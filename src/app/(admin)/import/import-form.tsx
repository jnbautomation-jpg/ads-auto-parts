"use client";

import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import { previewImport, commitImport, type PreviewState, type CommitResult } from "./actions";
import { generateSkuBase } from "@/lib/sku";
import { formatFit, formatMoney, formatPartType, formatPosition } from "@/lib/format";
import { PartType } from "@/generated/prisma/enums";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  cardClass,
  inputClass,
  labelClass,
  mutedClass,
  tableHeaderRowClass,
  tableRowClass,
} from "@/lib/admin-ui";

const PART_TYPES = Object.values(PartType);
const ROW_COLS = "grid-cols-[1fr_70px_55px_75px_75px_80px_150px]";

export function ImportForm() {
  const [state, formAction, pending] = useActionState<PreviewState, FormData>(previewImport, {});
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [partType, setPartType] = useState<PartType | "">("");
  const [sheetName, setSheetName] = useState("");
  // Tracks which previewImport response (by object identity) "Start Over"
  // dismissed. A fresh previewImport call always produces a new `state`
  // object, so the comparison naturally un-dismisses without an effect.
  const [dismissedState, setDismissedState] = useState<PreviewState | null>(null);

  const [commitPending, startCommit] = useTransition();
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  function setFile(file: File | null) {
    if (!inputRef.current) return;
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      inputRef.current.files = dt.files;
      setFileName(file.name);
    } else {
      inputRef.current.value = "";
      setFileName("");
    }
  }

  function reset() {
    setFile(null);
    setPartType("");
    setSheetName("");
    setCommitResult(null);
    setDismissedState(state);
  }

  const preview = dismissedState === state ? undefined : state.preview;

  function handleConfirm() {
    if (!preview) return;
    startCommit(async () => {
      const result = await commitImport(preview.rows, preview.partType);
      setCommitResult(result);
    });
  }

  const alreadyCommitted = Boolean(commitResult && !commitResult.error);

  return (
    <div className="flex flex-col gap-3">
      {!preview ? (
        <form action={formAction} className="flex flex-col gap-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) setFile(file);
            }}
            className={`flex cursor-pointer flex-col items-center gap-1.5 border border-dashed p-6 text-center transition-colors md:p-9 ${
              dragOver ? "border-[#E31E24] bg-[#E31E24]/[0.04]" : "border-black/25 bg-[#FAFAFA]"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              name="file"
              accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className="font-[family-name:var(--font-oswald)] text-sm font-semibold tracking-[0.14em] text-[#444]">
              {fileName ? fileName.toUpperCase() : "DROP SPREADSHEET HERE"}
            </div>
            <div className="font-[family-name:var(--font-barlow)] text-xs text-[#8a8a8a]">
              {fileName ? "Click to choose a different file" : "or click to browse — .xlsx, .xls, or .csv"}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className={`${labelClass} w-full md:w-[220px]`}>
              PART TYPE
              <select
                name="partType"
                value={partType}
                onChange={(e) => setPartType(e.target.value as PartType)}
                className={inputClass}
                required
              >
                <option value="">Choose part type…</option>
                {PART_TYPES.map((pt) => (
                  <option key={pt} value={pt}>
                    {formatPartType(pt)}
                  </option>
                ))}
              </select>
            </label>

            {state.sheets ? (
              <label className={`${labelClass} w-full md:w-[220px]`}>
                SHEET / TAB
                <select
                  name="sheetName"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Choose sheet…</option>
                  {state.sheets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <button
              type="submit"
              disabled={pending || !fileName || !partType || Boolean(state.sheets && !sheetName)}
              className={`${buttonPrimaryClass} w-full md:w-auto`}
            >
              {pending ? "PARSING…" : "PARSE FILE"}
            </button>
          </div>

          {state.sheets ? (
            <p className={mutedClass}>This workbook has multiple sheets — pick the one to import.</p>
          ) : null}

          {state.error ? (
            <p className="border border-[#E31E24]/30 bg-[#E31E24]/[0.06] px-3 py-2 text-sm text-[#B4231F]">{state.error}</p>
          ) : null}
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <div className={`${cardClass} flex flex-wrap items-center gap-4 px-3.5 py-2.5`}>
            <div className="text-sm">
              <span className="font-semibold text-[#15803d]">{preview.rows.length} ready</span>
              {" · "}
              <span className="font-semibold text-[#B45309]">{preview.flagged.length} flagged</span>
              {" · "}
              <span className="font-semibold text-[#B4231F]">{preview.failed.length} failed</span>
            </div>
            <div className={mutedClass}>
              {formatPartType(preview.partType)} · sheet &quot;{preview.sheetName}&quot;
            </div>
            <button type="button" onClick={reset} className={`${buttonSecondaryClass} w-full md:ml-auto md:w-auto`}>
              START OVER
            </button>
          </div>

          {preview.rows.length > 0 ? (
            <div className={cardClass}>
              {/* Desktop dense table */}
              <div className="hidden md:block">
                <div className={`${tableHeaderRowClass} ${ROW_COLS}`}>
                  <div>VEHICLE FIT</div>
                  <div>POS</div>
                  <div className="text-right">QTY</div>
                  <div className="text-right">COST</div>
                  <div className="text-right">PRICE</div>
                  <div>BIN</div>
                  <div>SKU</div>
                </div>
                {preview.rows.map((r) => (
                  <div key={r.rowNum} className={`${tableRowClass} ${ROW_COLS}`}>
                    <div className="truncate">{formatFit(r.make, r.model, r.yearStart, r.yearEnd)}</div>
                    <div className="text-[#666]">{r.position ? formatPosition(r.position) : "—"}</div>
                    <div className="text-right">{r.quantity}</div>
                    <div className="text-right">{formatMoney(r.cost)}</div>
                    <div className="text-right">{formatMoney(r.price)}</div>
                    <div>{r.binLocation ?? "—"}</div>
                    <div className="truncate font-mono text-[11px]">
                      {generateSkuBase({
                        model: r.model,
                        yearStart: r.yearStart,
                        yearEnd: r.yearEnd,
                        partType: preview.partType,
                        position: r.position,
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile stacked cards */}
              <div className="flex flex-col md:hidden">
                {preview.rows.map((r) => (
                  <div key={r.rowNum} className="flex flex-col gap-1 border-b border-black/5 px-3.5 py-2.5 last:border-b-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold">{formatFit(r.make, r.model, r.yearStart, r.yearEnd)}</div>
                      <div className="shrink-0 text-[13px] text-[#666]">
                        {r.position ? formatPosition(r.position) : "—"}
                      </div>
                    </div>
                    <div className="truncate font-mono text-[11px] text-[#8a8a8a]">
                      {generateSkuBase({
                        model: r.model,
                        yearStart: r.yearStart,
                        yearEnd: r.yearEnd,
                        partType: preview.partType,
                        position: r.position,
                      })}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-[#555]">
                      <span>QTY {r.quantity}</span>
                      <span>Cost {formatMoney(r.cost)}</span>
                      <span>Price {formatMoney(r.price)}</span>
                      <span>BIN {r.binLocation ?? "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {preview.flagged.length > 0 ? (
            <div className={cardClass}>
              <div className="border-b border-black/8 px-3.5 py-2 font-[family-name:var(--font-oswald)] text-xs font-semibold tracking-[0.14em] text-[#B45309]">
                FLAGGED — NEEDS MANUAL REVIEW ({preview.flagged.length})
              </div>
              <ul className="flex flex-col gap-1.5 px-3.5 py-2.5 font-[family-name:var(--font-barlow)] text-xs text-[#555]">
                {preview.flagged.map((f) => (
                  <li key={f.rowNum}>
                    Row {f.rowNum}: {f.reason}{" "}
                    <span className="text-[#8a8a8a]">
                      ({f.vehicles.map((v) => `${v.make} ${v.model}`).join(" / ")})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.failed.length > 0 ? (
            <div className={cardClass}>
              <div className="border-b border-black/8 px-3.5 py-2 font-[family-name:var(--font-oswald)] text-xs font-semibold tracking-[0.14em] text-[#B4231F]">
                FAILED TO PARSE ({preview.failed.length})
              </div>
              <ul className="flex flex-col gap-1.5 px-3.5 py-2.5 font-[family-name:var(--font-barlow)] text-xs text-[#555]">
                {preview.failed.map((f) => (
                  <li key={f.rowNum}>
                    Row {f.rowNum}: {f.reason} <span className="text-[#8a8a8a]">— &quot;{f.raw}&quot;</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={preview.rows.length === 0 || commitPending || alreadyCommitted}
              onClick={handleConfirm}
              className={`${buttonPrimaryClass} w-full md:w-auto`}
            >
              {commitPending ? "IMPORTING…" : `CONFIRM IMPORT (${preview.rows.length})`}
            </button>
          </div>

          {commitResult ? (
            <div className={`${cardClass} px-3.5 py-3 text-sm`}>
              {commitResult.error ? (
                <p className="text-[#B4231F]">{commitResult.error}</p>
              ) : (
                <>
                  <p className="font-semibold text-[#15803d]">
                    {commitResult.created} product{commitResult.created === 1 ? "" : "s"} imported.{" "}
                    <Link href="/products" className="text-[#E31E24] hover:text-[#c9181e]">
                      View products →
                    </Link>
                  </p>
                  {commitResult.skipped && commitResult.skipped.length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-0.5 text-xs text-[#8a8a8a]">
                      {commitResult.skipped.map((s) => (
                        <li key={s.row}>
                          Row {s.row}: {s.reason}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
