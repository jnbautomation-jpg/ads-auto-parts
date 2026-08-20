"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getCustomerContext, getOrganizationId, requireCustomerContext } from "@/lib/customer-auth";
import { canonicalMake, canonicalModel } from "@/lib/normalize";
import { HONEYPOT_NAME, normalizePhone } from "@/lib/inquiry";
import { isLocale, localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

export type AccountFormState = { error?: string; notice?: string };

/**
 * Which language to answer in. Forms post a hidden `locale`, because a server
 * action has no other way to know which version of the site the customer is
 * on — and the spec is explicit that error messages must be translated, not
 * just marketing copy.
 */
function localeOf(formData: FormData): Locale {
  const raw = String(formData.get("locale") || "");
  return isLocale(raw) ? raw : "en";
}

// Supabase's own minimum is 6; 8 is the shop's floor for a customer account
// that will eventually hold order history.
const MIN_PASSWORD_LENGTH = 8;

const MAX = { email: 200, password: 200, name: 120, phone: 40, company: 160 } as const;

function tooLong(value: string, limit: number): boolean {
  return value.length > limit;
}

export async function signUpCustomer(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const locale = localeOf(formData);
  const t = getDictionary(locale);

  // Same honeypot as the quote form — this endpoint creates accounts, so it
  // is a bot target.
  if (String(formData.get(HONEYPOT_NAME) || "").trim() !== "") {
    return { notice: t.accountErrors.confirmEmail };
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();

  if (!email || !password) return { error: t.accountErrors.emailAndPassword };
  if (tooLong(email, MAX.email) || tooLong(password, MAX.password) || tooLong(name, MAX.name)) {
    return { error: t.accountErrors.tooLong };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: t.accountErrors.passwordTooShort };
  }
  if (phone && normalizePhone(phone).length < 7) {
    return { error: t.accountErrors.phoneInvalid };
  }

  const organizationId = await getOrganizationId();
  if (!organizationId) return { error: t.accountErrors.serverProblem };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    // Deliberately vague. A precise "that email is already registered"
    // turns this form into a way to test which of your customers have
    // accounts.
    return { error: t.accountErrors.createFailed };
  }
  if (!data.user) return { error: t.accountErrors.createFailed };

  // The Supabase auth user is the identity; this row is the shop's record of
  // them. Everyone starts RETAIL — wholesale is only ever granted by a staff
  // approval (see applyForWholesale / reviewWholesaleApplication).
  await prisma.customerAccount.upsert({
    where: { authUserId: data.user.id },
    create: {
      organizationId,
      authUserId: data.user.id,
      email,
      name: name || null,
      phone: phone || null,
    },
    update: { email, name: name || null, phone: phone || null },
  });

  // With email confirmation enabled in Supabase there is no session yet, so
  // don't pretend they're signed in.
  if (!data.session) {
    return { notice: t.accountErrors.confirmEmail };
  }

  redirect(localePath(locale, "/account"));
}

export async function signInCustomer(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const locale = localeOf(formData);
  const t = getDictionary(locale);

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: t.accountErrors.emailOrPassword };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: t.accountErrors.invalidCredentials };

  // A staff member signing in here would have no customer account. Send them
  // to their own area rather than leaving them on a page that says they have
  // no account.
  const staff = await prisma.user.findUnique({ where: { id: data.user.id }, select: { id: true } });
  if (staff) redirect("/dashboard");

  const organizationId = await getOrganizationId();
  if (organizationId) {
    // Self-heal: an auth user with no CustomerAccount row (signup interrupted
    // between the two writes) gets one on first successful sign-in rather
    // than hitting a dead account page.
    await prisma.customerAccount.upsert({
      where: { authUserId: data.user.id },
      create: { organizationId, authUserId: data.user.id, email },
      update: {},
    });
  }

  redirect(localePath(locale, "/account"));
}

export async function signOutCustomer() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function applyForWholesale(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const locale = localeOf(formData);
  const t = getDictionary(locale);

  const { account } = await requireCustomerContext();

  const companyName = String(formData.get("companyName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();

  if (!companyName) return { error: t.accountErrors.shopNameRequired };
  if (tooLong(companyName, MAX.company)) return { error: t.accountErrors.shopNameTooLong };
  if (!phone || normalizePhone(phone).length < 7) {
    return { error: t.accountErrors.phoneInvalid };
  }

  if (account.wholesaleStatus === "PENDING") {
    return { notice: t.accountErrors.alreadyApplied };
  }
  if (account.tier === "WHOLESALE") {
    return { notice: t.accountErrors.alreadyTrade };
  }

  await prisma.customerAccount.update({
    where: { id: account.id },
    data: {
      companyName,
      phone,
      wholesaleStatus: "PENDING",
      appliedAt: new Date(),
      // Clear any previous decision so a re-application starts fresh.
      wholesaleNote: null,
      reviewedAt: null,
      reviewedById: null,
    },
  });

  revalidatePath("/account");
  return { notice: t.accountErrors.applicationSent };
}

export async function saveVehicle(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const locale = localeOf(formData);
  const t = getDictionary(locale);

  const { account } = await requireCustomerContext();

  // Normalized with the same rules as the catalog, so a saved vehicle
  // actually matches the parts it should.
  const make = canonicalMake(String(formData.get("make") || ""));
  const model = canonicalModel(String(formData.get("model") || ""));
  const year = Number(formData.get("year"));

  if (!make || !model) return { error: t.accountErrors.vehicleRequired };
  if (!Number.isInteger(year) || year < 1980 || year > new Date().getFullYear() + 2) {
    return { error: t.accountErrors.yearInvalid };
  }

  try {
    await prisma.savedVehicle.create({
      data: { customerAccountId: account.id, make, model, year },
    });
  } catch {
    // Unique constraint on (account, make, model, year) — saving the same
    // vehicle twice is a no-op, not an error worth showing.
    return { notice: t.accountErrors.vehicleDuplicate };
  }

  revalidatePath("/account");
  return { notice: t.accountErrors.vehicleSaved };
}

export async function deleteVehicle(formData: FormData) {
  const ctx = await getCustomerContext();
  if (!ctx) return;

  const id = String(formData.get("id") || "");
  if (!id) return;

  // deleteMany with the ownership filter, so another customer's id can't be
  // passed in — the same pattern the admin actions use.
  await prisma.savedVehicle.deleteMany({
    where: { id, customerAccountId: ctx.account.id },
  });

  revalidatePath("/account");
}
