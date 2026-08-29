import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Staff routes are already behind auth and (admin)/layout.tsx sets
// robots: noindex — this keeps crawlers from spending budget on them at all.
// Listed explicitly rather than by pattern so adding a private route is a
// deliberate edit here, matching how PUBLIC_PREFIX_PATHS works in
// src/lib/supabase/middleware.ts.
const PRIVATE_PATHS = [
  "/dashboard",
  "/products",
  "/stock",
  "/suppliers",
  "/import",
  "/inquiries",
  "/staff",
  "/orders",
  "/alerts",
  "/customers",
  "/login",
  // Per-customer pages, some showing trade pricing.
  "/account",
  "/force-password-change",
  // Per-visitor and nothing to index. The confirmation page is also reachable
  // by anyone holding the PaymentIntent id, so it should never be crawled.
  "/cart",
  "/checkout",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_PATHS,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
