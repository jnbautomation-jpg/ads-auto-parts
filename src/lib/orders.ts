// Order creation and the stock decrement that goes with it.
//
// Phase 2A spec step 8, verbatim:
//   "Stock decrements the moment a part is marked sold or paid."
//   "Wrap in a transaction and lock the row to prevent double-selling."
//   "Reject checkout if quantity hits zero mid-transaction."
//   "Log every stock change with user and timestamp for audit."
//
// All four are handled in createOrder() below. The locking is the part worth
// reading carefully: without it, two customers buying the last door both read
// quantity = 1, both pass the check, and both orders succeed — the shop sells
// a part it does not have and finds out when one of them arrives to collect it.

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ViewerTier } from "@/lib/pricing";
import { canSeeWholesale } from "@/lib/pricing";

export type OrderLineInput = { productId: string; quantity: number };

export type CreateOrderInput = {
  organizationId: string;
  customerAccountId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  fulfillment: "PICKUP" | "DELIVERY";
  deliveryAddress?: string | null;
  notes?: string | null;
  lines: OrderLineInput[];
  /** Decides which price column the order is billed at. */
  tier: ViewerTier;
  /** Staff user id when a staff member takes a phone order; null for self-serve. */
  actorUserId?: string | null;
};

export type CreateOrderResult =
  | { ok: true; orderId: string; orderNumber: number; total: number }
  | { ok: false; error: string; outOfStock?: { sku: string; available: number }[] };

/** Money is held as Decimal in the database; round to cents in JS. */
function money(n: number): number {
  return Math.round(n * 100) / 100;
}

export function orderNumberLabel(orderNumber: number): string {
  return `ADS-${orderNumber}`;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  READY: "Ready",
  DELIVERED: "Delivered",
  PICKED_UP: "Picked up",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "Unpaid",
  DEPOSIT_PAID: "Deposit paid",
  PAID: "Paid",
  REFUNDED: "Refunded",
};

/** Collapse duplicate lines for the same product into one. */
export function mergeLines(lines: OrderLineInput[]): OrderLineInput[] {
  const totals = new Map<string, number>();
  for (const line of lines) {
    if (!line.productId || !Number.isInteger(line.quantity) || line.quantity <= 0) continue;
    totals.set(line.productId, (totals.get(line.productId) ?? 0) + line.quantity);
  }
  return [...totals.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

type LockedRow = { id: string; sku: string; quantity: number; price: string; retailPrice: string; partType: string; make: string; model: string; yearStart: number; yearEnd: number };

/**
 * Creates an order and decrements stock atomically.
 *
 * Everything below happens inside one transaction. If any line is short, the
 * whole thing rolls back — a partially-filled order that silently drops a
 * line is worse than a clear failure the customer can act on.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const lines = mergeLines(input.lines);
  if (lines.length === 0) return { ok: false, error: "Your order is empty." };

  const wholesale = canSeeWholesale(input.tier);

  try {
    return await prisma.$transaction(async (tx) => {
      // SELECT ... FOR UPDATE takes a row-level write lock. A second
      // transaction touching the same product blocks here until this one
      // commits, then re-reads the DECREMENTED quantity — which is what makes
      // the check below trustworthy.
      //
      // ORDER BY id is not cosmetic: two orders containing the same two parts
      // in opposite order would deadlock without a consistent lock ordering.
      //
      // Raw SQL because Prisma has no typed API for row locking.
      const ids = lines.map((l) => l.productId);
      const locked = await tx.$queryRaw<LockedRow[]>`
        SELECT id, sku, quantity, price::text AS price, "retailPrice"::text AS "retailPrice",
               "partType"::text AS "partType", make, model, "yearStart", "yearEnd"
        FROM products
        WHERE id = ANY(${ids}::text[])
          AND "organizationId" = ${input.organizationId}
          AND "isPublic" = true
        ORDER BY id
        FOR UPDATE
      `;

      const byId = new Map(locked.map((row) => [row.id, row]));

      // A line whose product vanished, was unpublished, or belongs to another
      // org never reaches the stock check.
      const missing = lines.filter((l) => !byId.has(l.productId));
      if (missing.length > 0) {
        return { ok: false as const, error: "One of those parts is no longer available." };
      }

      const short: { sku: string; available: number }[] = [];
      for (const line of lines) {
        const row = byId.get(line.productId)!;
        if (row.quantity < line.quantity) short.push({ sku: row.sku, available: row.quantity });
      }
      if (short.length > 0) {
        return {
          ok: false as const,
          error:
            short.length === 1 && short[0].available === 0
              ? "That part just sold out."
              : "We don't have enough of one of those parts any more.",
          outOfStock: short,
        };
      }

      // Order number from the sequence — atomic, so simultaneous checkouts
      // never collide on it.
      const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval('order_number_seq') AS nextval
      `;
      const orderNumber = Number(nextval);

      const items = lines.map((line) => {
        const row = byId.get(line.productId)!;
        const unitPrice = Number(wholesale ? row.price : row.retailPrice);
        return {
          productId: row.id,
          sku: row.sku,
          description: `${row.yearStart}-${row.yearEnd} ${row.make} ${row.model} ${row.partType}`,
          unitPrice,
          quantity: line.quantity,
          lineTotal: money(unitPrice * line.quantity),
        };
      });
      const subtotal = money(items.reduce((sum, i) => sum + i.lineTotal, 0));

      const order = await tx.order.create({
        data: {
          organizationId: input.organizationId,
          orderNumber,
          customerAccountId: input.customerAccountId ?? null,
          customerName: input.customerName,
          customerEmail: input.customerEmail || null,
          customerPhone: input.customerPhone,
          fulfillment: input.fulfillment,
          deliveryAddress: input.fulfillment === "DELIVERY" ? input.deliveryAddress || null : null,
          notes: input.notes || null,
          pricedAsTier: wholesale ? "WHOLESALE" : "RETAIL",
          subtotal,
          total: subtotal,
          items: { create: items },
        },
        select: { id: true, orderNumber: true },
      });

      // Decrement and log. Every movement gets a StockMovement row naming the
      // order, which is the audit trail the spec asks for — and the reason a
      // staff member can later explain where a part went.
      for (const line of lines) {
        const row = byId.get(line.productId)!;
        const resulting = row.quantity - line.quantity;

        await tx.product.update({
          where: { id: row.id },
          data: { quantity: resulting },
        });
        await tx.stockMovement.create({
          data: {
            organizationId: input.organizationId,
            productId: row.id,
            type: "OUT",
            quantityChange: -line.quantity,
            resultingQuantity: resulting,
            userId: input.actorUserId ?? null,
            note: `Order ${orderNumberLabel(orderNumber)}`,
          },
        });
      }

      return {
        ok: true as const,
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: subtotal,
      };
    });
  } catch {
    // A deadlock or serialisation failure rolls back cleanly; nothing was
    // sold, so the customer can simply try again.
    return { ok: false, error: "We couldn't complete that order — please try again." };
  }
}

/** Restores stock for a cancelled order. Also transactional and logged. */
export async function restockOrder(
  client: PrismaClient | Prisma.TransactionClient,
  orderId: string,
  organizationId: string,
  actorUserId: string | null,
): Promise<void> {
  const items = await client.orderItem.findMany({
    where: { orderId, productId: { not: null } },
    select: { productId: true, quantity: true },
  });

  for (const item of items) {
    if (!item.productId) continue;
    const product = await client.product.findFirst({
      where: { id: item.productId, organizationId },
      select: { id: true, quantity: true },
    });
    if (!product) continue;

    const resulting = product.quantity + item.quantity;
    await client.product.update({ where: { id: product.id }, data: { quantity: resulting } });
    await client.stockMovement.create({
      data: {
        organizationId,
        productId: product.id,
        type: "IN",
        quantityChange: item.quantity,
        resultingQuantity: resulting,
        userId: actorUserId,
        note: `Cancelled order restock`,
      },
    });
  }
}
