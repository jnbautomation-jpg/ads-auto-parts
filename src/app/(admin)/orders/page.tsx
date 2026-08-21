import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireAuthContext } from "@/lib/auth";
import { canEditCatalog } from "@/lib/permissions";
import { formatMoney } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, orderNumberLabel } from "@/lib/orders";
import { cardClass, inputClass, mutedClass, pageHeadingClass } from "@/lib/admin-ui";
import { OrderRow } from "./order-row";

const STATUS_TABS = ["ALL", "NEW", "READY", "DELIVERED", "PICKED_UP", "CANCELLED"] as const;

type SearchParams = { status?: string; q?: string; from?: string; to?: string };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { organization, user } = await requireAuthContext();
  const params = await searchParams;

  const status = STATUS_TABS.includes((params.status ?? "ALL") as never)
    ? (params.status ?? "ALL")
    : "ALL";
  const q = params.q?.trim() ?? "";
  const from = params.from?.trim() ?? "";
  const to = params.to?.trim() ?? "";

  const where: Prisma.OrderWhereInput = { organizationId: organization.id };
  if (status !== "ALL") where.status = status as never;

  // Search by customer, phone, or part — the three things a staff member has
  // in front of them when someone calls about an order.
  if (q) {
    const asNumber = Number(q.replace(/\D/g, ""));
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { items: { some: { sku: { contains: q, mode: "insensitive" } } } },
      { items: { some: { description: { contains: q, mode: "insensitive" } } } },
      ...(Number.isFinite(asNumber) && asNumber > 0 ? [{ orderNumber: asNumber }] : []),
    ];
  }

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(`${from}T00:00:00`);
    // Inclusive of the end date — a staff member picking "to: today" means
    // everything today, not everything before midnight.
    if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999`);
  }

  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { items: { select: { id: true, sku: true, description: true, quantity: true } } },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { organizationId: organization.id },
      _count: { _all: true },
    }),
  ]);

  const countFor = (s: string) =>
    s === "ALL"
      ? counts.reduce((sum, c) => sum + c._count._all, 0)
      : (counts.find((c) => c.status === s)?._count._all ?? 0);

  const qs = (overrides: Record<string, string>) => {
    const next = new URLSearchParams();
    if (status !== "ALL") next.set("status", status);
    if (q) next.set("q", q);
    if (from) next.set("from", from);
    if (to) next.set("to", to);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const s = next.toString();
    return s ? `/orders?${s}` : "/orders";
  };

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageHeadingClass}>Orders</h1>
        <span className={mutedClass}>
          {orders.length} shown{orders.length === 200 ? " (newest 200)" : ""}
        </span>
      </div>

      {/* Status tabs — horizontally scrollable so they work on a phone in the
          warehouse, which is where the spec says these get used. */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={qs({ status: s === "ALL" ? "" : s })}
            className={`whitespace-nowrap border px-3 py-2 font-[family-name:var(--font-oswald)] text-[11px] font-semibold tracking-[0.12em] transition-colors ${
              status === s
                ? "border-[#E31E24] bg-[#E31E24] text-white"
                : "border-black/15 bg-white text-[#555] hover:border-black/35"
            }`}
          >
            {s === "ALL" ? "ALL" : ORDER_STATUS_LABEL[s].toUpperCase()} ({countFor(s)})
          </Link>
        ))}
      </div>

      <form action="/orders" method="GET" className="flex flex-wrap items-end gap-2">
        {status !== "ALL" ? <input type="hidden" name="status" value={status} /> : null}
        <label className="flex flex-1 flex-col gap-1 text-[10.5px] font-semibold tracking-[0.14em] text-[#8a8a8a]">
          SEARCH
          <input
            name="q"
            defaultValue={q}
            placeholder="Customer, phone, part, or order #"
            className={`${inputClass} min-w-[200px]`}
          />
        </label>
        <label className="flex flex-col gap-1 text-[10.5px] font-semibold tracking-[0.14em] text-[#8a8a8a]">
          FROM
          <input type="date" name="from" defaultValue={from} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-[10.5px] font-semibold tracking-[0.14em] text-[#8a8a8a]">
          TO
          <input type="date" name="to" defaultValue={to} className={inputClass} />
        </label>
        <button
          type="submit"
          className="inline-flex h-11 items-center bg-black px-4 font-[family-name:var(--font-oswald)] text-xs font-semibold tracking-[0.14em] text-white md:h-[34px]"
        >
          FILTER
        </button>
        {q || from || to ? (
          <Link
            href={status === "ALL" ? "/orders" : `/orders?status=${status}`}
            className="inline-flex h-11 items-center px-2 font-[family-name:var(--font-barlow)] text-sm text-[#8a8a8a] underline md:h-[34px]"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <div className={`${cardClass} flex flex-col`}>
        {orders.length === 0 ? (
          <p className="px-3.5 py-10 text-center text-sm text-[#8a8a8a]">No orders match those filters.</p>
        ) : (
          orders.map((order) => (
            <OrderRow
              key={order.id}
              order={{
                id: order.id,
                label: orderNumberLabel(order.orderNumber),
                customerName: order.customerName,
                customerPhone: order.customerPhone,
                status: order.status,
                statusLabel: ORDER_STATUS_LABEL[order.status] ?? order.status,
                paymentStatus: order.paymentStatus,
                paymentLabel: PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus,
                fulfillment: order.fulfillment,
                total: formatMoney(order.total.toString()),
                placed: order.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                items: order.items.map((i) => `${i.quantity}× ${i.description} (${i.sku})`),
              }}
              canEditPayment={canEditCatalog(user.role)}
            />
          ))
        )}
      </div>
    </div>
  );
}
