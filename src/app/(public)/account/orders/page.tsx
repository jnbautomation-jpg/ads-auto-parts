import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/customer-auth";
import { formatMoney } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, orderNumberLabel } from "@/lib/orders";
import { badgeClass, bodyClass, eyebrowClass, h1Class, secondaryButtonClass } from "@/lib/public-ui";

export default async function CustomerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string }>;
}) {
  const { account } = await requireCustomerContext();
  const { placed } = await searchParams;

  const orders = await prisma.order.findMany({
    where: { customerAccountId: account.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { items: { select: { id: true, sku: true, description: true, quantity: true } } },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-[860px] flex-col gap-7 px-5 py-12 lg:py-16">
      <div className="flex flex-col gap-1.5">
        <h1 className={h1Class}>Your orders</h1>
        <p className={bodyClass}>Reorder anything you&apos;ve bought before.</p>
      </div>

      {placed ? (
        <p className="border border-[#4ade80]/30 bg-[#4ade80]/[0.06] px-4 py-3 font-[family-name:var(--font-barlow)] text-[14px] font-semibold text-[#4ade80]">
          Order ADS-{placed} placed — we&apos;ll be in touch.
        </p>
      ) : null}

      {orders.length === 0 ? (
        <p className={bodyClass}>Nothing yet. Once you order, it&apos;ll show up here.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-col gap-2.5 border border-white/10 bg-[#111] p-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-[family-name:var(--font-oswald)] text-[16px] font-semibold">
                  {orderNumberLabel(o.orderNumber)}
                </span>
                <span className={eyebrowClass}>
                  {o.createdAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  <span className={`${badgeClass} border-white/25 text-[#D4D4D4]`}>
                    {ORDER_STATUS_LABEL[o.status]}
                  </span>
                  <span className={`${badgeClass} border-white/25 text-[#D4D4D4]`}>
                    {PAYMENT_STATUS_LABEL[o.paymentStatus]}
                  </span>
                  <span className="font-[family-name:var(--font-oswald)] text-[16px] font-semibold">
                    {formatMoney(o.total.toString())}
                  </span>
                </span>
              </div>

              <ul className="flex flex-col gap-0.5">
                {o.items.map((i) => (
                  <li key={i.id} className="font-[family-name:var(--font-barlow)] text-[13.5px] text-[#B4B4B4]">
                    {i.quantity}× {i.description} ({i.sku})
                  </li>
                ))}
              </ul>

              <div>
                {/* Deliberately a link to a review screen, not a one-click
                    submit — prices and stock may have moved since. */}
                <Link href={`/account/orders/${o.id}`} className={secondaryButtonClass}>
                  Reorder
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/account"
        className="text-center font-[family-name:var(--font-barlow)] text-[12px] font-semibold tracking-[0.14em] text-[#777] transition-colors hover:text-[#ccc]"
      >
        ← BACK TO ACCOUNT
      </Link>
    </main>
  );
}
