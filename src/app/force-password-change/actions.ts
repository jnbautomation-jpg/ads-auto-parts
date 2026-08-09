"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ChangePasswordState = { error?: string };

export async function changeTempPassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState | never> {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirm") || "");

  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "Passwords don't match." };

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Couldn't update your password. Try again." };

  // Clear the flag server-side, scoped strictly to the id just re-verified
  // from this caller's own session above — never from anything the client
  // submitted. app_metadata can only be written via the admin client, so
  // this is the only place the flag is ever cleared.
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(authUser.id, { app_metadata: { must_change_password: false } });

  redirect("/dashboard");
}
