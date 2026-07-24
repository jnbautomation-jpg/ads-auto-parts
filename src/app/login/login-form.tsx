"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

type State = { error: string };

const initialState: State = { error: "" };

const fieldClass =
  "h-[50px] w-full border border-white/12 bg-[#111] px-3.5 font-[family-name:var(--font-barlow)] text-[15px] font-medium text-white placeholder:text-[#666] focus:border-[#E31E24] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.15)] focus:outline-none disabled:opacity-60";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<State, FormData>(async (_prevState, formData) => {
    const result = await signIn(formData);
    return result ?? { error: "" };
  }, initialState);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3.5">
      <input type="hidden" name="next" value={next} />

      {state.error ? (
        <p className="border border-[#E31E24]/35 bg-[#E31E24]/8 px-3.5 py-[11px] font-[family-name:var(--font-barlow)] text-[13px] font-medium text-[#ff6b70]">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2.5">
        <label htmlFor="email" className="sr-only">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="Work email"
          required
          autoComplete="email"
          disabled={pending}
          className={fieldClass}
        />

        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Password"
          required
          autoComplete="current-password"
          disabled={pending}
          className={fieldClass}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex h-[52px] items-center justify-center gap-2.5 bg-[#E31E24] font-[family-name:var(--font-oswald)] text-[15px] font-bold tracking-[0.22em] text-white transition-colors hover:bg-[#ff3a40] active:scale-[0.97] disabled:opacity-85"
      >
        {pending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
        ) : null}
        {pending ? "SIGNING IN…" : "SIGN IN"}
      </button>
    </form>
  );
}
