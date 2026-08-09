"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { canEditCatalog } from "@/lib/permissions";

function field(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) || "").trim();
  return value || null;
}

export async function createSupplier(formData: FormData) {
  const { organization, user } = await requireAuthContext();
  if (!canEditCatalog(user.role)) return;
  const name = field(formData, "name");
  if (!name) return;

  await prisma.supplier.create({
    data: {
      organizationId: organization.id,
      name,
      contact: field(formData, "contact"),
      phone: field(formData, "phone"),
      email: field(formData, "email"),
      notes: field(formData, "notes"),
    },
  });

  revalidatePath("/suppliers");
}

export async function updateSupplier(formData: FormData) {
  const { organization, user } = await requireAuthContext();
  if (!canEditCatalog(user.role)) return;
  const id = String(formData.get("id") || "");
  const name = field(formData, "name");
  if (!id || !name) return;

  await prisma.supplier.updateMany({
    where: { id, organizationId: organization.id },
    data: {
      name,
      contact: field(formData, "contact"),
      phone: field(formData, "phone"),
      email: field(formData, "email"),
      notes: field(formData, "notes"),
    },
  });

  revalidatePath("/suppliers");
}

export async function deleteSupplier(formData: FormData) {
  const { organization, user } = await requireAuthContext();
  if (!canEditCatalog(user.role)) return;
  const id = String(formData.get("id") || "");
  if (!id) return;

  await prisma.supplier.deleteMany({ where: { id, organizationId: organization.id } });

  revalidatePath("/suppliers");
}
