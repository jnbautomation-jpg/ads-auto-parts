// Parses the client's hand-maintained inventory spreadsheets: a title row,
// a real header on row 2, makes appearing as standalone section rows that
// carry forward onto every row beneath them, and a MODEL cell that embeds
// the year range in one of two formats. Pure — no DB/Prisma access — so the
// same logic runs identically during preview and can be unit-tested in
// isolation.
import { PartPosition } from "@/generated/prisma/enums";

export type ParsedInventoryRow = {
  rowNum: number;
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
  position: PartPosition | null;
  quantity: number;
  cost: number;
  price: number;
  binLocation: string | null;
};

export type FlaggedVehicle = { make: string; model: string };

export type FlaggedInventoryRow = {
  rowNum: number;
  raw: string;
  reason: string;
  vehicles: [FlaggedVehicle, FlaggedVehicle];
  yearStart: number;
  yearEnd: number;
  position: PartPosition | null;
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

export type InventoryParseResult = {
  parsed: ParsedInventoryRow[];
  flagged: FlaggedInventoryRow[];
  failed: FailedInventoryRow[];
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

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
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

// "18-24 EQUINOX" / "16-24 malibu"
const PREFIX_YEAR_RE = /^(\d{2,4})\s*-\s*(\d{2,4})\s+(.+)$/;
// "ALTIMA 13 - 18" / "Model Y 20-24"
const SUFFIX_YEAR_RE = /^(.+?)\s+(\d{2,4})\s*-\s*(\d{2,4})$/;

type YearModel = { yearStart: number; yearEnd: number; model: string };

function parseYearModel(cell: string): YearModel | null {
  const normalized = normalizeWhitespace(cell);
  const prefix = normalized.match(PREFIX_YEAR_RE);
  if (prefix) {
    return { yearStart: expandYear(prefix[1]), yearEnd: expandYear(prefix[2]), model: titleCase(prefix[3]) };
  }
  const suffix = normalized.match(SUFFIX_YEAR_RE);
  if (suffix) {
    return { yearStart: expandYear(suffix[2]), yearEnd: expandYear(suffix[3]), model: titleCase(suffix[1]) };
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

function parseMoney(cell: string): number | null {
  const cleaned = cell.replace(/[$,]/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
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
// header, data starts at row 3) is done in exactly one place.
export function parseInventorySheet(dataRows: string[][], headerRow: string[]): InventoryParseResult {
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

  let currentMake: string | null = null;

  dataRows.forEach((cells, i) => {
    const rowNum = i + 3;
    const get = (c: number | undefined) => (c === undefined ? "" : (cells[c] ?? "")).toString();
    const raw = cells.join(" | ").trim();

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

    let position: PartPosition | null = null;
    if (sideRaw) {
      const mapped = SIDE_LOOKUP[sideRaw.toUpperCase()];
      if (!mapped) {
        failed.push({ rowNum, raw, reason: `Unrecognized SIDE "${sideRaw}".` });
        return;
      }
      position = mapped;
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

    const cost = parseMoney(costRaw);
    if (cost === null || cost < 0) {
      failed.push({ rowNum, raw, reason: `Missing or invalid COST "${costRaw}".` });
      return;
    }
    const price = parseMoney(shopRaw);
    if (price === null || price < 0) {
      failed.push({ rowNum, raw, reason: `Missing or invalid SHOP price "${shopRaw}".` });
      return;
    }

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
      const rightModel = titleCase(rightRest);

      flagged.push({
        rowNum,
        raw,
        reason: `Row covers 2 vehicles ("${modelRaw}") — split and enter manually.`,
        vehicles: [
          { make: currentMake, model: left.model },
          { make: rightMake, model: rightModel },
        ],
        yearStart: left.yearStart,
        yearEnd: left.yearEnd,
        position,
        quantity,
        cost,
        price,
        binLocation,
      });
      return;
    }

    const yearModel = parseYearModel(modelRaw);
    if (!yearModel) {
      failed.push({ rowNum, raw, reason: `Could not find a year range in the MODEL cell "${modelRaw}".` });
      return;
    }

    parsed.push({
      rowNum,
      make: currentMake,
      model: yearModel.model,
      yearStart: yearModel.yearStart,
      yearEnd: yearModel.yearEnd,
      position,
      quantity,
      cost,
      price,
      binLocation,
    });
  });

  return { parsed, flagged, failed };
}
