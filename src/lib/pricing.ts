// Two-tier pricing. One rule, one file — every price shown to anyone
// resolves through here.
//
//   Product.price       — WHOLESALE. What a trade account pays. Never public.
//   Product.retailPrice — RETAIL. What the public catalog shows.
//
// The public catalog and product page must select `retailPrice` and must NOT
// select `price`, so the wholesale number never enters the server component's
// data at all. That is stronger than hiding it at render time: it cannot leak
// through the RSC payload, a prefill link, or a future refactor that starts
// passing the product object to a client component.

// `import type` matters: this module is imported by the client-side product
// form for RETAIL_MARKUP_USD, and a value import of Prisma would drag the
// generated client into the browser bundle.
import type { Prisma } from "@/generated/prisma/client";

// Matthew's stated pricing rule: public price is wholesale plus a flat $100.
//
// Worth revisiting — a flat amount is a wildly uneven margin: +50% on a $199
// part and +19% on a $539 part. A percentage, or per-part-type tiers, would
// hold margin steady. Kept as a named constant so changing the rule is a
// one-line edit plus a re-run of scripts/backfill-retail-price.ts.
export const RETAIL_MARKUP_USD = 100;

/** Default public price for a part, given its wholesale price. */
export function defaultRetailPrice(wholesale: number): number {
  if (!Number.isFinite(wholesale) || wholesale < 0) return 0;
  return round2(wholesale + RETAIL_MARKUP_USD);
}

/**
 * Margin the shop makes on a public sale, as a percentage of the wholesale
 * price. Used by the admin UI to make an uneven flat markup visible.
 * Returns null when wholesale is 0 — the percentage is undefined there.
 */
export function retailMarginPercent(wholesale: number, retail: number): number | null {
  if (!Number.isFinite(wholesale) || !Number.isFinite(retail) || wholesale <= 0) return null;
  return round2(((retail - wholesale) / wholesale) * 100);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Prisma `select` for public product reads. Deliberately omits `price`,
 * `cost`, `binLocation`, and `supplierId` — anything a customer must never
 * see, kept out of the query rather than filtered after it.
 */
export const PUBLIC_PRODUCT_SELECT = {
  id: true,
  sku: true,
  make: true,
  model: true,
  yearStart: true,
  yearEnd: true,
  partType: true,
  position: true,
  retailPrice: true,
  capaCertified: true,
  condition: true,
  conditionNotes: true,
  photos: true,
  quantity: true,
  reorderPoint: true,
} satisfies Prisma.ProductSelect;
