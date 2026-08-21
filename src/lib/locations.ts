// Local landing pages — spec section 4: "Local landing pages — Kissimmee,
// Winter Park, Sanford, Apopka, Lakeland, Daytona. Cheap organic traffic."
//
// ⚠️ A WARNING WORTH READING BEFORE ADDING MORE CITIES.
//
// Six near-identical pages with a city name swapped in are "doorway pages",
// and Google demotes or de-indexes them — the opposite of cheap traffic. Each
// page here therefore carries information that genuinely differs by city:
// which delivery zone it falls in, the drive from the warehouse, the county,
// and live stock counts. If a new city can't be given real differences, it is
// better not to have a page.
//
// Drive times are approximate and worth confirming with someone who does the
// route; they are presented as "about" rather than as a promise.

import { estimateDelivery, type DeliveryZone } from "@/lib/delivery";

export type ServiceLocation = {
  slug: string;
  name: string;
  /** Full display name including state. */
  fullName: string;
  county: string;
  /** Representative ZIP, used to derive the delivery zone from one source. */
  zip: string;
  approxMiles: number;
  approxDriveMinutes: number;
  /** One line of genuinely local context, not filler. */
  note: string;
};

export const SERVICE_LOCATIONS: ServiceLocation[] = [
  {
    slug: "winter-park",
    name: "Winter Park",
    fullName: "Winter Park, FL",
    county: "Orange County",
    zip: "32789",
    approxMiles: 5,
    approxDriveMinutes: 15,
    note: "Our closest neighbourhood — a panel can be on a Winter Park bench within the hour if it's on the shelf.",
  },
  {
    slug: "apopka",
    name: "Apopka",
    fullName: "Apopka, FL",
    county: "Orange County",
    zip: "32703",
    approxMiles: 15,
    approxDriveMinutes: 25,
    note: "North-west Orange County, straight up 441 — a short hop for a same-day panel.",
  },
  {
    slug: "kissimmee",
    name: "Kissimmee",
    fullName: "Kissimmee, FL",
    county: "Osceola County",
    zip: "34741",
    approxMiles: 20,
    approxDriveMinutes: 30,
    note: "Osceola County shops order from us daily — mostly doors and bumpers for late-model imports.",
  },
  {
    slug: "sanford",
    name: "Sanford",
    fullName: "Sanford, FL",
    county: "Seminole County",
    zip: "32771",
    approxMiles: 22,
    approxDriveMinutes: 30,
    note: "Seminole County shops sit north of us on 17-92 — an easy run against the morning traffic.",
  },
  {
    slug: "daytona-beach",
    name: "Daytona Beach",
    fullName: "Daytona Beach, FL",
    county: "Volusia County",
    zip: "32114",
    approxMiles: 55,
    approxDriveMinutes: 60,
    note: "Volusia County — an hour up I-4, still inside our same-day run when you order before the cutoff.",
  },
  {
    slug: "lakeland",
    name: "Lakeland",
    fullName: "Lakeland, FL",
    county: "Polk County",
    zip: "33801",
    approxMiles: 55,
    approxDriveMinutes: 60,
    note: "Polk County — the western edge of our same-day area, an hour down I-4.",
  },
];

export function findLocation(slug: string): ServiceLocation | null {
  return SERVICE_LOCATIONS.find((l) => l.slug === slug) ?? null;
}

/**
 * The delivery promise for a location, derived from the SAME zone table the
 * ZIP checker uses — so a landing page can never advertise a delivery the
 * estimator would decline.
 */
export function deliveryForLocation(location: ServiceLocation): {
  zone: DeliveryZone;
  free: boolean;
  sameDayAvailable: boolean;
  cutoffLabel: string;
} {
  // Fixed to a morning time on purpose: the page describes what the shop
  // OFFERS, not whether today's cutoff has already passed. The live ZIP
  // checker answers the time-sensitive question.
  const morning = new Date();
  morning.setHours(9, 0, 0, 0);
  const est = estimateDelivery(location.zip, morning);

  return {
    zone: est?.zone ?? "OUTSIDE",
    free: est?.free ?? false,
    sameDayAvailable: est?.sameDayAvailable ?? false,
    cutoffLabel: est?.cutoffLabel ?? "12 PM",
  };
}
