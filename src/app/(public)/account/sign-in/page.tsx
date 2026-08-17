import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerContext } from "@/lib/customer-auth";
import { getAuthContext } from "@/lib/auth";
import { h1Class, bodyClass } from "@/lib/public-ui";
import { AuthForm } from "../auth-form";

export default async function CustomerSignInPage() {
  // Already signed in? Send them where they belong rather than showing a
  // sign-in form they don't need.
  if (await getCustomerContext()) redirect("/account");
  if (await getAuthContext()) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-[440px] flex-col justify-center gap-6 px-5 py-14">
      <div className="flex flex-col gap-2">
        <h1 className={h1Class}>Sign in</h1>
        <p className={bodyClass}>
          Trade accounts see wholesale pricing once approved. Retail customers can save vehicles for
          faster quotes.
        </p>
      </div>

      <AuthForm mode="sign-in" />

      <Link
        href="/catalog"
        className="text-center font-[family-name:var(--font-barlow)] text-[12px] font-semibold tracking-[0.14em] text-[#777] transition-colors hover:text-[#ccc]"
      >
        ← BACK TO CATALOG
      </Link>
    </main>
  );
}
