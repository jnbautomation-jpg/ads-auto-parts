"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getCustomerContext, getOrganizationId, requireCustomerContext } from "@/lib/customer-auth";
import { canonicalMake, canonicalModel } from "@/lib/normalize";
import { HONEYPOT_NAME, normalizePhone } from "@/lib/inquiry";

export type AccountFormState = { error?: string; notice?: string };

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
  // Same honeypot as the quote form — this endpoint creates accounts, so it
  // is a bot target.
  if (String(formData.get(HONEYPOT_NAME) || "").trim() !== "") {
    return { notice: "Check your email to confirm your account." };
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();

  if (!email || !password) return { error: "Enter an email address and a password." };
  if (tooLong(email, MAX.email) || tooLong(password, MAX.password) || tooLong(name, MAX.name)) {
    return { error: "That's longer than we can accept — please shorten it." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.` };
  }
  if (phone && normalizePhone(phone).length < 7) {
    return { error: "That phone number doesn't look right." };
  }

  const organizationId = await getOrganizationId();
  if (!organizationId) return { error: "Something went wrong on our end — please call us instead." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    // Deliberately vague. A precise "that email is already registered"
    // turns this form into a way to test which of your customers have
    // accounts.
    return { error: "We couldn't create that account. Try signing in instead." };
  }
  if (!data.user) return { error: "We couldn't create that account. Please try again." };

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
    return { notice: "Account created — check your email to confirm it, then sign in." };
  }

  redirect("/account");
}

export async function signInCustomer(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Invalid email or password." };

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

  redirect("/account");
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
  const { account } = await requireCustomerContext();

  const companyName = String(formData.get("companyName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();

  if (!companyName) return { error: "Enter your shop or business name." };
  if (tooLong(companyName, MAX.company)) return { error: "That business name is too long." };
  if (!phone || normalizePhone(phone).length < 7) {
    return { error: "Enter a phone number we can reach you on." };
  }

  if (account.wholesaleStatus === "PENDING") {
    return { notice: "Your application is already with us — we'll be in touch." };
  }
  if (account.tier === "WHOLESALE") {
    return { notice: "You already have a trade account." };
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
  return { notice: "Application received — we'll review it and get back to you." };
}

export async function saveVehicle(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const { account } = await requireCustomerContext();

  // Normalized with the same rules as the catalog, so a saved vehicle
  // actually matches the parts it should.
  const make = canonicalMake(String(formData.get("make") || ""));
  const model = canonicalModel(String(formData.get("model") || ""));
  const year = Number(formData.get("year"));

  if (!make || !model) return { error: "Enter a make and model." };
  if (!Number.isInteger(year) || year < 1980 || year > new Date().getFullYear() + 2) {
    return { error: "Enter a valid year." };
  }

  try {
    await prisma.savedVehicle.create({
      data: { customerAccountId: account.id, make, model, year },
    });
  } catch {
    // Unique constraint on (account, make, model, year) — saving the same
    // vehicle twice is a no-op, not an error worth showing.
    return { notice: "That vehicle is already saved." };
  }

  revalidatePath("/account");
  return { notice: "Vehicle saved." };
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
