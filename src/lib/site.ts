// Single source of truth for the shop's own details. These were previously
// re-declared in six files (page.tsx, site-header.tsx, catalog-header.tsx,
// catalog/page.tsx, catalog/[id]/page.tsx, actions.ts) — a phone-number
// change meant a five-file edit and the copies had already started to drift.
//
// The address string is also what Google Business matches on for the local
// listing: keep it byte-identical to the listing, don't reformat it.

// Single-tenant public site — every public query and lead scopes to this org.
export const ORG_SLUG = "ads-auto-parts";

export const PHONE_DISPLAY = "(407) 743-4644";
// Bare digits for tel:/sms: hrefs — never render this one.
export const PHONE_HREF = "4077434644";

export const EMAIL = "autodoorstorewest@gmail.com";

export const ADDRESS = "6950 Venture Cir, Orlando, FL 32807";
export const MAPS_URL = `https://maps.google.com/?q=${encodeURIComponent(ADDRESS)}`;

export const HOURS_DISPLAY = "Mon–Fri 9 AM–5 PM · Sat–Sun Closed";
export const PHONE_NOTE = "Phone available 24/7";

export const BUSINESS_NAME = "ADS Auto Door Store";
export const LOCALITY = "Orlando, FL";
