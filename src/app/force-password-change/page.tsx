import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "./change-password-form";

export default async function ForcePasswordChangePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth — proxy.ts already gates this route the same way, but
  // this page shouldn't render for someone who got here without the flag.
  if (!user) redirect("/login");
  if (!user.app_metadata?.must_change_password) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="relative flex w-full max-w-[400px] flex-col gap-6">
        <div className="w-full border border-white/8 border-t-2 border-t-[#E31E24] bg-[#1A1A1A] p-6 lg:p-8">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-[family-name:var(--font-oswald)] text-[19px] font-semibold tracking-[0.2em] lg:text-[20px]">
              SET A NEW PASSWORD
            </h1>
            <p className="font-[family-name:var(--font-barlow)] text-[13px] text-[#888]">
              This account was just created for you. Choose a permanent password to continue.
            </p>
          </div>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
