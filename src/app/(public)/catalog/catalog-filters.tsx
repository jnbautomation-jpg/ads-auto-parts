"use client";

import { useMemo, useState } from "react";
import { formatPartTypeIn } from "@/lib/format";
import { primaryButtonClass } from "@/lib/public-ui";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import {
  applyChange,
  optionsFor,
  yearOptions,
  type FitRow,
  type Selection,
} from "@/lib/catalog-filter";

export type { FitRow };

const selectClass =
  "min-h-[44px] border border-[var(--line)] bg-[var(--surface-page)] px-3.5 text-[15px] text-[var(--ink)] lg:border-0";

// Phase 2 spec 1.4: "Cascade Year → Make → Model → Part so only valid
// combinations are selectable."
//
// The four selects used to be independent, so you could pick 2019 + Tesla +
// Tundra + Grille and get zero results.
//
// The cascade is DIRECTIONAL, in the order the spec names: each select is
// narrowed only by the ones BEFORE it. Narrowing in both directions was the
// obvious first implementation and it created dead ends — choosing "Model Y"
// left Tesla as the only selectable make, so you could not switch make
// without first clearing the model. Changing an earlier select instead
// clears any later one that no longer has stock.
//
// Filtering happens on the client from a deduped matrix of the catalog's
// vehicle fits — a few hundred rows — rather than a round-trip per change.
// That keeps the dropdowns instant, and the matrix is public data anyway
// (it is exactly what the catalog already lists).

export function CatalogFilters({
  rows,
  initial,
  multiTypeOption,
  locale,
  action,
}: {
  rows: FitRow[];
  initial: Selection;
  // A category that spans two part types arrives as a slug and has no single
  // enum option to round-trip through; kept as an extra option so pressing
  // Search from a landing-page tile doesn't silently drop the category.
  multiTypeOption: { value: string; label: string } | null;
  /** Which language's catalog to submit to, so /es stays on /es. */
  locale: Locale;
  action: string;
}) {
  const dict = getDictionary(locale);
  const [sel, setSel] = useState<Selection>(initial);

  const years = useMemo(() => yearOptions(rows), [rows]);
  const makes = useMemo(() => optionsFor(rows, sel, "make"), [rows, sel]);
  const models = useMemo(() => optionsFor(rows, sel, "model"), [rows, sel]);
  const partTypes = useMemo(
    () =>
      optionsFor(rows, sel, "partType")
        .map((value) => ({ value, label: formatPartTypeIn(value, locale) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [rows, sel, locale],
  );

  function update(key: keyof Selection, value: string) {
    setSel((prev) => applyChange(rows, prev, key, value, multiTypeOption?.value ?? null));
  }

  return (
    <form
      action={action}
      method="GET"
      className="grid grid-cols-2 gap-2 lg:grid-cols-[1fr_1.2fr_1.2fr_1.4fr_160px] lg:gap-px lg:border lg:border-[var(--line)] lg:bg-[var(--line)]"
    >
      {/* sr-only labels are position:absolute, so they stay out of the
          grid's flow and don't consume a column. */}
      <label htmlFor="band-year" className="sr-only">
        {dict.catalog.year}
      </label>
      <select
        id="band-year"
        name="year"
        value={sel.year}
        onChange={(e) => update("year", e.target.value)}
        className={selectClass}
      >
        <option value="">{dict.catalog.year}</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <label htmlFor="band-make" className="sr-only">
        {dict.catalog.make}
      </label>
      <select
        id="band-make"
        name="make"
        value={sel.make}
        onChange={(e) => update("make", e.target.value)}
        className={selectClass}
      >
        <option value="">{dict.catalog.make}</option>
        {makes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <label htmlFor="band-model" className="sr-only">
        {dict.catalog.model}
      </label>
      <select
        id="band-model"
        name="model"
        value={sel.model}
        onChange={(e) => update("model", e.target.value)}
        className={selectClass}
      >
        <option value="">{dict.catalog.model}</option>
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <label htmlFor="band-part-type" className="sr-only">
        {dict.catalog.partType}
      </label>
      <select
        id="band-part-type"
        name="partType"
        value={sel.partType}
        onChange={(e) => update("partType", e.target.value)}
        className={selectClass}
      >
        <option value="">{dict.catalog.partType}</option>
        {multiTypeOption ? (
          <option value={multiTypeOption.value}>{multiTypeOption.label}</option>
        ) : null}
        {partTypes.map((pt) => (
          <option key={pt.value} value={pt.value}>
            {pt.label}
          </option>
        ))}
      </select>

      <button type="submit" className={`col-span-2 ${primaryButtonClass} lg:col-span-1`}>
        {dict.catalog.search}
      </button>
    </form>
  );
}
