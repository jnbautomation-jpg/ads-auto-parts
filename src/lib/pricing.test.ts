import { describe, expect, it } from "vitest";
import {
  PUBLIC_PRODUCT_SELECT,
  RETAIL_MARKUP_USD,
  defaultRetailPrice,
  retailMarginPercent,
} from "./pricing";

describe("defaultRetailPrice", () => {
  it("adds the standard markup to the wholesale price", () => {
    expect(defaultRetailPrice(199)).toBe(199 + RETAIL_MARKUP_USD);
    expect(defaultRetailPrice(539)).toBe(539 + RETAIL_MARKUP_USD);
  });

  it("rounds to cents rather than leaving floating-point dust", () => {
    expect(defaultRetailPrice(0.1 + 0.2)).toBe(round(0.30000000000000004 + RETAIL_MARKUP_USD));
  });

  it("returns 0 for invalid or negative input instead of NaN", () => {
    // A NaN here would be written straight into a Decimal column.
    expect(defaultRetailPrice(Number.NaN)).toBe(0);
    expect(defaultRetailPrice(-5)).toBe(0);
  });
});

describe("retailMarginPercent", () => {
  it("shows how uneven a flat markup is across price points", () => {
    // This is the number worth taking back to Matthew: the same $100 is a
    // very different margin depending on the part.
    expect(retailMarginPercent(199, 299)).toBeCloseTo(50.25, 1);
    expect(retailMarginPercent(539, 639)).toBeCloseTo(18.55, 1);
  });

  it("returns null when wholesale is zero or invalid", () => {
    expect(retailMarginPercent(0, 100)).toBeNull();
    expect(retailMarginPercent(Number.NaN, 100)).toBeNull();
  });
});

describe("PUBLIC_PRODUCT_SELECT", () => {
  // The whole point of the two-tier split: a customer must never receive the
  // wholesale price, the cost, the bin, or the supplier. Selecting them is
  // the only way they could reach the browser, so this asserts on the select
  // itself rather than on rendered markup.
  it("never selects a staff-only field", () => {
    for (const field of ["price", "cost", "binLocation", "supplierId", "isPublic"]) {
      expect(field in PUBLIC_PRODUCT_SELECT, `${field} must not be publicly selected`).toBe(false);
    }
  });

  it("selects the retail price", () => {
    expect(PUBLIC_PRODUCT_SELECT.retailPrice).toBe(true);
  });

  it("selects what the catalog actually renders", () => {
    for (const field of ["id", "make", "model", "partType", "photos", "quantity", "reorderPoint"]) {
      expect(field in PUBLIC_PRODUCT_SELECT, `${field} should be selected`).toBe(true);
    }
  });
});

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
