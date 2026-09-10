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
//
// Every zone now has a rate (Matthew, 9 Sep 2026), so this states it rather
// than sending the customer to the phone for a quote. The fee is PER PART —
// two doors is two parts — and the checkout multiplies it by the cart; this
// checker only knows the ZIP, so it quotes the per-part rate and says so.
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
          className="min-h-[44px] w-[130px] border border-[var(--line)] bg-[var(--surface-raised)] px-3 font-[family-name:var(--font-barlow)] text-[15px] text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:outline-none"
        />
        <button
          type="submit"
          className="min-h-[44px] border border-[var(--line-strong)] px-4 font-[family-name:var(--font-barlow)] text-[14px] font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent)]"
        >
          Check delivery
        </button>
      </form>

      {result === "invalid" ? (
        <p aria-live="polite" className="text-[13px] text-[var(--danger)]">
          Enter a 5-digit ZIP code.
        </p>
      ) : result ? (
        <div aria-live="polite" className="flex flex-col gap-1 text-[13.5px]">
          {/* --stock-in, not the old #4ADE80: that green was picked for a
              black ground and fails contrast on this one. */}
          {result.zone === "ORLANDO" ? (
            <p className="font-semibold text-[var(--stock-in)]">Free delivery — you&apos;re in Orlando.</p>
          ) : result.zone === "CENTRAL_FL" ? (
            <p className="font-semibold text-[var(--stock-in)]">
              Free delivery — you&apos;re in our Central Florida area.
            </p>
          ) : result.zone === "FLORIDA" ? (
            <p className="font-semibold text-[var(--ink)]">
              We deliver across Florida — ${result.perPartUsd} per part.
            </p>
          ) : (
            <p className="font-semibold text-[var(--ink)]">
              We ship out of state — ${result.perPartUsd} per part.
            </p>
          )}

          {result.free ? (
            <p className="text-[var(--ink-muted)]">
              {result.sameDayAvailable
                ? `Order in the next few hours and it goes out today — the cutoff is ${result.cutoffLabel}.`
                : `Today's ${result.cutoffLabel} cutoff has passed, so this would go out tomorrow.`}
            </p>
          ) : (
            <p className="text-[var(--ink-muted)]">
              Per part means per unit — two doors is two parts. The exact total shows at checkout.
            </p>
          )}

          <p className="text-[var(--ink-faint)]">
            Questions?{" "}
            <a href={`tel:${PHONE_HREF}`} className="text-[var(--ink)] underline">
              Call {PHONE_DISPLAY}
            </a>
            .
          </p>
        </div>
      ) : (
        <p className="text-[12.5px] text-[var(--ink-faint)]">
          Free across Central FL · same-day before {SAME_DAY_CUTOFF_LABEL} · $90/part elsewhere in FL · $250/part out of state
        </p>
      )}
    </div>
  );
}
