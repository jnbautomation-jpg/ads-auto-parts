"use client";

import Link from "next/link";
import { useActionState, useMemo, useRef, useState, useTransition } from "react";
import {
  listImportTabs,
  previewTabs,
  commitImport,
  type TabListState,
  type TabsPreviewState,
  type TabPreview,
  type CommitResult,
} from "./actions";
import { generateSkuBase } from "@/lib/sku";
import { formatFit, formatMoney, formatPartType, formatPosition } from "@/lib/format";
import { PartType } from "@/generated/prisma/enums";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  cardClass,
  inputClass,
  mutedClass,
  tableHeaderRowClass,
  tableRowClass,
} from "@/lib/admin-ui";

const PART_TYPES = Object.values(PartType);
const ROW_COLS = "grid-cols-[110px_1fr_70px_55px_75px_75px_80px_150px]";

type Step = "upload" | "pick" | "preview";

export function ImportForm() {
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [listState, listAction, listPending] = useActionState<TabListState, FormData>(listImportTabs, {});
  const [previewState, previewAction, previewPending] = useActionState<TabsPreviewState, FormData>(previewTabs, {});

  const [step, setStep] = useState<Step>("upload");

  // sheetName -> checked / chosen part type. Seeded from listState the first
  // time it arrives; edits after that are the user's own.
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [tabType, setTabType] = useState<Record<string, string>>({});
  const [seededFor, setSeededFor] = useState<TabListState | null>(null);
  if (listState !== seededFor && listState.sheets) {
    setSeededFor(listState);
    const nextChecked: Record<string, boolean> = {};
    const nextType: Record<string, string> = {};
    for (const s of listState.sheets) {
      nextChecked[s.name] = true;
      nextType[s.name] = s.suggestedType ?? "";
    }
    setChecked(nextChecked);
    setTabType(nextType);
    setStep("pick");
  }

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
    setStep("upload");
    setSeededFor(null);
    setChecked({});
    setTabType({});
    setCommitResult(null);
  }

  function handleParseSelected() {
    if (!inputRef.current?.files?.[0]) return;
    const selections = Object.entries(checked)
      .filter(([, isChecked]) => isChecked)
      .map(([sheetName]) => ({ sheetName, partType: tabType[sheetName] || "" }));
    if (selections.length === 0) return;

    const formData = new FormData();
    formData.set("file", inputRef.current.files[0]);
    formData.set("selections", JSON.stringify(selections));
    setStep("preview");
    previewAction(formData);
  }

  const tabs = useMemo(() => previewState.tabs ?? [], [previewState.tabs]);
  const allRows = useMemo(() => tabs.flatMap((t) => t.rows.map((r) => ({ ...r, sheetName: t.sheetName }))), [tabs]);
  const allFlagged = useMemo(() => tabs.flatMap((t) => t.flagged.map((f) => ({ ...f, sheetName: t.sheetName }))), [tabs]);
  const allFailed = useMemo(() => tabs.flatMap((t) => t.failed.map((f) => ({ ...f, sheetName: t.sheetName }))), [tabs]);

  function handleConfirm() {
    if (allRows.length === 0) return;
    startCommit(async () => {
      const result = await commitImport(allRows);
      setCommitResult(result);
    });
  }

  const alreadyCommitted = Boolean(commitResult && !commitResult.error);
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3">
      {step === "upload" ? (
        <form action={listAction} className="flex flex-col gap-3">
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

          <button
            type="submit"
            disabled={listPending || !fileName}
            className={`${buttonPrimaryClass} w-full md:w-auto`}
          >
            {listPending ? "READING…" : "READ TABS"}
          </button>

          {listState.error ? (
            <p className="border border-[#E31E24]/30 bg-[#E31E24]/[0.06] px-3 py-2 text-sm text-[#B4231F]">{listState.error}</p>
          ) : null}
        </form>
      ) : null}

      {step === "pick" && listState.sheets ? (
        <div className="flex flex-col gap-3">
          <div className={cardClass}>
            <div className="border-b border-black/8 px-3.5 py-2.5 font-[family-name:var(--font-oswald)] text-xs font-semibold tracking-[0.16em]">
              {fileName.toUpperCase()} — {listState.sheets.length} TAB{listState.sheets.length === 1 ? "" : "S"} FOUND
            </div>
            <p className={`${mutedClass} px-3.5 pt-2`}>
              Pick the tabs to import (all checked by default) and confirm each one&apos;s part type — pre-filled
              from the tab name, but a per-row TYPE column (when a tab has one) can still override it for individual
              rows.
            </p>
            <div className="flex flex-col gap-2 px-3.5 py-3">
              {listState.sheets.map((s) => (
                <div key={s.name} className="flex flex-wrap items-center gap-3 border-b border-black/5 pb-2 last:border-b-0">
                  <label className="flex min-w-[220px] flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked[s.name] ?? false}
                      onChange={(e) => setChecked((prev) => ({ ...prev, [s.name]: e.target.checked }))}
                    />
                    <span className="font-medium">{s.name}</span>
                  </label>
                  <select
                    value={tabType[s.name] ?? ""}
                    onChange={(e) => setTabType((prev) => ({ ...prev, [s.name]: e.target.value }))}
                    className={`${inputClass} w-auto`}
                  >
                    <option value="">Auto-detect from sheet…</option>
                    {PART_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {formatPartType(pt)}
                      </option>
                    ))}
                  </select>
                  {!s.suggestedType && !tabType[s.name] ? (
                    <span className="text-xs text-[#B45309]">Couldn&apos;t guess a type from this tab name — pick one.</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleParseSelected}
              disabled={checkedCount === 0 || previewPending}
              className={`${buttonPrimaryClass} w-full md:w-auto`}
            >
              {previewPending ? "PARSING…" : `PARSE ${checkedCount} SELECTED TAB${checkedCount === 1 ? "" : "S"}`}
            </button>
            <button type="button" onClick={reset} className={`${buttonSecondaryClass} w-full md:w-auto`}>
              START OVER
            </button>
          </div>
        </div>
      ) : null}

      {step === "preview" && previewPending ? <p className={mutedClass}>Parsing selected tabs…</p> : null}

      {step === "preview" && previewState.error ? (
        <p className="border border-[#E31E24]/30 bg-[#E31E24]/[0.06] px-3 py-2 text-sm text-[#B4231F]">{previewState.error}</p>
      ) : null}

      {step === "preview" && !previewPending && tabs.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <span className="font-semibold text-[#15803d]">{allRows.length} ready</span>
              {" · "}
              <span className="font-semibold text-[#B45309]">{allFlagged.length} flagged</span>
              {" · "}
              <span className="font-semibold text-[#B4231F]">{allFailed.length} failed</span>
              {" · "}
              <span className={mutedClass}>across {tabs.length} tab{tabs.length === 1 ? "" : "s"}</span>
            </div>
            <button type="button" onClick={reset} className={`${buttonSecondaryClass} ml-auto`}>
              START OVER
            </button>
          </div>

          {/* Per-tab, per-part-type breakdown */}
          <div className={cardClass}>
            <div className="border-b border-black/8 px-3.5 py-2.5 font-[family-name:var(--font-oswald)] text-xs font-semibold tracking-[0.16em]">
              PER-TAB BREAKDOWN
            </div>
            {tabs.map((t: TabPreview) => (
              <div key={t.sheetName} className="flex flex-col gap-1 border-b border-black/5 px-3.5 py-2.5 last:border-b-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{t.sheetName}</span>
                  {t.skippedReason ? (
                    <span className="text-xs text-[#B4231F]">Skipped — {t.skippedReason}</span>
                  ) : (
                    <span className="text-sm">
                      <span className="font-semibold text-[#15803d]">{t.rows.length} ready</span>
                      {" · "}
                      <span className="font-semibold text-[#B45309]">{t.flagged.length} flagged</span>
                      {" · "}
                      <span className="font-semibold text-[#B4231F]">{t.failed.length} failed</span>
                    </span>
                  )}
                </div>
                {t.partTypeBreakdown.length > 0 ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#444]">
                    {t.partTypeBreakdown.map((b) => (
                      <span key={b.partType}>
                        <span className="font-semibold">{formatPartType(b.partType)}:</span> {b.count}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {allRows.length > 0 ? (
            <div className={cardClass}>
              {/* Desktop dense table */}
              <div className="hidden md:block">
                <div className={`${tableHeaderRowClass} ${ROW_COLS}`}>
                  <div>TAB</div>
                  <div>VEHICLE FIT</div>
                  <div>POS</div>
                  <div className="text-right">QTY</div>
                  <div className="text-right">COST</div>
                  <div className="text-right">PRICE</div>
                  <div>BIN</div>
                  <div>SKU</div>
                </div>
                {allRows.map((r) => (
                  <div key={`${r.sheetName}-${r.rowNum}`} className={`${tableRowClass} ${ROW_COLS}`}>
                    <div className="truncate text-[#666]">{r.sheetName}</div>
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
                        partType: r.partType,
                        position: r.position,
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile stacked cards */}
              <div className="flex flex-col md:hidden">
                {allRows.map((r) => (
                  <div key={`${r.sheetName}-${r.rowNum}`} className="flex flex-col gap-1 border-b border-black/5 px-3.5 py-2.5 last:border-b-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold">{formatFit(r.make, r.model, r.yearStart, r.yearEnd)}</div>
                      <div className="shrink-0 text-[13px] text-[#666]">
                        {r.position ? formatPosition(r.position) : "—"}
                      </div>
                    </div>
                    <div className="text-[11px] text-[#8a8a8a]">{r.sheetName}</div>
                    <div className="truncate font-mono text-[11px] text-[#8a8a8a]">
                      {generateSkuBase({
                        model: r.model,
                        yearStart: r.yearStart,
                        yearEnd: r.yearEnd,
                        partType: r.partType,
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

          {allFlagged.length > 0 ? (
            <div className={cardClass}>
              <div className="border-b border-black/8 px-3.5 py-2 font-[family-name:var(--font-oswald)] text-xs font-semibold tracking-[0.14em] text-[#B45309]">
                FLAGGED — NEEDS MANUAL REVIEW ({allFlagged.length})
              </div>
              <ul className="flex flex-col gap-1.5 px-3.5 py-2.5 font-[family-name:var(--font-barlow)] text-xs text-[#555]">
                {allFlagged.map((f) => (
                  <li key={`${f.sheetName}-${f.rowNum}`}>
                    <span className="text-[#8a8a8a]">[{f.sheetName}]</span> Row {f.rowNum}: {f.reason}{" "}
                    <span className="text-[#8a8a8a]">
                      ({f.vehicles.map((v) => `${v.make} ${v.model}`).join(" / ")})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {allFailed.length > 0 ? (
            <div className={cardClass}>
              <div className="border-b border-black/8 px-3.5 py-2 font-[family-name:var(--font-oswald)] text-xs font-semibold tracking-[0.14em] text-[#B4231F]">
                FAILED TO PARSE ({allFailed.length})
              </div>
              <ul className="flex flex-col gap-1.5 px-3.5 py-2.5 font-[family-name:var(--font-barlow)] text-xs text-[#555]">
                {allFailed.map((f) => (
                  <li key={`${f.sheetName}-${f.rowNum}`}>
                    <span className="text-[#8a8a8a]">[{f.sheetName}]</span> Row {f.rowNum}: {f.reason}{" "}
                    <span className="text-[#8a8a8a]">— &quot;{f.raw}&quot;</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={allRows.length === 0 || commitPending || alreadyCommitted}
              onClick={handleConfirm}
              className={`${buttonPrimaryClass} w-full md:w-auto`}
            >
              {commitPending ? "IMPORTING…" : `CONFIRM IMPORT (${allRows.length})`}
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
      ) : null}
    </div>
  );
}
