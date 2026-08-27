// Checkout input validation — pure, so it is unit-tested without a database,
// a Stripe key or a browser.
//
// The checkout form is unauthenticated and reachable by anyone, exactly like
// the quote form, so everything here treats its input as hostile. The pattern
// deliberately mirrors validateQuoteInput() in src/lib/inquiry.ts: same
// locale-aware error strings, same "reject rather than truncate" rule.
//
// What this does NOT do is price anything. Prices are read from the database
// under a row lock in createOrder(), at the tier the server resolved for the
// request. Nothing the browser sends influences what is charged.

import { getDictionary } from "@/lib/dictionaries";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { isValidEmail, normalizePhone } from "@/lib/inquiry";
import { isValidZip, normalizeZip, zoneForZip } from "@/lib/delivery";

export type Fulfillment = "PICKUP" | "DELIVERY";

export function isFulfillment(value: string): value is Fulfillment {
  return value === "PICKUP" || value === "DELIVERY";
}

/**
 * Upper bounds on what gets stored. Generous for a real customer, tight
 * enough that the form cannot be used to write unbounded text into the
 * orders table.
 */
export const CHECKOUT_LIMITS = {
  name: 120,
  phone: 40,
  email: 200,
  deliveryAddress: 300,
  notes: 1000,
} as const;

const MIN_PHONE_DIGITS = 7;

export type CheckoutInput = {
  name: string;
  phone: string;
  email: string;
  fulfillment: Fulfillment;
  deliveryAddress: string;
  deliveryZip: string;
  notes: string;
};

export type CheckoutValidation =
  | { ok: true; value: CheckoutInput }
  | { ok: false; error: string; field?: keyof CheckoutInput };

export function validateCheckoutInput(
  raw: Partial<Record<keyof CheckoutInput, string>>,
  locale: Locale = DEFAULT_LOCALE,
): CheckoutValidation {
  const dict = getDictionary(locale);

  const fulfillmentRaw = (raw.fulfillment ?? "").trim();
  const value: CheckoutInput = {
    name: (raw.name ?? "").trim(),
    phone: (raw.phone ?? "").trim(),
    email: (raw.email ?? "").trim(),
    // An unrecognised value becomes pickup rather than an error: pickup is the
    // option that cannot go wrong — nothing is shipped to a wrong address.
    fulfillment: isFulfillment(fulfillmentRaw) ? fulfillmentRaw : "PICKUP",
    deliveryAddress: (raw.deliveryAddress ?? "").trim(),
    deliveryZip: normalizeZip(raw.deliveryZip ?? ""),
    notes: (raw.notes ?? "").trim(),
  };

  if (!value.name) return { ok: false, error: dict.checkout.errors.nameRequired, field: "name" };
  if (!value.phone) return { ok: false, error: dict.checkout.errors.phoneRequired, field: "phone" };

  for (const [field, limit] of Object.entries(CHECKOUT_LIMITS) as [
    keyof typeof CHECKOUT_LIMITS,
    number,
  ][]) {
    if (value[field].length > limit) {
      return {
        ok: false,
        error: `${dict.errors.tooLongBefore}${dict.checkout.fields[field]}${dict.errors.tooLongAfter}`,
        field,
      };
    }
  }

  if (normalizePhone(value.phone).length < MIN_PHONE_DIGITS) {
    return { ok: false, error: dict.errors.phoneInvalid, field: "phone" };
  }

  // Email is REQUIRED here, unlike on the quote form. Someone who has just
  // paid needs a receipt and an order number, and the only channel we have
  // for that is the address they typed.
  if (!value.email) return { ok: false, error: dict.checkout.errors.emailRequired, field: "email" };
  if (!isValidEmail(value.email)) {
    return { ok: false, error: dict.errors.emailInvalid, field: "email" };
  }

  if (value.fulfillment === "DELIVERY") {
    if (!value.deliveryAddress) {
      return {
        ok: false,
        error: dict.checkout.errors.addressRequired,
        field: "deliveryAddress",
      };
    }
    if (!isValidZip(value.deliveryZip)) {
      return { ok: false, error: dict.checkout.errors.zipInvalid, field: "deliveryZip" };
    }
    // A ZIP outside the delivery zones is refused rather than quietly
    // accepted at $0 shipping. src/lib/delivery.ts already declines to guess
    // an out-of-city fee — it says "call for a quote" — because the fee is
    // still one of Matthew's outstanding decisions. Taking payment for a
    // delivery whose cost nobody has set would be that guess, made silently
    // and with the shop's money.
    if (zoneForZip(value.deliveryZip) === "OUTSIDE") {
      return { ok: false, error: dict.checkout.errors.zipOutside, field: "deliveryZip" };
    }
  }

  return { ok: true, value };
}

/**
 * The single address string stored on the order.
 *
 * Order.deliveryAddress is one column, and the warehouse reads it off a
 * screen — so the ZIP is folded into the address rather than kept apart,
 * where it could be dropped by anything that renders only the address.
 */
export function formatDeliveryAddress(input: CheckoutInput): string | null {
  if (input.fulfillment !== "DELIVERY") return null;
  return `${input.deliveryAddress}, ${input.deliveryZip}`;
}
