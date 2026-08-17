"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { signInCustomer, signUpCustomer, type AccountFormState } from "./actions";
import { primaryButtonClass } from "@/lib/public-ui";
import { HoneypotField } from "@/components/honeypot-field";

const fieldClass =
  "min-h-[48px] w-full border border-white/12 bg-[#111] px-3.5 font-[family-name:var(--font-barlow)] text-[15px] font-medium text-white placeholder:text-[#8A8A8A] focus:border-[#E31E24] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.15)] focus:outline-none";

const labelClass = "font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[#B4B4B4]";

// One component for both sign-in and sign-up — the two forms differ only by
// which action they post to and which extra fields they show. The spec warns
// that shops won't finish a long form, so sign-up asks for the minimum:
// email, password, and optionally a name and phone.
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const isSignUp = mode === "sign-up";
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    isSignUp ? signUpCustomer : signInCustomer,
    {},
  );
  const uid = useId();

  return (
    <form action={formAction} className="relative flex flex-col gap-3.5">
      <HoneypotField />

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-email`} className={labelClass}>
          Email
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
          Password
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
          <span className="font-[family-name:var(--font-barlow)] text-[12px] text-[#8A8A8A]">
            At least 8 characters.
          </span>
        ) : null}
      </div>

      {isSignUp ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-name`} className={labelClass}>
              Name <span className="font-normal text-[#8A8A8A]">(optional)</span>
            </label>
            <input id={`${uid}-name`} name="name" autoComplete="name" className={fieldClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-phone`} className={labelClass}>
              Phone <span className="font-normal text-[#8A8A8A]">(optional)</span>
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
        {pending ? "Working…" : isSignUp ? "Create account" : "Sign in"}
      </button>

      {state.error ? (
        <p
          aria-live="polite"
          className="text-center font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[#f87171]"
        >
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p
          aria-live="polite"
          className="text-center font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[#4ade80]"
        >
          {state.notice}
        </p>
      ) : null}

      <p className="mt-1 text-center font-[family-name:var(--font-barlow)] text-[13px] text-[#8A8A8A]">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <Link href="/account/sign-in" className="text-white underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Need an account?{" "}
            <Link href="/account/sign-up" className="text-white underline">
              Create one
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
