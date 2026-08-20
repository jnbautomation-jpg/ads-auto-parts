// Shared auth screen, rendered by /account/sign-in|sign-up and their /es
// equivalents.

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerContext } from "@/lib/customer-auth";
import { getAuthContext } from "@/lib/auth";
import { h1Class, bodyClass } from "@/lib/public-ui";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { AuthForm } from "./auth-form";

export async function AuthView({
  mode,
  locale,
}: {
  mode: "sign-in" | "sign-up";
  locale: Locale;
}) {
  // Already signed in? Send them where they belong rather than showing a form
  // they don't need.
  if (await getCustomerContext()) redirect(localePath(locale, "/account"));
  if (await getAuthContext()) redirect("/dashboard");

  const a = getDictionary(locale).account;
  const isSignUp = mode === "sign-up";

  return (
    <main className="mx-auto flex min-h-screen max-w-[440px] flex-col justify-center gap-6 px-5 py-14">
      <div className="flex flex-col gap-2">
        <h1 className={h1Class}>{isSignUp ? a.signUpTitle : a.signInTitle}</h1>
        <p className={bodyClass}>{isSignUp ? a.signUpIntro : a.signInIntro}</p>
      </div>

      <AuthForm mode={mode} locale={locale} />

      <Link
        href={localePath(locale, "/catalog")}
        className="text-center font-[family-name:var(--font-barlow)] text-[12px] font-semibold tracking-[0.14em] text-[#777] transition-colors hover:text-[#ccc]"
      >
        {getDictionary(locale).nav.backToCatalog.toUpperCase()}
      </Link>
    </main>
  );
}
