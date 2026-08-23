"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { analyzeEstimate, type EstimateState } from "./actions";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import {
  badgeClass,
  bodyClass,
  eyebrowClass,
  primaryButtonClass,
  secondaryButtonClass,
  subHeadingClass,
} from "@/lib/public-ui";

export function EstimateForm({ locale = "en" }: { locale?: Locale } = {}) {
  const dict = getDictionary(locale);
  const [state, formAction, pending] = useActionState<EstimateState, FormData>(analyzeEstimate, {});
  const uid = useId();
  const r = state.result;

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-3">
        {/* The action answers in the language of the page that submitted it —
            part names, stock labels and its own error messages. Without this
            a Spanish visitor gets an English answer to a Spanish form. */}
        <input type="hidden" name="locale" value={locale} />
        <label htmlFor={`${uid}-file`} className="font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[var(--ink-muted)]">
          {dict.estimate.fileLabel}
        </label>
        <input
          id={`${uid}-file`}
          type="file"
          name="estimate"
          accept="application/pdf,.pdf"
          required
          className="w-full border border-[var(--line)] bg-[var(--surface-raised)] p-3 font-[family-name:var(--font-barlow)] text-[14px] text-white file:mr-3 file:border-0 file:bg-[var(--accent)] file:px-3 file:py-2 file:font-semibold file:text-white"
        />
        <button type="submit" disabled={pending} className={`${primaryButtonClass} disabled:opacity-60`}>
          {pending ? dict.estimate.submitting : dict.estimate.submit}
        </button>
        <p className="font-[family-name:var(--font-barlow)] text-[12.5px] text-[var(--ink-faint)]">
          {/* Said plainly because an estimate contains a customer's name,
              address and claim number. */}
          {dict.estimate.privacy}
        </p>
        {state.error ? (
          <p aria-live="polite" className="text-[13px] font-semibold text-[var(--danger)]">
            {state.error}
          </p>
        ) : null}
      </form>

      {r?.scanned ? (
        <div className="flex flex-col gap-2.5 border border-[var(--stock-low)]/40 bg-[var(--stock-low)]/[0.08] p-5">
          <h2 className={subHeadingClass}>{dict.estimate.scannedTitle}</h2>
          <p className={bodyClass}>{dict.estimate.scannedBody}</p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <a href={`tel:${PHONE_HREF}`} className={primaryButtonClass}>
              {dict.catalog.callUs} {PHONE_DISPLAY}
            </a>
            <Link href={localePath(locale, "/vin")} className={secondaryButtonClass}>
              {dict.nav.searchByVin}
            </Link>
          </div>
        </div>
      ) : null}

      {r && !r.scanned ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2.5 border border-[var(--line)] bg-[var(--surface-raised)] p-5">
            <span className={eyebrowClass}>{dict.estimate.whatWeRead}</span>
            {r.vehicle ? (
              <h2 className={subHeadingClass}>
                {[r.vehicle.year, r.vehicle.make, r.vehicle.model].filter(Boolean).join(" ")}
                {r.vehicle.trim ? ` ${r.vehicle.trim}` : ""}
              </h2>
            ) : (
              <p className={bodyClass}>{dict.estimate.noVehicle}</p>
            )}
            {r.vin ? <p className="font-mono text-[13px] text-[var(--ink-faint)]">{r.vin}</p> : null}
            {r.vinWarning ? (
              <p className="border-l-2 border-[var(--stock-low)] pl-3 text-[13px] text-[var(--stock-low)]">
                {r.vinWarning}
              </p>
            ) : null}
            {r.partTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {r.partTypes.map((t) => (
                  <span key={t} className={`${badgeClass} border-[var(--line-strong)] text-[var(--ink-muted)]`}>
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="font-[family-name:var(--font-barlow)] text-[12.5px] text-[var(--ink-faint)]">
              {dict.estimate.checkBeforeOrdering}
            </p>
          </div>

          {r.matches.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className={subHeadingClass}>{dict.estimate.inStockTitle}</h2>
              <ul className="flex flex-col divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {r.matches.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3">
                    <Link
                      href={localePath(locale, `/catalog/${m.id}`)}
                      className="text-[14.5px] font-medium text-[var(--ink)] hover:text-[var(--accent)]"
                    >
                      {m.label}
                    </Link>
                    <span className="font-mono text-[12px] text-[var(--ink-faint)]">{m.sku}</span>
                    <span className="ml-auto flex items-center gap-2.5">
                      <span className={`${badgeClass} border-[var(--line-strong)] text-[var(--ink-muted)]`}>{m.availability}</span>
                      <span className="font-[family-name:var(--font-oswald)] text-[16px] font-semibold">
                        {m.price}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className={bodyClass}>{dict.estimate.noMatches}</p>
          )}

          {r.unmatchedPartTypes.length > 0 ? (
            <div className="flex flex-col gap-2 border border-[var(--line)] bg-[var(--surface-raised)] p-5">
              <span className={eyebrowClass}>{dict.estimate.unmatchedTitle}</span>
              <p className={bodyClass}>
                {dict.estimate.unmatchedBefore} {r.unmatchedPartTypes.join(", ")}.{" "}
                {dict.estimate.unmatchedAfter}
              </p>
              <a href={`tel:${PHONE_HREF}`} className={`${secondaryButtonClass} self-start`}>
                {dict.catalog.callUs} {PHONE_DISPLAY}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
