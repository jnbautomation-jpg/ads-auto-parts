"use server";

// Checkout server actions.
//
// Two things happen here, and the order matters:
//
//   1. The order is created and stock is decremented, under a row lock, by
//      createOrder(). That decrement IS the reservation — it is what stops
//      two people paying for the same door. The order starts UNPAID.
//   2. A Stripe PaymentIntent is created for the order's own total, computed
//      server-side from the database.
//
// The browser never sends a price, a total, or a product name. It sends
// product ids and quantities, and everything else is re-derived here. A cart
// is localStorage — see src/lib/cart.ts — so it is attacker-controlled by
// definition.
//
// Payment is NOT confirmed here. The client confirms the intent with Stripe
// directly, and src/app/api/stripe/webhook/route.ts is what marks the order
// paid. That split is the spec's, and it is what makes "customer paid and
// closed the tab" a case that still works.

import { prisma } from "@/lib/prisma";
import { normalizeCart, type CartLine } from "@/lib/cart";
import { validateCheckoutInput, formatDeliveryAddress } from "@/lib/checkout";
import { createOrder, orderNumberLabel, restockOrder } from "@/lib/orders";
import { priceForViewer, productSelectFor } from "@/lib/pricing";
import { getCustomerContext, getOrganizationId, getViewerTier } from "@/lib/customer-auth";
import { formatFit, formatPartTypeIn, formatPositionIn } from "@/lib/format";
import { getPartTypeImage } from "@/lib/part-images";
import { CURRENCY, isStripeConfigured, stripeClient, toStripeAmount } from "@/lib/stripe";
import { getDictionary } from "@/lib/dictionaries";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

/**
 * One cart line, resolved against the database for display.
 *
 * Deliberately carries no stock count. Public pages never show an exact
 * quantity (CHANGELOG decision 8) — `reduced` says a line was trimmed to what
 * is on the shelf without saying how many that is.
 */
export type ResolvedLine = {
  productId: string;
  sku: string;
  title: string;
  fit: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** The part is gone, or unpublished. The line cannot be bought. */
  soldOut: boolean;
  /** The line was trimmed because stock dropped since it went in the cart. */
  reduced: boolean;
};

export type ResolvedCart = {
  lines: ResolvedLine[];
  subtotal: number;
  /** True when at least one line changed on the way through. */
  changed: boolean;
};

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Turn the browser's cart into something priceable and renderable.
 *
 * Called on every render of the cart and checkout pages rather than cached:
 * a part can sell, drop in price or be unpublished while the cart sits open,
 * and the customer should see that before they pay rather than after.
 */
export async function resolveCart(
  rawLines: CartLine[],
  rawLocale: string = DEFAULT_LOCALE,
): Promise<ResolvedCart> {
  // Part names and positions are rendered here rather than in the component,
  // so they have to be translated here too — otherwise the Spanish cart lists
  // "Door — Left Rear" under fully translated headings.
  const locale = resolveLocale(rawLocale);
  const lines = normalizeCart(rawLines);
  if (lines.length === 0) return { lines: [], subtotal: 0, changed: false };

  const organizationId = await getOrganizationId();
  if (!organizationId) return { lines: [], subtotal: 0, changed: false };

  // productSelectFor() decides what the QUERY fetches, by tier. A retail
  // viewer's request never loads the wholesale column at all, so it cannot
  // reach the browser through this action's return value.
  const tier = await getViewerTier();
  const products = await prisma.product.findMany({
    where: {
      id: { in: lines.map((l) => l.productId) },
      organizationId,
      isPublic: true,
    },
    select: productSelectFor(tier),
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  let changed = false;
  const resolved: ResolvedLine[] = lines.map((line) => {
    const product = byId.get(line.productId);

    if (!product) {
      changed = true;
      return {
        productId: line.productId,
        sku: "",
        title: "",
        fit: "",
        image: null,
        quantity: line.quantity,
        unitPrice: 0,
        lineTotal: 0,
        soldOut: true,
        reduced: false,
      };
    }

    const quantity = Math.min(line.quantity, product.quantity);
    const reduced = quantity > 0 && quantity < line.quantity;
    const soldOut = quantity <= 0;
    if (reduced || soldOut) changed = true;

    const unitPrice = Number(priceForViewer(product, tier));
    const position = product.position ? ` — ${formatPositionIn(product.position, locale)}` : "";

    return {
      productId: product.id,
      sku: product.sku,
      title: `${formatPartTypeIn(product.partType, locale)}${position}`,
      fit: formatFit(product.make, product.model, product.yearStart, product.yearEnd),
      image: product.photos[0] ?? getPartTypeImage(product.partType),
      quantity,
      unitPrice,
      lineTotal: money(unitPrice * quantity),
      soldOut,
      reduced,
    };
  });

  return {
    lines: resolved,
    subtotal: money(resolved.reduce((sum, l) => sum + l.lineTotal, 0)),
    changed,
  };
}

export type PlaceOrderInput = {
  lines: CartLine[];
  name: string;
  phone: string;
  email: string;
  fulfillment: string;
  deliveryAddress: string;
  deliveryZip: string;
  notes: string;
  locale: string;
};

export type PlaceOrderResult =
  | { ok: true; clientSecret: string; paymentIntentId: string; orderNumber: string; total: number }
  | { ok: false; error: string; field?: string; cartChanged?: boolean };

/**
 * Create the order, reserve the stock, and open a payment for it.
 *
 * If anything after createOrder() fails, the order is cancelled and its stock
 * put back before returning. An order nobody can pay for that is still
 * holding the last door off the shelf is worse than a failed checkout.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const locale = resolveLocale(input.locale);
  const dict = getDictionary(locale);

  if (!isStripeConfigured()) {
    return { ok: false, error: dict.checkout.errors.unavailable };
  }

  const validation = validateCheckoutInput(
    {
      name: input.name,
      phone: input.phone,
      email: input.email,
      fulfillment: input.fulfillment,
      deliveryAddress: input.deliveryAddress,
      deliveryZip: input.deliveryZip,
      notes: input.notes,
    },
    locale,
  );
  if (!validation.ok) return { ok: false, error: validation.error, field: validation.field };
  const details = validation.value;

  const lines = normalizeCart(input.lines);
  if (lines.length === 0) return { ok: false, error: dict.checkout.errors.cartEmpty };

  const organizationId = await getOrganizationId();
  if (!organizationId) return { ok: false, error: dict.errors.generic };

  const tier = await getViewerTier();
  const customer = await getCustomerContext();

  const created = await createOrder({
    organizationId,
    customerAccountId: customer?.account.id ?? null,
    customerName: details.name,
    customerEmail: details.email,
    customerPhone: details.phone,
    fulfillment: details.fulfillment,
    deliveryAddress: formatDeliveryAddress(details),
    notes: details.notes || null,
    lines,
    tier,
    // Self-serve checkout: there is no staff member behind this movement, so
    // the stock log records the order rather than a person.
    actorUserId: null,
  });

  if (!created.ok) {
    // createOrder's own message already distinguishes "sold out" from a
    // transient failure, but it is English-only — the customer gets the
    // translated version and the cart is told to re-read itself.
    return {
      ok: false,
      error: created.outOfStock?.length ? dict.checkout.errors.soldOut : dict.errors.generic,
      cartChanged: Boolean(created.outOfStock?.length),
    };
  }

  const stripe = stripeClient();
  if (!stripe) {
    await releaseOrder(created.orderId, organizationId);
    return { ok: false, error: dict.checkout.errors.unavailable };
  }

  try {
    const intent = await stripe.paymentIntents.create({
      // Computed from the order the database just wrote, never from anything
      // the browser sent.
      amount: toStripeAmount(created.total),
      currency: CURRENCY,
      // Card, Apple Pay and Google Pay, as the spec asks. Letting Stripe
      // decide which to offer is what makes the wallet buttons appear only on
      // devices that actually support them.
      automatic_payment_methods: { enabled: true },
      receipt_email: details.email,
      // The webhook matches on this. Order id is the one that matters; the
      // rest is for reading a payment in the Stripe dashboard without having
      // to cross-reference the admin.
      metadata: {
        orderId: created.orderId,
        orderNumber: orderNumberLabel(created.orderNumber),
        organizationId,
        // The order table has no locale column and this did not warrant a
        // migration. The webhook reads it back to answer the customer's
        // confirmation email in the language they checked out in.
        locale,
      },
      description: `${orderNumberLabel(created.orderNumber)} — ADS Auto Door Store`,
    });

    if (!intent.client_secret) throw new Error("PaymentIntent has no client secret");

    await prisma.order.update({
      where: { id: created.orderId },
      data: { stripePaymentIntentId: intent.id },
    });

    return {
      ok: true,
      clientSecret: intent.client_secret,
      // The confirmation page keys on this rather than on the order number.
      // Order numbers come off a sequence — ADS-1041, ADS-1042 — so a page
      // that looked one up from a query string would let anyone read the next
      // customer's order by adding one. A PaymentIntent id is unguessable.
      paymentIntentId: intent.id,
      orderNumber: orderNumberLabel(created.orderNumber),
      total: created.total,
    };
  } catch (cause) {
    // Stripe refused, or the update failed. Put the stock back — the customer
    // has not paid and nothing should stay reserved for an order that can
    // never be completed.
    console.error(`Checkout failed after order ${created.orderId} was created:`, cause);
    await releaseOrder(created.orderId, organizationId);
    return { ok: false, error: dict.checkout.errors.paymentFailed };
  }
}

/** Cancel an unpaid order and return its stock to the shelf. */
async function releaseOrder(orderId: string, organizationId: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await restockOrder(tx, orderId, organizationId, null);
      await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    });
  } catch (cause) {
    // Logged rather than thrown: the caller is already returning an error to
    // the customer, and a failed rollback must not replace a useful message
    // with a crash. This leaves stock reserved against a cancelled order,
    // which staff can correct from /stock.
    console.error(`Could not release stock for order ${orderId}:`, cause);
  }
}
