// Single source of truth for the shop's own details. These were previously
// re-declared in six files (page.tsx, site-header.tsx, catalog-header.tsx,
// catalog/page.tsx, catalog/[id]/page.tsx, actions.ts) — a phone-number
// change meant a five-file edit and the copies had already started to drift.
//
// The address string is also what Google Business matches on for the local
// listing: keep it byte-identical to the listing, don't reformat it.

import type { Locale } from "@/lib/i18n";

// Single-tenant public site — every public query and lead scopes to this org.
export const ORG_SLUG = "ads-auto-parts";

// Absolute origin for canonical URLs, Open Graph images, and the sitemap.
// Metadata needs an absolute base; without one Next falls back to
// http://localhost:3000 and every shared link points at nothing.
//
// Resolution order:
//   1. NEXT_PUBLIC_SITE_URL — set this in Vercel once the real domain is
//      attached. It is the only one that survives a domain change.
//   2. VERCEL_PROJECT_PRODUCTION_URL — the project's production domain,
//      injected by Vercel. Deliberately NOT VERCEL_URL, which is unique per
//      deployment and would make canonical URLs point at a preview build.
//   3. localhost, for `npm run dev`.
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) return `https://${vercelProduction.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

export const PHONE_DISPLAY = "(407) 743-4644";
// Bare digits for tel:/sms: hrefs — never render this one.
export const PHONE_HREF = "4077434644";

// DECIDED (Aug 2026): the shop is staying on this address. The Gmail is
// monitored and works, and a domain mailbox that nobody reads is worse than a
// Gmail that someone does. Spec 1.14 wanted the address off a personal account
// and onto the business domain; that is a real improvement whenever the shop
// wants it, but it is now a choice rather than an outstanding task.
//
// If that day comes, it is this one line — nothing else in the codebase
// hard-codes an address:
//
//     export const EMAIL = "sales@autodoorstoreorlando.com";
export const EMAIL = "autodoorstorewest@gmail.com";

export const ADDRESS = "6950 Venture Cir, Orlando, FL 32807";
export const MAPS_URL = `https://maps.google.com/?q=${encodeURIComponent(ADDRESS)}`;

export const HOURS_DISPLAY = "Mon–Fri 9 AM–5 PM · Sat–Sun Closed";
export const PHONE_NOTE = "Phone available 24/7";

// The Spanish renderings live here, beside the English ones, rather than in
// the dictionaries with the rest of the copy. These are not copy — they are
// contested business facts (the site says Mon–Fri 9–5, the shop's Facebook
// says always open; CHANGELOG has it blocked on Matthew), and a shop whose
// Spanish page advertises different hours from its English page is worse than
// one that is only half translated. Keeping them adjacent means whoever
// finally gets the real hours edits both in the same breath.
//
// Typed as Record<Locale, string>, so adding a language is a compile error
// here rather than a silently English line in the footer.
export const HOURS_DISPLAY_IN: Record<Locale, string> = {
  en: HOURS_DISPLAY,
  es: "Lun–Vie 9 AM–5 PM · Sáb–Dom cerrado",
};
export const PHONE_NOTE_IN: Record<Locale, string> = {
  en: PHONE_NOTE,
  es: "Teléfono disponible 24/7",
};

export const BUSINESS_NAME = "ADS Auto Door Store";
export const LOCALITY = "Orlando, FL";

// Advertising conversion tracking. Both are PUBLIC identifiers — they appear
// in the page source by design, so they belong here with the shop's other
// details rather than in an env var pretending to be a secret.
//
// Supplied by Connie Lothian (marketing) on 17 Aug 2026. The old Wix site had
// both; neither was carried across, so two live Google Ads campaigns have been
// running against a site that reports no conversions at all. Without these the
// spend cannot be attributed and the campaigns cannot be optimised.
//
// An empty string disables that tag entirely — see SiteAnalytics — so a shop
// that stops advertising can switch tracking off without touching code.
export const GOOGLE_ADS_ID = "AW-7560399029";
export const META_PIXEL_ID = "120240474804150214";

// Outbound profile links used by the trust-signals block.
//
// ⚠️ NEEDS THE REAL URLS. The spec notes the shop already has Facebook, Yelp
// and eBay presences and that the eBay store "isn't linked from the site" —
// but the document doesn't contain the URLs. An empty string hides that link
// rather than shipping a dead one, so filling these in is a one-line change
// each and requires no code.
export const REVIEW_LINKS = {
  google: "",
  facebook: "",
  yelp: "",
  ebay: "",
} as const;
