"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { generateSkuBase } from "@/lib/sku";
import { canBulkDelete, canEditCatalog } from "@/lib/permissions";
import { defaultRetailPrice } from "@/lib/pricing";
import { Prisma } from "@/generated/prisma/client";
import type { PartType, PartPosition, PartCondition } from "@/generated/prisma/enums";

export type ProductFormState = { error?: string };

export async function saveProduct(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const { organization, user } = await requireAuthContext();
  if (!canEditCatalog(user.role)) return { error: "You don't have permission to edit products." };

  const id = String(formData.get("id") || "");
  const partType = String(formData.get("partType")) as PartType;
  const positionRaw = String(formData.get("position") || "");
  const position = positionRaw ? (positionRaw as PartPosition) : null;
  const make = String(formData.get("make") || "").trim();
  const model = String(formData.get("model") || "").trim();
  const yearStart = Number(formData.get("yearStart"));
  const yearEnd = Number(formData.get("yearEnd"));
  const color = String(formData.get("color") || "").trim() || null;
  const paintCode = String(formData.get("paintCode") || "").trim() || null;
  const binLocation = String(formData.get("binLocation") || "").trim().toUpperCase() || null;
  const condition = String(formData.get("condition")) as PartCondition;
  const conditionNotes = String(formData.get("conditionNotes") || "").trim() || null;
  const quantity = Number(formData.get("quantity"));
  const reorderPoint = Number(formData.get("reorderPoint"));
  const cost = Number(formData.get("cost"));
  // `price` is the WHOLESALE price. `retailPrice` is what the public sees —
  // if the form leaves it blank, fall back to the standard markup rather
  // than storing a zero the catalog would then advertise.
  const price = Number(formData.get("price"));
  const retailRaw = String(formData.get("retailPrice") || "").trim();
  const retailPrice = retailRaw === "" ? defaultRetailPrice(price) : Number(retailRaw);
  const capaCertified = formData.get("capaCertified") === "on";
  const isPublic = formData.get("isPublic") === "on";
  const supplierId = String(formData.get("supplierId") || "") || null;

  let photos: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("photos") || "[]"));
    if (Array.isArray(parsed)) photos = parsed.filter((p) => typeof p === "string");
  } catch {
    photos = [];
  }

  if (!make || !model) return { error: "Make and model are required." };
  if (!Number.isInteger(yearStart) || !Number.isInteger(yearEnd) || yearStart < 1900 || yearEnd < yearStart) {
    return { error: "Enter a valid year range (year end must be on or after year start)." };
  }
  if (!Number.isInteger(quantity) || quantity < 0) return { error: "Quantity must be zero or greater." };
  if (!Number.isInteger(reorderPoint) || reorderPoint < 0) {
    return { error: "Reorder point must be zero or greater." };
  }
  if (!Number.isFinite(cost) || cost < 0) return { error: "Cost must be a non-negative number." };
  if (!Number.isFinite(price) || price < 0) {
    return { error: "Wholesale price must be a non-negative number." };
  }
  if (!Number.isFinite(retailPrice) || retailPrice < 0) {
    return { error: "Retail price must be a non-negative number." };
  }

  if (supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, organizationId: organization.id },
    });
    if (!supplier) return { error: "Selected supplier was not found." };
  }

  let sku = String(formData.get("sku") || "").trim();
  if (!sku) sku = generateSkuBase({ model, yearStart, yearEnd, partType, position });
  if (!sku) return { error: "Couldn't auto-generate a code — fill in make, model, years, and part type." };

  // quantity is intentionally excluded here: on create it's the starting
  // stock level, but on update it must never come from this form — the
  // quantity input is disabled while editing, and disabled inputs aren't
  // submitted, so trusting a "quantity" field here would zero it out.
  // Quantity changes only happen through recordStockMovement's transaction.
  const data = {
    organizationId: organization.id,
    sku,
    partType,
    make,
    model,
    yearStart,
    yearEnd,
    position,
    color,
    paintCode,
    binLocation,
    condition,
    conditionNotes,
    capaCertified,
    reorderPoint,
    cost,
    price,
    retailPrice,
    photos,
    isPublic,
    supplierId,
  };

  try {
    if (id) {
      const existing = await prisma.product.findFirst({ where: { id, organizationId: organization.id } });
      if (!existing) return { error: "Product not found." };

      await prisma.$transaction(async (tx) => {
        await tx.product.update({ where: { id }, data });

        // Keep the fit this form represents in sync in VehicleFit too —
        // match by the product's *prior* fit fields so a multi-vehicle
        // product's other fits (added via import) are left untouched. If
        // nothing matches, add a fit rather than guessing which row to
        // overwrite.
        const matchingFit = await tx.vehicleFit.findFirst({
          where: {
            productId: id,
            organizationId: organization.id,
            make: existing.make,
            model: existing.model,
            yearStart: existing.yearStart,
            yearEnd: existing.yearEnd,
            position: existing.position,
          },
        });
        if (matchingFit) {
          await tx.vehicleFit.update({
            where: { id: matchingFit.id },
            data: { make, model, yearStart, yearEnd, position },
          });
        } else {
          await tx.vehicleFit.create({
            data: { organizationId: organization.id, productId: id, make, model, yearStart, yearEnd, position },
          });
        }
      });
    } else {
      await prisma.product.create({
        data: {
          ...data,
          quantity,
          vehicleFits: { create: { organizationId: organization.id, make, model, yearStart, yearEnd, position } },
        },
      });
    }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: `Code "${sku}" is already in use in this org — edit it and save again.` };
    }
    throw err;
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/products/${id}`);

  redirect(id ? `/products/${id}` : "/products");
}

export async function toggleProductVisibility(formData: FormData) {
  const { organization, user } = await requireAuthContext();
  if (!canEditCatalog(user.role)) return;
  const id = String(formData.get("id"));
  const nextValue = formData.get("next") === "true";

  // updateMany (not update) so the organizationId filter is enforced at the
  // query level — a tampered id from another org simply matches zero rows.
  await prisma.product.updateMany({
    where: { id, organizationId: organization.id },
    data: { isPublic: nextValue },
  });

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
}

export type BulkDeleteResult = { deleted: number } | { error: string };

// Called directly from the client (not a <form> action) so the row-selection
// UI can show a pending state and surface an error inline.
export async function bulkDeleteProducts(ids: string[]): Promise<BulkDeleteResult> {
  const { organization, user } = await requireAuthContext();
  if (!canBulkDelete(user.role)) return { error: "Only the owner can bulk-delete products." };

  const requestedIds = Array.from(new Set((ids ?? []).filter((id): id is string => typeof id === "string" && id.length > 0)));
  if (requestedIds.length === 0) return { error: "No products selected." };

  const deleted = await prisma.$transaction(async (tx) => {
    // Re-scope to this org inside the transaction — a tampered id from
    // another org just won't be among the rows actually deleted.
    const owned = await tx.product.findMany({
      where: { id: { in: requestedIds }, organizationId: organization.id },
      select: { id: true },
    });
    const ownedIds = owned.map((p) => p.id);
    if (ownedIds.length === 0) return 0;

    // FK order: stock movements first, inquiries detached (not deleted —
    // they're customer leads, kept on record without the product link),
    // then the products themselves.
    await tx.stockMovement.deleteMany({ where: { productId: { in: ownedIds }, organizationId: organization.id } });
    await tx.inquiry.updateMany({
      where: { productId: { in: ownedIds }, organizationId: organization.id },
      data: { productId: null },
    });
    const result = await tx.product.deleteMany({ where: { id: { in: ownedIds }, organizationId: organization.id } });
    return result.count;
  });

  revalidatePath("/products");
  revalidatePath("/dashboard");

  return { deleted };
}
