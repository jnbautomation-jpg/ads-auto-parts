import { describe, expect, it } from "vitest";
import { fromStripeAmount, toStripeAmount } from "./stripe";

// Money conversion is the part of this integration where a bug charges a real
// customer the wrong amount, so it is tested harder than its size suggests.
describe("toStripeAmount", () => {
  it("converts a plain price string from the database", () => {
    expect(toStripeAmount("469.00")).toBe(46900);
    expect(toStripeAmount("339.99")).toBe(33999);
    expect(toStripeAmount("0.01")).toBe(1);
  });

  it("handles whole dollars written without decimals", () => {
    expect(toStripeAmount("469")).toBe(46900);
    expect(toStripeAmount("0")).toBe(0);
  });

  it("handles a single decimal place", () => {
    expect(toStripeAmount("469.5")).toBe(46950);
  });

  // The reason this function parses the string instead of multiplying a
  // float: Math.round(1234.55 * 100) is 123455 here but the naive
  // (1234.55 * 100) is 123454.99999999999, and truncation gets it wrong.
  it("is exact on the values where floating point is not", () => {
    expect(toStripeAmount("1234.55")).toBe(123455);
    expect(toStripeAmount("0.29")).toBe(29);
    expect(toStripeAmount("8.20")).toBe(820);
  });

  it("accepts trailing zeros past the cent, which are not real precision", () => {
    // Postgres can hand back "469.000" from a Decimal column. That is the same
    // money as "469.00" and must not be rejected.
    expect(toStripeAmount("469.000")).toBe(46900);
    expect(toStripeAmount("1.500")).toBe(150);
  });

  it("accepts a number, since order totals are also handled as numbers", () => {
    expect(toStripeAmount(469)).toBe(46900);
    expect(toStripeAmount(1234.55)).toBe(123455);
  });

  // Failing the checkout is recoverable. Charging the wrong amount is not.
  it("throws rather than guessing at something that is not money", () => {
    expect(() => toStripeAmount("")).toThrow();
    expect(() => toStripeAmount("abc")).toThrow();
    expect(() => toStripeAmount("12.34.56")).toThrow();
    expect(() => toStripeAmount("$469")).toThrow();
    expect(() => toStripeAmount("1,234.55")).toThrow();
    expect(() => toStripeAmount(Number.NaN)).toThrow();
  });

  it("throws on sub-cent precision instead of silently rounding it away", () => {
    expect(() => toStripeAmount("10.005")).toThrow();
    expect(() => toStripeAmount("0.001")).toThrow();
  });

  it("throws rather than overflowing", () => {
    expect(() => toStripeAmount("99999999999999999999")).toThrow();
  });
});

describe("fromStripeAmount", () => {
  it("converts cents back to dollars", () => {
    expect(fromStripeAmount(46900)).toBe(469);
    expect(fromStripeAmount(33999)).toBe(339.99);
    expect(fromStripeAmount(1)).toBe(0.01);
  });

  it("round-trips every amount it is given", () => {
    for (const price of ["469.00", "0.01", "1234.55", "8.20", "0", "99.99"]) {
      expect(fromStripeAmount(toStripeAmount(price))).toBe(Number(price));
    }
  });
});
