"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";

const STATUSES = new Set(["ACTIVE", "NOTIFIED", "CANCELLED"]);

export async function updateAlertStatus(formData: FormData) {
  const { organization } = await requireAuthContext();

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  const note = String(formData.get("note") || "").trim().slice(0, 500) || undefined;
  if (!id || !STATUSES.has(status)) return;

  await prisma.partAlert.updateMany({
    where: { id, organizationId: organization.id },
    data: {
      status: status as never,
      notifiedAt: status === "NOTIFIED" ? new Date() : null,
      ...(note ? { staffNote: note } : {}),
    },
  });

  revalidatePath("/alerts");
}
