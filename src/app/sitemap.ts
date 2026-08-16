import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { ORG_SLUG, SITE_URL } from "@/lib/site";

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
