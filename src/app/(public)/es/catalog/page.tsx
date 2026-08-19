import type { Metadata } from "next";
import { alternatesFor } from "@/lib/i18n";
import { CatalogView, type SearchParams } from "../../catalog/catalog-view";

export const metadata: Metadata = {
  title: "Catálogo de piezas — ADS Auto Door Store, Orlando FL",
  description:
    "Puertas, cofres, salpicaderas, defensas y más — piezas de carrocería nuevas, aftermarket y certificadas CAPA, con entrega el mismo día en Florida Central.",
  // hreflang so Google indexes both languages instead of treating one as a
  // duplicate of the other.
  alternates: alternatesFor("es", "/catalog"),
};

export default async function CatalogPageEs({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return <CatalogView searchParams={searchParams} locale="es" />;
}
