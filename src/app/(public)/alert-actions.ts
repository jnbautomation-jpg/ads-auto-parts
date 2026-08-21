"use server";

import { prisma } from "@/lib/prisma";
import { ORG_SLUG } from "@/lib/site";
import { getCustomerContext } from "@/lib/customer-auth";
import { ALERT_LIMITS, validateAlert } from "@/lib/alerts";
import { HONEYPOT_NAME, normalizePhone } from "@/lib/inquiry";

export type AlertFormState = { error?: string; notice?: string };

export async function requestPartAlert(
  _prev: AlertFormState,
  formData: FormData,
): Promise<AlertFormState> {
  // Same honeypot as every other public form.
  if (String(formData.get(HONEYPOT_NAME) || "").trim() !== "") {
    return { notice: "We'll let you know as soon as it lands." };
  }

  const validation = validateAlert({
    make: String(formData.get("make") || ""),
    model: String(formData.get("model") || ""),
    year: String(formData.get("year") || ""),
    partType: String(formData.get("partType") || "") || null,
    productId: String(formData.get("productId") || "") || null,
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
  });
  if (!validation.ok) return { error: validation.error };

  const organization = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
    select: { id: true },
  });
  if (!organization) {
    return { error: "Something went wrong on our end — please call us instead." };
  }

  const v = validation.value;

  // Rate limit per phone, compared on digits so reformatting the same number
  // doesn't get around it — same approach as the quote form.
  const since = new Date(Date.now() - ALERT_LIMITS.windowMs);
  const recent = await prisma.partAlert.findMany({
    where: { organizationId: organization.id, createdAt: { gte: since } },
    select: { phone: true },
  });
  const digits = normalizePhone(v.phone);
  if (recent.filter((r) => normalizePhone(r.phone) === digits).length >= ALERT_LIMITS.perPhone) {
    return { error: "We've already got your requests — give us a call if it's urgent." };
  }

  // A client-supplied productId is re-checked against this org's public
  // catalog, never trusted.
  let productId: string | null = null;
  if (v.productId) {
    const product = await prisma.product.findFirst({
      where: { id: v.productId, organizationId: organization.id, isPublic: true },
      select: { id: true },
    });
    productId = product?.id ?? null;
  }

  const customer = await getCustomerContext();

  await prisma.partAlert.create({
    data: {
      organizationId: organization.id,
      type: "BACK_IN_STOCK",
      make: v.make,
      model: v.model,
      year: v.year,
      partType: v.partType as never,
      productId,
      name: v.name,
      phone: v.phone,
      email: v.email,
      customerAccountId: customer?.account.id ?? null,
    },
  });

  return { notice: "Got it — we'll call you as soon as one lands." };
}
