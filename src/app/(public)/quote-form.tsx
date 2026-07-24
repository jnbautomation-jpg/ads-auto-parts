"use client";

import { useActionState } from "react";
import { submitQuoteRequest, type QuoteFormState } from "./actions";

const PARTS = [
  "Doors",
  "Hoods",
  "Fenders",
  "Bumpers",
  "Tailgates & Trunks",
  "Liftgates",
  "Quarter Panels",
  "Rear Body Panels",
];

const fieldClass =
  "h-[50px] w-full border border-white/12 bg-[#111] px-3.5 font-[family-name:var(--font-barlow)] text-[15px] font-medium text-white placeholder:text-[#666] focus:border-[#E31E24] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.15)] focus:outline-none";

export function QuoteForm({ id }: { id?: string }) {
  const [state, formAction, pending] = useActionState<QuoteFormState, FormData>(submitQuoteRequest, {});

  return (
    <form
      id={id}
      action={formAction}
      className="flex flex-col gap-3 self-start border border-white/8 border-t-2 border-t-[#E31E24] bg-[#1A1A1A] p-[18px] lg:gap-3 lg:p-[26px]"
    >
      <div className="font-[family-name:var(--font-barlow-condensed)] text-[12px] font-semibold tracking-[0.26em] text-[#888] lg:text-[13px] lg:tracking-[0.28em]">
        REQUEST A QUOTE
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <input name="name" placeholder="Name" required className={fieldClass} />
        <input name="phone" type="tel" placeholder="Phone" required className={fieldClass} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <input name="vehicle" placeholder="Vehicle (year, make, model)" className={fieldClass} />
        <select name="partNeeded" defaultValue="" className={fieldClass}>
          <option value="" disabled>
            Part needed
          </option>
          {PARTS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <textarea
        name="notes"
        placeholder="Anything else? (paint code, side, photos to follow…)"
        rows={3}
        className="resize-y border border-white/12 bg-[#111] px-3.5 py-3 font-[family-name:var(--font-barlow)] text-[15px] font-medium text-white placeholder:text-[#666] focus:border-[#E31E24] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.15)] focus:outline-none"
      />

      <button
        type="submit"
        disabled={pending}
        className="h-[52px] bg-[#E31E24] font-[family-name:var(--font-oswald)] text-[15px] font-bold tracking-[0.2em] text-white transition-colors hover:bg-[#ff3a40] active:scale-[0.97] disabled:opacity-60 lg:h-[54px]"
      >
        {pending ? "SENDING…" : "SEND REQUEST"}
      </button>

      {state.error ? (
        <p className="text-center font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[#f87171]">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-center font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[#4ade80]">
          Request sent — we&apos;ll get back to you fast.
        </p>
      ) : null}
    </form>
  );
}
