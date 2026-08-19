import { describe, expect, it } from "vitest";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  mergeLines,
  orderNumberLabel,
} from "./orders";

// The transactional stock-decrement in createOrder() cannot be meaningfully
// unit-tested — SELECT ... FOR UPDATE is the thing under test, so it needs a
// real Postgres. That behaviour is covered by
// scripts/verify-order-locking.ts, which runs two simultaneous orders for the
// last unit and asserts exactly one wins. Re-run it after touching
// createOrder().

describe("mergeLines", () => {
  it("collapses repeat lines for the same product", () => {
    // Adding the same part to the cart twice must decrement stock by 2, not
    // create two lines that each check availability against the full count.
    expect(mergeLines([
      { productId: "a", quantity: 1 },
      { productId: "a", quantity: 2 },
      { productId: "b", quantity: 1 },
    ])).toEqual([
      { productId: "a", quantity: 3 },
      { productId: "b", quantity: 1 },
    ]);
  });

  it("drops lines that could not decrement stock sensibly", () => {
    expect(mergeLines([
      { productId: "", quantity: 1 },
      { productId: "a", quantity: 0 },
      { productId: "b", quantity: -3 },
      { productId: "c", quantity: 1.5 },
    ])).toEqual([]);
  });

  it("returns an empty list for empty input", () => {
    expect(mergeLines([])).toEqual([]);
  });
});

describe("orderNumberLabel", () => {
  it("renders the reference staff quote on the phone", () => {
    expect(orderNumberLabel(1000)).toBe("ADS-1000");
  });
});

describe("status labels", () => {
  it("labels every order status the schema allows", () => {
    for (const status of ["NEW", "READY", "DELIVERED", "PICKED_UP", "CANCELLED"]) {
      expect(ORDER_STATUS_LABEL[status], `missing label for ${status}`).toBeTruthy();
    }
  });

  it("never shows a raw underscored enum value", () => {
    expect(ORDER_STATUS_LABEL.PICKED_UP).toBe("Picked up");
    expect(PAYMENT_STATUS_LABEL.DEPOSIT_PAID).toBe("Deposit paid");
  });

  it("labels every payment status", () => {
    for (const status of ["UNPAID", "DEPOSIT_PAID", "PAID", "REFUNDED"]) {
      expect(PAYMENT_STATUS_LABEL[status], `missing label for ${status}`).toBeTruthy();
    }
  });
});
