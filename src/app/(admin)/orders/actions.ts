"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { canEditCatalog } from "@/lib/permissions";
import { restockOrder } from "@/lib/orders";

export type OrderActionState = { error?: string };

const STATUSES = new Set(["NEW", "READY", "DELIVERED", "PICKED_UP", "CANCELLED"]);
const PAYMENTS = new Set(["UNPAID", "DEPOSIT_PAID", "PAID", "REFUNDED"]);

export async function updateOrderStatus(formData: FormData) {
  const { organization, user } = await requireAuthContext();

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id || !STATUSES.has(status)) return;

  const order = await prisma.order.findFirst({
    where: { id, organizationId: organization.id },
    select: { id: true, status: true },
  });
  if (!order) return;

  // Cancelling puts the parts back on the shelf, in the SAME transaction as
  // the status change — a failure between the two would lose stock silently.
  if (status === "CANCELLED" && order.status !== "CANCELLED") {
    await prisma.$transaction(async (tx) => {
      await restockOrder(tx, order.id, organization.id, user.id);
      await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    });
  } else {
    await prisma.order.updateMany({
      where: { id, organizationId: organization.id },
      data: { status: status as never },
    });
  }

  revalidatePath("/orders");
}

export async function updatePaymentStatus(formData: FormData) {
  const { organization, user } = await requireAuthContext();
  // Recording money received is a catalog-level responsibility, not general
  // warehouse work.
  if (!canEditCatalog(user.role)) return;

  const id = String(formData.get("id") || "");
  const paymentStatus = String(formData.get("paymentStatus") || "");
  if (!id || !PAYMENTS.has(paymentStatus)) return;

  await prisma.order.updateMany({
    where: { id, organizationId: organization.id },
    data: { paymentStatus: paymentStatus as never },
  });

  revalidatePath("/orders");
}
