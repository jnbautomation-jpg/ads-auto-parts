import { describe, expect, it } from "vitest";
import {
  VOLUME_DISCOUNT_MINIMUM_USD,
  VOLUME_DISCOUNT_USD,
  qualifiesForVolumeDiscount,
  volumeDiscountFor,
} from "./discount";
import { calculateTax, RETAIL_SALES_TAX_RATE } from "./tax";

const RETAIL_ACCOUNT = { pricedAsTier: "RETAIL" as const, hasAccount: true };

describe("the numbers", () => {
  it("is $100 off at $500 or more", () => {
    expect(VOLUME_DISCOUNT_USD).toBe(100);
    expect(VOLUME_DISCOUNT_MINIMUM_USD).toBe(500);
  });
});

describe("volumeDiscountFor", () => {
  it("gives a logged-in retail customer $100 off at exactly $500 — the minimum is inclusive", () => {
    expect(volumeDiscountFor({ ...RETAIL_ACCOUNT, subtotal: 500 })).toBe(100);
  });

  it("gives nothing one cent below the minimum", () => {
    expect(volumeDiscountFor({ ...RETAIL_ACCOUNT, subtotal: 499.99 })).toBe(0);
  });

  it("gives a logged-in retail customer $100 off well above the minimum", () => {
    expect(volumeDiscountFor({ ...RETAIL_ACCOUNT, subtotal: 600 })).toBe(100);
    expect(volumeDiscountFor({ ...RETAIL_ACCOUNT, subtotal: 2400 })).toBe(100);
  });

  // The discount exists to give people a reason to register.
  it("gives a guest nothing, even at $500+", () => {
    expect(volumeDiscountFor({ pricedAsTier: "RETAIL", hasAccount: false, subtotal: 600 })).toBe(0);
  });

  // A trade account already saves $100 per unit and pays no tax; stacking
  // this would be $200 off. Retail-only until Matthew says otherwise.
  it("gives a wholesale-priced order nothing", () => {
    expect(volumeDiscountFor({ pricedAsTier: "WHOLESALE", hasAccount: true, subtotal: 600 })).toBe(0);
  });

  it("is flat — the same $100 whether the order is $500 or $5,000", () => {
    expect(volumeDiscountFor({ ...RETAIL_ACCOUNT, subtotal: 500 })).toBe(
      volumeDiscountFor({ ...RETAIL_ACCOUNT, subtotal: 5000 }),
    );
  });

  it("never exceeds the subtotal, so an order cannot go negative if the numbers change", () => {
    // Unreachable at a $500 minimum, guarded anyway.
    expect(volumeDiscountFor({ ...RETAIL_ACCOUNT, subtotal: 500 })).toBeLessThanOrEqual(500);
  });

  it("gives nothing on a nonsensical subtotal rather than throwing", () => {
    // This runs inside createOrder's transaction; an exception there rolls
    // back a stock reservation the customer is about to pay for.
    expect(volumeDiscountFor({ ...RETAIL_ACCOUNT, subtotal: Number.NaN })).toBe(0);
    expect(volumeDiscountFor({ ...RETAIL_ACCOUNT, subtotal: -600 })).toBe(0);
    expect(volumeDiscountFor({ ...RETAIL_ACCOUNT, subtotal: 0 })).toBe(0);
  });
});

describe("qualifiesForVolumeDiscount", () => {
  it("is about the amount only — used for the guest sign-in nudge", () => {
    expect(qualifiesForVolumeDiscount(500)).toBe(true);
    expect(qualifiesForVolumeDiscount(499.99)).toBe(false);
    expect(qualifiesForVolumeDiscount(Number.NaN)).toBe(false);
  });
});

// The rule that matters most, from JJ's note: the discount comes off the
// subtotal BEFORE tax, so a $600 order is $500 taxed — not $600 taxed and
// then reduced. Otherwise the customer pays tax on money they did not spend.
describe("discount before tax — JJ's worked example", () => {
  it("taxes $500, not $600, on a $600 logged-in retail order", () => {
    const subtotal = 600;
    const discount = volumeDiscountFor({ ...RETAIL_ACCOUNT, subtotal });
    const taxable = subtotal - discount;
    const tax = calculateTax(taxable, RETAIL_SALES_TAX_RATE);

    expect(taxable).toBe(500);
    expect(tax).toBe(32.5); // 6.5% of $500
    expect(Math.round((taxable + tax) * 100) / 100).toBe(532.5);

    // And explicitly NOT the wrong order of operations:
    const wrongTax = calculateTax(subtotal, RETAIL_SALES_TAX_RATE); // 39.00 on $600
    expect(tax).toBeLessThan(wrongTax);
  });
});
