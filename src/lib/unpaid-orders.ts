// Releases the stock held by checkouts nobody finished.
//
// A self-serve order takes its parts off the shelf the moment the customer
// clicks Pay (src/lib/orders.ts), and only a cancelled payment puts them back
// (src/app/api/stripe/webhook/route.ts). Stripe never cancels an unfinished
// PaymentIntent on its own, so without this an abandoned checkout would hold
// its parts forever.
//
// This only cancels payments in Stripe. The payment_intent.canceled webhook
// does the actual release, exactly as it does for any other cancellation, so
// there is still a single code path that restocks an order.

import { prisma } from "@/lib/prisma";
import { stripeClient } from "@/lib/stripe";
import { describeError } from "@/lib/log-error";

/**
 * How long an unpaid self-serve order holds its stock before it is released.
 *
 * PLACEHOLDER: the hold length is Matthew's decision (CHANGELOG, "hold
 * expiry") and has not been confirmed. 30 minutes is well past a normal
 * checkout, including a 3-D Secure step.
 */
export const UNPAID_HOLD_MINUTES = 30;

/** Payments cancelled per sweep, so one sweep stays short. */
const SWEEP_BATCH = 10;

/**
 * Cancel the Stripe payments behind this organisation's unpaid orders older
 * than the hold. Scoped by organisation, as cancelPendingPayment is.
 *
 * Only orders still NEW and carrying a PaymentIntent are touched: staff phone
 * orders and account reorders have no PaymentIntent, and an order staff have
 * already moved on is theirs to handle. Stripe refuses to cancel a payment
 * that has succeeded or is processing, so a real sale is never unwound.
 *
 * Oldest first: these have held their stock longest, and a batch that took
 * the newest would keep skipping the backlog and never reach them. A payment
 * Stripe will not cancel cannot stall the sweep either way — each cancel is
 * caught individually. Never throws.
 */
export async function releaseStaleUnpaidOrders(
  organizationId: string,
  now: Date = new Date(),
): Promise<void> {
  const stripe = stripeClient();
  if (!stripe) return;

  try {
    const cutoff = new Date(now.getTime() - UNPAID_HOLD_MINUTES * 60_000);
    const stale = await prisma.order.findMany({
      where: {
        organizationId,
        paymentStatus: "UNPAID",
        status: "NEW",
        stripePaymentIntentId: { not: null },
        createdAt: { lt: cutoff },
      },
      select: { id: true, stripePaymentIntentId: true },
      orderBy: { createdAt: "asc" },
      take: SWEEP_BATCH,
    });

    for (const order of stale) {
      if (!order.stripePaymentIntentId) continue;
      try {
        await stripe.paymentIntents.cancel(order.stripePaymentIntentId);
      } catch (cause) {
        console.warn(
          `releaseStaleUnpaidOrders: could not cancel ${order.stripePaymentIntentId} ` +
            `(order ${order.id}): ${describeError(cause)}`,
        );
      }
    }
  } catch (cause) {
    console.error(`releaseStaleUnpaidOrders failed: ${describeError(cause)}`);
  }
}
