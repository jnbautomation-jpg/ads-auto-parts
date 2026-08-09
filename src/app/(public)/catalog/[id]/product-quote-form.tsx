"use client";

import { useActionState, useId } from "react";
import { submitQuoteRequest, type QuoteFormState } from "../../actions";
import { eyebrowClass, primaryButtonClass } from "@/lib/public-ui";

const fieldClass =
  "min-h-[44px] w-full border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-3 text-[14px] text-white placeholder:text-[#8A8A8A] focus:border-[#E31E24] focus:outline-none";

export function ProductQuoteForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState<QuoteFormState, FormData>(submitQuoteRequest, {});
  const uid = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3 border border-[#2A2A2A] p-5 lg:p-6">
      <input type="hidden" name="productId" value={productId} />
      <span className={eyebrowClass}>
        Request a quote
      </span>
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <label htmlFor={`${uid}-name`} className="sr-only">
          Name
        </label>
        <input id={`${uid}-name`} name="name" placeholder="Name" required className={fieldClass} />
        <label htmlFor={`${uid}-phone`} className="sr-only">
          Phone
        </label>
        <input
          id={`${uid}-phone`}
          name="phone"
          type="tel"
          placeholder="Phone"
          required
          className={fieldClass}
        />
      </div>
      <label htmlFor={`${uid}-email`} className="sr-only">
        Email
      </label>
      <input id={`${uid}-email`} name="email" type="email" placeholder="Email" className={fieldClass} />
      <label htmlFor={`${uid}-notes`} className="sr-only">
        Message
      </label>
      <textarea
        id={`${uid}-notes`}
        name="notes"
        placeholder="Message — vehicle, part, color, timing…"
        rows={3}
        className={`${fieldClass} resize-y`}
      />
      <button
        type="submit"
        disabled={pending}
        className={`${primaryButtonClass} disabled:opacity-60`}
      >
        {pending ? "Sending…" : "Send request"}
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
