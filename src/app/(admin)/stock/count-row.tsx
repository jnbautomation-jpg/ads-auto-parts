"use client";

import { useActionState } from "react";
import { recordStockCount, type CountState } from "./actions";
import { inputClass } from "@/lib/admin-ui";

export type CountRowData = {
  id: string;
  sku: string;
  label: string;
  quantity: number;
  reorderPoint: number;
  riskLabel: string;
  riskExplanation: string;
  riskKey: string;
  lastCounted: string;
  binLocation: string | null;
};

function riskColor(risk: string): string {
  if (risk === "SHOWING_CALL") return "border-[#B4231F] text-[#B4231F]";
  if (risk === "SHOWING_LOW") return "border-[#B45309] text-[#B45309]";
  if (risk === "OK") return "border-[#15803d] text-[#15803d]";
  return "border-black/25 text-[#666]";
}

export function CountRow({ product }: { product: CountRowData }) {
  const [state, formAction, pending] = useActionState<CountState, FormData>(recordStockCount, {});

  return (
    <div className="flex flex-col gap-2 border-b border-black/5 px-3.5 py-3 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[12.5px] font-semibold">{product.sku}</span>
        <span className="font-[family-name:var(--font-barlow)] text-[13.5px]">{product.label}</span>
        {product.binLocation ? (
          <span className="font-[family-name:var(--font-barlow)] text-[13px] text-[#555]">
            bin {product.binLocation}
          </span>
        ) : null}
        <span
          className={`ml-auto inline-block border px-[6px] py-[2px] font-[family-name:var(--font-oswald)] text-[9.5px] font-semibold tracking-[0.12em] ${riskColor(product.riskKey)}`}
        >
          {product.riskLabel.toUpperCase()}
        </span>
      </div>

      <p className="font-[family-name:var(--font-barlow)] text-[12.5px] text-[#777]">
        System says <strong className="text-black">{product.quantity}</strong> · {product.lastCounted}
        {" · "}
        {product.riskExplanation}
      </p>

      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="productId" value={product.id} />
        <label className="font-[family-name:var(--font-oswald)] text-[10.5px] font-semibold tracking-[0.14em] text-[#8a8a8a]">
          ON SHELF
          <input
            type="number"
            name="counted"
            min={0}
            required
            defaultValue={product.quantity}
            className={`${inputClass} ml-2 w-[90px]`}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center border border-black bg-black px-3 font-[family-name:var(--font-oswald)] text-[11px] font-semibold tracking-[0.12em] text-white disabled:opacity-50"
        >
          {pending ? "SAVING…" : "CONFIRM COUNT"}
        </button>
        <span className="font-[family-name:var(--font-barlow)] text-[12px] text-[#8a8a8a]">
          {/* Confirming an unchanged number is the common case and still
              worth recording — that is what marks it verified. */}
          Same number? Confirm it anyway — that&apos;s what marks it checked.
        </span>
      </form>

      {state.error ? (
        <p className="text-[13px] font-semibold text-[#B4231F]">{state.error}</p>
      ) : null}
    </div>
  );
}
