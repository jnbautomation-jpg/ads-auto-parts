"use client";

import { useState, useTransition } from "react";
import { recordStockMovement } from "@/app/(admin)/products/[id]/actions";
import { buttonPrimaryClass, buttonSecondaryClass, inputClass, labelClass } from "@/lib/admin-ui";

export function StockButtons({ productId }: { productId: string }) {
  const [open, setOpen] = useState<"IN" | "OUT" | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    if (!open) return;
    formData.set("productId", productId);
    formData.set("direction", open);

    startTransition(async () => {
      const result = await recordStockMovement({}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError("");
      setOpen(null);
    });
  }

  return (
    <div className="flex w-full flex-col gap-2 md:w-auto">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(open === "IN" ? null : "IN")}
          className={`${buttonPrimaryClass} flex-1 md:flex-none`}
        >
          + STOCK IN
        </button>
        <button
          type="button"
          onClick={() => setOpen(open === "OUT" ? null : "OUT")}
          className={`${buttonSecondaryClass} flex-1 md:flex-none`}
        >
          − STOCK OUT
        </button>
      </div>

      {error ? <p className="text-xs text-[#E31E24]">{error}</p> : null}

      {open ? (
        <form action={submit} className="flex flex-wrap items-end gap-2 border border-black/10 bg-[#FAFAFA] p-2.5">
          <label className={labelClass}>
            QTY
            <input type="number" name="amount" min={1} required autoFocus className={`${inputClass} w-20`} />
          </label>
          <label className={`${labelClass} min-w-[140px] flex-1`}>
            NOTE (OPTIONAL)
            <input type="text" name="note" className={inputClass} />
          </label>
          <button type="submit" disabled={isPending} className={`${buttonPrimaryClass} w-full md:w-auto`}>
            {isPending ? "SAVING…" : `CONFIRM ${open}`}
          </button>
        </form>
      ) : null}
    </div>
  );
}
