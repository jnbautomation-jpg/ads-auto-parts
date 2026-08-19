import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { formatPartType } from "@/lib/format";
import { formatReceivedDate } from "@/lib/inquiry";
import { ALERT_STATUS_LABEL, ALERT_TYPE_LABEL } from "@/lib/alerts";
import { cardClass, mutedClass, pageHeadingClass, sectionLabelClass } from "@/lib/admin-ui";
import { updateAlertStatus } from "./actions";

// Staff queue for customers waiting on a part.
//
// Sending SMS/email automatically needs a provider account the shop doesn't
// have yet, so this is the manual version: who is waiting, for what, and a
// tap-to-call number. Still strictly better than the previous behaviour,
// where an empty search was a customer who simply left.
export default async function AlertsPage() {
  const { organization } = await requireAuthContext();

  const [waiting, handled] = await Promise.all([
    prisma.partAlert.findMany({
      where: { organizationId: organization.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      include: { product: { select: { sku: true } } },
    }),
    prisma.partAlert.findMany({
      where: { organizationId: organization.id, status: { not: "ACTIVE" } },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { product: { select: { sku: true } } },
    }),
  ]);

  const row = (a: (typeof waiting)[number], actionable: boolean) => (
    <div key={a.id} className="flex flex-col gap-2 border-b border-black/5 px-3.5 py-3 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-[family-name:var(--font-oswald)] text-[14px] font-semibold">
          {[a.year, a.make, a.model].filter(Boolean).join(" ")}
        </span>
        <span className="font-[family-name:var(--font-barlow)] text-[13px] text-[#555]">
          {a.partType ? formatPartType(a.partType) : "Any part"}
          {a.product ? ` · ${a.product.sku}` : ""}
        </span>
        <a
          href={`tel:${a.phone.replace(/\D/g, "")}`}
          className="font-[family-name:var(--font-barlow)] text-[13px] font-semibold text-black underline"
        >
          {a.phone}
        </a>
        {a.name ? (
          <span className="font-[family-name:var(--font-barlow)] text-[13px] text-[#555]">{a.name}</span>
        ) : null}
        <span className={`ml-auto ${mutedClass}`}>
          {ALERT_TYPE_LABEL[a.type]} · {formatReceivedDate(a.createdAt)} ·{" "}
          {ALERT_STATUS_LABEL[a.status]}
        </span>
      </div>

      {actionable ? (
        <div className="flex flex-wrap gap-2">
          <form action={updateAlertStatus}>
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="status" value="NOTIFIED" />
            <button
              type="submit"
              className="inline-flex h-9 items-center border border-black bg-black px-3 font-[family-name:var(--font-oswald)] text-[11px] font-semibold tracking-[0.12em] text-white"
            >
              MARK CONTACTED
            </button>
          </form>
          <form action={updateAlertStatus}>
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="status" value="CANCELLED" />
            <button
              type="submit"
              className="inline-flex h-9 items-center border border-black/20 px-3 font-[family-name:var(--font-oswald)] text-[11px] font-semibold tracking-[0.12em] text-[#999] hover:border-[#B4231F] hover:text-[#B4231F]"
            >
              CLOSE
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className={pageHeadingClass}>Part requests</h1>
        <span className={mutedClass}>{waiting.length} waiting</span>
      </div>

      <p className="border border-black/10 bg-white px-3.5 py-2.5 text-sm text-[#555]">
        Customers who searched for something we didn&apos;t have. Call them when the part lands —
        automatic SMS and email need a messaging provider to be set up first.
      </p>

      <section className="flex flex-col gap-2">
        <h2 className={sectionLabelClass}>WAITING</h2>
        <div className={`${cardClass} flex flex-col`}>
          {waiting.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-sm text-[#8a8a8a]">Nobody waiting right now.</p>
          ) : (
            waiting.map((a) => row(a, true))
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={sectionLabelClass}>HANDLED</h2>
        <div className={`${cardClass} flex flex-col`}>
          {handled.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-sm text-[#8a8a8a]">Nothing handled yet.</p>
          ) : (
            handled.map((a) => row(a, false))
          )}
        </div>
      </section>
    </div>
  );
}
