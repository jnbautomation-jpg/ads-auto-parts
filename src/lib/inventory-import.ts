// Parses the client's hand-maintained inventory spreadsheets: a title row,
// a real header on row 2, makes appearing as standalone section rows that
// carry forward onto every row beneath them, a part-type title/section row
// (e.g. a lone "DOORS" cell — sometimes the sheet title itself, sometimes a
// mid-sheet section like the make ones) that carries forward the same way,
// and a MODEL cell that embeds the year range in one of two formats. Pure —
// no DB/Prisma access — so the same logic runs identically during preview
// and can be unit-tested in isolation.
//
// The workbook has ~12 tabs (DOOR INV, TRUNK ETC, TAILGATE, REAR BODY
// PANELS, HOODS, QUARTER PANEL, FENDER, BUMPERS, GRILLE, hinges, RADIATOR
// SUPPORT, reinforcement bar) with different column sets and column order —
// columns are always looked up by header name (buildColumnIndex), never
// position. A tab's own name is the part-type fallback (resolveTabPartType);
// a per-row TYPE column, when present, overrides it for just that row (a
// tab like "TRUNK ETC" can mix TRUNK and LIFTGATE rows).
import { PartPosition, PartType } from "@/generated/prisma/enums";
import { MAKE_ALIASES, canonicalMake, canonicalModel } from "@/lib/normalize";

export type ParsedInventoryRow = {
  rowNum: number;
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
  position: PartPosition | null;
  partType: PartType;
  quantity: number;
  cost: number;
  price: number;
  binLocation: string | null;
  // e.g. a dual "399/375" price cell — first number used as cost/price,
  // second recorded here rather than failing the row.
  note: string | null;
  // Set only for an unsplit "/" row whose quantity is unambiguous (a single
  // shared count for the whole row, not a per-vehicle split): the vehicle(s)
  // beyond the primary make/model above, sharing this row's year range,
  // position, and quantity. One Product gets one VehicleFit per entry here
  // plus one for the primary fit.
  additionalVehicles?: FlaggedVehicle[];
};

export type FlaggedVehicle = { make: string; model: string };

export type FlaggedInventoryRow = {
  rowNum: number;
  raw: string;
  reason: string;
  // 2 for an unsplit multi-vehicle "/" row, 1 for a single vehicle flagged
  // for some other reason (ambiguous single year, missing price, etc.).
  vehicles: FlaggedVehicle[];
  yearStart: number;
  yearEnd: number;
  position: PartPosition | null;
  partType: PartType;
  quantity: number;
  cost: number;
  price: number;
  binLocation: string | null;
};

export type FailedInventoryRow = {
  rowNum: number;
  raw: string;
  reason: string;
};

export type PartTypeCount = { partType: PartType; count: number };

export type InventoryParseResult = {
  parsed: ParsedInventoryRow[];
  flagged: FlaggedInventoryRow[];
  failed: FailedInventoryRow[];
  // Part types actually found via title/section rows or a per-row TYPE
  // column in the sheet itself — excludes any fallbackPartType contribution
  // — in first-seen order. Empty means the sheet had no detectable
  // part-type signal at all.
  detectedPartTypes: PartType[];
};

// Only MODEL/QTY/COST/SHOP are structurally required — LOCATION and SIDE
// are legitimately absent on some tabs (both are nullable in the schema)
// and the row-level parsing already tolerates a missing column for either.
const REQUIRED_COLUMNS = ["model", "qty", "cost", "shop"] as const;

// Per-part-type SIDE-column vocabulary. Each inner map is an exact-match
// lookup (uppercased, whitespace-collapsed base text — see
// splitSideQualifier) — never substring/contains — so a misaligned
// description cell (e.g. "COVER, FR (W/O SNSR HO)...") can't accidentally
// resolve just because it contains a recognized fragment. A part type with
// no entry here takes no SIDE value at all: any non-blank SIDE cell for it
// still fails rather than being silently ignored.
const POSITION_VOCAB: Partial<Record<PartType, Record<string, PartPosition>>> = {
  DOOR: {
    LF: "FRONT_LEFT",
    RF: "FRONT_RIGHT",
    LR: "REAR_LEFT",
    RR: "REAR_RIGHT",
  },
  FENDER: {
    // Client-confirmed: this shop's fenders are always front fenders — LH/RH
    // (the real column values) and L/R (kept for any tab still using the
    // short form) both mean front-left/front-right, never rear.
    L: "FRONT_LEFT",
    R: "FRONT_RIGHT",
    LH: "FRONT_LEFT",
    RH: "FRONT_RIGHT",
  },
  QUARTER_PANEL: {
    // Client-confirmed: same as FENDER — quarter panels are always front.
    LH: "FRONT_LEFT",
    RH: "FRONT_RIGHT",
  },
  BUMPER: {
    FRONT: "FRONT",
    REAR: "REAR",
  },
  GRILLE: {
    FRONT: "FRONT",
  },
  // HOOD: no entry — hoods carry no position; a non-blank SIDE cell fails.
  // The remaining tabs (TAILGATE, TRUNK, LIFTGATE, REAR_BODY_PANEL, HINGE,
  // RADIATOR_SUPPORT, REINFORCEMENT_BAR) have no reviewed real SIDE-column
  // data yet — left unmapped rather than guessed. Add entries once real
  // values are seen.
};

// The schema's PartPosition enum has no separate upper/lower granularity
// (see prisma/schema.prisma) — a SIDE cell like "front (upper)" or "Front
// lower" resolves to plain FRONT, with the upper/lower qualifier carried as
// a flagged note instead of silently dropped (same pattern parseMoneyCell
// uses for a parenthetical price annotation). This only strips an exact
// trailing "(upper)"/"(lower)" or bare trailing upper/lower word — never a
// substring scan — so it can't misfire on unrelated parenthetical content
// like "(W/O SNSR HO)".
const SIDE_QUALIFIER_RE = /^(.*?)\s*(?:\(\s*(upper|lower)\s*\)|\b(upper|lower)\b)$/i;

function splitSideQualifier(sideText: string): { base: string; qualifier: string | null } {
  const match = sideText.match(SIDE_QUALIFIER_RE);
  if (!match) return { base: sideText, qualifier: null };
  const qualifier = (match[2] ?? match[3])?.toLowerCase() ?? null;
  const base = normalizeWhitespace(match[1]);
  if (!qualifier || !base) return { base: sideText, qualifier: null };
  return { base, qualifier };
}

// Used both to detect a make section-header row and to spot an explicit make
// token at the start of the second half of a multi-vehicle "/" split (e.g.
// GMC, which never appears as its own section but shows up inline).
// Make recognition and canonicalization both come from MAKE_ALIASES in
// src/lib/normalize.ts — the same table the repair script uses. Keeping a
// second copy here is what let "VW" and "Volkswagen" become two separate
// makes in the first place (spec 1.7).

// The subset that can appear as a standalone section row carrying the make
// forward onto rows beneath it.
const SECTION_MAKES = new Set([
  "CHEVROLET",
  "CHEVY",
  "FORD",
  "HONDA",
  "HYUNDIA",
  "HYUNDAI",
  "JEEP",
  "KIA",
  "MAZDA",
  "NISSAN",
  "DODGE",
  "TESLA",
  "TOYOTA",
  "VW",
  "VOLKSWAGEN",
  "CHRYSLER",
  "MITSUBISHI",
]);

// Singular forms only — matchPartTypeTitle() also tries stripping a trailing
// "S" so "DOORS", "QUARTER PANELS", etc. match without listing every plural.
// Used for strict single-cell section-title-row detection (detectPartTypeTitleRow),
// which deliberately requires an exact-ish match since it fires on any lone
// non-blank cell in a row.
const PART_TYPE_TITLES: Record<string, PartType> = {
  DOOR: "DOOR",
  HOOD: "HOOD",
  TAILGATE: "TAILGATE",
  TRUNK: "TRUNK",
  LIFTGATE: "LIFTGATE",
  "REAR BODY PANEL": "REAR_BODY_PANEL",
  "REAR BODY": "REAR_BODY_PANEL",
  "QUARTER PANEL": "QUARTER_PANEL",
  FENDER: "FENDER",
  BUMPER: "BUMPER",
  GRILLE: "GRILLE",
  GRILL: "GRILLE",
  HINGE: "HINGE",
  "RADIATOR SUPPORT": "RADIATOR_SUPPORT",
  "REINFORCEMENT BAR": "REINFORCEMENT_BAR",
  REINFORCEMENT: "REINFORCEMENT_BAR",
};

// Loose keyword matching for tab names and per-row TYPE column values, which
// come decorated ("DOOR INV", "TRUNK ETC", "REAR BODY PANELS", lowercase
// "hinges", etc.) rather than as a clean single-cell title. Order doesn't
// matter — none of these keywords overlap.
const PART_TYPE_ALIASES: [RegExp, PartType][] = [
  [/\bdoors?\b/i, "DOOR"],
  [/\bhoods?\b/i, "HOOD"],
  [/\btailgates?\b/i, "TAILGATE"],
  [/\btrunks?\b/i, "TRUNK"],
  [/\bliftgates?\b/i, "LIFTGATE"],
  [/\brear\s*body/i, "REAR_BODY_PANEL"],
  [/\bquarter\s*panels?/i, "QUARTER_PANEL"],
  [/\bfenders?\b/i, "FENDER"],
  [/\bbumpers?\b/i, "BUMPER"],
  [/\bgrill(e)?s?\b/i, "GRILLE"],
  [/\bhinges?\b/i, "HINGE"],
  [/\bradiator\s*support/i, "RADIATOR_SUPPORT"],
  [/\breinforcement(\s*bars?)?\b/i, "REINFORCEMENT_BAR"],
];

// Resolves free text (a tab name or a TYPE-column cell) to a PartType via
// keyword matching — tolerant of extra words ("DOOR INV", "TRUNK ETC"),
// case, and plurals. Returns null when nothing recognizable is found.
export function matchPartTypeLoose(text: string): PartType | null {
  const normalized = normalizeWhitespace(text.replace(/_/g, " "));
  if (!normalized) return null;
  for (const [re, type] of PART_TYPE_ALIASES) {
    if (re.test(normalized)) return type;
  }
  return null;
}

// Strips noise from a tab or uploaded-file name that has nothing to do with
// the part type itself — a file extension, a browser's "(1)"-style
// duplicate-download suffix, and the literal word INV — before handing the
// text to matchPartTypeLoose. Dropdown-guess only; row-level TYPE-column
// values go through matchPartTypeLoose directly and never see this.
function stripNameNoise(text: string): string {
  return text
    .replace(/\.(csv|xlsx|xls)$/i, "")
    .replace(/\(\s*\d+\s*\)/g, " ")
    .replace(/\binv\b/gi, " ");
}

// Derives a tab's default part type from its own name — used as the
// fallbackPartType seed so most tabs never need a manual category pick.
export function resolveTabPartType(sheetName: string): PartType | null {
  return matchPartTypeLoose(stripNameNoise(sheetName));
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

// Matches a cell's text against a known part-type title — case/spacing
// insensitive, and tolerant of a simple trailing-S plural ("DOORS" -> DOOR).
function matchPartTypeTitle(cellText: string): PartType | null {
  const normalized = normalizeWhitespace(cellText.replace(/_/g, " ")).toUpperCase();
  if (!normalized) return null;
  if (PART_TYPE_TITLES[normalized]) return PART_TYPE_TITLES[normalized];
  if (normalized.endsWith("S")) {
    const singular = normalized.slice(0, -1);
    if (PART_TYPE_TITLES[singular]) return PART_TYPE_TITLES[singular];
  }
  return null;
}

// A part-type title row — unlike a make section row — can land in any
// column: it's often a merged/centered heading (e.g. the sheet's own title
// row), not something typed into the MODEL column. So this scans every cell
// in the row and only matches when exactly one is non-blank.
function detectPartTypeTitleRow(cells: string[]): PartType | null {
  const nonBlank = cells.map((c) => normalizeWhitespace((c ?? "").toString())).filter(Boolean);
  if (nonBlank.length !== 1) return null;
  return matchPartTypeTitle(nonBlank[0]);
}

// A make section row can land in any column, not just MODEL (e.g. bumpers'
// "|| CHEVY ||||" has leading blank cells shifting the make token over) —
// and, unlike a part-type title row, can carry unrelated stray content
// alongside the make token (e.g. bumpers' ["", "HONDA", "", "", "", "15",
// "", ""], where "15" is leftover residue in some other cell). So this
// doesn't require the row to have exactly one non-blank cell — it scans
// every cell for a KNOWN make token specifically (exact match against
// SECTION_MAKES) and only fires when exactly one cell matches.
function detectMakeSectionRow(cells: string[]): string | null {
  const matches = cells
    .map((c) => normalizeWhitespace((c ?? "").toString()).toUpperCase())
    .filter((c) => SECTION_MAKES.has(c));
  if (matches.length !== 1) return null;
  return canonicalMake(matches[0]);
}

function titleCase(s: string): string {
  return s
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function expandYear(digits: string): number {
  const n = Number(digits);
  return digits.length <= 2 ? 2000 + n : n;
}

// Some hand-entered cells glue the year directly onto the model with no
// space ("17 - 22ROGUE SPORT", "19 -24RAV 4", "2025Camry"). Insert the
// missing space before the year regexes below ever see the cell.
function normalizeYearSpacing(s: string): string {
  return s
    .replace(/^(\d{2,4}\s*-\s*\d{2,4})(?=[A-Za-z])/, "$1 ")
    .replace(/([A-Za-z])(?=\d{2,4}\s*-\s*\d{2,4}$)/, "$1 ")
    .replace(/^(\d{2,4})(?=[A-Za-z])/, "$1 ");
}

// "18-24 EQUINOX" / "16-24 malibu"
const PREFIX_YEAR_RE = /^(\d{2,4})\s*-\s*(\d{2,4})\s+(.+)$/;
// "ALTIMA 13 - 18" / "Model Y 20-24"
const SUFFIX_YEAR_RE = /^(.+?)\s+(\d{2,4})\s*-\s*(\d{2,4})$/;
// "2025 Camry" — a single year with no explicit range. Deliberately only 2-
// or 4-digit (not 3), so a stray 3-digit trim code doesn't look like a year.
const SINGLE_YEAR_PREFIX_RE = /^(\d{4}|\d{2})\s+(.+)$/;
const SINGLE_YEAR_SUFFIX_RE = /^(.+?)\s+(\d{4}|\d{2})$/;

type YearModel = {
  yearStart: number;
  yearEnd: number;
  model: string;
  // True for a bare single-year cell ("2025 Camry") — no explicit range, so
  // the caller should flag it for a human to confirm rather than commit it.
  singleYear: boolean;
};

function parseYearModel(cell: string): YearModel | null {
  const normalized = normalizeWhitespace(normalizeYearSpacing(cell));

  const prefix = normalized.match(PREFIX_YEAR_RE);
  if (prefix) {
    return { yearStart: expandYear(prefix[1]), yearEnd: expandYear(prefix[2]), model: titleCase(prefix[3]), singleYear: false };
  }
  const suffix = normalized.match(SUFFIX_YEAR_RE);
  if (suffix) {
    return { yearStart: expandYear(suffix[2]), yearEnd: expandYear(suffix[3]), model: titleCase(suffix[1]), singleYear: false };
  }
  const singlePrefix = normalized.match(SINGLE_YEAR_PREFIX_RE);
  if (singlePrefix) {
    const year = expandYear(singlePrefix[1]);
    return { yearStart: year, yearEnd: year, model: titleCase(singlePrefix[2]), singleYear: true };
  }
  const singleSuffix = normalized.match(SINGLE_YEAR_SUFFIX_RE);
  if (singleSuffix) {
    const year = expandYear(singleSuffix[2]);
    return { yearStart: year, yearEnd: year, model: titleCase(singleSuffix[1]), singleYear: true };
  }
  return null;
}

function stripMakePrefix(cell: string): { make: string | null; rest: string } {
  const normalized = normalizeWhitespace(cell);
  const firstWord = normalized.split(" ")[0]?.toUpperCase();
  if (firstWord && firstWord in MAKE_ALIASES) {
    return { make: canonicalMake(firstWord), rest: normalized.slice(firstWord.length).trim() };
  }
  return { make: null, rest: normalized };
}

// Model canonicalization lives in src/lib/normalize.ts, shared with
// scripts/clean-vehicle-data.ts. The importer and the repair script must
// apply identical rules — otherwise cleaning the table just postpones the
// mess until the next upload (spec 1.6).
const canonicalizeModel = canonicalModel;

// Strips a redundant leading make token (e.g. "Ford F 150" when the row is
// already under a Ford section) and applies the canonical-spelling pass.
function finalizeModel(model: string): string {
  return canonicalizeModel(stripMakePrefix(model).rest);
}

// Parses a price cell, tolerating a dual "399/375" format: the first number
// is used as the value, the second is returned as an informational note
// instead of failing the row.
function parseMoneyMaybeDual(cell: string): { value: number | null; note: string | null } {
  const cleaned = cell.replace(/[$,]/g, "").trim();
  if (cleaned === "") return { value: null, note: null };

  if (cleaned.includes("/")) {
    const parts = cleaned.split("/").map((s) => s.trim()).filter(Boolean);
    const first = Number(parts[0]);
    if (!Number.isFinite(first)) return { value: null, note: null };
    const rest = parts.slice(1).join(" / ");
    return {
      value: first,
      note: rest ? `Alternate price "${rest}" also listed in source (used "${parts[0]}").` : null,
    };
  }

  const n = Number(cleaned);
  return { value: Number.isFinite(n) ? n : null, note: null };
}

// Handles junk riding along with a price, e.g. "346 (not in stock)" — the
// leading number is still used as the value, but the annotation always gets
// flagged for a human to see rather than silently dropped.
function parseMoneyCell(cell: string): { value: number | null; note: string | null; flagged: boolean } {
  const trimmed = cell.trim();
  const parenMatch = trimmed.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    const [, before, annotation] = parenMatch;
    const dual = parseMoneyMaybeDual(before);
    const annotationNote = `Source noted "${annotation.trim()}" on this price.`;
    return {
      value: dual.value,
      note: dual.note ? `${annotationNote} ${dual.note}` : annotationNote,
      flagged: true,
    };
  }
  const dual = parseMoneyMaybeDual(trimmed);
  return { value: dual.value, note: dual.note, flagged: false };
}

// Handles non-numeric QTY text (e.g. "out" meaning out of stock) — treated
// as 0 on hand, but always flagged so a human confirms rather than the
// sheet's actual count silently disappearing.
function parseQuantityCell(cell: string): { value: number; flagged: boolean; reason: string | null } {
  const trimmed = cell.trim();
  if (trimmed === "") return { value: 0, flagged: false, reason: null };
  const n = Number(trimmed);
  if (Number.isInteger(n) && n >= 0) return { value: n, flagged: false, reason: null };
  return { value: 0, flagged: true, reason: `QTY "${trimmed}" isn't a number — treated as 0, confirm.` };
}

export type InventoryColumnIndex = Record<string, number>;

// Header label variants that mean the same column as the canonical key —
// e.g. the hinges tab labels its sell-price column "sell" instead of SHOP.
const HEADER_ALIASES: Record<string, string> = {
  sell: "shop",
};

export function buildColumnIndex(headerRow: string[]): InventoryColumnIndex {
  const index: InventoryColumnIndex = {};
  headerRow.forEach((cell, i) => {
    const key = normalizeWhitespace(cell).toLowerCase();
    if (!key) return;
    index[key] = i;
    const aliasKey = HEADER_ALIASES[key];
    if (aliasKey && !(aliasKey in index)) index[aliasKey] = i;
  });
  return index;
}

export function missingRequiredColumns(index: InventoryColumnIndex): string[] {
  return REQUIRED_COLUMNS.filter((c) => !(c in index));
}

// Real tabs don't agree on which row actually holds the column headers —
// some have an extra blank or Partslink-only row between the title and the
// header. Scans the first few rows for the one that looks like a header
// (matches at least 3 of the 4 required concepts — MODEL/QTY/COST/SHOP,
// including the "sell" alias) rather than assuming a fixed row. Returns the
// 0-based row index, or null if nothing in the scanned rows qualifies.
export function findHeaderRowIndex(rows: string[][], maxScan = 5): number | null {
  for (let i = 0; i < Math.min(maxScan, rows.length); i++) {
    const index = buildColumnIndex(rows[i]);
    const hitCount = REQUIRED_COLUMNS.filter((c) => c in index).length;
    if (hitCount >= 3) return i;
  }
  return null;
}

// Header names vary slightly across tabs ("TYPE" vs "PART TYPE", "Partslink
// number" vs "Partslink") — find the first column whose normalized header
// contains the given token, rather than requiring an exact key match.
function findColumnContaining(index: InventoryColumnIndex, token: string): number | undefined {
  for (const [key, col] of Object.entries(index)) {
    if (key.includes(token)) return col;
  }
  return undefined;
}

// `dataRows` excludes both the title row and the header row — callers pass
// the header row separately, and `dataStartRow` (the 1-based Excel row
// number the first entry of `dataRows` corresponds to) so the row-number
// math is done in exactly one place. Real tabs don't all put the header on
// row 2 — callers locate it themselves (see findHeaderRowIndex) — so this
// no longer assumes a fixed offset. `titleRow` is row 1 itself: its lone
// cell (if any) is checked for a part-type title too, since that's often
// where a single-category sheet's category actually lives (e.g. a centered
// "DOORS" heading), not in the data area.
// `fallbackPartType` seeds the current part type when nothing in the sheet
// names one — normally the tab's own name (resolveTabPartType), or the
// manually-selected category from the import form — and also fills any gap
// before the first in-sheet part-type title is found. A per-row TYPE column,
// when present and non-blank, overrides the fallback for just that row.
export function parseInventorySheet(
  dataRows: string[][],
  headerRow: string[],
  titleRow: string[] = [],
  fallbackPartType: PartType | null = null,
  dataStartRow: number = 3,
): InventoryParseResult {
  const index = buildColumnIndex(headerRow);
  const locationCol = index["location"];
  const modelCol = index["model"];
  const sideCol = index["side"];
  const qtyCol = index["qty"];
  const costCol = index["cost"];
  const shopCol = index["shop"];
  const typeCol = index["type"] ?? findColumnContaining(index, "part type");
  const partslinkCol = findColumnContaining(index, "partslink");

  const parsed: ParsedInventoryRow[] = [];
  const flagged: FlaggedInventoryRow[] = [];
  const failed: FailedInventoryRow[] = [];

  const detectedPartTypes: PartType[] = [];
  const seenPartTypes = new Set<PartType>();
  const markDetected = (pt: PartType) => {
    if (!seenPartTypes.has(pt)) {
      seenPartTypes.add(pt);
      detectedPartTypes.push(pt);
    }
  };

  let currentMake: string | null = null;

  const titleHint = detectPartTypeTitleRow(titleRow);
  if (titleHint) markDetected(titleHint);
  let currentPartType: PartType | null = titleHint ?? fallbackPartType;

  dataRows.forEach((cells, i) => {
    const rowNum = dataStartRow + i;
    const get = (c: number | undefined) => (c === undefined ? "" : (cells[c] ?? "")).toString();
    const raw = cells.join(" | ").trim();

    // Part-type title/section row — can land in any column (often a
    // merged/centered heading), so this checks the whole row, not just
    // MODEL. Checked before the blank-row bail below so it isn't swallowed
    // when it lands in a column that bail doesn't look at.
    const partTypeTitle = detectPartTypeTitleRow(cells);
    if (partTypeTitle) {
      currentPartType = partTypeTitle;
      markDetected(partTypeTitle);
      return;
    }

    // Make section row — same "lone non-blank cell, any column" shape as a
    // part-type title row above, so it's checked the same way and just as
    // early, before the blank-row bail below can swallow it.
    const makeSection = detectMakeSectionRow(cells);
    if (makeSection) {
      currentMake = makeSection;
      return;
    }

    const modelRaw = normalizeWhitespace(get(modelCol));
    const sideRaw = normalizeWhitespace(get(sideCol));
    const qtyRaw = get(qtyCol).trim();
    const costRaw = get(costCol).trim();
    const shopRaw = get(shopCol).trim();
    const locationRaw = get(locationCol).trim();
    const typeRaw = normalizeWhitespace(get(typeCol));
    const partslinkRaw = normalizeWhitespace(get(partslinkCol));

    if (!modelRaw && !sideRaw && !qtyRaw && !costRaw && !shopRaw && !locationRaw && !typeRaw) return; // fully blank row

    if (!modelRaw) {
      failed.push({ rowNum, raw, reason: "MODEL cell is empty." });
      return;
    }
    if (!currentMake) {
      failed.push({ rowNum, raw, reason: "No make section row found above this row." });
      return;
    }

    // A per-row TYPE column overrides the section/tab fallback for just
    // this row — a tab like "TRUNK ETC" mixes TRUNK and Liftgate rows this
    // way. An unrecognized TYPE value doesn't fail the row (the fallback
    // still applies) but does get flagged so a human confirms the guess.
    let partType = currentPartType;
    let typeReason: string | null = null;
    if (typeRaw) {
      const resolved = matchPartTypeLoose(typeRaw);
      if (resolved) {
        partType = resolved;
        markDetected(resolved);
      } else {
        typeReason = `Unrecognized TYPE "${typeRaw}" — kept ${partType ?? "no"} fallback, confirm.`;
      }
    }

    if (!partType) {
      failed.push({ rowNum, raw, reason: "No part-type section row, TYPE column, or tab fallback found for this row." });
      return;
    }

    // A description/reference column (e.g. "Partslink number") naming a
    // different part type than the one this row resolved to — flagged for
    // manual review rather than guessing which signal is right.
    let conflictReason: string | null = null;
    if (partslinkRaw) {
      const hinted = matchPartTypeLoose(partslinkRaw);
      if (hinted && hinted !== partType) {
        conflictReason = `Partslink text "${partslinkRaw}" suggests ${hinted}, but this row resolved to ${partType} — needs manual review.`;
      }
    }

    // An unrecognized SIDE value (a free-text part description like "COVER,
    // FR (W/O SNSR HO)..." riding in the SIDE column, a typo like "frony",
    // or anything else that isn't an exact vocabulary token) never fails the
    // row outright — it's flagged for a human to set the position manually,
    // the same way an unrecognized TYPE value is. Matching stays exact
    // (POSITION_VOCAB lookup, never substring/contains) — the point is to
    // stop guessing, not to fail harder; a false-positive match on garbage
    // text would be worse than asking a human.
    let position: PartPosition | null = null;
    let sideReason: string | null = null;
    if (sideRaw) {
      const { base, qualifier } = splitSideQualifier(sideRaw);
      const mapped = POSITION_VOCAB[partType]?.[base.toUpperCase()];
      if (!mapped) {
        sideReason = `Unrecognized SIDE "${sideRaw}" — not a known position for ${partType}, set manually.`;
      } else {
        position = mapped;
        if (qualifier) {
          sideReason = `SIDE "${sideRaw}" specified a ${qualifier.toUpperCase()} qualifier — no separate upper/lower position field exists yet, recorded as ${mapped} only, confirm placement.`;
        }
      }
    }

    // Dual "399/375" cells never fail the row — the first number is used,
    // the second (if any) is carried as an informational note. A genuinely
    // missing/unparseable price still blocks commit, but only gets the row
    // flagged for manual review rather than dropped as a hard failure. A
    // parenthetical annotation ("346 (not in stock)") still extracts the
    // leading number but always flags — that note is too important to lose
    // silently the way the dual-price note is.
    const costResult = parseMoneyCell(costRaw);
    const priceResult = parseMoneyCell(shopRaw);
    const priceNote = [costResult.note, priceResult.note].filter(Boolean).join(" ") || null;
    const priceAnnotated = costResult.flagged || priceResult.flagged;
    const priceIssue =
      costResult.value === null || costResult.value < 0
        ? `Missing or invalid COST "${costRaw}".`
        : priceResult.value === null || priceResult.value < 0
          ? `Missing or invalid SHOP price "${shopRaw}".`
          : null;
    const cost = costResult.value ?? 0;
    const price = priceResult.value ?? 0;

    const binLocation = locationRaw ? locationRaw.toUpperCase() : null;

    if (modelRaw.includes("/")) {
      const [leftRaw, rightRaw] = modelRaw.split("/").map((s) => s.trim());
      const left = parseYearModel(leftRaw);
      // Only treat "/" as a multi-vehicle separator when the left side
      // parses as a real year+model — e.g. "18-24 Equinox/GMC Terrain".
      // When it doesn't (e.g. "HD CVIC H/B 2022-2026", where "H/B" is a
      // body-style abbreviation, not a vehicle boundary), this isn't a
      // split at all — fall through and parse the whole modelRaw as one
      // vehicle below instead of failing the row.
      if (left) {
        const { make: explicitRightMake, rest: rightRest } = stripMakePrefix(rightRaw);
        const rightMake = explicitRightMake ?? currentMake;
        const rightModel = canonicalizeModel(titleCase(rightRest));
        const leftModel = finalizeModel(left.model);

        // Unlike the single-vehicle path, an unparseable/dual QTY here doesn't
        // fail the row — it just means we can't tell how this row's count
        // splits between the two vehicles, so it still needs a human, but as a
        // flag (with both vehicles preserved for reference) rather than a drop.
        const qtyResult = parseQuantityCell(qtyRaw);
        const quantity = qtyResult.value;

        const reasonParts: string[] = [];
        if (qtyResult.flagged) {
          reasonParts.push(
            `QTY "${qtyRaw}" doesn't say how it splits between the 2 vehicles in "${modelRaw}" — enter manually.`,
          );
        }
        if (priceIssue) reasonParts.push(priceIssue);
        if (priceAnnotated && priceNote) reasonParts.push(priceNote);
        if (typeReason) reasonParts.push(typeReason);
        if (conflictReason) reasonParts.push(conflictReason);
        if (sideReason) reasonParts.push(sideReason);

        if (reasonParts.length > 0) {
          flagged.push({
            rowNum,
            raw,
            reason: reasonParts.join(" "),
            vehicles: [
              { make: currentMake, model: leftModel },
              { make: rightMake, model: rightModel },
            ],
            yearStart: left.yearStart,
            yearEnd: left.yearEnd,
            position,
            partType,
            quantity,
            cost,
            price,
            binLocation,
          });
          return;
        }

        // Unambiguous shared quantity: one product, fit to both vehicles.
        parsed.push({
          rowNum,
          make: currentMake,
          model: leftModel,
          additionalVehicles: [{ make: rightMake, model: rightModel }],
          yearStart: left.yearStart,
          yearEnd: left.yearEnd,
          position,
          partType,
          quantity,
          cost,
          price,
          binLocation,
          note: priceNote && !priceAnnotated ? priceNote : null,
        });
        return;
      }
    }

    const qtyResult = parseQuantityCell(qtyRaw);
    const quantity = qtyResult.value;

    const yearModel = parseYearModel(modelRaw);
    if (!yearModel) {
      failed.push({ rowNum, raw, reason: `Could not find a year range in the MODEL cell "${modelRaw}".` });
      return;
    }
    const finalModel = finalizeModel(yearModel.model);

    const reasonParts: string[] = [];
    if (yearModel.singleYear) {
      reasonParts.push(
        `Single year "${yearModel.yearStart}" with no explicit range in "${modelRaw}" — confirm and enter manually.`,
      );
    }
    if (priceIssue) reasonParts.push(priceIssue);
    if (priceAnnotated && priceNote) reasonParts.push(priceNote);
    if (qtyResult.flagged && qtyResult.reason) reasonParts.push(qtyResult.reason);
    if (typeReason) reasonParts.push(typeReason);
    if (conflictReason) reasonParts.push(conflictReason);
    if (sideReason) reasonParts.push(sideReason);

    if (reasonParts.length > 0) {
      flagged.push({
        rowNum,
        raw,
        reason: reasonParts.join(" "),
        vehicles: [{ make: currentMake, model: finalModel }],
        yearStart: yearModel.yearStart,
        yearEnd: yearModel.yearEnd,
        position,
        partType,
        quantity,
        cost,
        price,
        binLocation,
      });
      return;
    }

    parsed.push({
      rowNum,
      make: currentMake,
      model: finalModel,
      yearStart: yearModel.yearStart,
      yearEnd: yearModel.yearEnd,
      position,
      partType,
      quantity,
      cost,
      price,
      binLocation,
      note: priceNote,
    });
  });

  return { parsed, flagged, failed, detectedPartTypes };
}
