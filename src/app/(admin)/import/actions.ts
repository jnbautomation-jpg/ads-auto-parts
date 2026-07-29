"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { readWorkbookSheets, type WorkbookSheet } from "@/lib/workbook";
import {
  buildColumnIndex,
  missingRequiredColumns,
  parseInventorySheet,
  type FailedInventoryRow,
  type FlaggedInventoryRow,
  type ParsedInventoryRow,
  type PartTypeCount,
} from "@/lib/inventory-import";
import { generateSkuBase } from "@/lib/sku";
import { formatPartType } from "@/lib/format";
import { PartPosition, PartType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

const PART_TYPES = new Set<string>(Object.values(PartType));
const POSITIONS = new Set<string>(Object.values(PartPosition));

export type PreviewState = {
  error?: string;
  sheets?: string[];
  partType?: PartType;
  // First part type detected from the sheet's title/section rows, so the
  // client can pre-fill the category dropdown when it needs to ask again
  // (e.g. no titles were detectable and a manual fallback is required).
  suggestedPartType?: PartType;
  preview?: {
    sheetName: string;
    rows: ParsedInventoryRow[];
    flagged: FlaggedInventoryRow[];
    failed: FailedInventoryRow[];
    partTypeBreakdown: PartTypeCount[];
    // True when the sheet had no in-sheet part-type titles at all, so every
    // row's category came from the manually-selected fallback.
    usedFallback: boolean;
    // Set when in-sheet titles were found but disagree with the manually
    // selected category — the in-sheet titles still win.
    partTypeWarning?: string;
  };
};

// Phase 1: parse the uploaded file and stage results for review. Never
// writes to the DB — that only happens in commitImport, after a human has
// looked at the preview.
export async function previewImport(_prevState: PreviewState, formData: FormData): Promise<PreviewState> {
  await requireAuthContext();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file first." };
  }

  // Now only a fallback: the parser detects a part type per row from the
  // sheet's own title/section rows (see inventory-import.ts). This is only
  // required when the sheet turns out to have no detectable titles at all.
  const partTypeRaw = String(formData.get("partType") || "");
  if (partTypeRaw && !PART_TYPES.has(partTypeRaw)) {
    return { error: "Invalid part type." };
  }
  const manualPartType = partTypeRaw ? (partTypeRaw as PartType) : null;

  const sheetNameRaw = String(formData.get("sheetName") || "");

  const buffer = await file.arrayBuffer();
  let sheets: WorkbookSheet[];
  try {
    sheets = readWorkbookSheets(buffer, file.name);
  } catch {
    return { error: "Couldn't read that file — is it a valid .xlsx, .xls, or .csv?" };
  }
  if (sheets.length === 0) {
    return { error: "That file has no sheets." };
  }

  let sheet: WorkbookSheet;
  if (sheets.length === 1) {
    sheet = sheets[0];
  } else {
    const match = sheets.find((s) => s.name === sheetNameRaw);
    if (!match) {
      // Ask the client to render a sheet picker and resubmit the same file.
      return { sheets: sheets.map((s) => s.name), partType: manualPartType ?? undefined };
    }
    sheet = match;
  }

  if (sheet.rows.length < 3) {
    return { error: `Sheet "${sheet.name}" needs a title row, a header row, and at least one data row.` };
  }

  const titleRow = sheet.rows[0];
  const headerRow = sheet.rows[1];
  const missing = missingRequiredColumns(buildColumnIndex(headerRow));
  if (missing.length > 0) {
    return { error: `Sheet "${sheet.name}" is missing column(s): ${missing.join(", ")}.` };
  }

  const dataRows = sheet.rows.slice(2);
  const { parsed, flagged, failed, detectedPartTypes } = parseInventorySheet(dataRows, headerRow, titleRow, manualPartType);

  if (detectedPartTypes.length === 0 && !manualPartType) {
    return {
      error: `Sheet "${sheet.name}" has no detectable part-type titles (e.g. "DOORS") — choose a category to continue.`,
      sheets: sheets.length > 1 ? sheets.map((s) => s.name) : undefined,
    };
  }

  let partTypeWarning: string | undefined;
  if (detectedPartTypes.length > 0 && manualPartType && !detectedPartTypes.includes(manualPartType)) {
    const detectedLabels = detectedPartTypes.map(formatPartType).join(", ");
    partTypeWarning = `Sheet titles say ${detectedLabels} — using that instead of the selected "${formatPartType(manualPartType)}".`;
  }

  const breakdownMap = new Map<PartType, number>();
  for (const row of parsed) {
    breakdownMap.set(row.partType, (breakdownMap.get(row.partType) ?? 0) + 1);
  }
  const partTypeBreakdown: PartTypeCount[] = Array.from(breakdownMap, ([partType, count]) => ({ partType, count }));

  return {
    suggestedPartType: detectedPartTypes[0] ?? manualPartType ?? undefined,
    preview: {
      sheetName: sheet.name,
      rows: parsed,
      flagged,
      failed,
      partTypeBreakdown,
      usedFallback: detectedPartTypes.length === 0,
      partTypeWarning,
    },
  };
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

        // Every product gets one VehicleFit per vehicle it fits — the
        // primary one (mirroring its own make/model/years/position) plus one
        // more per unsplit "/" row vehicle, all sharing this row's year
        // range, position, and quantity (the shared count that made the
        // multi-vehicle row unambiguous in the first place).
        await tx.product.create({
          data: {
            ...productFields,
            sku,
            vehicleFits: {
              create: [
                {
                  organizationId: organization.id,
                  make: productFields.make,
                  model: productFields.model,
                  yearStart: productFields.yearStart,
                  yearEnd: productFields.yearEnd,
                  position: productFields.position,
                },
                ...additionalVehicles.map((v) => ({
                  organizationId: organization.id,
                  make: v.make,
                  model: v.model,
                  yearStart: productFields.yearStart,
                  yearEnd: productFields.yearEnd,
                  position: productFields.position,
                })),
              ],
            },
          },
        });
        created++;
      }
    });
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");

  return { created, skipped };
}
