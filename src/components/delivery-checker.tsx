"use client";

import { useId, useState } from "react";
import {
  estimateDelivery,
  SAME_DAY_CUTOFF_LABEL,
  type DeliveryEstimate,
} from "@/lib/delivery";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";

// Runs entirely in the browser: the zone tables are static and public, so a
// round-trip would add latency for nothing.
export function DeliveryChecker() {
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<DeliveryEstimate | null | "invalid">(null);
  const uid = useId();

  function check(e: React.FormEvent) {
    e.preventDefault();
    const est = estimateDelivery(zip);
    setResult(est ?? "invalid");
  }

  return (
    <div className="flex flex-col gap-2.5">
      <form onSubmit={check} className="flex gap-2">
        <label htmlFor={`${uid}-zip`} className="sr-only">
          ZIP code
        </label>
        <input
          id={`${uid}-zip`}
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          inputMode="numeric"
          maxLength={10}
          placeholder="Your ZIP"
          className="min-h-[44px] w-[130px] border border-white/12 bg-[#111] px-3 font-[family-name:var(--font-barlow)] text-[15px] text-white placeholder:text-[#8A8A8A] focus:border-[#E31E24] focus:outline-none"
        />
        <button
          type="submit"
          className="min-h-[44px] border border-white/20 px-4 font-[family-name:var(--font-barlow)] text-[14px] font-semibold text-white transition-colors hover:border-[#E31E24]"
        >
          Check delivery
        </button>
      </form>

      {result === "invalid" ? (
        <p aria-live="polite" className="text-[13px] text-[#f87171]">
          Enter a 5-digit ZIP code.
        </p>
      ) : result ? (
        <div aria-live="polite" className="flex flex-col gap-1 text-[13.5px]">
          {result.zone === "ORLANDO" ? (
            <p className="font-semibold text-[#4ADE80]">Free delivery — you&apos;re in Orlando.</p>
          ) : result.zone === "CENTRAL_FL" ? (
            <p className="font-semibold text-white">
              We deliver to you across Central Florida.
            </p>
          ) : (
            <p className="font-semibold text-[#FBBF24]">
              You&apos;re outside our delivery area — call and we&apos;ll work something out.
            </p>
          )}

          {result.zone !== "OUTSIDE" ? (
            <p className="text-[#B4B4B4]">
              {result.sameDayAvailable
                ? `Order in the next few hours and it goes out today — the cutoff is ${result.cutoffLabel}.`
                : `Today's ${result.cutoffLabel} cutoff has passed, so this would go out tomorrow.`}
            </p>
          ) : null}

          {/* An unknown fee is never guessed — the shop quotes it. */}
          {result.zone !== "ORLANDO" ? (
            <p className="text-[#8A8A8A]">
              Delivery cost depends on the address —{" "}
              <a href={`tel:${PHONE_HREF}`} className="text-white underline">
                call {PHONE_DISPLAY}
              </a>{" "}
              for an exact quote.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-[12.5px] text-[#8A8A8A]">
          Free in Orlando · same-day across Central FL before {SAME_DAY_CUTOFF_LABEL}
        </p>
      )}
    </div>
  );
}
