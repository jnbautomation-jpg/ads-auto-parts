import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { CatalogView, type SearchParams } from "./catalog-view";

// Spec 1.10 was "one page title sitewide". The homepage and the local pages
// were given their own, but /catalog kept inheriting the layout's — so the
// catalog and the homepage still shared a title in Google's results, while
// /es/catalog already had its own.
export const metadata: Metadata = pageMetadata("en", "/catalog", {
  title: "Parts catalog — ADS Auto Door Store, Orlando FL",
  description:
    "Doors, hoods, fenders, bumpers and more — new, CAPA certified aftermarket auto body parts, delivered same-day across Central Florida.",
});

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <CatalogView searchParams={searchParams} locale="en" />;
}
