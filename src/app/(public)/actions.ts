"use server";

import { prisma } from "@/lib/prisma";
// Single-tenant public site: this org is the only one the landing page ever
// files leads against. Looked up by slug rather than passed from the client
// so nothing about the org is exposed to the browser.
import { ORG_SLUG } from "@/lib/site";
import { HONEYPOT_NAME, normalizePhone, validateQuoteInput } from "@/lib/inquiry";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

export type QuoteFormState = { success?: boolean; error?: string };

// A single phone number may file this many requests inside the window below
// before we start rejecting. Set well above what a real customer does (send,
// realise they forgot the paint code, send again) and well below what a
// script does.
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export async function submitQuoteRequest(
  _prevState: QuoteFormState,
  formData: FormData,
): Promise<QuoteFormState> {
  // Honeypot: a real browser leaves this empty because no human can see or
  // tab to it. Report success rather than an error — telling a bot why it was
  // rejected just teaches it to avoid the trap next time.
  if (String(formData.get(HONEYPOT_NAME) || "").trim() !== "") {
    return { success: true };
  }

  // The form says which language to answer in; anything unexpected falls back
  // to English rather than throwing, so a tampered field cannot stop a lead
  // from being filed.
  const submittedLocale = String(formData.get("locale") || "");
  const locale = isLocale(submittedLocale) ? submittedLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  const validation = validateQuoteInput({
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    email: String(formData.get("email") || ""),
    vehicle: String(formData.get("vehicle") || ""),
    partNeeded: String(formData.get("partNeeded") || ""),
    notes: String(formData.get("notes") || ""),
  }, locale);
  if (!validation.ok) return { error: validation.error };

  const { name, phone, email, vehicle, partNeeded, notes } = validation.value;
  const requestedProductId = String(formData.get("productId") || "").trim() || null;

  const organization = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!organization) {
    return { error: dict.errors.generic };
  }

  // Rate limit per phone number. Recent inquiries are fetched and compared on
  // digits only, so re-formatting the same number ("407-743-4644" vs
  // "4077434644") cannot be used to slip past the limit. The window keeps
  // this query small, and it lives in the database rather than in memory
  // because serverless instances do not share state.
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recent = await prisma.inquiry.findMany({
    where: { organizationId: organization.id, createdAt: { gte: since } },
    select: { phone: true },
  });
  const digits = normalizePhone(phone);
  const fromSamePhone = recent.filter((r) => normalizePhone(r.phone ?? "") === digits).length;
  if (fromSamePhone >= RATE_LIMIT_MAX) {
    return { error: dict.errors.alreadyGotRequest };
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

  // These two prefixes stay English in both languages on purpose:
  // parseQuoteMessage() reads them back out for the admin inquiries table, and
  // the staff screens are English. Translating them here would make a Spanish
  // lead show "—" for vehicle and part.
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
      email: email || null,
      message,
    },
  });

  return { success: true };
}
