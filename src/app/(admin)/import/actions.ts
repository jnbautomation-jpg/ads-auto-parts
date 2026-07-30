"use server";

import { revalidatePath } from "next/cache";
import { createId } from "@paralleldrive/cuid2";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { readWorkbookSheets, type WorkbookSheet } from "@/lib/workbook";
import {
  buildColumnIndex,
  missingRequiredColumns,
  parseInventorySheet,
  resolveTabPartType,
  type FailedInventoryRow,
  type FlaggedInventoryRow,
  type ParsedInventoryRow,
  type PartTypeCount,
} from "@/lib/inventory-import";
import { generateSkuBase } from "@/lib/sku";
import { PartPosition, PartType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

const PART_TYPES = new Set<string>(Object.values(PartType));
const POSITIONS = new Set<string>(Object.values(PartPosition));

// Single clear rule for now, easy to change later: these part types are
// always sourced CAPA certified, everything else isn't.
const CAPA_PART_TYPES = new Set<PartType>(["FENDER", "BUMPER", "HOOD"]);

export type TabListState = {
  error?: string;
  // One entry per sheet in the workbook, in file order. suggestedType comes
  // from the tab's own name (e.g. "TRUNK ETC" -> TRUNK) — null when nothing
  // recognizable is in the name, so the picker has to ask.
  sheets?: { name: string; suggestedType: PartType | null }[];
};

// Phase 1: just enough of the workbook to render the tab picker — every
// sheet's name and a guessed part type from it. Cheap; doesn't parse rows.
export async function listImportTabs(_prevState: TabListState, formData: FormData): Promise<TabListState> {
  await requireAuthContext();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file first." };
  }

  const buffer = await file.arrayBuffer();
  let sheets: WorkbookSheet[];
  try {
    sheets = readWorkbookSheets(buffer, file.name);
  } catch (err) {
    console.error("[import] listImportTabs: readWorkbookSheets failed", err);
    return { error: "Couldn't read that file — is it a valid .xlsx, .xls, or .csv?" };
  }
  if (sheets.length === 0) {
    return { error: "That file has no sheets." };
  }

  return { sheets: sheets.map((s) => ({ name: s.name, suggestedType: resolveTabPartType(s.name) })) };
}

export type TabSelection = { sheetName: string; partType: string };

export type TabPreview = {
  sheetName: string;
  // The fallback type this tab was parsed with (from the picker — tab-name
  // guess or a manual override). Individual rows can still resolve to a
  // different type via their own TYPE column value.
  partType: PartType | null;
  rows: ParsedInventoryRow[];
  flagged: FlaggedInventoryRow[];
  failed: FailedInventoryRow[];
  partTypeBreakdown: PartTypeCount[];
  // Non-empty means this tab was skipped entirely — too short, or missing a
  // structurally required column (MODEL/QTY/COST/SHOP).
  skippedReason?: string;
};

export type TabsPreviewState = {
  error?: string;
  tabs?: TabPreview[];
};

// Phase 2: parse every tab the user selected in the picker, each with its
// own (possibly overridden) fallback part type. One tab at a time is just
// selections.length === 1 — same code path either way. Never writes to the
// DB — that only happens in commitImport, once a human has reviewed every
// tab's breakdown.
export async function previewTabs(_prevState: TabsPreviewState, formData: FormData): Promise<TabsPreviewState> {
  await requireAuthContext();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file first." };
  }

  let selections: TabSelection[];
  try {
    selections = JSON.parse(String(formData.get("selections") || "[]"));
  } catch (err) {
    console.error("[import] previewTabs: failed to parse selections", err);
    return { error: "Invalid tab selection." };
  }
  if (!Array.isArray(selections) || selections.length === 0) {
    return { error: "Choose at least one tab to import." };
  }

  const buffer = await file.arrayBuffer();
  let sheets: WorkbookSheet[];
  try {
    sheets = readWorkbookSheets(buffer, file.name);
  } catch (err) {
    console.error("[import] previewTabs: readWorkbookSheets failed", err);
    return { error: "Couldn't read that file — is it a valid .xlsx, .xls, or .csv?" };
  }

  const tabs: TabPreview[] = [];

  for (const selection of selections) {
    const sheet = sheets.find((s) => s.name === selection?.sheetName);
    if (!sheet) continue;

    const manualType = PART_TYPES.has(selection.partType) ? (selection.partType as PartType) : null;

    if (sheet.rows.length < 3) {
      tabs.push({
        sheetName: sheet.name,
        partType: manualType,
        rows: [],
        flagged: [],
        failed: [],
        partTypeBreakdown: [],
        skippedReason: "Needs a title row, a header row, and at least one data row.",
      });
      continue;
    }

    const titleRow = sheet.rows[0];
    const headerRow = sheet.rows[1];
    const missing = missingRequiredColumns(buildColumnIndex(headerRow));
    if (missing.length > 0) {
      tabs.push({
        sheetName: sheet.name,
        partType: manualType,
        rows: [],
        flagged: [],
        failed: [],
        partTypeBreakdown: [],
        skippedReason: `Missing column(s): ${missing.join(", ")}.`,
      });
      continue;
    }

    const dataRows = sheet.rows.slice(2);
    const { parsed, flagged, failed, detectedPartTypes } = parseInventorySheet(dataRows, headerRow, titleRow, manualType);

    if (detectedPartTypes.length === 0 && !manualType) {
      tabs.push({
        sheetName: sheet.name,
        partType: null,
        rows: [],
        flagged: [],
        failed: [],
        partTypeBreakdown: [],
        skippedReason: `No detectable part type (from the tab name, a section title, or a TYPE column) — pick a category for this tab and re-parse.`,
      });
      continue;
    }

    const breakdownMap = new Map<PartType, number>();
    for (const row of parsed) {
      breakdownMap.set(row.partType, (breakdownMap.get(row.partType) ?? 0) + 1);
    }
    const partTypeBreakdown: PartTypeCount[] = Array.from(breakdownMap, ([partType, count]) => ({ partType, count }));

    tabs.push({ sheetName: sheet.name, partType: manualType, rows: parsed, flagged, failed, partTypeBreakdown });
  }

  return { tabs };
}

export type CommitResult = {
  error?: string;
  created?: number;
  skipped?: { row: number; reason: string }[];
};

// Phase 2: called directly (not as a <form> action) once a human has
// reviewed the preview and hit "Confirm import". This is still a public
// Server Action endpoint like any other, so every row is re-validated here
// rather than trusting what previewImport handed back to the client.
export async function commitImport(rows: ParsedInventoryRow[]): Promise<CommitResult> {
  const { organization } = await requireAuthContext();

  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "No rows to import." };
  }

  type PendingProduct = Omit<Prisma.ProductUncheckedCreateInput, "sku"> & {
    sku?: string;
    // Vehicles beyond the primary make/model above — each becomes its own
    // VehicleFit row sharing this row's year range and position.
    additionalVehicles: { make: string; model: string }[];
  };

  const valid: PendingProduct[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (const row of rows ?? []) {
    const rowNum = Number(row?.rowNum) || 0;
    const make = String(row?.make ?? "").trim();
    const model = String(row?.model ?? "").trim();
    const yearStart = Number(row?.yearStart);
    const yearEnd = Number(row?.yearEnd);
    const positionRaw = row?.position ?? null;
    const partTypeRaw = String(row?.partType ?? "");
    const quantity = Number(row?.quantity);
    const cost = Number(row?.cost);
    const price = Number(row?.price);
    const binLocation = row?.binLocation ? String(row.binLocation).trim() || null : null;

    if (!make || !model) {
      skipped.push({ row: rowNum, reason: "Missing make or model." });
      continue;
    }
    if (!Number.isInteger(yearStart) || !Number.isInteger(yearEnd) || yearEnd < yearStart) {
      skipped.push({ row: rowNum, reason: "Invalid year range." });
      continue;
    }
    if (!PART_TYPES.has(partTypeRaw)) {
      skipped.push({ row: rowNum, reason: "Invalid or missing part type." });
      continue;
    }
    if (positionRaw !== null && !POSITIONS.has(positionRaw)) {
      skipped.push({ row: rowNum, reason: "Invalid position." });
      continue;
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      skipped.push({ row: rowNum, reason: "Invalid quantity." });
      continue;
    }
    if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(price) || price < 0) {
      skipped.push({ row: rowNum, reason: "Invalid cost/price." });
      continue;
    }

    const position = positionRaw as PartPosition | null;
    const partType = partTypeRaw as PartType;
    const conditionNotes = row?.note ? String(row.note).trim() || null : null;

    const additionalVehicles = Array.isArray(row?.additionalVehicles)
      ? row.additionalVehicles
          .map((v) => ({ make: String(v?.make ?? "").trim(), model: String(v?.model ?? "").trim() }))
          .filter((v) => v.make && v.model)
      : [];

    valid.push({
      organizationId: organization.id,
      // sku filled in per-row inside the transaction, once we know the collision-safe suffix
      partType,
      make,
      model,
      yearStart,
      yearEnd,
      position,
      condition: "A",
      // Imported parts go live on the public catalog immediately, matching
      // the manual add-form's default — staff can still hide individual
      // items afterward via the per-product toggle.
      isPublic: true,
      capaCertified: CAPA_PART_TYPES.has(partType),
      conditionNotes,
      quantity,
      cost,
      price,
      binLocation,
      additionalVehicles,
    });
  }

  let created = 0;
  if (valid.length > 0) {
    await prisma.$transaction(async (tx) => {
      const existingSkus = new Set(
        (await tx.product.findMany({ where: { organizationId: organization.id }, select: { sku: true } })).map(
          (p) => p.sku,
        ),
      );

      // IDs are generated here (matching Prisma's own @default(cuid())
      // algorithm) instead of left to the DB, so vehicle_fits rows can name
      // their productId up front. A sequential product.create per row (one
      // nested inside the other) means one round trip per row — fine for a
      // handful of rows, but a real several-hundred-row sheet blows well
      // past the interactive-transaction timeout. Two createMany calls keep
      // this to 2 round trips total while staying inside one transaction:
      // vehicle_fits still can't reference a product that isn't there,
      // because the product rows are written (and visible within this same
      // transaction) first.
      const products: Prisma.ProductCreateManyInput[] = [];
      const vehicleFits: Prisma.VehicleFitCreateManyInput[] = [];

      for (const item of valid) {
        const { additionalVehicles, ...productFields } = item;
        const base = {
          model: productFields.model,
          yearStart: productFields.yearStart,
          yearEnd: productFields.yearEnd,
          partType: productFields.partType,
          position: productFields.position,
        };
        let sku = generateSkuBase(base);
        let suffix = 2;
        while (existingSkus.has(sku)) {
          sku = `${generateSkuBase(base)}-${suffix}`;
          suffix++;
        }
        existingSkus.add(sku);

        const productId = createId();
        products.push({ ...productFields, id: productId, sku });

        // Every product gets one VehicleFit per vehicle it fits — the
        // primary one (mirroring its own make/model/years/position) plus one
        // more per unsplit "/" row vehicle, all sharing this row's year
        // range and position.
        vehicleFits.push({
          organizationId: organization.id,
          productId,
          make: productFields.make,
          model: productFields.model,
          yearStart: productFields.yearStart,
          yearEnd: productFields.yearEnd,
          position: productFields.position,
        });
        for (const v of additionalVehicles) {
          vehicleFits.push({
            organizationId: organization.id,
            productId,
            make: v.make,
            model: v.model,
            yearStart: productFields.yearStart,
            yearEnd: productFields.yearEnd,
            position: productFields.position,
          });
        }
      }

      await tx.product.createMany({ data: products });
      await tx.vehicleFit.createMany({ data: vehicleFits });
      created = products.length;
    });
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");

  return { created, skipped };
}
