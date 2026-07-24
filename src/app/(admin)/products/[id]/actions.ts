"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";

export type StockMovementState = { error?: string };

export async function recordStockMovement(
  _prevState: StockMovementState,
  formData: FormData,
): Promise<StockMovementState> {
  const { organization, user } = await requireAuthContext();

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
