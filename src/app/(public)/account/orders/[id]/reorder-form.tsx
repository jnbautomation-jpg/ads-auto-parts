"use client";

import { useActionState } from "react";
import { confirmReorder, type ReorderState } from "../../order-actions";
import { primaryButtonClass } from "@/lib/public-ui";

export function ReorderConfirmForm({
  orderId,
  disabled,
}: {
  orderId: string;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState<ReorderState, FormData>(confirmReorder, {});

  return (
    <form action={formAction} className="flex flex-col gap-2.5">
      <input type="hidden" name="orderId" value={orderId} />
      <button
        type="submit"
        disabled={disabled || pending}
        className={`${primaryButtonClass} disabled:opacity-40`}
      >
        {pending ? "Placing order…" : "Place this order"}
      </button>
      {state.error ? (
        <p aria-live="polite" className="text-center text-[13px] font-semibold text-[#f87171]">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
