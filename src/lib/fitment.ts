// Fitment detail presentation — spec section 4.
//
//   "Better fitment data per part — OEM part number, shell vs skin, steel vs
//    aluminum, pre-cut mirror and handle holes, paint prep status. Directly
//    cuts returns, same as the VIN lookup."
//
// The governing rule here: NULL MEANS UNRECORDED, NOT NO.
//
// Telling a shop a door has no mirror hole when nobody ever checked is worse
// than telling them nothing — they order on the strength of it, the panel
// arrives wrong, and that is exactly the return this feature exists to
// prevent. So an unknown field is omitted from the spec table entirely
// rather than rendered as "No".

import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

export type FitmentFields = {
  oemPartNumber?: string | null;
  construction?: string | null;
  material?: string | null;
  paintPrep?: string | null;
  hasMirrorHole?: boolean | null;
  hasHandleHole?: boolean | null;
};

export type FitmentRow = { label: string; value: string };

/**
 * The rows to show for a part, skipping anything unrecorded.
 *
 * Returns an empty array when nothing is known, so callers can hide the whole
 * section rather than render an empty box.
 */
export function fitmentRows(part: FitmentFields, locale: Locale = "en"): FitmentRow[] {
  const d = getDictionary(locale).fitment;
  const rows: FitmentRow[] = [];

  if (part.oemPartNumber?.trim()) {
    rows.push({ label: d.oemNumber, value: part.oemPartNumber.trim() });
  }
  if (part.construction) {
    rows.push({
      label: d.construction,
      value: part.construction === "SHELL" ? d.shell : d.skin,
    });
  }
  if (part.material) {
    rows.push({
      label: d.material,
      value: part.material === "ALUMINUM" ? d.aluminum : d.steel,
    });
  }
  if (part.paintPrep) {
    rows.push({
      label: d.paintPrep,
      value:
        part.paintPrep === "PRIMED" ? d.primed : part.paintPrep === "EDP_COATED" ? d.edp : d.bare,
    });
  }
  // Explicit null check — `false` is a real answer ("no mirror hole") and
  // must render; only null/undefined is omitted.
  if (part.hasMirrorHole !== null && part.hasMirrorHole !== undefined) {
    rows.push({ label: d.mirrorHole, value: part.hasMirrorHole ? d.preCut : d.notCut });
  }
  if (part.hasHandleHole !== null && part.hasHandleHole !== undefined) {
    rows.push({ label: d.handleHole, value: part.hasHandleHole ? d.preCut : d.notCut });
  }

  return rows;
}

/** True when a part has any fitment detail worth showing. */
export function hasFitmentDetail(part: FitmentFields): boolean {
  return fitmentRows(part).length > 0;
}
