// Single source of truth for the shop's own details. These were previously
// re-declared in six files (page.tsx, site-header.tsx, catalog-header.tsx,
// catalog/page.tsx, catalog/[id]/page.tsx, actions.ts) — a phone-number
// change meant a five-file edit and the copies had already started to drift.
//
// The address string is also what Google Business matches on for the local
// listing: keep it byte-identical to the listing, don't reformat it.

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

// Phase 2 spec 1.14: moved off the personal Gmail account to the business
// domain. This mailbox must exist and be monitored before deploying —
// every quote link on the public site points at it.
export const EMAIL = "sales@autodoorstoreorlando.com";

export const ADDRESS = "6950 Venture Cir, Orlando, FL 32807";
export const MAPS_URL = `https://maps.google.com/?q=${encodeURIComponent(ADDRESS)}`;

export const HOURS_DISPLAY = "Mon–Fri 9 AM–5 PM · Sat–Sun Closed";
export const PHONE_NOTE = "Phone available 24/7";

export const BUSINESS_NAME = "ADS Auto Door Store";
export const LOCALITY = "Orlando, FL";

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
