"use client";

import { useState } from "react";
import { buttonPrimaryClass, buttonSecondaryClass, cardClass, inputClass, mutedClass } from "@/lib/admin-ui";

type PartTypeOption = { value: string; label: string };

export function ProductFilters({
  q,
  partType,
  lowOnly,
  partTypes,
  resultSummary,
}: {
  q?: string;
  partType?: string;
  lowOnly: boolean;
  partTypes: PartTypeOption[];
  resultSummary: string;
}) {
  const [open, setOpen] = useState(false);

  const fields = (
    <>
      <input
        type="text"
        name="q"
        defaultValue={q}
        placeholder="Search code, make, model…"
        className={`${inputClass} w-full md:w-[260px]`}
      />
      <select name="partType" defaultValue={partType ?? ""} className={`${inputClass} w-full md:w-auto`}>
        <option value="">All part types</option>
        {partTypes.map((pt) => (
          <option key={pt.value} value={pt.value}>
            {pt.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 py-2 font-[family-name:var(--font-barlow)] text-[13px] font-medium text-[#444] md:py-0">
        <input type="checkbox" name="lowOnly" defaultChecked={lowOnly} className="h-[18px] w-[18px] accent-[#E31E24] md:h-4 md:w-4" />
        Low stock only
      </label>
      <button type="submit" className={`${buttonPrimaryClass} w-full md:w-auto`}>
        FILTER
      </button>
    </>
  );

  return (
    <>
      {/* Desktop filter bar — unchanged */}
      <form method="GET" className={`hidden ${cardClass} md:flex md:flex-wrap md:items-center md:gap-2 md:p-2.5`}>
        {fields}
        <div className={`ml-auto ${mutedClass}`}>{resultSummary}</div>
      </form>

      {/* Mobile trigger bar */}
      <div className={`flex items-center justify-between gap-2 ${cardClass} p-2.5 md:hidden`}>
        <button type="button" onClick={() => setOpen(true)} className={buttonSecondaryClass}>
          FILTERS
        </button>
        <div className={mutedClass}>{resultSummary}</div>
      </div>

      {/* Mobile filter sheet */}
      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <form
            method="GET"
            onSubmit={() => setOpen(false)}
            className="relative z-10 flex max-h-[85vh] flex-col gap-3 border-t border-black/10 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <div className="font-[family-name:var(--font-oswald)] text-sm font-semibold tracking-[0.14em]">
                FILTERS
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="flex h-11 w-11 items-center justify-center text-2xl leading-none text-[#999]"
              >
                ×
              </button>
            </div>
            {fields}
          </form>
        </div>
      ) : null}
    </>
  );
}
