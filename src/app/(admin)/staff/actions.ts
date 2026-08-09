"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ASSIGNABLE_ROLES, canManageStaff } from "@/lib/permissions";
import { Prisma } from "@/generated/prisma/client";
import type { UserRole } from "@/generated/prisma/enums";

export type StaffFormState = { error?: string };

function isAssignableRole(value: string): value is UserRole {
  return (ASSIGNABLE_ROLES as string[]).includes(value);
}

// Creates BOTH the Supabase Auth login and the linked Prisma row in one
// step. Owner-only — checked server-side, not just by hiding the form.
export async function createStaffUser(
  _prevState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const { organization, user } = await requireAuthContext();
  if (!canManageStaff(user.role)) return { error: "Only the owner can manage staff." };

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "");

  if (!email || !email.includes("@")) return { error: "Enter a valid email." };
  if (password.length < 8) return { error: "Temp password must be at least 8 characters." };
  if (!isAssignableRole(role)) return { error: "Choose a role." };

  const admin = createAdminClient();

  // email_confirm: true — staff accounts are created by the owner, not
  // self-signed-up, so there's no verification email to wait on.
  // app_metadata (not user_metadata) so the flag can only ever be cleared by
  // the admin client server-side, never by the staff member's own session.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { must_change_password: true },
  });

  if (error || !data.user) {
    return { error: error?.message || "Couldn't create a login for that email." };
  }

  try {
    await prisma.user.create({
      data: { id: data.user.id, organizationId: organization.id, email, role },
    });
  } catch (err) {
    // Never leave an orphaned Supabase login with no app-side row behind.
    await admin.auth.admin.deleteUser(data.user.id);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "That email is already in use in this organization." };
    }
    throw err;
  }

  revalidatePath("/staff");
  return {};
}

// Row-level actions (called directly from <form action>, not useActionState)
// — matches the createSupplier/updateSupplier/deleteSupplier convention:
// silently no-op on an unauthorized or invalid request rather than
// surfacing an error, since the triggering UI is already hidden for
// anyone who isn't the owner.
export async function changeStaffRole(formData: FormData) {
  const { organization, user } = await requireAuthContext();
  if (!canManageStaff(user.role)) return;

  const targetId = String(formData.get("id") || "");
  const role = String(formData.get("role") || "");
  if (!targetId || !isAssignableRole(role) || targetId === user.id) return;

  // Re-scope to this org and refuse to touch another OWNER — owners aren't
  // managed from this page, by anyone, ever.
  const target = await prisma.user.findFirst({ where: { id: targetId, organizationId: organization.id } });
  if (!target || target.role === "OWNER") return;

  await prisma.user.update({ where: { id: targetId }, data: { role } });
  revalidatePath("/staff");
}

export async function removeStaffUser(formData: FormData) {
  const { organization, user } = await requireAuthContext();
  if (!canManageStaff(user.role)) return;

  const targetId = String(formData.get("id") || "");
  if (!targetId || targetId === user.id) return;

  const target = await prisma.user.findFirst({ where: { id: targetId, organizationId: organization.id } });
  if (!target || target.role === "OWNER") return;

  // Revoke the Supabase login first, then drop the Prisma row — if the
  // second step somehow fails, the account still can't log in (fails
  // toward "locked out", not toward "still has access").
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(targetId);
  await prisma.user.delete({ where: { id: targetId } });

  revalidatePath("/staff");
}
