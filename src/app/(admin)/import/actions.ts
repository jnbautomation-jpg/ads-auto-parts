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
} from "@/lib/inventory-import";
import { generateSkuBase } from "@/lib/sku";
import { PartPosition, PartType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

const PART_TYPES = new Set<string>(Object.values(PartType));
const POSITIONS = new Set<string>(Object.values(PartPosition));

export type PreviewState = {
  error?: string;
  sheets?: string[];
  partType?: PartType;
  preview?: {
    partType: PartType;
    sheetName: string;
    rows: ParsedInventoryRow[];
    flagged: FlaggedInventoryRow[];
    failed: FailedInventoryRow[];
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

  const partTypeRaw = String(formData.get("partType") || "");
  if (!PART_TYPES.has(partTypeRaw)) {
    return { error: "Choose a part type." };
  }
  const partType = partTypeRaw as PartType;

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
      return { sheets: sheets.map((s) => s.name), partType };
    }
    sheet = match;
  }

  if (sheet.rows.length < 3) {
    return { error: `Sheet "${sheet.name}" needs a title row, a header row, and at least one data row.` };
  }

  const headerRow = sheet.rows[1];
  const missing = missingRequiredColumns(buildColumnIndex(headerRow));
  if (missing.length > 0) {
    return { error: `Sheet "${sheet.name}" is missing column(s): ${missing.join(", ")}.` };
  }

  const dataRows = sheet.rows.slice(2);
  const { parsed, flagged, failed } = parseInventorySheet(dataRows, headerRow);

  return {
    preview: {
      partType,
      sheetName: sheet.name,
      rows: parsed,
      flagged,
      failed,
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
export async function commitImport(rows: ParsedInventoryRow[], partTypeRaw: PartType): Promise<CommitResult> {
  const { organization } = await requireAuthContext();

  if (!PART_TYPES.has(partTypeRaw)) {
    return { error: "Invalid part type." };
  }
  const partType = partTypeRaw;

  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "No rows to import." };
  }

  const valid: Prisma.ProductCreateManyInput[] = [];
  const skipped: { row: number; reason: string }[] = [];

  for (const row of rows ?? []) {
    const rowNum = Number(row?.rowNum) || 0;
    const make = String(row?.make ?? "").trim();
    const model = String(row?.model ?? "").trim();
    const yearStart = Number(row?.yearStart);
    const yearEnd = Number(row?.yearEnd);
    const positionRaw = row?.position ?? null;
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

    valid.push({
      organizationId: organization.id,
      sku: "", // filled in per-row inside the transaction, once we know the collision-safe suffix
      partType,
      make,
      model,
      yearStart,
      yearEnd,
      position,
      condition: "A",
      quantity,
      cost,
      price,
      binLocation,
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
        const base = { model: item.model, yearStart: item.yearStart, yearEnd: item.yearEnd, partType: item.partType, position: item.position };
        let sku = generateSkuBase(base);
        let suffix = 2;
        while (existingSkus.has(sku)) {
          sku = `${generateSkuBase(base)}-${suffix}`;
          suffix++;
        }
        existingSkus.add(sku);
        item.sku = sku;
      }

      await tx.product.createMany({ data: valid });
      created = valid.length;
    });
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");

  return { created, skipped };
}
