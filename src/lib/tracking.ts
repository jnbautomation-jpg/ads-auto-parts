// Conversion events for the ad platforms.
//
// The base tags in SiteAnalytics only record page views. What marketing is
// actually buying is leads, so a submitted quote form has to fire an event or
// the campaigns still cannot be optimised — which is the situation the site
// was in: spend visible, results invisible.
//
// Client-only by design. These run after a server action has already written
// the lead to the database, so a blocked tracker, an ad blocker or a script
// that failed to load can never stop a lead being recorded. Tracking is the
// last thing to happen and the least important.

/** Google Ads conversion label, e.g. "AW-123/AbCdEf". Empty disables it. */
export const GOOGLE_LEAD_CONVERSION_LABEL = "";

type Gtag = (...args: unknown[]) => void;
type Fbq = (...args: unknown[]) => void;

function gtag(): Gtag | null {
  const fn = (window as unknown as { gtag?: Gtag }).gtag;
  return typeof fn === "function" ? fn : null;
}

function fbq(): Fbq | null {
  const fn = (window as unknown as { fbq?: Fbq }).fbq;
  return typeof fn === "function" ? fn : null;
}

/**
 * Records that a customer submitted a quote request.
 *
 * Wrapped in try/catch and guarded on the globals existing: an exception here
 * would surface to a customer who has just successfully sent a lead, which is
 * the worst possible moment to show an error for something they do not care
 * about.
 */
export function trackLead(): void {
  if (typeof window === "undefined") return;

  try {
    const g = gtag();
    if (g) {
      // Google Ads counts a conversion only against a conversion label, which
      // is created in the Ads UI per conversion action. Until marketing
      // supplies one, send a generic event so it is still visible in reports.
      if (GOOGLE_LEAD_CONVERSION_LABEL) {
        g("event", "conversion", { send_to: GOOGLE_LEAD_CONVERSION_LABEL });
      } else {
        g("event", "generate_lead");
      }
    }

    const f = fbq();
    if (f) f("track", "Lead");
  } catch {
    // Deliberately silent. A tracking failure is not the customer's problem
    // and the lead is already saved.
  }
}
