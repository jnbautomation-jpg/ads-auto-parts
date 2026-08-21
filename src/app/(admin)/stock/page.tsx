import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { formatFit, formatPartType } from "@/lib/format";
import {
  COUNT_STALE_DAYS,
  RISK_EXPLANATION,
  RISK_LABEL,
  buildCountWorklist,
  summarize,
} from "@/lib/stock-audit";
import { cardClass, mutedClass, pageHeadingClass, sectionLabelClass } from "@/lib/admin-ui";
import { CountRow } from "./count-row";

// Stock accuracy pass (spec section 4).
//
// The spec's worry — "a large share of items currently show LOW STOCK, and if
// that's stale it undermines trust once checkout is live" — is measurable
// here rather than assumed. The header shows what share of the catalog has
// actually been verified, and the worklist puts the parts whose staleness is
// costing something at the top.
export default async function StockPage() {
  const { organization } = await requireAuthContext();

  const products = await prisma.product.findMany({
    where: { organizationId: organization.id },
    select: {
      id: true,
      sku: true,
      make: true,
      model: true,
      yearStart: true,
      yearEnd: true,
      partType: true,
      quantity: true,
      reorderPoint: true,
      isPublic: true,
      binLocation: true,
      lastCountedAt: true,
    },
  });

  const stats = summarize(products);
  const worklist = buildCountWorklist(products).filter((p) => p.risk !== "OK").slice(0, 100);

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageHeadingClass}>Stock accuracy</h1>
        <span className={mutedClass}>
          {stats.verifiedPercent}% of {stats.total} verified in the last {COUNT_STALE_DAYS} days
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ["SHOWING_CALL", "#B4231F"],
            ["SHOWING_LOW", "#B45309"],
            ["NEVER_COUNTED", "#666"],
            ["OK", "#15803d"],
          ] as const
        ).map(([key, color]) => (
          <div key={key} className={`${cardClass} flex flex-col gap-1 px-3.5 py-3`}>
            <span className="font-[family-name:var(--font-oswald)] text-[22px] font-bold" style={{ color }}>
              {stats.counts[key]}
            </span>
            <span className="font-[family-name:var(--font-barlow)] text-[12px] text-[#555]">
              {RISK_LABEL[key]}
            </span>
          </div>
        ))}
      </div>

      <p className="border border-black/10 bg-white px-3.5 py-2.5 text-sm text-[#555]">
        Counted in this order because these are the parts where a wrong number costs something:
        anything the public sees as out of stock or low first, then everything never physically
        checked. Confirming a count that already matches is worth doing — that is what marks it
        verified.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className={sectionLabelClass}>COUNT THESE FIRST</h2>
        <div className={`${cardClass} flex flex-col`}>
          {worklist.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-sm text-[#8a8a8a]">
              Everything has been counted recently. Nothing to do.
            </p>
          ) : (
            worklist.map((p) => (
              <CountRow
                key={p.id}
                product={{
                  id: p.id,
                  sku: p.sku,
                  label: `${formatFit(p.make, p.model, p.yearStart, p.yearEnd)} — ${formatPartType(p.partType)}`,
                  quantity: p.quantity,
                  reorderPoint: p.reorderPoint,
                  riskKey: p.risk,
                  riskLabel: RISK_LABEL[p.risk],
                  riskExplanation: RISK_EXPLANATION[p.risk],
                  lastCounted: p.lastCountedAt
                    ? `last counted ${p.lastCountedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : "never counted",
                  binLocation: p.binLocation,
                }}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
