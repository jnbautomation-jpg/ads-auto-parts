import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { CatalogView, type SearchParams } from "../../catalog/catalog-view";

export const metadata: Metadata = pageMetadata("es", "/catalog", {
  title: "Catálogo de piezas — ADS Auto Door Store, Orlando FL",
  description:
    "Puertas, cofres, salpicaderas, defensas y más — piezas de carrocería nuevas, aftermarket y certificadas CAPA, con entrega el mismo día en Florida Central.",
});

export default async function CatalogPageEs({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <CatalogView searchParams={searchParams} locale="es" />;
}
