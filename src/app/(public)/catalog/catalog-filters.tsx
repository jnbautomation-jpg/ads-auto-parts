"use client";

import { useMemo, useState } from "react";
import { formatPartType } from "@/lib/format";
import { primaryButtonClass } from "@/lib/public-ui";
import {
  applyChange,
  optionsFor,
  yearOptions,
  type FitRow,
  type Selection,
} from "@/lib/catalog-filter";

export type { FitRow };

const selectClass =
  "min-h-[44px] border border-[#2A2A2A] bg-[#0A0A0A] px-3.5 text-[15px] text-white lg:border-0";

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
}: {
  rows: FitRow[];
  initial: Selection;
  // A category that spans two part types arrives as a slug and has no single
  // enum option to round-trip through; kept as an extra option so pressing
  // Search from a landing-page tile doesn't silently drop the category.
  multiTypeOption: { value: string; label: string } | null;
}) {
  const [sel, setSel] = useState<Selection>(initial);

  const years = useMemo(() => yearOptions(rows), [rows]);
  const makes = useMemo(() => optionsFor(rows, sel, "make"), [rows, sel]);
  const models = useMemo(() => optionsFor(rows, sel, "model"), [rows, sel]);
  const partTypes = useMemo(
    () =>
      optionsFor(rows, sel, "partType")
        .map((value) => ({ value, label: formatPartType(value) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [rows, sel],
  );

  function update(key: keyof Selection, value: string) {
    setSel((prev) => applyChange(rows, prev, key, value, multiTypeOption?.value ?? null));
  }

  return (
    <form
      action="/catalog"
      method="GET"
      className="grid grid-cols-2 gap-2 lg:grid-cols-[1fr_1.2fr_1.2fr_1.4fr_160px] lg:gap-px lg:border lg:border-[#2A2A2A] lg:bg-[#2A2A2A]"
    >
      {/* sr-only labels are position:absolute, so they stay out of the
          grid's flow and don't consume a column. */}
      <label htmlFor="band-year" className="sr-only">
        Year
      </label>
      <select
        id="band-year"
        name="year"
        value={sel.year}
        onChange={(e) => update("year", e.target.value)}
        className={selectClass}
      >
        <option value="">Year</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <label htmlFor="band-make" className="sr-only">
        Make
      </label>
      <select
        id="band-make"
        name="make"
        value={sel.make}
        onChange={(e) => update("make", e.target.value)}
        className={selectClass}
      >
        <option value="">Make</option>
        {makes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <label htmlFor="band-model" className="sr-only">
        Model
      </label>
      <select
        id="band-model"
        name="model"
        value={sel.model}
        onChange={(e) => update("model", e.target.value)}
        className={selectClass}
      >
        <option value="">Model</option>
        {models.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <label htmlFor="band-part-type" className="sr-only">
        Part type
      </label>
      <select
        id="band-part-type"
        name="partType"
        value={sel.partType}
        onChange={(e) => update("partType", e.target.value)}
        className={selectClass}
      >
        <option value="">Part Type</option>
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
        Search
      </button>
    </form>
  );
}
