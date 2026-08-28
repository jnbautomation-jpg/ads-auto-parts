import type { NextConfig } from "next";
import { resolveSiteUrl, wwwHostFor } from "./src/lib/site-url";

// www → non-www, in code rather than as a Vercel domain setting.
//
// Both hosts were serving the site with a 200 — the canonical tag pointed at
// the apex from both, which is what kept Google from splitting the ranking
// outright, but every www link, every ad click landing on www, and every
// crawler still had to be told twice. The Vercel dashboard can do this and
// arguably should, but it lives in an account the people working on this repo
// do not all have, and a redirect that is one dashboard toggle away from
// vanishing is not a redirect anyone can rely on. Here it is reviewable, it
// ships with the code, and it cannot be lost in a project migration.
//
// Derived from the same resolution the canonical tags use (src/lib/site-url.ts)
// rather than hardcoded, so a domain change moves both together. Returns null —
// and adds no redirect at all — on localhost, on preview deployments, and on
// any canonical host that is already www.
const wwwHost = wwwHostFor();
const canonicalOrigin = resolveSiteUrl();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Hand-maintained inventory workbooks (multi-sheet, formatted) can
      // exceed the 1MB default action body limit.
      bodySizeLimit: "10mb",
    },
  },

  async redirects() {
    if (!wwwHost) return [];

    return [
      {
        // `:path*` keeps the rest of the URL, so a deep link into the catalog
        // survives the hop instead of dumping the visitor on the homepage.
        // Query strings are carried over by Next automatically — which
        // matters here, because the ad clicks this is for arrive with gclid
        // and utm parameters attached.
        source: "/:path*",
        has: [{ type: "host", value: wwwHost }],
        destination: `${canonicalOrigin}/:path*`,
        // 308, not 307: this is settled, and search engines should collapse
        // the two hosts into one rather than re-checking forever.
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
