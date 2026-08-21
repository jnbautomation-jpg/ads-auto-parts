import { describe, expect, it } from "vitest";
import { buildReorderPlan, REORDER_STATUS_LABEL, type CurrentProduct, type PreviousItem } from "./reorder";

const prev = (over: Partial<PreviousItem> = {}): PreviousItem => ({
  productId: "p1",
  sku: "RAV4-19-24-DR-LF",
  description: "2019-2024 Toyota RAV4 DOOR",
  quantity: 2,
  unitPrice: 369,
  ...over,
});

const now = (over: Partial<CurrentProduct> = {}): CurrentProduct => ({
  id: "p1",
  quantity: 5,
  unitPrice: 369,
  ...over,
});

describe("buildReorderPlan", () => {
  it("reports an unchanged order as unchanged", () => {
    const plan = buildReorderPlan([prev()], new Map([["p1", now()]]));
    expect(plan.lines[0].status).toBe("UNCHANGED");
    expect(plan.hasChanges).toBe(false);
    expect(plan.orderable).toEqual([{ productId: "p1", quantity: 2 }]);
  });

  it("flags a price change rather than quietly charging the new price", () => {
    // The failure this prevents: a shop clicks reorder expecting last
    // month's total and is billed more without being told.
    const plan = buildReorderPlan([prev()], new Map([["p1", now({ unitPrice: 399 })]]));
    expect(plan.lines[0].status).toBe("PRICE_CHANGED");
    expect(plan.lines[0].previousUnitPrice).toBe(369);
    expect(plan.lines[0].currentUnitPrice).toBe(399);
    expect(plan.hasChanges).toBe(true);
  });

  it("does not call a rounding-identical price a change", () => {
    const plan = buildReorderPlan([prev({ unitPrice: 369.0 })], new Map([["p1", now({ unitPrice: 369.004 })]]));
    expect(plan.lines[0].status).toBe("UNCHANGED");
  });

  it("caps the quantity at what is actually on the shelf", () => {
    const plan = buildReorderPlan([prev({ quantity: 5 })], new Map([["p1", now({ quantity: 2 })]]));
    expect(plan.lines[0].status).toBe("PARTIAL_STOCK");
    expect(plan.lines[0].availableQuantity).toBe(2);
    expect(plan.orderable).toEqual([{ productId: "p1", quantity: 2 }]);
  });

  it("marks a sold-out part out of stock and excludes it from the order", () => {
    const plan = buildReorderPlan([prev()], new Map([["p1", now({ quantity: 0 })]]));
    expect(plan.lines[0].status).toBe("OUT_OF_STOCK");
    expect(plan.orderable).toEqual([]);
    expect(plan.empty).toBe(true);
  });

  it("distinguishes discontinued from out of stock", () => {
    // Different meanings to a shop deciding whether to wait: one comes back,
    // the other doesn't.
    const deleted = buildReorderPlan([prev()], new Map());
    expect(deleted.lines[0].status).toBe("DISCONTINUED");
    expect(deleted.lines[0].currentUnitPrice).toBeNull();

    const nullProduct = buildReorderPlan([prev({ productId: null })], new Map());
    expect(nullProduct.lines[0].status).toBe("DISCONTINUED");
  });

  it("orders what it can when only part of the order is available", () => {
    const plan = buildReorderPlan(
      [prev({ productId: "p1" }), prev({ productId: "p2", sku: "B", quantity: 1 })],
      new Map([
        ["p1", now({ id: "p1" })],
        ["p2", now({ id: "p2", quantity: 0 })],
      ]),
    );
    expect(plan.orderable).toEqual([{ productId: "p1", quantity: 2 }]);
    expect(plan.empty).toBe(false);
    expect(plan.lines.map((l) => l.status)).toEqual(["UNCHANGED", "OUT_OF_STOCK"]);
  });

  it("totals only what can actually be ordered today", () => {
    const plan = buildReorderPlan(
      [prev({ quantity: 2, unitPrice: 100 })],
      new Map([["p1", now({ quantity: 1, unitPrice: 120 })]]),
    );
    expect(plan.previousTotal).toBe(200);
    // One unit at today's price, not two at last month's.
    expect(plan.currentTotal).toBe(120);
  });

  it("handles an empty history without throwing", () => {
    const plan = buildReorderPlan([], new Map());
    expect(plan.empty).toBe(true);
    expect(plan.hasChanges).toBe(false);
  });
});

describe("REORDER_STATUS_LABEL", () => {
  it("explains each state in words a shop can act on", () => {
    expect(REORDER_STATUS_LABEL.OUT_OF_STOCK).toBe("Out of stock");
    expect(REORDER_STATUS_LABEL.DISCONTINUED).toBe("No longer listed");
    expect(REORDER_STATUS_LABEL.PARTIAL_STOCK).toBe("Only some available");
  });
});
