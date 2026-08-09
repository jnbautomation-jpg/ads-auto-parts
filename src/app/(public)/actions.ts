"use server";

import { prisma } from "@/lib/prisma";
// Single-tenant public site: this org is the only one the landing page ever
// files leads against. Looked up by slug rather than passed from the client
// so nothing about the org is exposed to the browser.
import { ORG_SLUG } from "@/lib/site";

export type QuoteFormState = { success?: boolean; error?: string };

export async function submitQuoteRequest(
  _prevState: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const vehicle = String(formData.get("vehicle") || "").trim();
  const partNeeded = String(formData.get("partNeeded") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const requestedProductId = String(formData.get("productId") || "").trim() || null;

  if (!name || !phone) {
    return { error: "Name and phone are required." };
  }

  const organization = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!organization) {
    return { error: "Something went wrong on our end — please call or text us instead." };
  }

  // Never trust a client-supplied productId directly — re-check it's a real,
  // public product in this org before linking the inquiry to it.
  let productId: string | null = null;
  if (requestedProductId) {
    const product = await prisma.product.findFirst({
      where: { id: requestedProductId, organizationId: organization.id, isPublic: true },
      select: { id: true },
    });
    productId = product?.id ?? null;
  }

  const message =
    [vehicle ? `Vehicle: ${vehicle}` : null, partNeeded ? `Part needed: ${partNeeded}` : null, notes]
      .filter(Boolean)
      .join("\n") || null;

  await prisma.inquiry.create({
    data: {
      organizationId: organization.id,
      productId,
      name,
      phone,
      email,
      message,
    },
  });

  return { success: true };
}
