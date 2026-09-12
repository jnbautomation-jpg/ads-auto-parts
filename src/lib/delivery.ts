// ZIP delivery estimator — Phase 2B.
//
// Zones and fees confirmed with Matthew, 9 Sep 2026:
//
//   * Orlando city limits — free.
//   * Central Florida (the same-day region) — free.
//   * Rest of Florida — $90 per part.
//   * Out of state — $250 per part.
//
// "Per part" means per unit, not per line: two doors on one order is two
// parts. Confirmed with Matthew — it is freight, and two doors take two
// doors' worth of space on the truck. There is no cap; four doors to Texas
// is $1,000 of delivery, which the client has agreed is correct.
//
// The fee is therefore a property of the ORDER, not of the ZIP. zoneForZip
// answers where; deliveryFeeFor answers how much, and needs the item count.

/** Orlando city ZIPs — free delivery, every time, no minimum. */
const ORLANDO_ZIPS = new Set([
  "32801", "32802", "32803", "32804", "32805", "32806", "32807", "32808",
  "32809", "32810", "32811", "32812", "32814", "32817", "32818", "32819",
  "32820", "32821", "32822", "32824", "32825", "32826", "32827", "32828",
  "32829", "32831", "32832", "32833", "32835", "32836", "32837", "32839",
]);

/**
 * Central Florida ZIP PREFIXES — free, and same-day before the cutoff.
 *
 * Prefix-matched rather than listed exhaustively: the region covers Orange,
 * Seminole, Osceola, Lake, Volusia, Polk and Brevard, which is several
 * hundred ZIPs, and a partial list would wrongly charge real customers a
 * fee. Matthew confirmed this county list on 9 Sep 2026.
 */
const CENTRAL_FL_PREFIXES = [
  "327", // Orlando metro / Orange
  "328", // Orange, Seminole
  "329", // Seminole, Volusia, Brevard
  "347", // Osceola, Lake
  "338", // Polk (Lakeland)
  "337", // Polk
  "321", // Daytona / Volusia
];

/**
 * Florida's ZIP range is 320xx–349xx, with 340xx being military (AA) rather
 * than a place anyone takes delivery. A ZIP that starts 32–34 and is not
 * already Orlando or Central Florida is the rest of the state.
 */
function isFloridaZip(zip: string): boolean {
  const prefix = Number(zip.slice(0, 3));
  return prefix >= 320 && prefix <= 349 && prefix !== 340;
}

/** Orders placed before this hour (24h, local) ship same day. */
export const SAME_DAY_CUTOFF_HOUR = 12;
export const SAME_DAY_CUTOFF_LABEL = "12 PM";

/** Per-part delivery, in dollars. Confirmed with Matthew 9 Sep 2026. */
export const FLORIDA_FEE_PER_PART_USD = 90;
export const OUT_OF_STATE_FEE_PER_PART_USD = 250;

export type DeliveryZone = "ORLANDO" | "CENTRAL_FL" | "FLORIDA" | "OUTSIDE";

export type DeliveryEstimate = {
  zone: DeliveryZone;
  /** Per part, in dollars. Zero in the free zones. */
  perPartUsd: number;
  free: boolean;
  sameDayAvailable: boolean;
  cutoffLabel: string;
};

export function normalizeZip(raw: string): string {
  // Accepts ZIP+4 and keeps the first five.
  return raw.replace(/\D/g, "").slice(0, 5);
}

export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

export function zoneForZip(zip: string): DeliveryZone {
  if (ORLANDO_ZIPS.has(zip)) return "ORLANDO";
  if (CENTRAL_FL_PREFIXES.some((p) => zip.startsWith(p))) return "CENTRAL_FL";
  if (isFloridaZip(zip)) return "FLORIDA";
  return "OUTSIDE";
}

/** The per-part rate for a zone, in dollars. */
export function perPartFeeFor(zone: DeliveryZone): number {
  switch (zone) {
    case "ORLANDO":
    case "CENTRAL_FL":
      return 0;
    case "FLORIDA":
      return FLORIDA_FEE_PER_PART_USD;
    case "OUTSIDE":
      return OUT_OF_STATE_FEE_PER_PART_USD;
  }
}

/**
 * What delivery costs for an order, in dollars.
 *
 * `partCount` is the total number of units across the cart, not the number
 * of lines — two of the same door is two parts. A cart with no items is
 * zero rather than a negative or a throw: this runs where an empty cart is
 * a normal intermediate state, not an error.
 */
export function deliveryFeeFor(zone: DeliveryZone, partCount: number): number {
  if (!Number.isFinite(partCount) || partCount <= 0) return 0;
  return perPartFeeFor(zone) * Math.floor(partCount);
}

/**
 * Delivery estimate for a ZIP.
 *
 * `now` is injectable so the cutoff can be tested without waiting for
 * lunchtime — the same-day answer genuinely depends on the time of day, and
 * a customer told "same day" at 4 PM would be misled.
 */
export function estimateDelivery(rawZip: string, now: Date = new Date()): DeliveryEstimate | null {
  const zip = normalizeZip(rawZip);
  if (!isValidZip(zip)) return null;

  const zone = zoneForZip(zip);
  const beforeCutoff = now.getHours() < SAME_DAY_CUTOFF_HOUR;
  const free = zone === "ORLANDO" || zone === "CENTRAL_FL";

  return {
    zone,
    perPartUsd: perPartFeeFor(zone),
    free,
    // Same-day is a Central Florida promise; the paid zones are a shipment.
    sameDayAvailable: free && beforeCutoff,
    cutoffLabel: SAME_DAY_CUTOFF_LABEL,
  };
}