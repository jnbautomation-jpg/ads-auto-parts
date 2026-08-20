import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { ORG_SLUG, SITE_URL } from "@/lib/site";
import { SERVICE_LOCATIONS } from "@/lib/locations";
import { HREFLANG, LOCALES, localePath } from "@/lib/i18n";

// Rendered on demand rather than at build time. A sitemap route that queried
// the database during the build would make `next build` require a live
// database, which would break CI (which builds against a placeholder
// connection string) and couple deploys to database availability. Crawlers
// hit this rarely, so the per-request cost is irrelevant.
export const dynamic = "force-dynamic";

/**
 * One entry per page, with its other language attached as an `xhtml:link`
 * alternate — the shape Google documents for a multilingual site, and the one
 * in Next's own localized-sitemap example.
 *
 * Listing each language as a separate top-level URL instead would work, but it
 * tells a crawler nothing about which pages are translations of each other, so
 * the two languages compete as near-duplicates. `path` here is the
 * language-neutral path; the prefixes come from `localePath`.
 */
function bothLanguages(
  path: string,
  rest: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}${localePath("en", path)}`,
    alternates: {
      languages: {
        ...Object.fromEntries(
          LOCALES.map((l) => [HREFLANG[l], `${SITE_URL}${localePath(l, path)}`]),
        ),
        "x-default": `${SITE_URL}${localePath("en", path)}`,
      },
    },
    ...rest,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    bothLanguages("/", { changeFrequency: "weekly", priority: 1 }),
    bothLanguages("/catalog", { changeFrequency: "daily", priority: 0.8 }),
    bothLanguages("/vin", { changeFrequency: "monthly", priority: 0.7 }),
    bothLanguages("/returns", { changeFrequency: "yearly", priority: 0.4 }),
    bothLanguages("/estimate", { changeFrequency: "monthly", priority: 0.6 }),
    // Local landing pages, both languages — the whole point is that search
    // engines find them.
    ...SERVICE_LOCATIONS.map((l) =>
      bothLanguages(`/parts/${l.slug}`, { changeFrequency: "monthly", priority: 0.6 }),
    ),
  ];

  const organization = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
    select: { id: true },
  });
  if (!organization) return staticEntries;

  // Only public products — an unlisted part must not become discoverable
  // through the sitemap.
  const products = await prisma.product.findMany({
    where: { organizationId: organization.id, isPublic: true },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  return [
    ...staticEntries,
    ...products.map((product) =>
      bothLanguages(`/catalog/${product.id}`, {
        lastModified: product.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      }),
    ),
  ];
}
