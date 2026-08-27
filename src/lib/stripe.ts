// Stripe — the one place the app talks to the payment provider.
//
// Chosen off the Vercel Marketplace (`payments` category) and named
// explicitly in the Phase 2 spec, which also fixes the shape of the
// integration: card / Apple Pay / Google Pay, and **the webhook is the source
// of truth for payment, not the client callback.**
//
// That last point drives the whole design. The browser telling us "it worked"
// is a claim from an untrusted party, and it also never arrives when someone
// pays and closes the tab. src/app/api/stripe/webhook/route.ts is what
// actually marks an order paid; the success page only reads what the webhook
// already decided.
//
// Two keys, and they are not interchangeable:
//
//   STRIPE_SECRET_KEY               server only. Never send it to the browser.
//   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  safe in the page source by design.
//
// A third, STRIPE_WEBHOOK_SECRET, signs the webhook — see the route.

import Stripe from "stripe";

export const CURRENCY = "usd";

/** Whether payments can run at all. False in CI and in any checkout without keys. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && publishableKey());
}

export function publishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
}

/**
 * Server-side Stripe client.
 *
 * Built per call rather than at module scope: the constructor needs the key
 * eagerly, and reading it at import time would make every page that touches
 * this module fail to build without one. Returns null when unconfigured so
 * callers degrade instead of throwing — the site has to keep working with
 * payments switched off, exactly as it does today.
 */
export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

/**
 * Dollars to integer cents, which is the only unit Stripe accepts.
 *
 * Done on the string, not with `Math.round(value * 100)`. Prices come out of
 * Postgres as Decimal and reach here as strings like "469.00"; multiplying a
 * parsed float by 100 is how a $1,234.55 order becomes 123454 cents. Money
 * that is off by a cent is a support call, and it is off in the customer's
 * favour or the shop's depending on the value, which is worse than a
 * consistent error.
 *
 * Throws on anything it cannot represent exactly. A payment for the wrong
 * amount must not be attempted — failing the checkout is recoverable, taking
 * the wrong sum is not.
 */
export function toStripeAmount(value: string | number): number {
  const text = typeof value === "number" ? value.toFixed(2) : value.trim();

  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new Error(`Not a money value: ${JSON.stringify(value)}`);
  }

  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace(/^-/, "").split(".");

  // More than two decimal places cannot be charged. Rounding silently is what
  // produces the off-by-a-cent case above, so this is an error instead.
  if (fraction.length > 2 && /[^0]/.test(fraction.slice(2))) {
    throw new Error(`Money value has sub-cent precision: ${text}`);
  }

  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
  if (!Number.isSafeInteger(cents)) throw new Error(`Money value out of range: ${text}`);

  return negative ? -cents : cents;
}

/** Integer cents back to dollars, for display and for comparing against an order total. */
export function fromStripeAmount(cents: number): number {
  return Math.round(cents) / 100;
}
