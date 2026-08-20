// Insurance estimate upload — spec section 4.
//
//   "Estimate upload — let a shop upload an insurance estimate PDF and get a
//    quote back."
//
// WHAT THIS DOES AND DELIBERATELY DOESN'T DO
//
// Estimates come from CCC One, Mitchell and Audatex, and their layouts differ
// wildly; some are scans with no text layer at all. Reliably parsing every
// line item out of all of them is not something to promise, and quoting the
// wrong parts is worse than quoting nothing.
//
// So this reads the two things that ARE reliable:
//
//   * the VIN — every estimate carries one, it's checksummed, and we already
//     decode it (src/lib/vin.ts), which pins the exact vehicle including trim
//   * part-type keywords in the line items, using the same vocabulary matcher
//     the workbook importer uses
//
// and then shows the shop what it found FOR CONFIRMATION before anything is
// quoted. It is an accelerator for a human, not an automatic quote.
//
// PRIVACY: an insurance estimate contains the customer's name, address and
// claim number. The PDF is parsed in memory and NEVER STORED — only the
// extracted VIN and part types are kept, and only if the shop chooses to send
// a quote request.

import { matchPartTypeLoose } from "@/lib/inventory-import";
import { hasValidVinCheckDigit, normalizeVin } from "@/lib/vin";
import type { PartType } from "@/generated/prisma/enums";

/** Refuse anything implausible as an estimate before parsing it. */
export const ESTIMATE_LIMITS = {
  maxBytes: 8 * 1024 * 1024,
  /** Below this, there's no text layer worth reading — usually a scan. */
  minTextChars: 200,
} as const;

// 17 chars from the VIN alphabet, not adjacent to other alphanumerics so a
// long claim number can't produce a false positive.
const VIN_CANDIDATE = /(?<![A-Z0-9])([A-HJ-NPR-Z0-9]{17})(?![A-Z0-9])/g;

/**
 * Finds the VIN in estimate text.
 *
 * Estimates contain several long alphanumeric codes — claim numbers, policy
 * numbers, RO numbers. The check digit is what separates a real VIN from
 * those, so a candidate that fails it is only used when nothing else matches.
 */
export function findVin(text: string): { vin: string; checkDigitValid: boolean } | null {
  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const match of text.toUpperCase().matchAll(VIN_CANDIDATE)) {
    const vin = normalizeVin(match[1]);
    if (seen.has(vin)) continue;
    seen.add(vin);
    candidates.push(vin);
  }
  if (candidates.length === 0) return null;

  const valid = candidates.find((c) => hasValidVinCheckDigit(c));
  if (valid) return { vin: valid, checkDigitValid: true };
  return { vin: candidates[0], checkDigitValid: false };
}

/**
 * Part types named in the estimate, in the order they first appear.
 *
 * Uses the importer's vocabulary matcher so "L/H FRONT DOOR SHELL" and
 * "Door, Front Left" both resolve, and unrecognised lines are simply skipped
 * rather than guessed at.
 */
export function findPartTypes(text: string): PartType[] {
  const found: PartType[] = [];
  const seen = new Set<PartType>();
  // Line by line: matching against the whole document would let one stray
  // word claim the entire estimate.
  for (const rawLine of text.split(/[\n\r]+/)) {
    const line = rawLine.trim();
    if (!line || line.length > 200) continue;
    const type = matchPartTypeLoose(line);
    if (type && !seen.has(type)) {
      seen.add(type);
      found.push(type);
    }
  }
  return found;
}

export type EstimateParse = {
  vin: string | null;
  vinCheckDigitValid: boolean;
  partTypes: PartType[];
  /** True when the PDF had no usable text — almost always a scan. */
  looksScanned: boolean;
};

export function parseEstimateText(text: string): EstimateParse {
  const looksScanned = text.trim().length < ESTIMATE_LIMITS.minTextChars;
  const vin = findVin(text);
  return {
    vin: vin?.vin ?? null,
    vinCheckDigitValid: vin?.checkDigitValid ?? false,
    partTypes: findPartTypes(text),
    looksScanned,
  };
}
