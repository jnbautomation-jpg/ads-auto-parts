"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { canRecordStock } from "@/lib/permissions";

export type CountState = { error?: string };

/**
 * Records a physical shelf count.
 *
 * Always writes a StockMovement, EVEN WHEN THE NUMBER IS UNCHANGED. That is
 * the point of the feature: "someone stood in front of this part and counted
 * it" has to be an auditable event, otherwise a verified-correct count is
 * indistinguishable from one nobody ever checked.
 *
 * Wrapped in a transaction with a row lock for the same reason createOrder is
 * — a count landing at the same moment as a sale must not overwrite it with a
 * stale number.
 */
export async function recordStockCount(
  _prev: CountState,
  formData: FormData,
): Promise<CountState> {
  const { organization, user } = await requireAuthContext();
  if (!canRecordStock(user.role)) return { error: "You don't have permission to record stock." };

  const productId = String(formData.get("productId") || "");
  const counted = Number(formData.get("counted"));
  if (!productId) return { error: "Missing product." };
  if (!Number.isInteger(counted) || counted < 0) {
    return { error: "Enter the number on the shelf (0 or more)." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string; quantity: number }[]>`
        SELECT id, quantity FROM products
        WHERE id = ${productId} AND "organizationId" = ${organization.id}
        FOR UPDATE
      `;
      const product = locked[0];
      if (!product) throw new Error("Product not found.");

      const delta = counted - product.quantity;

      await tx.product.update({
        where: { id: productId },
        data: { quantity: counted, lastCountedAt: new Date() },
      });

      await tx.stockMovement.create({
        data: {
          organizationId: organization.id,
          productId,
          type: "ADJUSTMENT",
          quantityChange: delta,
          resultingQuantity: counted,
          userId: user.id,
          note:
            delta === 0
              ? "Shelf count — matched"
              : `Shelf count — corrected by ${delta > 0 ? "+" : ""}${delta}`,
        },
      });
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't record that count." };
  }

  revalidatePath("/stock");
  revalidatePath("/products");
  return {};
}
