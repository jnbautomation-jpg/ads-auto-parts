"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { bulkDeleteProducts, toggleProductVisibility } from "@/app/(admin)/products/actions";
import { formatFit, formatMoney, formatPartType, formatPosition } from "@/lib/format";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  capaBadgeClass,
  cardClass,
  codeClass,
  tableHeaderRowClass,
  tableRowClass,
} from "@/lib/admin-ui";

// Decimal fields (price) are stringified server-side before this crosses
// the client boundary — Prisma.Decimal isn't a plain serializable value.
export type ProductRow = {
  id: string;
  sku: string;
  partType: string;
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
  position: string | null;
  binLocation: string | null;
  capaCertified: boolean;
  quantity: number;
  reorderPoint: number;
  price: string;
  isPublic: boolean;
};

const ROW_COLS = "grid-cols-[24px_152px_100px_1fr_52px_60px_62px_70px_84px_80px]";

export function ProductList({ products }: { products: ProductRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allSelected = products.length > 0 && selected.size === products.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDeleteSelected() {
    if (selected.size === 0) return;
    const count = selected.size;
    if (!confirm(`Delete ${count} selected product${count === 1 ? "" : "s"}? This cannot be undone.`)) return;

    setError(null);
    startTransition(async () => {
      const result = await bulkDeleteProducts(Array.from(selected));
      if ("error" in result) {
        setError(result.error);
      } else {
        setSelected(new Set());
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 ? (
        <div className={`${cardClass} flex flex-wrap items-center gap-3 px-3.5 py-2.5`}>
          <span className="font-[family-name:var(--font-oswald)] text-xs font-semibold tracking-[0.14em]">
            {selected.size} SELECTED
          </span>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={pending}
            className={`${buttonPrimaryClass} bg-[#B4231F] hover:bg-[#8f1c19]`}
          >
            {pending ? "DELETING…" : "DELETE SELECTED"}
          </button>
          <button type="button" onClick={() => setSelected(new Set())} disabled={pending} className={buttonSecondaryClass}>
            CLEAR
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="border border-[#E31E24]/30 bg-[#E31E24]/[0.06] px-3 py-2 text-sm text-[#B4231F]">{error}</p>
      ) : null}

      <div className={cardClass}>
        {/* Desktop dense table */}
        <div className="hidden md:block">
          <div className={`${tableHeaderRowClass} ${ROW_COLS}`}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              disabled={products.length === 0}
              aria-label="Select all products"
              className="h-4 w-4 accent-[#E31E24]"
            />
            <div>CODE</div>
            <div>PART</div>
            <div>VEHICLE FIT</div>
            <div>POS</div>
            <div>BIN</div>
            <div>CAPA</div>
            <div className="text-right">QTY</div>
            <div className="text-right">PRICE</div>
            <div className="text-center">PUBLIC</div>
          </div>
          {products.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-sm text-[#8a8a8a]">No products match these filters.</p>
          ) : (
            products.map((product) => {
              const low = product.quantity <= product.reorderPoint;
              return (
                <div
                  key={product.id}
                  className={`${tableRowClass} ${ROW_COLS} border-l-2 last:border-b-0 hover:bg-[#f4f4f4] ${
                    low ? "border-l-[#F59E0B] bg-[#F59E0B]/[0.06]" : "border-l-transparent"
                  } ${selected.has(product.id) ? "bg-[#E31E24]/[0.04]" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(product.id)}
                    onChange={() => toggleOne(product.id)}
                    aria-label={`Select ${product.sku}`}
                    className="h-4 w-4 accent-[#E31E24]"
                  />
                  <Link href={`/products/${product.id}`} className={`${codeClass} hover:underline`}>
                    {product.sku}
                  </Link>
                  <div>{formatPartType(product.partType)}</div>
                  <div className="truncate">{formatFit(product.make, product.model, product.yearStart, product.yearEnd)}</div>
                  <div className="text-[#666]">{product.position ? formatPosition(product.position) : "—"}</div>
                  <div className="text-[#666]">{product.binLocation ?? "—"}</div>
                  <div>
                    <span className={capaBadgeClass(product.capaCertified)}>
                      {product.capaCertified ? "CAPA" : "—"}
                    </span>
                  </div>
                  <div className={`text-right font-bold ${low ? "text-[#B45309]" : "text-[#15803d]"}`}>
                    {product.quantity}
                  </div>
                  <div className="text-right">{formatMoney(product.price)}</div>
                  <div className="flex justify-center">
                    <form action={toggleProductVisibility}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="next" value={(!product.isPublic).toString()} />
                      <button
                        type="submit"
                        aria-label={product.isPublic ? "Hide from public catalog" : "Show on public catalog"}
                        className={`relative h-4 w-8 border border-black/15 transition-colors ${
                          product.isPublic ? "bg-black" : "bg-[#e2e2e2]"
                        }`}
                      >
                        <span
                          className={`absolute top-px h-[12px] w-[12px] border border-black/15 bg-white transition-all ${
                            product.isPublic ? "left-[17px]" : "left-px"
                          }`}
                        />
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Mobile stacked cards */}
        <div className="flex flex-col md:hidden">
          {products.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#8a8a8a]">No products match these filters.</p>
          ) : (
            products.map((product) => {
              const low = product.quantity <= product.reorderPoint;
              return (
                <div
                  key={product.id}
                  className={`flex items-stretch border-b border-l-2 border-black/5 last:border-b-0 ${
                    low ? "border-l-[#F59E0B] bg-[#F59E0B]/[0.06]" : "border-l-transparent"
                  } ${selected.has(product.id) ? "bg-[#E31E24]/[0.04]" : ""}`}
                >
                  <label className="flex items-center pl-4 pr-1">
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggleOne(product.id)}
                      aria-label={`Select ${product.sku}`}
                      className="h-[18px] w-[18px] accent-[#E31E24]"
                    />
                  </label>
                  <Link
                    href={`/products/${product.id}`}
                    className="flex flex-1 flex-col gap-1.5 px-3 py-3.5 active:bg-[#f4f4f4]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-[family-name:var(--font-oswald)] text-[15px] font-semibold leading-tight">
                        {formatFit(product.make, product.model, product.yearStart, product.yearEnd)}
                      </div>
                      <span className={`shrink-0 ${capaBadgeClass(product.capaCertified)}`}>
                        {product.capaCertified ? "CAPA" : "—"}
                      </span>
                    </div>
                    <div className={`${codeClass} text-[#666]`}>{product.sku}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-[family-name:var(--font-barlow)] text-[13px] text-[#555]">
                      <span>
                        {formatPartType(product.partType)}
                        {product.position ? ` · ${formatPosition(product.position)}` : ""}
                      </span>
                      <span className="text-[#8a8a8a]">BIN {product.binLocation ?? "—"}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div
                        className={`flex items-baseline gap-1.5 font-[family-name:var(--font-oswald)] text-[20px] font-bold ${
                          low ? "text-[#B45309]" : "text-[#15803d]"
                        }`}
                      >
                        {product.quantity}
                        {low ? (
                          <span className="font-[family-name:var(--font-barlow)] text-[10.5px] font-semibold tracking-[0.1em] text-[#B45309]">
                            LOW STOCK
                          </span>
                        ) : null}
                      </div>
                      <div className="font-[family-name:var(--font-barlow)] text-[15px] font-semibold">
                        {formatMoney(product.price)}
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
