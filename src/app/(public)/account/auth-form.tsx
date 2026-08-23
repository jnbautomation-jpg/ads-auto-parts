"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { signInCustomer, signUpCustomer, type AccountFormState } from "./actions";
import { primaryButtonClass } from "@/lib/public-ui";
import { HoneypotField } from "@/components/honeypot-field";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

const fieldClass =
  "min-h-[48px] w-full border border-[var(--line)] bg-[var(--surface-raised)] px-3.5 font-[family-name:var(--font-barlow)] text-[15px] font-medium text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.15)] focus:outline-none";

const labelClass = "font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[var(--ink-muted)]";

// One component for both sign-in and sign-up — the two forms differ only by
// which action they post to and which extra fields they show. The spec warns
// that shops won't finish a long form, so sign-up asks for the minimum:
// email, password, and optionally a name and phone.
export function AuthForm({
  mode,
  locale = "en",
}: {
  mode: "sign-in" | "sign-up";
  locale?: Locale;
}) {
  const a = getDictionary(locale).account;
  const isSignUp = mode === "sign-up";
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    isSignUp ? signUpCustomer : signInCustomer,
    {},
  );
  const uid = useId();

  return (
    <form action={formAction} className="relative flex flex-col gap-3.5">
      <HoneypotField />
      {/* The action has no other way to know which language to answer in. */}
      <input type="hidden" name="locale" value={locale} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-email`} className={labelClass}>
          {a.email}
        </label>
        <input
          id={`${uid}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-password`} className={labelClass}>
          {a.password}
        </label>
        <input
          id={`${uid}-password`}
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={isSignUp ? 8 : undefined}
          className={fieldClass}
        />
        {isSignUp ? (
          <span className="font-[family-name:var(--font-barlow)] text-[12px] text-[var(--ink-faint)]">
            {a.passwordHint}
          </span>
        ) : null}
      </div>

      {isSignUp ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-name`} className={labelClass}>
              {a.name} <span className="font-normal text-[var(--ink-faint)]">{a.optional}</span>
            </label>
            <input id={`${uid}-name`} name="name" autoComplete="name" className={fieldClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-phone`} className={labelClass}>
              {a.phone} <span className="font-normal text-[var(--ink-faint)]">{a.optional}</span>
            </label>
            <input
              id={`${uid}-phone`}
              name="phone"
              type="tel"
              autoComplete="tel"
              className={fieldClass}
            />
          </div>
        </>
      ) : null}

      <button type="submit" disabled={pending} className={`${primaryButtonClass} mt-1 disabled:opacity-60`}>
        {pending ? a.working : isSignUp ? a.createAccount : a.signIn}
      </button>

      {state.error ? (
        <p
          aria-live="polite"
          className="text-center font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[var(--danger)]"
        >
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p
          aria-live="polite"
          className="text-center font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[var(--stock-in)]"
        >
          {state.notice}
        </p>
      ) : null}

      <p className="mt-1 text-center font-[family-name:var(--font-barlow)] text-[13px] text-[var(--ink-faint)]">
        {isSignUp ? (
          <>
            {a.haveAccount}{" "}
            <Link href={localePath(locale, "/account/sign-in")} className="text-[var(--ink)] underline">
              {a.signIn}
            </Link>
          </>
        ) : (
          <>
            {a.needAccount}{" "}
            <Link href={localePath(locale, "/account/sign-up")} className="text-[var(--ink)] underline">
              {a.createOne}
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
