"use client";

import { useActionState, useId } from "react";
import Link from "next/link";
import { analyzeEstimate, type EstimateState } from "./actions";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";
import {
  badgeClass,
  bodyClass,
  eyebrowClass,
  primaryButtonClass,
  secondaryButtonClass,
  subHeadingClass,
} from "@/lib/public-ui";

export function EstimateForm() {
  const [state, formAction, pending] = useActionState<EstimateState, FormData>(analyzeEstimate, {});
  const uid = useId();
  const r = state.result;

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-3">
        <label htmlFor={`${uid}-file`} className="font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-[#B4B4B4]">
          Estimate PDF
        </label>
        <input
          id={`${uid}-file`}
          type="file"
          name="estimate"
          accept="application/pdf,.pdf"
          required
          className="w-full border border-white/12 bg-[#111] p-3 font-[family-name:var(--font-barlow)] text-[14px] text-white file:mr-3 file:border-0 file:bg-[#E31E24] file:px-3 file:py-2 file:font-semibold file:text-white"
        />
        <button type="submit" disabled={pending} className={`${primaryButtonClass} disabled:opacity-60`}>
          {pending ? "Reading the estimate…" : "Check what we have"}
        </button>
        <p className="font-[family-name:var(--font-barlow)] text-[12.5px] text-[#8A8A8A]">
          {/* Said plainly because an estimate contains a customer's name,
              address and claim number. */}
          We read the VIN and the parts listed, then delete the file. Nothing from the estimate is
          stored.
        </p>
        {state.error ? (
          <p aria-live="polite" className="text-[13px] font-semibold text-[#f87171]">
            {state.error}
          </p>
        ) : null}
      </form>

      {r?.scanned ? (
        <div className="flex flex-col gap-2.5 border border-[#FBBF24]/40 bg-[#FBBF24]/[0.06] p-5">
          <h2 className={subHeadingClass}>That looks like a scan</h2>
          <p className={bodyClass}>
            There&apos;s no readable text in that PDF, so it&apos;s probably a photo or a scan.
            Send it to us and we&apos;ll quote it by hand — or type the VIN in instead.
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <a href={`tel:${PHONE_HREF}`} className={primaryButtonClass}>
              Call {PHONE_DISPLAY}
            </a>
            <Link href="/vin" className={secondaryButtonClass}>
              Search by VIN
            </Link>
          </div>
        </div>
      ) : null}

      {r && !r.scanned ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2.5 border border-white/10 bg-[#111] p-5">
            <span className={eyebrowClass}>What we read</span>
            {r.vehicle ? (
              <h2 className={subHeadingClass}>
                {[r.vehicle.year, r.vehicle.make, r.vehicle.model].filter(Boolean).join(" ")}
                {r.vehicle.trim ? ` ${r.vehicle.trim}` : ""}
              </h2>
            ) : (
              <p className={bodyClass}>
                We couldn&apos;t identify the vehicle from that estimate.
              </p>
            )}
            {r.vin ? <p className="font-mono text-[13px] text-[#8A8A8A]">{r.vin}</p> : null}
            {r.vinWarning ? (
              <p className="border-l-2 border-[#FBBF24] pl-3 text-[13px] text-[#FBBF24]">
                {r.vinWarning}
              </p>
            ) : null}
            {r.partTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {r.partTypes.map((t) => (
                  <span key={t} className={`${badgeClass} border-white/25 text-[#D4D4D4]`}>
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="font-[family-name:var(--font-barlow)] text-[12.5px] text-[#8A8A8A]">
              Check this matches your estimate before ordering — we read it automatically.
            </p>
          </div>

          {r.matches.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className={subHeadingClass}>What we have in stock</h2>
              <ul className="flex flex-col divide-y divide-white/10 border-y border-white/10">
                {r.matches.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3">
                    <Link href={`/catalog/${m.id}`} className="text-[14.5px] font-medium text-white hover:text-[#E31E24]">
                      {m.label}
                    </Link>
                    <span className="font-mono text-[12px] text-[#8A8A8A]">{m.sku}</span>
                    <span className="ml-auto flex items-center gap-2.5">
                      <span className={`${badgeClass} border-white/25 text-[#D4D4D4]`}>{m.availability}</span>
                      <span className="font-[family-name:var(--font-oswald)] text-[16px] font-semibold">
                        {m.price}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className={bodyClass}>
              We don&apos;t have anything listed for those parts on that vehicle right now — but we
              stock far more than we list. Call us with the estimate and we&apos;ll check.
            </p>
          )}

          {r.unmatchedPartTypes.length > 0 ? (
            <div className="flex flex-col gap-2 border border-white/10 bg-[#111] p-5">
              <span className={eyebrowClass}>Not matched</span>
              <p className={bodyClass}>
                These were on the estimate but we don&apos;t have them listed for this vehicle:{" "}
                {r.unmatchedPartTypes.join(", ")}. Call and we&apos;ll source them.
              </p>
              <a href={`tel:${PHONE_HREF}`} className={`${secondaryButtonClass} self-start`}>
                Call {PHONE_DISPLAY}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
