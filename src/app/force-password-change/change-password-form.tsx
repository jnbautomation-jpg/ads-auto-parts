"use client";

import { useActionState } from "react";
import { changeTempPassword, type ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = {};

const fieldClass =
  "h-[50px] w-full border border-white/12 bg-[#111] px-3.5 font-[family-name:var(--font-barlow)] text-[15px] font-medium text-white placeholder:text-[#666] focus:border-[#E31E24] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.15)] focus:outline-none disabled:opacity-60";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(async (_prev, formData) => {
    const result = await changeTempPassword(_prev, formData);
    return result ?? { error: "" };
  }, initialState);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3.5">
      {state.error ? (
        <p className="border border-[#E31E24]/35 bg-[#E31E24]/8 px-3.5 py-[11px] font-[family-name:var(--font-barlow)] text-[13px] font-medium text-[#ff6b70]">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2.5">
        <label htmlFor="password" className="sr-only">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="New password (min. 8 characters)"
          required
          minLength={8}
          autoComplete="new-password"
          disabled={pending}
          className={fieldClass}
        />

        <label htmlFor="confirm" className="sr-only">
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          placeholder="Confirm new password"
          required
          minLength={8}
          autoComplete="new-password"
          disabled={pending}
          className={fieldClass}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex h-[52px] items-center justify-center gap-2.5 bg-[#E31E24] font-[family-name:var(--font-oswald)] text-[15px] font-bold tracking-[0.22em] text-white transition-colors hover:bg-[#ff3a40] active:scale-[0.97] disabled:opacity-85"
      >
        {pending ? "SAVING…" : "SET PASSWORD & CONTINUE"}
      </button>
    </form>
  );
}
