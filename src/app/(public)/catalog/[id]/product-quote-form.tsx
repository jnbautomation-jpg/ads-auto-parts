"use client";

import { useActionState, useEffect, useId } from "react";
import { submitQuoteRequest, type QuoteFormState } from "../../actions";
import { eyebrowClass, primaryButtonClass } from "@/lib/public-ui";
import { HoneypotField } from "@/components/honeypot-field";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { trackLead } from "@/lib/tracking";

const fieldClass =
  "min-h-[44px] w-full border border-[var(--line)] bg-[var(--surface-raised)] px-3.5 py-3 text-[14px] text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:outline-none";

export function ProductQuoteForm({
  productId,
  locale = "en",
}: {
  productId: string;
  locale?: Locale;
}) {
  const dict = getDictionary(locale);
  const [state, formAction, pending] = useActionState<QuoteFormState, FormData>(submitQuoteRequest, {});
  const uid = useId();

  // Fires once the server action has confirmed the lead is saved, so a blocked
  // tracker can never cost the shop the lead itself.
  useEffect(() => {
    if (state.success) trackLead();
  }, [state.success]);

  return (
    <form action={formAction} className="relative flex flex-col gap-3 border border-[var(--line)] p-5 lg:p-6">
      <HoneypotField />
      <input type="hidden" name="productId" value={productId} />
      {/* Tells the action which language to answer in. */}
      <input type="hidden" name="locale" value={locale} />
      <span className={eyebrowClass}>{dict.quote.heading}</span>
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <label htmlFor={`${uid}-name`} className="sr-only">
          {dict.quote.name}
        </label>
        <input
          id={`${uid}-name`}
          name="name"
          placeholder={dict.quote.name}
          required
          className={fieldClass}
        />
        <label htmlFor={`${uid}-phone`} className="sr-only">
          {dict.quote.phone}
        </label>
        <input
          id={`${uid}-phone`}
          name="phone"
          type="tel"
          placeholder={dict.quote.phone}
          required
          className={fieldClass}
        />
      </div>
      <label htmlFor={`${uid}-email`} className="sr-only">
        {dict.quote.email}
      </label>
      <input
        id={`${uid}-email`}
        name="email"
        type="email"
        placeholder={dict.quote.email}
        className={fieldClass}
      />
      <label htmlFor={`${uid}-notes`} className="sr-only">
        {dict.quote.messageLabel}
      </label>
      <textarea
        id={`${uid}-notes`}
        name="notes"
        placeholder={dict.quote.message}
        rows={3}
        className={`${fieldClass} resize-y`}
      />
      <button
        type="submit"
        disabled={pending}
        className={`${primaryButtonClass} disabled:opacity-60`}
      >
        {pending ? dict.quote.sending : dict.quote.send}
      </button>
      {state.error ? <p className="text-center text-[13px] font-semibold text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? (
        <p className="text-center text-[13px] font-semibold text-[var(--stock-in)]">
          {dict.quote.success}
        </p>
      ) : null}
    </form>
  );
}
