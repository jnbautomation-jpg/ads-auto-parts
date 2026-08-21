// Back-in-stock and price alerts — Phase 2B.
//
//   "Request form for out-of-stock parts captures vehicle + contact."
//   "Notify by SMS and email when the part lands or drops in price."
//   "Turns every empty search result into a lead instead of a bounce."
//
// The capture and the matching are built here. SENDING is deliberately not:
// SMS and email both need a provider account (Twilio, Resend, or similar)
// that the shop does not have yet, and picking one is a decision with a
// monthly bill attached. Until then staff work the queue from the admin
// screen — which is strictly better than the current behaviour, where an
// empty search is simply a lost customer.

import type { Prisma } from "@/generated/prisma/client";
import { canonicalMake, canonicalModel } from "@/lib/normalize";
import { normalizePhone } from "@/lib/inquiry";

export const ALERT_LIMITS = {
  name: 120,
  phone: 40,
  email: 200,
  /** Per phone number, per window — stops a bot filling the queue. */
  perPhone: 5,
  windowMs: 60 * 60 * 1000,
} as const;

export type AlertInput = {
  make: string;
  model: string;
  year?: string | number | null;
  partType?: string | null;
  productId?: string | null;
  name?: string | null;
  phone: string;
  email?: string | null;
};

export type AlertValidation =
  | {
      ok: true;
      value: {
        make: string;
        model: string;
        year: number | null;
        partType: string | null;
        productId: string | null;
        name: string | null;
        phone: string;
        email: string | null;
      };
    }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates and normalizes an alert request.
 *
 * Make and model go through the same canonicaliser the catalog uses. That is
 * the whole point: an alert saved as "cx 5" would never match a "CX-5"
 * arriving in stock, and the customer would never hear from anyone.
 */
export function validateAlert(raw: AlertInput): AlertValidation {
  const make = canonicalMake(String(raw.make ?? ""));
  const model = canonicalModel(String(raw.model ?? ""));
  const phone = String(raw.phone ?? "").trim();
  const name = String(raw.name ?? "").trim();
  const email = String(raw.email ?? "").trim();

  if (!make || !model) return { ok: false, error: "Tell us the vehicle make and model." };
  if (!phone || normalizePhone(phone).length < 7) {
    return { ok: false, error: "Enter a phone number we can reach you on." };
  }
  if (name.length > ALERT_LIMITS.name || phone.length > ALERT_LIMITS.phone) {
    return { ok: false, error: "That's longer than we can accept — please shorten it." };
  }
  if (email && (!EMAIL_RE.test(email) || email.length > ALERT_LIMITS.email)) {
    return { ok: false, error: "That email address doesn't look right." };
  }

  const yearNum = raw.year === null || raw.year === undefined || raw.year === "" ? null : Number(raw.year);
  if (yearNum !== null && (!Number.isInteger(yearNum) || yearNum < 1980 || yearNum > new Date().getFullYear() + 2)) {
    return { ok: false, error: "Enter a valid year." };
  }

  return {
    ok: true,
    value: {
      make,
      model,
      year: yearNum,
      partType: raw.partType ? String(raw.partType) : null,
      productId: raw.productId ? String(raw.productId) : null,
      name: name || null,
      phone,
      email: email || null,
    },
  };
}

/**
 * Which waiting customers a newly-stocked product satisfies.
 *
 * Matching is deliberately generous on year: an alert with no year matches
 * any year of that model, and an alert WITH a year matches when the part's
 * fit range covers it. A part that fits 2019-2024 should reach someone
 * waiting on a 2021.
 */
export function alertMatchWhere(
  organizationId: string,
  product: { make: string; model: string; partType: string; yearStart: number; yearEnd: number },
): Prisma.PartAlertWhereInput {
  return {
    organizationId,
    status: "ACTIVE",
    make: canonicalMake(product.make),
    model: canonicalModel(product.model),
    // An alert that named no part type wants to hear about any part for that
    // vehicle.
    OR: [{ partType: null }, { partType: product.partType as never }],
    AND: [
      {
        OR: [
          { year: null },
          { year: { gte: product.yearStart, lte: product.yearEnd } },
        ],
      },
    ],
  };
}

export const ALERT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Waiting",
  NOTIFIED: "Contacted",
  CANCELLED: "Closed",
};

export const ALERT_TYPE_LABEL: Record<string, string> = {
  BACK_IN_STOCK: "Back in stock",
  PRICE_DROP: "Price drop",
};
