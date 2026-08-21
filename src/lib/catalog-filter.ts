// Pure option-narrowing logic for the catalog's cascading selects
// (Phase 2 spec 1.4). Lives here rather than inside the client component so
// it can be unit-tested without rendering React.
//
// The cascade is DIRECTIONAL, in the order the spec names — Year → Make →
// Model → Part. Each select is narrowed only by the ones BEFORE it.
// Narrowing in both directions was the obvious first implementation and it
// created dead ends: choosing "Model Y" left Tesla as the only selectable
// make, so a visitor could not switch make without first clearing the model.

export type FitRow = {
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
  partType: string;
};

export type Selection = { year: string; make: string; model: string; partType: string };

export type Dimension = keyof Selection;

/** Cascade order. A select is narrowed by everything earlier and nothing later. */
export const ORDER: readonly Dimension[] = ["year", "make", "model", "partType"] as const;

/** Whether a row carries the given value for one dimension. */
export function rowHas(row: FitRow, key: Dimension, value: string): boolean {
  if (key === "year") {
    const y = Number(value);
    // A fit spans a run of model years, so a single year matches the range.
    return Number.isFinite(y) && row.yearStart <= y && y <= row.yearEnd;
  }
  if (key === "make") return row.make === value;
  if (key === "model") return row.model === value;
  return row.partType === value;
}

/** Does this row satisfy every selection that comes BEFORE `upTo`? */
export function matchesUpstream(row: FitRow, sel: Selection, upTo: Dimension): boolean {
  for (const key of ORDER) {
    if (key === upTo) return true;
    const value = sel[key];
    if (!value) continue;
    if (!rowHas(row, key, value)) return false;
  }
  return true;
}

/** Distinct years across the whole matrix — year is first, so never narrowed. */
export function yearOptions(rows: FitRow[]): number[] {
  const set = new Set<number>();
  for (const row of rows) {
    for (let y = row.yearStart; y <= row.yearEnd; y++) set.add(y);
  }
  return [...set].sort((a, b) => b - a);
}

/** Selectable values for one dimension, given the selections before it. */
export function optionsFor(rows: FitRow[], sel: Selection, key: Exclude<Dimension, "year">): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    if (!matchesUpstream(row, sel, key)) continue;
    set.add(key === "make" ? row.make : key === "model" ? row.model : row.partType);
  }
  return [...set].sort();
}

/**
 * Apply a change and clear any LATER select stranded on a value that no
 * longer has stock — pick Tesla after choosing Tundra and the model is
 * nonsense. Earlier selects are never touched; that is what keeps the
 * cascade one-directional and dead-end free.
 *
 * `keepPartType` is a multi-type slug (e.g. "tailgates-trunks") that isn't in
 * `rows` to validate against; dropping it would lose the category a visitor
 * arrived with from a landing-page tile.
 */
export function applyChange(
  rows: FitRow[],
  prev: Selection,
  key: Dimension,
  value: string,
  keepPartType?: string | null,
): Selection {
  const next: Selection = { ...prev, [key]: value };
  const changedAt = ORDER.indexOf(key);

  for (const later of ORDER.slice(changedAt + 1)) {
    const current = next[later];
    if (!current) continue;
    if (later === "partType" && keepPartType && current === keepPartType) continue;
    const stillStocked = rows.some(
      (row) => matchesUpstream(row, next, later) && rowHas(row, later, current),
    );
    if (!stillStocked) next[later] = "";
  }
  return next;
}
