import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n";
import { CatalogView, type SearchParams } from "./catalog-view";

export const metadata: Metadata = {
  alternates: alternatesFor("en", "/catalog"),
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <CatalogView searchParams={searchParams} locale="en" />;
}
