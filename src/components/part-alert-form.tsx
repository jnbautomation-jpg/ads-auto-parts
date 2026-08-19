"use client";

import { useActionState, useId, useState } from "react";
import { requestPartAlert, type AlertFormState } from "@/app/(public)/alert-actions";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/public-ui";
import { HoneypotField } from "@/components/honeypot-field";

const fieldClass =
  "min-h-[46px] w-full border border-white/12 bg-[#111] px-3.5 font-[family-name:var(--font-barlow)] text-[15px] text-white placeholder:text-[#8A8A8A] focus:border-[#E31E24] focus:outline-none";

const labelClass = "font-[family-name:var(--font-barlow)] text-[12.5px] font-semibold text-[#B4B4B4]";

/**
 * "Tell me when you get one" — shown on an empty search and on a part that
 * is currently CALL.
 *
 * Collapsed behind a button by default. An empty result page should read as
 * "we can probably still help", not as a form to fill in; opening it is the
 * customer choosing to leave details.
 */
export function PartAlertForm({
  make = "",
  model = "",
  year = "",
  partType = "",
  productId = "",
  compact = false,
}: {
  make?: string;
  model?: string;
  year?: string;
  partType?: string;
  productId?: string;
  compact?: boolean;
}) {
  const [state, formAction, pending] = useActionState<AlertFormState, FormData>(
    requestPartAlert,
    {},
  );
  const [open, setOpen] = useState(!compact);
  const uid = useId();

  if (state.notice) {
    return (
      <p
        aria-live="polite"
        className="border border-[#4ade80]/30 bg-[#4ade80]/[0.06] px-4 py-3 text-center font-[family-name:var(--font-barlow)] text-[14px] font-semibold text-[#4ade80]"
      >
        {state.notice}
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={secondaryButtonClass}>
        Tell me when you get one
      </button>
    );
  }

  return (
    <form action={formAction} className="relative flex w-full flex-col gap-3 text-left">
      <HoneypotField />
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="partType" value={partType} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-year`} className={labelClass}>
            Year
          </label>
          <input id={`${uid}-year`} name="year" defaultValue={year} className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-make`} className={labelClass}>
            Make
          </label>
          <input id={`${uid}-make`} name="make" defaultValue={make} required className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-model`} className={labelClass}>
            Model
          </label>
          <input id={`${uid}-model`} name="model" defaultValue={model} required className={fieldClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-phone`} className={labelClass}>
            Phone
          </label>
          <input id={`${uid}-phone`} name="phone" type="tel" required className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-email`} className={labelClass}>
            Email <span className="font-normal text-[#8A8A8A]">(optional)</span>
          </label>
          <input id={`${uid}-email`} name="email" type="email" className={fieldClass} />
        </div>
      </div>

      <button type="submit" disabled={pending} className={`${primaryButtonClass} disabled:opacity-60`}>
        {pending ? "Sending…" : "Notify me when it's in"}
      </button>

      {state.error ? (
        <p aria-live="polite" className="text-center text-[13px] font-semibold text-[#f87171]">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
