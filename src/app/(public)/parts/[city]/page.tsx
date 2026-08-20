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
import { pageMetadata } from "@/lib/metadata";
import { BUSINESS_NAME, PHONE_DISPLAY } from "@/lib/site";
import { LocationView } from "./location-view";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const location = findLocation(city);
  if (!location) return { title: "Not found" };

  return pageMetadata("en", `/parts/${location.slug}`, {
    title: `Auto body parts in ${location.name}, FL — doors, hoods, fenders`,
    description: `New aftermarket auto body parts delivered to ${location.name} and ${location.county}. Same-day across Central Florida on orders before 12 PM. ${BUSINESS_NAME} — ${PHONE_DISPLAY}.`,
  });
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  return <LocationView city={city} locale="en" />;
}
