import { describe, expect, it } from "vitest";
import { buildReceiptData, type ReceiptOrder } from "./receipt";
import { RETAIL_MARKUP_USD } from "./pricing";

const BASE: ReceiptOrder = {
  orderNumber: 1042,
  createdAt: new Date("2026-08-24T15:00:00Z"),
  customerName: "Jane Doe",
  customerEmail: "jane@example.com",
  customerPhone: "(407) 743-4644",
  fulfillment: "PICKUP",
  deliveryAddress: null,
  pricedAsTier: "RETAIL",
  paymentStatus: "PAID",
  subtotal: "469.00",
  discount: "0",
  deliveryFee: "0",
  deliveryZone: null,
  tax: "0",
  taxRate: "0",
  total: "469.00",
  items: [{ sku: "CORO-14-19-DR-LF", description: "2014–2019 Corolla door", quantity: 1, unitPrice: "469.00" }],
};

describe("buildReceiptData", () => {
  it("multiplies unit price by quantity for each line", () => {
    const r = buildReceiptData({
      ...BASE,
      items: [{ ...BASE.items[0], quantity: 3, unitPrice: "120.50" }],
    });
    expect(r.lines[0].lineTotal).toBe(361.5);
  });

  it("drops a missing email rather than printing a blank contact line", () => {
    const r = buildReceiptData({ ...BASE, customerEmail: null });
    expect(r.contact).toEqual(["(407) 743-4644"]);
  });

  it("prints the delivery address for a delivery", () => {
    const r = buildReceiptData({
      ...BASE,
      fulfillment: "DELIVERY",
      deliveryAddress: "12 Main St, Orlando FL",
    });
    expect(r.fulfilment).toEqual(["Delivery", "12 Main St, Orlando FL"]);
  });

  it("says the address is missing rather than printing an empty heading", () => {
    // A delivery can be taken over the phone before the address is confirmed.
    const r = buildReceiptData({ ...BASE, fulfillment: "DELIVERY", deliveryAddress: "   " });
    expect(r.fulfilment[1]).toBe("Address to be confirmed");
  });

  it("shows a trade order what it saved, per unit", () => {
    // The point of a trade account is that the saving is visible.
    const r = buildReceiptData({
      ...BASE,
      pricedAsTier: "WHOLESALE",
      items: [{ ...BASE.items[0], quantity: 2 }],
    });
    expect(r.tradeSaving).toBe(RETAIL_MARKUP_USD * 2);
  });

  it("shows no discount line on a retail order", () => {
    expect(buildReceiptData(BASE).tradeSaving).toBeNull();
  });

  it("does not invent a saving on a trade order with no items", () => {
    const r = buildReceiptData({ ...BASE, pricedAsTier: "WHOLESALE", items: [] });
    expect(r.tradeSaving).toBeNull();
  });

  it("marks an unpaid order as owing rather than paid", () => {
    expect(buildReceiptData({ ...BASE, paymentStatus: "UNPAID" }).paid).toBe(false);
    expect(buildReceiptData(BASE).paid).toBe(true);
  });

  it("survives a malformed price instead of printing NaN on a customer's receipt", () => {
    const r = buildReceiptData({
      ...BASE,
      total: "not-a-number",
      items: [{ ...BASE.items[0], unitPrice: "" }],
    });
    expect(r.total).toBe(0);
    expect(r.lines[0].lineTotal).toBe(0);
  });

  it("prefixes the order number so it matches how staff quote it", () => {
    expect(buildReceiptData(BASE).orderNumber).toBe("#1042");
  });
});

describe("buildReceiptData — sales tax", () => {
  it("carries the stored tax and rate through as numbers", () => {
    const r = buildReceiptData({ ...BASE, tax: "32.83", taxRate: "0.0700", total: "501.83" });
    expect(r.tax).toBe(32.83);
    expect(r.taxRate).toBe(0.07);
    expect(r.total).toBe(501.83);
  });

  it("reads the rate the order was CHARGED at, not today's", () => {
    // A receipt reprinted after a rate change must still add up using the
    // figures that were true when the money moved.
    const r = buildReceiptData({ ...BASE, tax: "30.49", taxRate: "0.0650", total: "499.49" });
    expect(r.taxRate).toBe(0.065);
    expect(r.subtotal + r.tax).toBeCloseTo(r.total, 2);
  });

  it("carries zero tax for a wholesale order, so no tax line prints", () => {
    const r = buildReceiptData({ ...BASE, pricedAsTier: "WHOLESALE", tax: "0", taxRate: "0" });
    expect(r.tax).toBe(0);
    expect(r.taxRate).toBe(0);
  });
});

describe("buildReceiptData — delivery", () => {
  it("carries the stored fee through", () => {
    const r = buildReceiptData({ ...BASE, deliveryFee: "180.00", deliveryZone: "FLORIDA", total: "691.18" });
    expect(r.deliveryFee).toBe(180);
  });

  it("is zero for a pickup, so no line prints", () => {
    expect(buildReceiptData(BASE).deliveryFee).toBe(0);
  });
});
