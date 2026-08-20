import type { Metadata } from "next";
// Rendered on demand, NOT prerendered.
//
// These pages show live stock counts, which is what makes them genuinely
// useful rather than doorway pages. generateStaticParams() would prerender
// them at build time, which (a) bakes in counts that go stale the moment a
// part sells and (b) makes `next build` require a live database — it failed
// in CI, which builds against a placeholder connection string. Every other
// route in this app is server-rendered on demand for the same reason.
import { findLocation } from "@/lib/locations";
import { alternatesFor } from "@/lib/i18n";
import { BUSINESS_NAME, PHONE_DISPLAY } from "@/lib/site";
import { LocationView } from "../../../parts/[city]/location-view";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const location = findLocation(city);
  if (!location) return { title: "No encontrado" };

  return {
    title: `Piezas de carrocería en ${location.name}, FL — puertas, cofres, salpicaderas`,
    description: `Piezas de carrocería nuevas entregadas en ${location.name} y ${location.county}. El mismo día en toda Florida Central en pedidos antes de las 12 PM. ${BUSINESS_NAME} — ${PHONE_DISPLAY}.`,
    alternates: alternatesFor("es", `/parts/${location.slug}`),
  };
}

export default async function LocationPageEs({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  return <LocationView city={city} locale="es" />;
}
