"use client";

import { useActionState, useId } from "react";
import { submitQuoteRequest, type QuoteFormState } from "./actions";
import { eyebrowClass, primaryButtonClass } from "@/lib/public-ui";
import { HoneypotField } from "@/components/honeypot-field";
import { PART_SLUG_LABELS, PART_SLUG_TO_TYPES, formatPartSlugIn } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

// Was a fourth hard-coded copy of the category list. Built from the same map
// the catalog and footer use, so a category can't exist in one place and not
// the other.
//
// The VALUE stays the English label even on the Spanish form: it is written
// into Inquiry.message and read by staff on an English admin screen. Only the
// label the customer reads is translated.
const PART_OPTIONS = Object.keys(PART_SLUG_TO_TYPES).map((slug) => ({
  slug,
  value: PART_SLUG_LABELS[slug] ?? slug,
}));

const fieldClass =
  "h-[50px] w-full border border-[var(--line)] bg-[var(--surface-raised)] px-3.5 font-[family-name:var(--font-barlow)] text-[15px] font-medium text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.15)] focus:outline-none";

export function QuoteForm({ id, locale = "en" }: { id?: string; locale?: Locale }) {
  const dict = getDictionary(locale);
  const [state, formAction, pending] = useActionState<QuoteFormState, FormData>(submitQuoteRequest, {});
  // Placeholders are not labels — they vanish on input and screen readers
  // don't announce them as field names. useId keeps these unique if the form
  // is ever rendered more than once on a page.
  const uid = useId();

  return (
    <form
      id={id}
      action={formAction}
      className="relative flex flex-col gap-3 self-start border border-[var(--line)] border-t-2 border-t-[#E31E24] bg-[var(--surface-raised)] p-[18px] lg:gap-3 lg:p-[26px]"
    >
      <HoneypotField />
      {/* Tells the action which language to answer in. */}
      <input type="hidden" name="locale" value={locale} />
      <div className={eyebrowClass}>{dict.quote.heading}</div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <label htmlFor={`${uid}-vehicle`} className="sr-only">
          {dict.quote.vehicle}
        </label>
        <input
          id={`${uid}-vehicle`}
          name="vehicle"
          placeholder={dict.quote.vehicle}
          className={fieldClass}
        />
        <label htmlFor={`${uid}-part`} className="sr-only">
          {dict.quote.partNeeded}
        </label>
        {/* Deliberately still lists every category, including the three with
            no stock — this is a request form, not a browse filter, and the
            catalog's own empty state says "we stock more than we list". */}
        <select id={`${uid}-part`} name="partNeeded" defaultValue="" className={fieldClass}>
          <option value="" disabled>
            {dict.quote.partNeeded}
          </option>
          {PART_OPTIONS.map((p) => (
            <option key={p.slug} value={p.value}>
              {formatPartSlugIn(p.slug, locale)}
            </option>
          ))}
        </select>
      </div>

      <label htmlFor={`${uid}-notes`} className="sr-only">
        {dict.quote.notesLabel}
      </label>
      <textarea
        id={`${uid}-notes`}
        name="notes"
        placeholder={dict.quote.notes}
        rows={3}
        className="resize-y border border-[var(--line)] bg-[var(--surface-raised)] px-3.5 py-3 font-[family-name:var(--font-barlow)] text-[15px] font-medium text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.15)] focus:outline-none"
      />

      <button
        type="submit"
        disabled={pending}
        className={`${primaryButtonClass} h-[52px] disabled:opacity-60 lg:h-[54px]`}
      >
        {pending ? dict.quote.sending : dict.quote.send}
      </button>

      {state.error ? (
        <p className="text-center font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-center font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[var(--stock-in)]">
          {dict.quote.success}
        </p>
      ) : null}
    </form>
  );
}
