"use client";

import { useActionState, useId } from "react";
import {
  applyForWholesale,
  saveVehicle,
  type AccountFormState,
} from "./actions";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/public-ui";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

const fieldClass =
  "min-h-[48px] w-full border border-[var(--line)] bg-[var(--surface-raised)] px-3.5 font-[family-name:var(--font-barlow)] text-[15px] font-medium text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.15)] focus:outline-none";

const labelClass = "font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[var(--ink-muted)]";

function Message({ state }: { state: AccountFormState }) {
  if (state.error) {
    return (
      <p aria-live="polite" className="text-[13px] font-semibold text-[var(--danger)]">
        {state.error}
      </p>
    );
  }
  if (state.notice) {
    return (
      <p aria-live="polite" className="text-[13px] font-semibold text-[var(--stock-in)]">
        {state.notice}
      </p>
    );
  }
  return null;
}

// Kept deliberately short — two fields. The spec warns that shops abandon
// long wholesale signup forms, and staff can collect anything else when they
// call to approve.
export function WholesaleApplicationForm({
  defaultPhone,
  locale = "en",
}: {
  defaultPhone: string;
  locale?: Locale;
}) {
  const a = getDictionary(locale).account;
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(
    applyForWholesale,
    {},
  );
  const uid = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-company`} className={labelClass}>
          {a.shopName}
        </label>
        <input id={`${uid}-company`} name="companyName" required className={fieldClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-phone`} className={labelClass}>
          {a.bestPhone}
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
        {pending ? a.sending : a.applyButton}
      </button>
      <Message state={state} />
    </form>
  );
}

export function SaveVehicleForm({ locale = "en" }: { locale?: Locale } = {}) {
  const a = getDictionary(locale).account;
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(saveVehicle, {});
  const uid = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor={`${uid}-year`} className={labelClass}>
          {a.year}
        </label>
        <input id={`${uid}-year`} name="year" type="number" required className={fieldClass} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor={`${uid}-make`} className={labelClass}>
          {a.make}
        </label>
        <input id={`${uid}-make`} name="make" required className={fieldClass} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor={`${uid}-model`} className={labelClass}>
          {a.model}
        </label>
        <input id={`${uid}-model`} name="model" required className={fieldClass} />
      </div>
      <button type="submit" disabled={pending} className={`${secondaryButtonClass} disabled:opacity-60`}>
        {pending ? a.saving : a.save}
      </button>
      <div className="sm:hidden">
        <Message state={state} />
      </div>
    </form>
  );
}
