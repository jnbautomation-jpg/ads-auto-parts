// Stripe webhook — the source of truth for whether an order was paid.
//
// The spec is explicit that this, and not the client callback, decides
// payment. Two reasons it has to be this way:
//
//   * The browser is not trusted. Anyone can POST "I paid" to our own server;
//     only Stripe can sign a request with the webhook secret.
//   * The browser is not reliable. A customer who pays and immediately closes
//     the tab never runs the callback — and they have still been charged.
//     Without this route their order would sit UNPAID forever.
//
// Everything here is idempotent. Stripe retries a webhook until it gets a 2xx,
// and it can deliver the same event more than once even after success, so
// every handler below has to survive being run twice.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { restockOrder } from "@/lib/orders";
import { stripeClient } from "@/lib/stripe";
import { sendOrderConfirmation } from "@/lib/order-email";

/**
 * Signature verification needs the body EXACTLY as Stripe sent it — the
 * signature covers the raw bytes, so anything that re-serialises the JSON
 * (including request.json()) invalidates it.
 */
export async function POST(request: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripe || !secret) {
    // Deliberately 503 and not 400: this is our misconfiguration, not a bad
    // request, and a 5xx makes Stripe retry rather than discard the event.
    // Once the secret is set, the queued retries deliver the missed payments.
    console.error("Stripe webhook received but STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET is unset");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "unsigned" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch (cause) {
    // A bad signature is either a misconfigured secret or someone forging
    // payment confirmations. 400 so Stripe stops retrying a request that can
    // never verify.
    console.error("Stripe webhook signature verification failed:", cause);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await markPaid(event.data.object);
        break;

      case "payment_intent.payment_failed":
      case "payment_intent.canceled":
        await releaseOrder(event.data.object);
        break;

      default:
        // Everything else is acknowledged and ignored. Returning an error for
        // an event we don't handle would make Stripe retry it forever.
        break;
    }
  } catch (cause) {
    // 500 so Stripe retries. Losing a payment confirmation is much worse than
    // handling one twice, and every handler here is safe to repeat.
    console.error(`Stripe webhook ${event.type} (${event.id}) failed:`, cause);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Mark the order paid.
 *
 * Matched on stripePaymentIntentId, which is UNIQUE on the model — so a
 * replayed event updates the same row rather than creating a second order.
 * Stock was already decremented when the order was created; payment does not
 * touch it.
 */
async function markPaid(intent: Stripe.PaymentIntent): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { stripePaymentIntentId: intent.id },
    select: { id: true, paymentStatus: true, status: true },
  });

  if (!order) {
    // A payment with no order behind it. Worth shouting about — the money is
    // real and somebody has to reconcile it by hand — but not worth a retry,
    // because the order is not going to appear on the next attempt.
    console.error(`Stripe payment ${intent.id} has no matching order`);
    return;
  }

  // Already handled. A repeat delivery stops here rather than re-sending the
  // customer a second confirmation email.
  if (order.paymentStatus === "PAID") return;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      // A cancelled order that then pays goes back to NEW: the money arrived,
      // so the shop has to act on it either way.
      status: order.status === "CANCELLED" ? "NEW" : order.status,
    },
  });

  await sendOrderConfirmation(order.id, intent.metadata?.locale);
}

/**
 * A payment that failed or was abandoned. Cancel the order and put the stock
 * back, so the part is buyable again.
 *
 * This is the half of the reservation model that keeps it honest: stock is
 * held from the moment an order is created, and released the moment the
 * payment behind it dies.
 */
async function releaseOrder(intent: Stripe.PaymentIntent): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { stripePaymentIntentId: intent.id },
    select: { id: true, organizationId: true, paymentStatus: true, status: true },
  });

  if (!order) return;

  // Never unwind a paid order on a late failure event. Stripe can deliver a
  // failed attempt after a successful retry on the same intent, and restocking
  // a part the shop has already been paid for would oversell it.
  if (order.paymentStatus === "PAID" || order.status === "CANCELLED") return;

  await prisma.$transaction(async (tx) => {
    await restockOrder(tx, order.id, order.organizationId, null);
    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
  });
}
