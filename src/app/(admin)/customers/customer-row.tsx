"use client";

import { useActionState, useState } from "react";
import {
  reviewWholesaleApplication,
  revokeWholesale,
  type WholesaleReviewState,
} from "./actions";
import { buttonPrimaryClass, buttonSecondaryClass, codeClass, inputClass } from "@/lib/admin-ui";

export type CustomerRowData = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  companyName: string | null;
  tier: string;
  wholesaleStatus: string | null;
  appliedLabel: string;
};

export function CustomerRow({
  customer,
  canReview,
}: {
  customer: CustomerRowData;
  canReview: boolean;
}) {
  const [state, formAction, pending] = useActionState<WholesaleReviewState, FormData>(
    reviewWholesaleApplication,
    {},
  );
  // The rejection note is optional, so the textarea stays out of the way
  // until a staff member chooses to reject.
  const [rejecting, setRejecting] = useState(false);

  const isPending = customer.wholesaleStatus === "PENDING";
  const isWholesale = customer.tier === "WHOLESALE";

  return (
    <div className="flex flex-col gap-2 border-b border-black/5 px-3.5 py-3 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={codeClass}>{customer.companyName ?? customer.name ?? customer.email}</span>
        <span className="font-[family-name:var(--font-barlow)] text-[13px] text-[#555]">
          {customer.email}
        </span>
        {customer.phone ? (
          <a
            href={`tel:${customer.phone.replace(/\D/g, "")}`}
            className="font-[family-name:var(--font-barlow)] text-[13px] text-[#555] underline"
          >
            {customer.phone}
          </a>
        ) : null}
        <span
          className={`ml-auto inline-block border px-[6px] py-[2px] font-[family-name:var(--font-oswald)] text-[9.5px] font-semibold tracking-[0.12em] ${
            isWholesale
              ? "border-[#E31E24] text-[#E31E24]"
              : isPending
                ? "border-[#B45309] text-[#B45309]"
                : "border-black/20 text-[#666]"
          }`}
        >
          {isWholesale ? "TRADE" : isPending ? `PENDING · ${customer.appliedLabel}` : "RETAIL"}
        </span>
      </div>

      {canReview && isPending ? (
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={customer.id} />
          {rejecting ? (
            <input
              name="note"
              placeholder="Reason (shown to the applicant)"
              className={`${inputClass} max-w-[320px]`}
            />
          ) : null}
          <button
            type="submit"
            name="decision"
            value="APPROVE"
            disabled={pending}
            className={buttonPrimaryClass}
          >
            {pending ? "SAVING…" : "APPROVE TRADE"}
          </button>
          {rejecting ? (
            <button
              type="submit"
              name="decision"
              value="REJECT"
              disabled={pending}
              className={buttonSecondaryClass}
            >
              CONFIRM REJECT
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setRejecting(true)}
              className={buttonSecondaryClass}
            >
              REJECT
            </button>
          )}
        </form>
      ) : null}

      {canReview && isWholesale ? (
        <form action={revokeWholesale}>
          <input type="hidden" name="id" value={customer.id} />
          <button
            type="submit"
            className="font-[family-name:var(--font-barlow)] text-xs text-[#999] underline transition-colors hover:text-[#B4231F]"
          >
            Revoke trade pricing
          </button>
        </form>
      ) : null}

      {state.error ? <p className="text-[13px] font-semibold text-[#B4231F]">{state.error}</p> : null}
    </div>
  );
}
