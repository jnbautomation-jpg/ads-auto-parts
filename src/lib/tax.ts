// Sales tax — pure, so the rounding is unit-tested without a database.
//
// Matthew's rule, via JJ on 29 Aug 2026: retail is taxed, wholesale accounts
// are not. Resale certificates are on file for the wholesale accounts, which
// is what makes the 0% defensible — that is a records control the shop owns,
// not something this file can check.
//
// Deliberately NOT Stripe Tax. `automatic_tax` does not exist on
// PaymentIntents (checked in the SDK types; it lives on Checkout Sessions,
// Invoices and Subscriptions), the `tax.calculations` API is billed per
// transaction, and it returns $0 silently without a Florida registration.
// For one shop in one county, a rate in config is simpler, cheaper, and
// harder to get quietly wrong.
//
// Two simplifications the shop is accepting knowingly (CHANGELOG, Matthew
// section, 29 Aug):
//
//   * One rate. Florida is destination-based, so a delivery into another
//     county technically carries that county's rate. This charges the shop's
//     own county's rate everywhere.
//   * The rate is keyed off the ORDER's snapshotted pricedAsTier, never the
//     account's live tier. An account approved for wholesale after ordering
//     does not retroactively un-tax an old receipt, and one downgraded later
//     does not tax one.

import type { CustomerTier } from "@/generated/prisma/enums";

/**
 * The retail rate, as a fraction.
 *
 * Confirmed 9 Sep 2026 off a physical receipt from the shop: $189.00
 * subtotal, $12.29 tax — 6.5%, which is Orange County's combined rate
 * (6% state + 0.5% surtax). This is the one line to change if it moves.
 */
export const RETAIL_SALES_TAX_RATE = 0.065;

/**
 * The rate an order is taxed at, from the tier it was PRICED at.
 *
 * Takes the snapshotted tier rather than the live viewer tier on purpose —
 * see the header. A STAFF viewer placing an order is priced wholesale by
 * createOrder (`pricedAsTier: WHOLESALE`) and so lands at 0% here, which is
 * consistent with the price they were charged: a trade price is a trade
 * sale. Staff wanting to charge a walk-in retail plus tax should price it
 * retail.
 */
export function taxRateFor(pricedAsTier: CustomerTier): number {
  return pricedAsTier === "WHOLESALE" ? 0 : RETAIL_SALES_TAX_RATE;
}

/**
 * Tax on a subtotal, in dollars, rounded to the cent.
 *
 * Done in integer cents. `subtotal * rate` in floating point is how $469.00
 * at 6.5% becomes 30.485000000000003, and a Decimal column will happily store
 * that as 30.49 while a later `===` against the same figure computed a
 * different way fails. Rounding is half-up on a positive number, which is
 * what Math.round does, and is the convention a customer expects to see on a
 * receipt.
 *
 * Negative or non-finite input is treated as zero rather than thrown: this
 * runs inside createOrder's transaction, and an exception there rolls back a
 * stock reservation the customer is about to pay for.
 */
export function calculateTax(subtotal: number, rate: number): number {
  if (!Number.isFinite(subtotal) || !Number.isFinite(rate) || subtotal <= 0 || rate <= 0) {
    return 0;
  }
  const subtotalCents = Math.round(subtotal * 100);
  const taxCents = Math.round(subtotalCents * rate);
  return taxCents / 100;
}

/** Percentage label for a receipt or summary line, e.g. "6.5%". */
export function formatTaxRate(rate: number): string {
  const percent = rate * 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2).replace(/\.?0+$/, "")}%`;
}