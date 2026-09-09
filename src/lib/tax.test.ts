import { describe, expect, it } from "vitest";
import { RETAIL_SALES_TAX_RATE, calculateTax, formatTaxRate, taxRateFor } from "./tax";

describe("taxRateFor", () => {
  it("charges the retail rate on a retail-priced order", () => {
    expect(taxRateFor("RETAIL")).toBe(RETAIL_SALES_TAX_RATE);
  });

  // Matthew's rule: 0% for wholesale accounts. Resale certificates are on
  // file, which is what makes this defensible.
  it("charges nothing on a wholesale-priced order", () => {
    expect(taxRateFor("WHOLESALE")).toBe(0);
  });
});

describe("calculateTax", () => {
   // Orange County's combined rate, confirmed off a shop receipt 9 Sep 2026.
  it("is 6.5%", () => {
    expect(RETAIL_SALES_TAX_RATE).toBe(0.065);
  });

  it("taxes a plain price to the cent", () => {
    expect(calculateTax(469, 0.07)).toBe(32.83);
    expect(calculateTax(310, 0.07)).toBe(21.7);
    expect(calculateTax(100, 0.07)).toBe(7);
  });

  // 469 * 0.07 in floating point is 32.830000000000005. The integer-cents
  // path is what keeps that from leaking into a Decimal column and then
  // failing an equality check against the same figure computed elsewhere.
  it("is exact where floating point is not", () => {
    expect(calculateTax(469, 0.07)).toBe(32.83);
    expect(calculateTax(1234.55, 0.07)).toBe(86.42);
    expect(calculateTax(0.29, 0.07)).toBe(0.02);
  });

  it("rounds half-up, the way a receipt does", () => {
    // 12.35 * 7% = 0.8645 → 0.86; 12.5 * 7% = 0.875 → 0.88
    expect(calculateTax(12.35, 0.07)).toBe(0.86);
    expect(calculateTax(12.5, 0.07)).toBe(0.88);
  });

  it("is zero at a zero rate, whatever the subtotal", () => {
    expect(calculateTax(469, 0)).toBe(0);
    expect(calculateTax(99999, 0)).toBe(0);
  });

  it("is zero on an empty or nonsensical subtotal rather than throwing", () => {
    // This runs inside createOrder's transaction. An exception here would
    // roll back a stock reservation the customer is about to pay for.
    expect(calculateTax(0, 0.07)).toBe(0);
    expect(calculateTax(-10, 0.07)).toBe(0);
    expect(calculateTax(Number.NaN, 0.07)).toBe(0);
    expect(calculateTax(469, Number.NaN)).toBe(0);
  });

  it("adds up: subtotal plus tax is the total a customer sees", () => {
    const subtotal = 1275;
    const tax = calculateTax(subtotal, 0.07);
    expect(tax).toBe(89.25);
    expect(Math.round((subtotal + tax) * 100) / 100).toBe(1364.25);
  });
});

describe("formatTaxRate", () => {
  it("prints a whole-number rate without decimals", () => {
    expect(formatTaxRate(0.07)).toBe("7%");
    expect(formatTaxRate(0.06)).toBe("6%");
  });

  it("prints a fractional rate without trailing zeros", () => {
    expect(formatTaxRate(0.065)).toBe("6.5%");
    expect(formatTaxRate(0.0725)).toBe("7.25%");
  });

  it("prints zero as zero", () => {
    expect(formatTaxRate(0)).toBe("0%");
  });
});
