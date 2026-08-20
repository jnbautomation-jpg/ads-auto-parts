// Stock accuracy — spec section 4.
//
//   "Stock accuracy pass — a large share of items currently show LOW STOCK.
//    If that's stale it undermines trust once checkout is live."
//
// The survey on the dev catalogue bears this out: 27% of public parts show
// LOW STOCK, 10% show CALL, and 323 of 325 have no stock movement at all
// since import. So the counts aren't necessarily WRONG — they have simply
// never been verified by a human, and nobody can tell which is which.
//
// This module ranks what to count first. The ordering isn't arbitrary: it
// puts the parts whose staleness is actively costing the shop money or
// credibility at the top.

export type StockAuditProduct = {
  id: string;
  sku: string;
  quantity: number;
  reorderPoint: number;
  isPublic: boolean;
  lastCountedAt: Date | null;
};

export type StockRisk = "SHOWING_CALL" | "SHOWING_LOW" | "NEVER_COUNTED" | "STALE" | "OK";

/** How long a count stays trustworthy before it's worth redoing. */
export const COUNT_STALE_DAYS = 90;

export const RISK_LABEL: Record<StockRisk, string> = {
  SHOWING_CALL: "Publicly out of stock",
  SHOWING_LOW: "Publicly low stock",
  NEVER_COUNTED: "Never counted",
  STALE: "Count is old",
  OK: "Recently counted",
};

export const RISK_EXPLANATION: Record<StockRisk, string> = {
  SHOWING_CALL:
    "Customers see CALL and most won't. If this is actually on the shelf, it's a lost sale every day.",
  SHOWING_LOW:
    "Customers see LOW STOCK, which pushes them to buy elsewhere. Worth confirming before checkout goes live.",
  NEVER_COUNTED: "Imported from the spreadsheet and never physically checked.",
  STALE: `Last counted more than ${COUNT_STALE_DAYS} days ago.`,
  OK: "Counted recently.",
};

/**
 * The risk category for one part.
 *
 * A part that is publicly visible AND advertising a bad availability label
 * outranks one that is merely uncounted — that's the case where staleness is
 * actively costing something rather than just being unknown.
 */
export function stockRisk(product: StockAuditProduct, now: Date = new Date()): StockRisk {
  const uncounted = product.lastCountedAt === null;
  const stale =
    product.lastCountedAt !== null &&
    now.getTime() - product.lastCountedAt.getTime() > COUNT_STALE_DAYS * 24 * 60 * 60 * 1000;

  if (product.isPublic && (uncounted || stale)) {
    if (product.quantity <= 0) return "SHOWING_CALL";
    if (product.quantity <= product.reorderPoint) return "SHOWING_LOW";
  }
  if (uncounted) return "NEVER_COUNTED";
  if (stale) return "STALE";
  return "OK";
}

const RISK_ORDER: StockRisk[] = ["SHOWING_CALL", "SHOWING_LOW", "NEVER_COUNTED", "STALE", "OK"];

export function riskRank(risk: StockRisk): number {
  return RISK_ORDER.indexOf(risk);
}

/** Worklist: highest risk first, then oldest count, then sku for stability. */
export function buildCountWorklist<T extends StockAuditProduct>(
  products: T[],
  now: Date = new Date(),
): (T & { risk: StockRisk })[] {
  return products
    .map((p) => ({ ...p, risk: stockRisk(p, now) }))
    .sort((a, b) => {
      const byRisk = riskRank(a.risk) - riskRank(b.risk);
      if (byRisk !== 0) return byRisk;
      const aTime = a.lastCountedAt?.getTime() ?? 0;
      const bTime = b.lastCountedAt?.getTime() ?? 0;
      if (aTime !== bTime) return aTime - bTime;
      return a.sku.localeCompare(b.sku);
    });
}

/** Headline numbers for the staff page. */
export function summarize(products: StockAuditProduct[], now: Date = new Date()) {
  const counts: Record<StockRisk, number> = {
    SHOWING_CALL: 0,
    SHOWING_LOW: 0,
    NEVER_COUNTED: 0,
    STALE: 0,
    OK: 0,
  };
  for (const p of products) counts[stockRisk(p, now)]++;
  const verified = counts.OK;
  return {
    counts,
    total: products.length,
    verifiedPercent: products.length === 0 ? 0 : Math.round((verified / products.length) * 100),
  };
}
