/**
 * Pull the PaymentIntent id out of the query string Stripe redirects back to.
 *
 * Shared by both language pages so they cannot disagree about what counts as
 * a valid id. Anything that is not a plausible PaymentIntent id becomes null
 * rather than being passed to the database — the value is a lookup key, and
 * this keeps a query string from deciding what gets queried.
 */
export function readPaymentIntent(
  params: Record<string, string | string[] | undefined>,
): string | null {
  const raw = params.payment_intent;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  return /^pi_[A-Za-z0-9]{8,64}$/.test(value) ? value : null;
}
