// Customer-side identity. The mirror of src/lib/auth.ts, which is staff-only.
//
// These two never mix. getAuthContext() resolves a Supabase auth id against
// the `users` table and grants staff access; this resolves the same id
// against `customer_accounts` and grants nothing but a pricing tier and an
// account page. A customer signing in has no `users` row, so every admin page
// and server action rejects them exactly as it rejects a stranger.

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ORG_SLUG } from "@/lib/site";
import type { CustomerAccount } from "@/generated/prisma/client";
import type { ViewerTier } from "@/lib/pricing";

export type CustomerContext = { account: CustomerAccount };

/** The signed-in customer, or null for a guest or a staff-only session. */
export async function getCustomerContext(): Promise<CustomerContext | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const account = await prisma.customerAccount.findUnique({
    where: { authUserId: authUser.id },
  });
  if (!account) return null;

  return { account };
}

export async function requireCustomerContext(): Promise<CustomerContext> {
  const ctx = await getCustomerContext();
  if (!ctx) redirect("/account/sign-in");
  return ctx;
}

/**
 * Pricing tier for the current request.
 *
 * WHOLESALE is returned only for an account whose tier was actually set to
 * WHOLESALE by a staff approval — a PENDING application still pays retail.
 * Reading `tier` rather than `wholesaleStatus` is deliberate: approval is the
 * single act that changes what someone is charged, so there is one field to
 * audit rather than two that could disagree.
 */
export async function getViewerTier(): Promise<ViewerTier> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return "GUEST";

  // Staff see wholesale pricing on the public site too — they use the
  // catalog to quote trade customers over the phone.
  const staff = await prisma.user.findUnique({ where: { id: authUser.id }, select: { id: true } });
  if (staff) return "STAFF";

  const account = await prisma.customerAccount.findUnique({
    where: { authUserId: authUser.id },
    select: { tier: true },
  });
  if (!account) return "GUEST";

  return account.tier === "WHOLESALE" ? "WHOLESALE" : "RETAIL";
}

/** The single-tenant org every customer account belongs to. */
export async function getOrganizationId(): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
    select: { id: true },
  });
  return org?.id ?? null;
}
