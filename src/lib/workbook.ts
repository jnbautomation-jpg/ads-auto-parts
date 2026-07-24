import * as XLSX from "xlsx";
import { parseCsv } from "@/lib/csv";

export type WorkbookSheet = {
  name: string;
  rows: string[][];
};

function cellsToStrings(rows: unknown[][]): string[][] {
  return rows.map((row) => row.map((cell) => (cell === undefined || cell === null ? "" : String(cell))));
}

// Reads every sheet of an uploaded file into raw string[][] rows — no
// column mapping or business rules here, just getting cells out of whatever
// format the file is in. `.xlsx`/`.xls` go through SheetJS; `.csv` reuses
// the existing hand-rolled parser (already handles CRLF) and comes back as
// a single pseudo-sheet.
export function readWorkbookSheets(buffer: ArrayBuffer, filename: string): WorkbookSheet[] {
  const isCsv = filename.toLowerCase().endsWith(".csv");

  if (isCsv) {
    const text = new TextDecoder("utf-8").decode(buffer);
    return [{ name: "CSV", rows: parseCsv(text) }];
  }

  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
    return { name, rows: cellsToStrings(rows) };
  });
}
