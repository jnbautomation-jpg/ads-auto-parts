// Canonical make/model normalization — Phase 2 spec 1.6, 1.7, 1.8.
//
// One canonical string per make and per model. This is the single place that
// decides what a vehicle is called, used by BOTH:
//
//   * the workbook importer (src/lib/inventory-import.ts), so new rows land
//     clean, and
//   * scripts/clean-vehicle-data.ts, which repairs rows already in the
//     database.
//
// Those two must never diverge: cleaning the table with one set of rules
// while the importer applies another just means the mess returns with the
// next upload.
//
// Everything here is pure — no database access — so it is unit-testable and
// runs identically in both places.

/**
 * Make aliases. Key is the uppercased raw token, value is canonical.
 *
 * Spec 1.7: "Volkswagen" and "VW" were two separate makes, splitting the same
 * manufacturer across two filter entries. Both now resolve to "Volkswagen".
 */
export const MAKE_ALIASES: Record<string, string> = {
  CHEVROLET: "Chevrolet",
  CHEVY: "Chevrolet",
  CHRYSLER: "Chrysler",
  DODGE: "Dodge",
  FORD: "Ford",
  GMC: "GMC",
  HONDA: "Honda",
  HYUNDAI: "Hyundai",
  HYUNDIA: "Hyundai", // misspelled in the source sheets
  JEEP: "Jeep",
  KIA: "Kia",
  MAZDA: "Mazda",
  MITSUBISHI: "Mitsubishi",
  NISSAN: "Nissan",
  RAM: "RAM",
  TESLA: "Tesla",
  TOYOTA: "Toyota",
  VOLKSWAGEN: "Volkswagen",
  VW: "Volkswagen", // spec 1.7 — was its own separate make
};

export function canonicalMake(raw: string): string {
  const key = collapse(raw).toUpperCase();
  if (!key) return "";
  return MAKE_ALIASES[key] ?? titleCase(collapse(raw));
}

// Spec 1.8: CAPA certification was baked into model strings — "Camry (capa)",
// "Camry Capa", "Camry(capa)" all became separate models. It belongs in the
// capaCertified boolean, which already exists and already has a filter wired
// to it.
//
// Matches CAPA as its own word or in brackets, anywhere in the string,
// including the unclosed "(capa" seen in the live data.
const CAPA_RE = /[\s(]*\(?\s*\bcapa\b\s*\)?/gi;

/** Splits a CAPA marker out of a model string. */
export function extractCapa(model: string): { model: string; capa: boolean } {
  const capa = /\bcapa\b/i.test(model);
  if (!capa) return { model, capa: false };
  return { model: collapse(model.replace(CAPA_RE, " ")), capa: true };
}

// Known misspellings from the live data (spec 1.6).
const MISSPELLINGS: [RegExp, string][] = [
  [/\bcorrolla\b/gi, "Corolla"],
  [/\boddesey\b/gi, "Odyssey"],
  [/\bodessey\b/gi, "Odyssey"],
  [/\bchallanger\b/gi, "Challenger"],
  [/\btuscon\b/gi, "Tucson"],
  [/\bsantafe\b/gi, "Santa Fe"],
  [/\bsilverado\b/gi, "Silverado"],
];

// Nameplates whose canonical spelling is not what title-casing produces.
// Ordered pattern fixes rather than a lookup table so they also apply inside
// a longer string ("Cx-5 Touring").
const NAMEPLATE_FIXES: [RegExp, string][] = [
  [/\bcr[\s-]?v\b/gi, "CR-V"],
  [/\bhr[\s-]?v\b/gi, "HR-V"],
  [/\bbr[\s-]?v\b/gi, "BR-V"],
  [/\bc[\s-]?hr\b/gi, "C-HR"],
  [/\bcx[\s-]?(\d{1,2})\b/gi, "CX-$1"],
  [/\bmx[\s-]?(\d{1,2})\b/gi, "MX-$1"],
  [/\bf[\s-]?(\d{3})\b/gi, "F-$1"],
  [/\brav[\s-]?4\b/gi, "RAV4"],
  [/\b(\d)runner\b/gi, "$1Runner"],
  [/\bid[\s.]?(\d)\b/gi, "ID.$1"],
  [/\bq(\d{1,2})\b/gi, "Q$1"],
  // Jeep generation codes, which appear as a bracketed suffix
  // ("Wrangler (JL)"). Listed one by one rather than matched as "any two
  // letters", which would wreck ordinary words.
  [/\bjl\b/gi, "JL"],
  [/\bjk\b/gi, "JK"],
  [/\bjt\b/gi, "JT"],
  [/\btj\b/gi, "TJ"],
  [/\byj\b/gi, "YJ"],
  [/\bxj\b/gi, "XJ"],
  [/\bwk\b/gi, "WK"],
];

/**
 * Repairs the unbalanced brackets seen in the live data — "Charger (capa",
 * "B)(capa)", "Cpe)", "Civic (h". Drops any bracketed fragment that never
 * closes, and any stray closing bracket with no opener, rather than leaving
 * punctuation debris in a customer-facing model name.
 */
function fixBrackets(input: string): string {
  let out = "";
  let depth = 0;
  for (const char of input) {
    if (char === "(") {
      depth++;
      out += char;
      continue;
    }
    if (char === ")") {
      // Stray closer with nothing open — drop it.
      if (depth === 0) continue;
      depth--;
      out += char;
      continue;
    }
    out += char;
  }
  // An opener that never closed: drop from the last unmatched "(" onward.
  while (depth > 0) {
    const idx = out.lastIndexOf("(");
    if (idx === -1) break;
    out = out.slice(0, idx);
    depth--;
  }
  // An empty "()" left behind carries no information.
  return collapse(out.replace(/\(\s*\)/g, " "));
}

/**
 * Canonical model string. Idempotent: running it on already-clean input
 * returns the same value, which is what makes it safe to apply both on
 * import and as a repair pass over existing rows.
 */
export function canonicalModel(raw: string): string {
  let s = collapse(raw);
  if (!s) return "";

  s = extractCapa(s).model;
  s = fixBrackets(s);
  // Normalize spacing around brackets before casing, so "Challenger(single
  // Scoop)" and "Challenger (single Scoop)" don't survive as two models.
  s = collapse(s.replace(/\s*\(\s*/g, " (").replace(/\s*\)/g, ")"));
  s = titleCase(s);

  for (const [pattern, replacement] of MISSPELLINGS) s = s.replace(pattern, replacement);
  for (const [pattern, replacement] of NAMEPLATE_FIXES) s = s.replace(pattern, replacement);

  return collapse(s);
}

/** Canonical make + model together, plus whether CAPA was embedded in the model. */
export function normalizeVehicle(
  make: string,
  model: string,
): { make: string; model: string; capa: boolean } {
  const { capa } = extractCapa(model);
  return { make: canonicalMake(make), model: canonicalModel(model), capa };
}

/**
 * Runs of whitespace — including newlines — become single spaces, and the
 * ends are trimmed. Exported because it is not specific to vehicle data: the
 * lead notification email uses it to flatten a subject line.
 */
export function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

// Uppercases the first *letter* of each word, not the first character — so
// "(single scoop)" becomes "(Single Scoop)" rather than "(single Scoop)".
// The nameplate fixes above then restore the genuine acronyms.
function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
