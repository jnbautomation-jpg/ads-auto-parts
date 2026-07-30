"use client";

import { useActionState } from "react";
import { submitQuoteRequest, type QuoteFormState } from "../../actions";

const fieldClass =
  "min-h-[44px] w-full border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-3 text-[14px] text-white placeholder:text-[#666] focus:border-[#E31E24] focus:outline-none";

export function ProductQuoteForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState<QuoteFormState, FormData>(submitQuoteRequest, {});

  return (
    <form action={formAction} className="flex flex-col gap-3 border border-[#2A2A2A] p-5 lg:p-6">
      <input type="hidden" name="productId" value={productId} />
      <span className="font-[family-name:var(--font-oswald)] text-[12px] tracking-[0.22em] text-[#E31E24] lg:text-[13px]">
        REQUEST A QUOTE
      </span>
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <input name="name" placeholder="Name" required className={fieldClass} />
        <input name="phone" type="tel" placeholder="Phone" required className={fieldClass} />
      </div>
      <input name="email" type="email" placeholder="Email" className={fieldClass} />
      <textarea
        name="notes"
        placeholder="Message — vehicle, part, color, timing…"
        rows={3}
        className={`${fieldClass} resize-y`}
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-[48px] bg-[#E31E24] font-[family-name:var(--font-oswald)] text-[15px] tracking-[0.2em] text-white transition-colors hover:bg-[#ff3a40] disabled:opacity-60"
      >
        {pending ? "SENDING…" : "SEND REQUEST"}
      </button>
      {state.error ? <p className="text-center text-[13px] font-semibold text-[#f87171]">{state.error}</p> : null}
      {state.success ? (
        <p className="text-center text-[13px] font-semibold text-[#4ade80]">
          Request sent — we&apos;ll get back to you fast.
        </p>
      ) : null}
    </form>
  );
}
