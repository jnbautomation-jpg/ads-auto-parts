import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { ORG_SLUG, SITE_URL } from "@/lib/site";
import { SERVICE_LOCATIONS } from "@/lib/locations";

// Rendered on demand rather than at build time. A sitemap route that queried
// the database during the build would make `next build` require a live
// database, which would break CI (which builds against a placeholder
// connection string) and couple deploys to database availability. Crawlers
// hit this rarely, so the per-request cost is irrelevant.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/catalog`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/vin`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/returns`, changeFrequency: "yearly", priority: 0.4 },
    // Local landing pages, both languages — the whole point is that search
    // engines find them.
    ...SERVICE_LOCATIONS.flatMap((l) => [
      { url: `${SITE_URL}/parts/${l.slug}`, changeFrequency: "monthly" as const, priority: 0.6 },
      { url: `${SITE_URL}/es/parts/${l.slug}`, changeFrequency: "monthly" as const, priority: 0.6 },
    ]),
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
    ...products.map((product) => ({
      url: `${SITE_URL}/catalog/${product.id}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
