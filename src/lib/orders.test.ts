import { describe, expect, it } from "vitest";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  mergeLines,
  orderNumberLabel,
  restockOrder,
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

describe("restockOrder", () => {
  // A fake client over one product row. findFirst stands in for the moment
  // between restockOrder's lookup and its write, and a checkout sells a unit
  // right then. A read-then-write restock (the previous code) wrote back
  // `quantity it read + n` and wiped that sale out; an increment cannot.
  function fakeClient(start: number) {
    const row = { id: "p1", organizationId: "org", quantity: start };
    const updates: unknown[] = [];
    const movements: { quantityChange: number; resultingQuantity: number }[] = [];
    const client = {
      orderItem: { findMany: async () => [{ productId: "p1", quantity: 2 }] },
      product: {
        findFirst: async ({ where }: { where: { id: string; organizationId: string } }) => {
          if (where.id !== row.id || where.organizationId !== row.organizationId) return null;
          row.quantity -= 1; // a concurrent checkout sells one
          return { id: row.id };
        },
        update: async (args: { data: { quantity: { increment: number } | number } }) => {
          updates.push(args.data);
          const q = args.data.quantity;
          row.quantity = typeof q === "number" ? q : row.quantity + q.increment;
          return { quantity: row.quantity };
        },
      },
      stockMovement: {
        create: async ({ data }: { data: { quantityChange: number; resultingQuantity: number } }) => {
          movements.push(data);
        },
      },
    };
    return { client: client as unknown as Parameters<typeof restockOrder>[0], row, updates, movements };
  }

  it("increments stock rather than writing back a value it read", async () => {
    const { client, row, updates, movements } = fakeClient(5);
    await restockOrder(client, "order1", "org", null);

    expect(updates).toEqual([{ quantity: { increment: 2 } }]);
    // 5 on the shelf, 1 sold mid-restock, 2 returned: 6. Read-then-write gave 7.
    expect(row.quantity).toBe(6);
    expect(movements).toEqual([expect.objectContaining({ quantityChange: 2, resultingQuantity: 6 })]);
  });

  it("skips a product from another organisation", async () => {
    const { client, row, updates } = fakeClient(5);
    await restockOrder(client, "order1", "some-other-org", null);
    expect(updates).toEqual([]);
    expect(row.quantity).toBe(5);
  });
});
