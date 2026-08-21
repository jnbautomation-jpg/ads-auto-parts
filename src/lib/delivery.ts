// ZIP delivery estimator — Phase 2B.
//
//   "Input a ZIP, return: free / cost, same-day or next-day, and the cutoff
//    time. Encode the actual delivery zones — free in Orlando city limits,
//    same-day Central FL before 12 PM."
//
// ⚠️ ZONES AND FEES NEED MATTHEW'S CONFIRMATION.
//
// The two rules the spec states outright are encoded exactly: free inside
// Orlando, same-day across Central Florida before the 12 PM cutoff. The
// specific ZIP lists and the out-of-area fee are a best reconstruction from
// the counties the shop says it serves — they are NOT client-confirmed, and
// quoting a delivery fee wrongly is the kind of error a customer notices at
// the door. Everything is in these two tables so confirming them is an edit
// here, not a hunt through components.

/** Orlando city ZIPs — free delivery, every time, no minimum. */
const ORLANDO_ZIPS = new Set([
  "32801", "32802", "32803", "32804", "32805", "32806", "32807", "32808",
  "32809", "32810", "32811", "32812", "32814", "32817", "32818", "32819",
  "32820", "32821", "32822", "32824", "32825", "32826", "32827", "32828",
  "32829", "32831", "32832", "32833", "32835", "32836", "32837", "32839",
]);

/**
 * Central Florida ZIP PREFIXES — same-day before the cutoff.
 *
 * Prefix-matched rather than listed exhaustively: the region covers Orange,
 * Seminole, Osceola, Lake, Volusia, Polk and Brevard, which is several
 * hundred ZIPs, and a partial list would wrongly tell real customers they
 * are out of area.
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

/** Orders placed before this hour (24h, local) ship same day. */
export const SAME_DAY_CUTOFF_HOUR = 12;
export const SAME_DAY_CUTOFF_LABEL = "12 PM";

export type DeliveryZone = "ORLANDO" | "CENTRAL_FL" | "OUTSIDE";

export type DeliveryEstimate = {
  zone: DeliveryZone;
  /** Null means "we'll quote it" rather than a known price. */
  feeUsd: number | null;
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
  return "OUTSIDE";
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

  if (zone === "ORLANDO") {
    return {
      zone,
      feeUsd: 0,
      free: true,
      sameDayAvailable: beforeCutoff,
      cutoffLabel: SAME_DAY_CUTOFF_LABEL,
    };
  }
  if (zone === "CENTRAL_FL") {
    return {
      zone,
      // ⚠️ Placeholder until Matthew confirms the out-of-city fee.
      feeUsd: null,
      free: false,
      sameDayAvailable: beforeCutoff,
      cutoffLabel: SAME_DAY_CUTOFF_LABEL,
    };
  }
  return {
    zone,
    feeUsd: null,
    free: false,
    sameDayAvailable: false,
    cutoffLabel: SAME_DAY_CUTOFF_LABEL,
  };
}
