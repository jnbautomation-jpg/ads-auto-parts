// The volume discount — pure, so the rule is unit-tested without a database.
//
// Matthew's rule, via JJ on 9 Sep 2026:
//
//   $100 off when a logged-in customer's pre-tax subtotal is $500 or more.
//
//   * Requires a customer account. A guest gets nothing, even at $500+ —
//     the discount exists to give people a reason to register.
//   * Retail pricing throughout. The customer still pays retailPrice per
//     part; this is money off the subtotal, not a change of tier.
//   * Tax is charged on what they actually pay. The discount comes off the
//     subtotal BEFORE calculateTax runs, so a $600 order is $500 taxed, not
//     $600 taxed and then reduced — otherwise they pay tax on money they
//     did not spend.
//   * Wholesale is unchanged. A trade account already gets the same $100
//     per unit off through RETAIL_MARKUP_USD, with no tax on a resale
//     certificate; stacking this on top would be $200 off. Retail-only is
//     JJ's call pending Matthew's, and it is the conservative reading —
//     isWholesaleEligible below is the one line to flip if Matthew says
//     otherwise.
//
// JJ pushed back on the first version of this, which was "spend $500 and
// unlock wholesale". That would have granted 0% tax to anyone without a
// resale certificate on file, and the shop eats that tax. It is a flat
// volume discount instead, and tax still applies.

import type { CustomerTier } from "@/generated/prisma/enums";

/** Money off the subtotal, in dollars. Matches RETAIL_MARKUP_USD by design, not by reference. */
export const VOLUME_DISCOUNT_USD = 100;

/** Pre-tax subtotal at which the discount applies — inclusive. "$500 or more." */
export const VOLUME_DISCOUNT_MINIMUM_USD = 500;

/**
 * Whether a wholesale-priced order also gets the volume discount.
 *
 * The open question from JJ's note. False until Matthew decides otherwise:
 * a trade account already saves $100 per unit and pays no tax, and stacking
 * this would double it. If that changes, this is the only line to edit.
 */
const WHOLESALE_ALSO_ELIGIBLE = false;

/** True when the SUBTOTAL alone would qualify — tier and account aside. Used for the sign-in nudge. */
export function qualifiesForVolumeDiscount(subtotal: number): boolean {
  return Number.isFinite(subtotal) && subtotal >= VOLUME_DISCOUNT_MINIMUM_USD;
}

/**
 * The discount an order gets, in dollars.
 *
 * Takes the ORDER's priced tier (the same snapshot tax uses), whether the
 * buyer has an account, and the pre-tax subtotal. Returns 0 or the flat
 * amount — never more than the subtotal, which cannot happen at a $500
 * minimum but is guarded anyway so a future change to the numbers cannot
 * produce a negative order.
 */
export function volumeDiscountFor(input: {
  pricedAsTier: CustomerTier;
  hasAccount: boolean;
  subtotal: number;
}): number {
  if (!input.hasAccount) return 0;
  if (input.pricedAsTier === "WHOLESALE" && !WHOLESALE_ALSO_ELIGIBLE) return 0;
  if (!qualifiesForVolumeDiscount(input.subtotal)) return 0;
  return Math.min(VOLUME_DISCOUNT_USD, input.subtotal);
}
