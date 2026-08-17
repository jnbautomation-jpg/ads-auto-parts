"use client";

import { useActionState, useId } from "react";
import {
  applyForWholesale,
  saveVehicle,
  type AccountFormState,
} from "./actions";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/public-ui";

const fieldClass =
  "min-h-[48px] w-full border border-white/12 bg-[#111] px-3.5 font-[family-name:var(--font-barlow)] text-[15px] font-medium text-white placeholder:text-[#8A8A8A] focus:border-[#E31E24] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.15)] focus:outline-none";

const labelClass = "font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[#B4B4B4]";

function Message({ state }: { state: AccountFormState }) {
  if (state.error) {
    return (
      <p aria-live="polite" className="text-[13px] font-semibold text-[#f87171]">
        {state.error}
      </p>
    );
  }
  if (state.notice) {
    return (
      <p aria-live="polite" className="text-[13px] font-semibold text-[#4ade80]">
        {state.notice}
      </p>
    );
  }
  return null;
}

// Kept deliberately short — two fields. The spec warns that shops abandon
// long wholesale signup forms, and staff can collect anything else when they
// call to approve.
export function WholesaleApplicationForm({ defaultPhone }: { defaultPhone: string }) {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    applyForWholesale,
    {},
  );
  const uid = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-company`} className={labelClass}>
          Shop / business name
        </label>
        <input id={`${uid}-company`} name="companyName" required className={fieldClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-phone`} className={labelClass}>
          Best phone number
        </label>
        <input
          id={`${uid}-phone`}
          name="phone"
          type="tel"
          required
          defaultValue={defaultPhone}
          className={fieldClass}
        />
      </div>
      <button type="submit" disabled={pending} className={`${primaryButtonClass} disabled:opacity-60`}>
        {pending ? "Sending…" : "Apply for trade pricing"}
      </button>
      <Message state={state} />
    </form>
  );
}

export function SaveVehicleForm() {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(saveVehicle, {});
  const uid = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor={`${uid}-year`} className={labelClass}>
          Year
        </label>
        <input id={`${uid}-year`} name="year" type="number" required className={fieldClass} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor={`${uid}-make`} className={labelClass}>
          Make
        </label>
        <input id={`${uid}-make`} name="make" required className={fieldClass} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor={`${uid}-model`} className={labelClass}>
          Model
        </label>
        <input id={`${uid}-model`} name="model" required className={fieldClass} />
      </div>
      <button type="submit" disabled={pending} className={`${secondaryButtonClass} disabled:opacity-60`}>
        {pending ? "Saving…" : "Save"}
      </button>
      <div className="sm:hidden">
        <Message state={state} />
      </div>
    </form>
  );
}
