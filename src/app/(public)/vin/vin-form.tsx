"use client";

import { useActionState, useId } from "react";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import Link from "next/link";
import { lookupVin, type VinLookupState } from "./actions";
import { badgeClass, bodyClass, primaryButtonClass, secondaryButtonClass, subHeadingClass } from "@/lib/public-ui";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

const fieldClass =
  "min-h-[52px] w-full border border-[var(--line)] bg-[var(--surface-raised)] px-3.5 font-mono text-[16px] uppercase tracking-[0.12em] text-[var(--ink)] placeholder:font-[family-name:var(--font-barlow)] placeholder:normal-case placeholder:tracking-normal placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.15)] focus:outline-none";

export function VinForm({ locale = "en" }: { locale?: Locale } = {}) {
  const dict = getDictionary(locale);
  const [state, formAction, pending] = useActionState<VinLookupState, FormData>(lookupVin, {});
  const uid = useId();

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-3">
        <label htmlFor={`${uid}-vin`} className="font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[var(--ink-muted)]">
          {dict.vin.label}
        </label>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <input
            id={`${uid}-vin`}
            name="vin"
            required
            maxLength={24}
            spellCheck={false}
            autoComplete="off"
            placeholder="e.g. 5YJ3E1EA2KF317806"
            className={fieldClass}
          />
          <button
            type="submit"
            disabled={pending}
            className={`${primaryButtonClass} shrink-0 disabled:opacity-60`}
          >
            {pending ? dict.vin.checking : dict.vin.submit}
          </button>
        </div>
        <p className="font-[family-name:var(--font-barlow)] text-[12.5px] text-[var(--ink-faint)]">
          {dict.vin.helper}
        </p>
      </form>

      {state.error ? (
        <p aria-live="polite" className="border border-[var(--danger)]/30 bg-[var(--danger)]/[0.06] px-4 py-3 text-[14px] font-semibold text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}

      {state.vehicle ? (
        <div aria-live="polite" className="flex flex-col gap-4 border border-[var(--line)] bg-[var(--surface-raised)] p-5 lg:p-6">
          {/* The spec is explicit: always show the matched vehicle for the
              customer to confirm before anything goes in a cart. */}
          <div className="flex flex-col gap-1.5">
            <span className="font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              {dict.vin.decodedTitle}
            </span>
            <h2 className={subHeadingClass}>
              {[state.vehicle.year, state.vehicle.catalogMake ?? state.vehicle.make, state.vehicle.catalogModel ?? state.vehicle.model]
                .filter(Boolean)
                .join(" ")}
            </h2>
            <div className="flex flex-wrap gap-2 pt-1">
              {state.vehicle.trim ? (
                <span className={`${badgeClass} border-[var(--line-strong)] text-[var(--ink-muted)]`}>{state.vehicle.trim}</span>
              ) : null}
              {state.vehicle.bodyClass ? (
                <span className={`${badgeClass} border-[var(--line-strong)] text-[var(--ink-muted)]`}>{state.vehicle.bodyClass}</span>
              ) : null}
            </div>
          </div>

          {state.warning ? (
            <p className="border-l-2 border-[var(--stock-low)] pl-3 font-[family-name:var(--font-barlow)] text-[13px] text-[var(--stock-low)]">
              {state.warning}
            </p>
          ) : null}

          {state.vehicle.trim ? null : (
            // Trim changes which part fits (the spec calls out GT line vs
            // sport line), and NHTSA doesn't publish it for every manufacturer.
            <p className="font-[family-name:var(--font-barlow)] text-[13px] text-[var(--ink-faint)]">
{dict.vin.confirmBody}
            </p>
          )}

          {state.matchCount && state.matchCount > 0 ? (
            <div className="flex flex-col gap-3">
              <p className={bodyClass}>
                {dict.vin.partsFor}: <strong className="text-[var(--ink)]">{state.matchCount}</strong>
              </p>
              <Link href={localePath(locale, state.catalogHref ?? "/catalog")} className={primaryButtonClass}>
                {dict.vin.seeAll}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className={bodyClass}>
{dict.vin.nothingBody}
              </p>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <a href={`tel:${PHONE_HREF}`} className={primaryButtonClass}>
                  {dict.catalog.callUs} {PHONE_DISPLAY}
                </a>
                <Link href={localePath(locale, "/catalog")} className={secondaryButtonClass}>
                  {dict.product.browseCatalog}
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
