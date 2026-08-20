"use client";

import { useActionState } from "react";
import { confirmReorder, type ReorderState } from "../../order-actions";
import { primaryButtonClass } from "@/lib/public-ui";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

export function ReorderConfirmForm({
  orderId,
  disabled,
  locale = "en",
}: {
  orderId: string;
  disabled: boolean;
  locale?: Locale;
}) {
  const a = getDictionary(locale).account;
  const [state, formAction, pending] = useActionState<ReorderState, FormData>(confirmReorder, {});

  return (
    <form action={formAction} className="flex flex-col gap-2.5">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        disabled={disabled || pending}
        className={`${primaryButtonClass} disabled:opacity-40`}
      >
        {pending ? a.placingOrder : a.placeOrder}
      </button>
      {state.error ? (
        <p aria-live="polite" className="text-center text-[13px] font-semibold text-[#f87171]">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
