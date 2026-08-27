// The two emails a paid order produces.
//
// Sent from the Stripe webhook, not from the checkout page, because the
// webhook is the only place that knows the money actually arrived. A
// confirmation sent when the customer clicks "Pay" would go out for payments
// that then fail.
//
// Same split as src/lib/lead-email.ts: pure builders here, tested without a
// provider, and one impure function that loads the order and sends.
//
// Language: the customer's confirmation follows the language they checked out
// in, carried through Stripe's PaymentIntent metadata (the order table has no
// locale column and this did not warrant a migration). The shop's copy stays
// English, the same call as the lead notification — staff screens are English.

import { prisma } from "@/lib/prisma";
import { escapeHtml, sendEmail, shopRecipients } from "@/lib/email";
import { formatMoneyIn } from "@/lib/format";
import { orderNumberLabel } from "@/lib/orders";
import { getDictionary } from "@/lib/dictionaries";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { ADDRESS, BUSINESS_NAME, PHONE_DISPLAY, SITE_URL } from "@/lib/site";

export type OrderEmailItem = {
  sku: string;
  description: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type OrderEmailData = {
  orderNumber: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  fulfillment: "PICKUP" | "DELIVERY";
  deliveryAddress: string | null;
  items: OrderEmailItem[];
  total: string;
};

/** Shared shell so the two emails below look like they came from the same shop. */
function wrap(inner: string): string {
  return [
    `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a">`,
    inner,
    `</div>`,
  ].join("");
}

/**
 * The line-items table, as text and as HTML.
 *
 * Money is formatted through formatMoneyIn() so the customer sees the same
 * rendering they saw at checkout, in their own language.
 */
function itemLines(items: OrderEmailItem[], locale: Locale): { text: string; html: string } {
  const text = items
    .map(
      (item) =>
        `  ${item.quantity} x ${item.description} (${item.sku})` +
        `  ${formatMoneyIn(item.lineTotal, locale)}`,
    )
    .join("\n");

  const html = items
    .map(
      (item) =>
        `<tr>` +
        `<td style="padding:8px 12px 8px 0;border-bottom:1px solid #D9DCE0">` +
        `${escapeHtml(item.description)}<br>` +
        `<span style="color:#666D75;font-size:13px">${escapeHtml(item.sku)} &middot; ` +
        `${item.quantity} &times; ${escapeHtml(formatMoneyIn(item.unitPrice, locale))}</span>` +
        `</td>` +
        `<td style="padding:8px 0;border-bottom:1px solid #D9DCE0;text-align:right;white-space:nowrap">` +
        `${escapeHtml(formatMoneyIn(item.lineTotal, locale))}` +
        `</td>` +
        `</tr>`,
    )
    .join("");

  return { text, html };
}

/** What the customer gets: proof of purchase and what happens next. */
export function buildCustomerEmail(
  order: OrderEmailData,
  locale: Locale,
): { subject: string; text: string; html: string } {
  const dict = getDictionary(locale);
  const label = orderNumberLabel(order.orderNumber);
  const items = itemLines(order.items, locale);
  const total = formatMoneyIn(order.total, locale);

  const collection =
    order.fulfillment === "DELIVERY"
      ? `${dict.checkout.delivery}: ${order.deliveryAddress ?? ""}`
      : `${dict.checkout.pickup}: ${ADDRESS}`;

  const text = [
    dict.checkout.successTitle,
    "",
    `${dict.checkout.orderNumberLabel}: ${label}`,
    "",
    dict.checkout.itemsHeading,
    items.text,
    "",
    `${dict.checkout.orderTotal}: ${total}`,
    "",
    collection,
    "",
    dict.checkout.keepNumber,
    `${BUSINESS_NAME} — ${PHONE_DISPLAY}`,
  ].join("\n");

  const html = wrap(
    [
      `<p style="margin:0 0 4px;font-size:19px"><strong>${escapeHtml(dict.checkout.successTitle)}</strong></p>`,
      `<p style="margin:0 0 20px;color:#545B63">${escapeHtml(dict.checkout.successBody)}</p>`,
      `<p style="margin:0 0 20px;font-size:17px">`,
      `<span style="color:#666D75">${escapeHtml(dict.checkout.orderNumberLabel)}</span> `,
      `<strong>${escapeHtml(label)}</strong>`,
      `</p>`,
      `<table style="width:100%;border-collapse:collapse;margin:0 0 8px">${items.html}`,
      `<tr><td style="padding:12px 12px 0 0"><strong>${escapeHtml(dict.checkout.orderTotal)}</strong></td>`,
      `<td style="padding:12px 0 0;text-align:right"><strong>${escapeHtml(total)}</strong></td></tr>`,
      `</table>`,
      `<p style="margin:20px 0 0">${escapeHtml(collection)}</p>`,
      `<p style="margin:16px 0 0;font-size:13px;color:#666D75">`,
      `${escapeHtml(dict.checkout.keepNumber)}<br>`,
      `${escapeHtml(BUSINESS_NAME)} &middot; <a href="tel:${escapeHtml(PHONE_DISPLAY.replace(/\D/g, ""))}" style="color:#E31E24">${escapeHtml(PHONE_DISPLAY)}</a>`,
      `</p>`,
    ].join(""),
  );

  return { subject: `${label} — ${dict.checkout.successTitle}`, text, html };
}

/** What the shop gets: enough to pull the parts without opening a screen. */
export function buildShopEmail(order: OrderEmailData): { subject: string; text: string; html: string } {
  const label = orderNumberLabel(order.orderNumber);
  const items = itemLines(order.items, DEFAULT_LOCALE);
  const total = formatMoneyIn(order.total, DEFAULT_LOCALE);

  const collection =
    order.fulfillment === "DELIVERY"
      ? `Deliver to: ${order.deliveryAddress ?? "— no address recorded —"}`
      : "Pickup at the warehouse";

  const rows: [string, string][] = [
    ["Customer", order.customerName],
    ["Phone", order.customerPhone],
    ["Email", order.customerEmail || "— not given —"],
    ["Fulfilment", collection],
  ];

  const text = [
    `Paid order ${label} — ${total}`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Parts:",
    items.text,
    "",
    `Order: ${SITE_URL}/orders`,
  ].join("\n");

  const html = wrap(
    [
      `<p style="margin:0 0 16px;font-size:18px"><strong>Paid order ${escapeHtml(label)} — ${escapeHtml(total)}</strong></p>`,
      ...rows.map(
        ([k, v]) =>
          `<p style="margin:0 0 6px"><strong style="display:inline-block;min-width:100px">${escapeHtml(k)}</strong>${escapeHtml(v)}</p>`,
      ),
      `<table style="width:100%;border-collapse:collapse;margin:16px 0 0">${items.html}</table>`,
      `<p style="margin:20px 0 0;font-size:13px;color:#666D75">`,
      `<a href="${escapeHtml(SITE_URL)}/orders" style="color:#E31E24">Open the order dashboard</a>`,
      `</p>`,
    ].join(""),
  );

  return { subject: `Paid order ${label} — ${total}`, text, html };
}

/**
 * Send both emails for a paid order.
 *
 * Never throws — it runs inside the Stripe webhook, and an email problem must
 * not make the webhook return 500 and have Stripe retry a payment that was
 * recorded correctly. The order is already marked paid by the time this runs.
 *
 * Idempotency keys are derived from the order id, so a webhook Stripe delivers
 * twice cannot send the customer two confirmations.
 */
export async function sendOrderConfirmation(orderId: string, rawLocale?: string | null): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        fulfillment: true,
        deliveryAddress: true,
        total: true,
        items: {
          select: { sku: true, description: true, quantity: true, unitPrice: true, lineTotal: true },
        },
      },
    });
    if (!order) {
      console.error(`Cannot send confirmation: order ${orderId} not found`);
      return;
    }

    const data: OrderEmailData = {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      fulfillment: order.fulfillment,
      deliveryAddress: order.deliveryAddress,
      total: order.total.toString(),
      items: order.items.map((item) => ({
        sku: item.sku,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        lineTotal: item.lineTotal.toString(),
      })),
    };

    const locale = rawLocale && isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

    if (order.customerEmail) {
      const customer = buildCustomerEmail(data, locale);
      const sent = await sendEmail({
        to: [order.customerEmail],
        ...customer,
        idempotencyKey: `order-customer-${orderId}`,
      });
      if (!sent.ok) {
        console.error(`Order ${orderId} confirmation to customer failed: ${sent.error}`);
      }
    }

    const shop = buildShopEmail(data);
    const notified = await sendEmail({
      to: shopRecipients(),
      ...shop,
      replyTo: order.customerEmail ?? undefined,
      idempotencyKey: `order-shop-${orderId}`,
    });
    if (!notified.ok) {
      console.error(`Order ${orderId} notification to the shop failed: ${notified.error}`);
    }
  } catch (cause) {
    console.error(`Order ${orderId} confirmation emails failed:`, cause);
  }
}
