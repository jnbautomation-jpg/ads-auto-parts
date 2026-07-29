// Parses the client's hand-maintained inventory spreadsheets: a title row,
// a real header on row 2, makes appearing as standalone section rows that
// carry forward onto every row beneath them, a part-type title/section row
// (e.g. a lone "DOORS" cell — sometimes the sheet title itself, sometimes a
// mid-sheet section like the make ones) that carries forward the same way,
// and a MODEL cell that embeds the year range in one of two formats. Pure —
// no DB/Prisma access — so the same logic runs identically during preview
// and can be unit-tested in isolation.
import { PartPosition, PartType } from "@/generated/prisma/enums";

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
  // Part types actually found via title/section rows in the sheet itself —
  // excludes any fallbackPartType contribution — in first-seen order.
  // Empty means the sheet had no detectable part-type titles at all.
  detectedPartTypes: PartType[];
};

const REQUIRED_COLUMNS = ["location", "model", "side", "qty", "cost", "shop"] as const;

const SIDE_LOOKUP: Record<string, PartPosition> = {
  LF: "FRONT_LEFT",
  RF: "FRONT_RIGHT",
  LR: "REAR_LEFT",
  RR: "REAR_RIGHT",
};

// Used both to detect a make section-header row and to spot an explicit make
// token at the start of the second half of a multi-vehicle "/" split (e.g.
// GMC, which never appears as its own section but shows up inline).
const MAKE_LABELS: Record<string, string> = {
  CHEVROLET: "Chevrolet",
  FORD: "Ford",
  HONDA: "Honda",
  HYUNDAI: "Hyundai",
  HYUNDIA: "Hyundai", // misspelled in the source file
  JEEP: "Jeep",
  KIA: "Kia",
  MAZDA: "Mazda",
  NISSAN: "Nissan",
  DODGE: "Dodge",
  TESLA: "Tesla",
  TOYOTA: "Toyota",
  VW: "VW",
  GMC: "GMC",
};

// The subset that can appear as a standalone section row carrying the make
// forward onto rows beneath it.
const SECTION_MAKES = new Set([
  "CHEVROLET",
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
]);

// Singular forms only — matchPartTypeTitle() also tries stripping a trailing
// "S" so "DOORS", "QUARTER PANELS", etc. match without listing every plural.
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
};

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
  if (firstWord && MAKE_LABELS[firstWord]) {
    return { make: MAKE_LABELS[firstWord], rest: normalized.slice(firstWord.length).trim() };
  }
  return { make: null, rest: normalized };
}

// Common misspellings seen in the source sheets.
const MODEL_MISSPELLINGS: [RegExp, string][] = [[/\btuscon\b/gi, "Tucson"]];

// Canonical spelling for nameplates that show up with inconsistent
// spacing/hyphenation across rows (title-cased first, so casing here is
// what survives) — keeps the same vehicle from splitting into two.
const MODEL_PATTERN_FIXES: [RegExp, string][] = [
  [/\bcr[\s-]?v\b/gi, "CR-V"],
  [/\bhr[\s-]?v\b/gi, "HR-V"],
  [/\bf[\s-]?(\d{3})\b/gi, "F-$1"],
  [/\brav[\s-]?4\b/gi, "RAV4"],
];

function canonicalizeModel(model: string): string {
  let result = model;
  for (const [pattern, replacement] of MODEL_MISSPELLINGS) result = result.replace(pattern, replacement);
  for (const [pattern, replacement] of MODEL_PATTERN_FIXES) result = result.replace(pattern, replacement);
  return normalizeWhitespace(result);
}

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

export type InventoryColumnIndex = Record<string, number>;

export function buildColumnIndex(headerRow: string[]): InventoryColumnIndex {
  const index: InventoryColumnIndex = {};
  headerRow.forEach((cell, i) => {
    const key = normalizeWhitespace(cell).toLowerCase();
    if (key) index[key] = i;
  });
  return index;
}

export function missingRequiredColumns(index: InventoryColumnIndex): string[] {
  return REQUIRED_COLUMNS.filter((c) => !(c in index));
}

// `dataRows` excludes both the title row and the header row — callers pass
// the header row separately so the row-number math (row 1 = title, row 2 =
// header, data starts at row 3) is done in exactly one place. `titleRow` is
// row 1 itself: its lone cell (if any) is checked for a part-type title too,
// since that's often where a single-category sheet's category actually
// lives (e.g. a centered "DOORS" heading), not in the data area.
// `fallbackPartType` seeds the current part type when nothing in the sheet
// names one — the manually-selected category from the import form — and
// also fills any gap before the first in-sheet part-type title is found.
export function parseInventorySheet(
  dataRows: string[][],
  headerRow: string[],
  titleRow: string[] = [],
  fallbackPartType: PartType | null = null,
): InventoryParseResult {
  const index = buildColumnIndex(headerRow);
  const locationCol = index["location"];
  const modelCol = index["model"];
  const sideCol = index["side"];
  const qtyCol = index["qty"];
  const costCol = index["cost"];
  const shopCol = index["shop"];

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
    const rowNum = i + 3;
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

    const modelRaw = normalizeWhitespace(get(modelCol));
    const sideRaw = normalizeWhitespace(get(sideCol));
    const qtyRaw = get(qtyCol).trim();
    const costRaw = get(costCol).trim();
    const shopRaw = get(shopCol).trim();
    const locationRaw = get(locationCol).trim();

    if (!modelRaw && !sideRaw && !qtyRaw && !costRaw && !shopRaw && !locationRaw) return; // fully blank row

    if (!sideRaw && SECTION_MAKES.has(modelRaw.toUpperCase())) {
      currentMake = MAKE_LABELS[modelRaw.toUpperCase()];
      return;
    }

    if (!modelRaw) {
      failed.push({ rowNum, raw, reason: "MODEL cell is empty." });
      return;
    }
    if (!currentMake) {
      failed.push({ rowNum, raw, reason: "No make section row found above this row." });
      return;
    }
    if (!currentPartType) {
      failed.push({ rowNum, raw, reason: "No part-type section row found above this row." });
      return;
    }
    const partType = currentPartType;

    let position: PartPosition | null = null;
    if (sideRaw) {
      const mapped = SIDE_LOOKUP[sideRaw.toUpperCase()];
      if (!mapped) {
        failed.push({ rowNum, raw, reason: `Unrecognized SIDE "${sideRaw}".` });
        return;
      }
      position = mapped;
    }

    // Dual "399/375" cells never fail the row — the first number is used,
    // the second (if any) is carried as an informational note. A genuinely
    // missing/unparseable price still blocks commit, but only gets the row
    // flagged for manual review rather than dropped as a hard failure.
    const costResult = parseMoneyMaybeDual(costRaw);
    const priceResult = parseMoneyMaybeDual(shopRaw);
    const priceNote = [costResult.note, priceResult.note].filter(Boolean).join(" ") || null;
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
      if (!left) {
        failed.push({ rowNum, raw, reason: `Could not find a year range in "${leftRaw}".` });
        return;
      }
      const { make: explicitRightMake, rest: rightRest } = stripMakePrefix(rightRaw);
      const rightMake = explicitRightMake ?? currentMake;
      const rightModel = canonicalizeModel(titleCase(rightRest));
      const leftModel = finalizeModel(left.model);

      // Unlike the single-vehicle path, an unparseable/dual QTY here doesn't
      // fail the row — it just means we can't tell how this row's count
      // splits between the two vehicles, so it still needs a human, but as a
      // flag (with both vehicles preserved for reference) rather than a drop.
      let quantity = 0;
      let quantityAmbiguous = false;
      if (qtyRaw !== "") {
        const n = Number(qtyRaw);
        if (!Number.isInteger(n) || n < 0) {
          quantityAmbiguous = true;
        } else {
          quantity = n;
        }
      }

      if (quantityAmbiguous || priceIssue) {
        const reasonParts: string[] = [];
        if (quantityAmbiguous) {
          reasonParts.push(
            `QTY "${qtyRaw}" doesn't say how it splits between the 2 vehicles in "${modelRaw}" — enter manually.`,
          );
        }
        if (priceIssue) reasonParts.push(priceIssue);
        if (priceNote) reasonParts.push(priceNote);

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
        note: priceNote,
      });
      return;
    }

    let quantity = 0;
    if (qtyRaw !== "") {
      const n = Number(qtyRaw);
      if (!Number.isInteger(n) || n < 0) {
        failed.push({ rowNum, raw, reason: `Invalid QTY "${qtyRaw}".` });
        return;
      }
      quantity = n;
    }

    const yearModel = parseYearModel(modelRaw);
    if (!yearModel) {
      failed.push({ rowNum, raw, reason: `Could not find a year range in the MODEL cell "${modelRaw}".` });
      return;
    }
    const finalModel = finalizeModel(yearModel.model);

    if (priceIssue || yearModel.singleYear) {
      const reasonParts: string[] = [];
      if (yearModel.singleYear) {
        reasonParts.push(
          `Single year "${yearModel.yearStart}" with no explicit range in "${modelRaw}" — confirm and enter manually.`,
        );
      }
      if (priceIssue) reasonParts.push(priceIssue);
      if (priceNote) reasonParts.push(priceNote);

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
