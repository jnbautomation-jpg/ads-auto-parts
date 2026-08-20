// Reorder from history — Phase 2B.
//
//   "One-click repeat of a previous order for wholesale accounts."
//   "Handle the case where a part is now out of stock or repriced."
//
// That second line is the whole design problem. A literal one-click reorder
// that silently places today's order at today's prices is a way to charge a
// shop more than they expected without telling them. So "one click" gets you
// to a review screen that shows exactly what changed; the second click is the
// order.
//
// Pure functions here so the comparison logic is testable without a database.

export type PreviousItem = {
  productId: string | null;
  sku: string;
  description: string;
  quantity: number;
  /** What they paid last time. */
  unitPrice: number;
};

export type CurrentProduct = {
  id: string;
  quantity: number;
  /** Today's price for THIS customer's tier. */
  unitPrice: number;
};

export type ReorderLineStatus =
  | "UNCHANGED"
  | "PRICE_CHANGED"
  | "PARTIAL_STOCK"
  | "OUT_OF_STOCK"
  | "DISCONTINUED";

export type ReorderLine = {
  sku: string;
  description: string;
  productId: string | null;
  wantedQuantity: number;
  /** How many can actually be ordered now. 0 when unavailable. */
  availableQuantity: number;
  previousUnitPrice: number;
  currentUnitPrice: number | null;
  status: ReorderLineStatus;
};

export type ReorderPlan = {
  lines: ReorderLine[];
  /** Lines that can be ordered right now, ready to hand to createOrder(). */
  orderable: { productId: string; quantity: number }[];
  /** True when nothing at all can be reordered. */
  empty: boolean;
  /** True when anything differs from last time — drives the warning banner. */
  hasChanges: boolean;
  previousTotal: number;
  currentTotal: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Compares a past order against what's on the shelf and at what price today.
 *
 * `current` is keyed by product id; a product missing from the map has been
 * deleted or unpublished since — DISCONTINUED rather than out of stock,
 * because those mean different things to a shop deciding whether to wait.
 */
export function buildReorderPlan(
  previous: PreviousItem[],
  current: Map<string, CurrentProduct>,
): ReorderPlan {
  const lines: ReorderLine[] = previous.map((item) => {
    const now = item.productId ? current.get(item.productId) : undefined;

    if (!item.productId || !now) {
      return {
        sku: item.sku,
        description: item.description,
        productId: item.productId,
        wantedQuantity: item.quantity,
        availableQuantity: 0,
        previousUnitPrice: item.unitPrice,
        currentUnitPrice: null,
        status: "DISCONTINUED",
      };
    }

    const availableQuantity = Math.min(item.quantity, Math.max(0, now.quantity));
    const priceChanged = round2(now.unitPrice) !== round2(item.unitPrice);

    let status: ReorderLineStatus;
    if (availableQuantity === 0) status = "OUT_OF_STOCK";
    else if (availableQuantity < item.quantity) status = "PARTIAL_STOCK";
    else if (priceChanged) status = "PRICE_CHANGED";
    else status = "UNCHANGED";

    return {
      sku: item.sku,
      description: item.description,
      productId: item.productId,
      wantedQuantity: item.quantity,
      availableQuantity,
      previousUnitPrice: item.unitPrice,
      currentUnitPrice: now.unitPrice,
      status,
    };
  });

  const orderable = lines
    .filter((l) => l.productId && l.availableQuantity > 0)
    .map((l) => ({ productId: l.productId as string, quantity: l.availableQuantity }));

  return {
    lines,
    orderable,
    empty: orderable.length === 0,
    hasChanges: lines.some((l) => l.status !== "UNCHANGED"),
    previousTotal: round2(previous.reduce((s, i) => s + i.unitPrice * i.quantity, 0)),
    currentTotal: round2(
      lines.reduce((s, l) => s + (l.currentUnitPrice ?? 0) * l.availableQuantity, 0),
    ),
  };
}

export const REORDER_STATUS_LABEL: Record<ReorderLineStatus, string> = {
  UNCHANGED: "Same as last time",
  PRICE_CHANGED: "Price changed",
  PARTIAL_STOCK: "Only some available",
  OUT_OF_STOCK: "Out of stock",
  DISCONTINUED: "No longer listed",
};
