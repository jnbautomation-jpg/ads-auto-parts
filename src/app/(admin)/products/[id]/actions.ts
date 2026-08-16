"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { canRecordStock } from "@/lib/permissions";

export type StockMovementState = { error?: string };

export async function recordStockMovement(
  _prevState: StockMovementState,
  formData: FormData,
): Promise<StockMovementState> {
  const { organization, user } = await requireAuthContext();
  // Every role can record stock today, so this never rejects — but the check
  // belongs here anyway: the action is the real boundary, and without it a
  // future tightening of canRecordStock would only hide the button while the
  // action kept accepting requests.
  if (!canRecordStock(user.role)) return { error: "You don't have permission to record stock." };

  const productId = String(formData.get("productId") || "");
  const direction = String(formData.get("direction") || "");
  const amount = Number(formData.get("amount"));
  const note = String(formData.get("note") || "").trim() || null;

  if (direction !== "IN" && direction !== "OUT") return { error: "Invalid movement type." };
  if (!Number.isInteger(amount) || amount <= 0) return { error: "Enter a quantity greater than zero." };

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, organizationId: organization.id },
      });
      if (!product) throw new Error("Product not found.");

      const delta = direction === "OUT" ? -amount : amount;
      const resultingQuantity = product.quantity + delta;
      if (resultingQuantity < 0) throw new Error("Not enough stock for that movement.");

      await tx.product.update({ where: { id: productId }, data: { quantity: resultingQuantity } });
      await tx.stockMovement.create({
        data: {
          organizationId: organization.id,
          productId,
          type: direction,
          quantityChange: delta,
          resultingQuantity,
          userId: user.id,
          note,
        },
      });
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }

  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
  revalidatePath("/dashboard");

  return {};
}
