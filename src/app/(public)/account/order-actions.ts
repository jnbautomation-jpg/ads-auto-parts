"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext, getViewerTier } from "@/lib/customer-auth";
import { canSeeWholesale } from "@/lib/pricing";
import { buildReorderPlan, type CurrentProduct } from "@/lib/reorder";
import { createOrder } from "@/lib/orders";

export type ReorderState = { error?: string };

/**
 * Loads a past order and compares it against today's shelf and prices.
 *
 * Prices are resolved at the CUSTOMER'S CURRENT TIER, not the tier the
 * original order was placed at. A shop approved for trade since their last
 * order should see trade prices now — and one whose trade access was revoked
 * must not keep the old rate.
 */
export async function loadReorderPlan(orderId: string) {
  const { account } = await requireCustomerContext();

  const order = await prisma.order.findFirst({
    // Scoped to this customer's own orders — another customer's id finds
    // nothing rather than leaking what they bought.
    where: { id: orderId, customerAccountId: account.id },
    include: { items: true },
  });
  if (!order) return null;

  const tier = await getViewerTier();
  const wholesale = canSeeWholesale(tier);

  const productIds = order.items.map((i) => i.productId).filter((id): id is string => Boolean(id));
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds }, organizationId: order.organizationId, isPublic: true },
        select: { id: true, quantity: true, price: true, retailPrice: true },
      })
    : [];

  const current = new Map<string, CurrentProduct>(
    products.map((p) => [
      p.id,
      {
        id: p.id,
        quantity: p.quantity,
        unitPrice: Number(wholesale ? p.price : p.retailPrice),
      },
    ]),
  );

  const plan = buildReorderPlan(
    order.items.map((i) => ({
      productId: i.productId,
      sku: i.sku,
      description: i.description,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
    })),
    current,
  );

  return { order, plan };
}

export async function confirmReorder(
  _prev: ReorderState,
  formData: FormData,
): Promise<ReorderState> {
  const { account } = await requireCustomerContext();
  const orderId = String(formData.get("orderId") || "");

  const loaded = await loadReorderPlan(orderId);
  if (!loaded) return { error: "We couldn't find that order." };

  // Re-derived here rather than trusted from the form: the review screen may
  // have been open for a while, and stock moves. createOrder() locks rows and
  // rejects anything short, so this is belt and braces rather than the only
  // guard.
  const { plan, order } = loaded;
  if (plan.empty) return { error: "None of those parts are available right now." };

  const tier = await getViewerTier();

  const result = await createOrder({
    organizationId: order.organizationId,
    customerAccountId: account.id,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    fulfillment: order.fulfillment,
    deliveryAddress: order.deliveryAddress,
    notes: `Reorder of ADS-${order.orderNumber}`,
    lines: plan.orderable,
    tier,
  });

  if (!result.ok) return { error: result.error };

  redirect(`/account/orders?placed=${result.orderNumber}`);
}
