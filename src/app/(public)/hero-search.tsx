"use client";

import { useMemo, useState } from "react";
import { applyChange, optionsFor, yearOptions, type FitRow, type Selection } from "@/lib/catalog-filter";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

// The hero's vehicle selects, made to cascade (spec 1.4).
//
// This is the same engine the catalog band uses — src/lib/catalog-filter.ts,
// Year → Make → Model, each select narrowed only by the ones before it — fed
// the same fit rows. Until 14 Sep 2026 the hero was a plain GET form over
// three flat lists, so picking Toyota still offered every model in the
// database; a customer who chose Altima under Toyota searched and got
// nothing. The catalog was fine because it re-queried.
//
// The markup here is the hero's, byte for byte — same classes (passed in, so
// landing-view.tsx stays the single owner of its styles), same `name`s, same
// dictionary keys, same submit button. The landing page's design is settled
// (CLAUDE.md); this is a behavioural fix, and the only visible change is
// that the Model list now answers to the Make.
//
// Part type is deliberately NOT cascaded. The hero submits English marketing
// labels that the catalog resolves to part types server-side (see `parts` in
// Hero), which is a different vocabulary from the engine's enum values;
// wiring it in would mean changing what the form submits, and that contract
// is what search depends on.

export function HeroSearch({
  rows,
  parts,
  locale,
  selectClass,
}: {
  rows: FitRow[];
  /** Marketing labels, already filtered to categories with stock. Submitted as-is. */
  parts: string[];
  locale: Locale;
  selectClass: string;
}) {
  const dict = getDictionary(locale);
  const [sel, setSel] = useState<Selection>({ year: "", make: "", model: "", partType: "" });

  const years = useMemo(() => yearOptions(rows), [rows]);
  const makes = useMemo(() => optionsFor(rows, sel, "make"), [rows, sel]);
  const models = useMemo(() => optionsFor(rows, sel, "model"), [rows, sel]);

  function update(key: "year" | "make" | "model", value: string) {
    setSel((prev) => applyChange(rows, prev, key, value));
  }

  return (
    <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-[1fr_1fr_1fr_1fr_230px] lg:gap-2.5">
      <select
        name="year"
        value={sel.year}
        onChange={(e) => update("year", e.target.value)}
        className={selectClass}
      >
        <option value="" disabled>
          {dict.catalog.year}
        </option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <select
        name="make"
        value={sel.make}
        onChange={(e) => update("make", e.target.value)}
        className={selectClass}
      >
        <option value="" disabled>
          {dict.catalog.make}
        </option>
        {makes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select
        name="model"
        value={sel.model}
        onChange={(e) => update("model", e.target.value)}
        className={selectClass}
      >
        <option value="" disabled>
          {dict.catalog.model}
        </option>
        <option value="">{dict.landing.allModels}</option>
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <select name="partType" defaultValue="" className={selectClass}>
        <option value="" disabled>
          {dict.catalog.partType}
        </option>
        {parts.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="h-[56px] bg-[var(--accent)] font-[family-name:var(--font-oswald)] text-[16px] font-bold tracking-[0.2em] text-white transition-colors hover:bg-[var(--accent-hover)] active:scale-[0.97]"
      >
        {dict.landing.hero.searchParts}
      </button>
    </div>
  );
}
