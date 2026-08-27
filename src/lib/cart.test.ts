import { describe, expect, it } from "vitest";
import {
  MAX_CART_LINES,
  MAX_LINE_QUANTITY,
  addToCart,
  cartCount,
  normalizeCart,
  parseCart,
  removeFromCart,
  serializeCart,
  setLineQuantity,
} from "./cart";

describe("addToCart", () => {
  it("adds a new part", () => {
    expect(addToCart([], "p1")).toEqual([{ productId: "p1", quantity: 1 }]);
  });

  it("increments an existing line rather than adding a second one", () => {
    const cart = addToCart(addToCart([], "p1"), "p1", 2);
    expect(cart).toEqual([{ productId: "p1", quantity: 3 }]);
  });

  it("keeps distinct parts separate", () => {
    const cart = addToCart(addToCart([], "p1"), "p2");
    expect(cart).toHaveLength(2);
  });

  it("clamps a line to the maximum instead of rejecting the add", () => {
    const cart = addToCart([], "p1", MAX_LINE_QUANTITY + 50);
    expect(cart[0].quantity).toBe(MAX_LINE_QUANTITY);
  });
});

describe("setLineQuantity", () => {
  it("sets an exact quantity", () => {
    expect(setLineQuantity([{ productId: "p1", quantity: 1 }], "p1", 4)).toEqual([
      { productId: "p1", quantity: 4 },
    ]);
  });

  it("removes the line when set to zero", () => {
    expect(setLineQuantity([{ productId: "p1", quantity: 3 }], "p1", 0)).toEqual([]);
  });

  it("removes the line on a negative quantity rather than storing one", () => {
    expect(setLineQuantity([{ productId: "p1", quantity: 3 }], "p1", -2)).toEqual([]);
  });

  it("leaves other lines alone", () => {
    const cart = [
      { productId: "p1", quantity: 1 },
      { productId: "p2", quantity: 2 },
    ];
    expect(setLineQuantity(cart, "p1", 5)).toEqual([
      { productId: "p1", quantity: 5 },
      { productId: "p2", quantity: 2 },
    ]);
  });
});

describe("removeFromCart", () => {
  it("drops the named line and keeps the rest", () => {
    const cart = [
      { productId: "p1", quantity: 1 },
      { productId: "p2", quantity: 2 },
    ];
    expect(removeFromCart(cart, "p1")).toEqual([{ productId: "p2", quantity: 2 }]);
  });

  it("is a no-op for a part that isn't in the cart", () => {
    const cart = [{ productId: "p1", quantity: 1 }];
    expect(removeFromCart(cart, "nope")).toEqual(cart);
  });
});

describe("cartCount", () => {
  it("counts parts, not lines — the header badge says how many parts", () => {
    expect(
      cartCount([
        { productId: "p1", quantity: 2 },
        { productId: "p2", quantity: 3 },
      ]),
    ).toBe(5);
  });

  it("is zero for an empty cart", () => {
    expect(cartCount([])).toBe(0);
  });
});

// The cart is localStorage, so its contents are attacker-controlled by
// definition: anyone can open a console and write whatever they like into it.
// None of the cases below may throw, because the header renders the cart on
// every page — an exception here would take down the whole site for that
// visitor, and they could not clear it without knowing to clear site data.
describe("parseCart — hostile input", () => {
  it("returns an empty cart for missing storage", () => {
    expect(parseCart(null)).toEqual([]);
    expect(parseCart("")).toEqual([]);
  });

  it("returns an empty cart for invalid JSON", () => {
    expect(parseCart("{oh no")).toEqual([]);
  });

  it("returns an empty cart for JSON that isn't an array", () => {
    expect(parseCart('{"productId":"p1"}')).toEqual([]);
    expect(parseCart('"a string"')).toEqual([]);
    expect(parseCart("null")).toEqual([]);
  });

  it("drops malformed lines but keeps the good ones", () => {
    const raw = JSON.stringify([
      { productId: "p1", quantity: 2 },
      { productId: "", quantity: 1 },
      { productId: "p2" },
      { quantity: 3 },
      { productId: "p3", quantity: "5" },
      { productId: "p4", quantity: 1.5 },
      { productId: "p5", quantity: -1 },
      null,
      "nope",
      { productId: "p6", quantity: 1 },
    ]);
    expect(parseCart(raw)).toEqual([
      { productId: "p1", quantity: 2 },
      { productId: "p6", quantity: 1 },
    ]);
  });

  it("clamps an absurd quantity written in by hand", () => {
    const raw = JSON.stringify([{ productId: "p1", quantity: 999999 }]);
    expect(parseCart(raw)[0].quantity).toBe(MAX_LINE_QUANTITY);
  });

  it("caps the number of lines", () => {
    const raw = JSON.stringify(
      Array.from({ length: MAX_CART_LINES + 20 }, (_, i) => ({ productId: `p${i}`, quantity: 1 })),
    );
    expect(parseCart(raw)).toHaveLength(MAX_CART_LINES);
  });

  it("drops an absurdly long product id rather than sending it to the database", () => {
    const raw = JSON.stringify([{ productId: "x".repeat(500), quantity: 1 }]);
    expect(parseCart(raw)).toEqual([]);
  });

  // The cart carries identity and count only. A price written in by hand must
  // not survive, because nothing downstream should ever read one from here.
  it("keeps only the product id and quantity, discarding anything else", () => {
    const raw = JSON.stringify([{ productId: "p1", quantity: 1, unitPrice: 0.01, name: "free" }]);
    expect(parseCart(raw)).toEqual([{ productId: "p1", quantity: 1 }]);
  });
});

describe("serializeCart", () => {
  it("round-trips a cart through storage", () => {
    const cart = [
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 1 },
    ];
    expect(parseCart(serializeCart(cart))).toEqual(cart);
  });

  it("normalizes on the way out as well as the way in", () => {
    const messy = [
      { productId: "p1", quantity: 1 },
      { productId: "p1", quantity: 2 },
    ];
    expect(JSON.parse(serializeCart(messy))).toEqual([{ productId: "p1", quantity: 3 }]);
  });
});

describe("normalizeCart", () => {
  it("merges duplicates of the same part", () => {
    expect(
      normalizeCart([
        { productId: "p1", quantity: 1 },
        { productId: "p2", quantity: 1 },
        { productId: "p1", quantity: 4 },
      ]),
    ).toEqual([
      { productId: "p1", quantity: 5 },
      { productId: "p2", quantity: 1 },
    ]);
  });

  it("trims whitespace around an id so it cannot split a line in two", () => {
    expect(
      normalizeCart([
        { productId: "p1", quantity: 1 },
        { productId: " p1 ", quantity: 1 },
      ]),
    ).toEqual([{ productId: "p1", quantity: 2 }]);
  });
});
