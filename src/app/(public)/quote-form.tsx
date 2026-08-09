"use client";

import { useActionState, useId } from "react";
import { submitQuoteRequest, type QuoteFormState } from "./actions";
import { eyebrowClass, primaryButtonClass } from "@/lib/public-ui";

const PARTS = [
  "Doors",
  "Hoods",
  "Fenders",
  "Bumpers",
  "Tailgates & Trunks",
  "Liftgates",
  "Quarter Panels",
  "Rear Body Panels",
  "Grilles",
  "Hinges",
  "Radiator Supports",
  "Reinforcement Bars",
];

const fieldClass =
  "h-[50px] w-full border border-white/12 bg-[#111] px-3.5 font-[family-name:var(--font-barlow)] text-[15px] font-medium text-white placeholder:text-[#8A8A8A] focus:border-[#E31E24] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.15)] focus:outline-none";

export function QuoteForm({ id }: { id?: string }) {
  const [state, formAction, pending] = useActionState<QuoteFormState, FormData>(submitQuoteRequest, {});
  // Placeholders are not labels — they vanish on input and screen readers
  // don't announce them as field names. useId keeps these unique if the form
  // is ever rendered more than once on a page.
  const uid = useId();

  return (
    <form
      id={id}
      action={formAction}
      className="flex flex-col gap-3 self-start border border-white/8 border-t-2 border-t-[#E31E24] bg-[#1A1A1A] p-[18px] lg:gap-3 lg:p-[26px]"
    >
      <div className={eyebrowClass}>
        Request a quote
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <label htmlFor={`${uid}-name`} className="sr-only">
          Name
        </label>
        <input id={`${uid}-name`} name="name" placeholder="Name" required className={fieldClass} />
        <label htmlFor={`${uid}-phone`} className="sr-only">
          Phone
        </label>
        <input
          id={`${uid}-phone`}
          name="phone"
          type="tel"
          placeholder="Phone"
          required
          className={fieldClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <label htmlFor={`${uid}-vehicle`} className="sr-only">
          Vehicle (year, make, model)
        </label>
        <input
          id={`${uid}-vehicle`}
          name="vehicle"
          placeholder="Vehicle (year, make, model)"
          className={fieldClass}
        />
        <label htmlFor={`${uid}-part`} className="sr-only">
          Part needed
        </label>
        {/* Deliberately still lists every category, including the three with
            no stock — this is a request form, not a browse filter, and the
            catalog's own empty state says "we stock more than we list". */}
        <select id={`${uid}-part`} name="partNeeded" defaultValue="" className={fieldClass}>
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

      <label htmlFor={`${uid}-notes`} className="sr-only">
        Anything else?
      </label>
      <textarea
        id={`${uid}-notes`}
        name="notes"
        placeholder="Anything else? (paint code, side, photos to follow…)"
        rows={3}
        className="resize-y border border-white/12 bg-[#111] px-3.5 py-3 font-[family-name:var(--font-barlow)] text-[15px] font-medium text-white placeholder:text-[#8A8A8A] focus:border-[#E31E24] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.15)] focus:outline-none"
      />

      <button
        type="submit"
        disabled={pending}
        className={`${primaryButtonClass} h-[52px] disabled:opacity-60 lg:h-[54px]`}
      >
        {pending ? "Sending…" : "Send request"}
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
