import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCustomerContext } from "@/lib/customer-auth";
import { formatMoney } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, orderNumberLabel } from "@/lib/orders";
import { badgeClass, bodyClass, eyebrowClass, h1Class, secondaryButtonClass } from "@/lib/public-ui";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

export async function CustomerOrdersView({
  searchParams,
  locale,
}: {
  searchParams: Promise<{ placed?: string }>;
  locale: Locale;
}) {
  const a = getDictionary(locale).account;
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
        <h1 className={h1Class}>{a.yourOrders}</h1>
        <p className={bodyClass}>{a.reorderIntro}</p>
      </div>

      {placed ? (
        <p className="border border-[var(--stock-in)]/35 bg-[var(--stock-in)]/[0.08] px-4 py-3 font-[family-name:var(--font-barlow)] text-[14px] font-semibold text-[var(--stock-in)]">
          ADS-{placed}: {a.orderPlaced}
        </p>
      ) : null}

      {orders.length === 0 ? (
        <p className={bodyClass}>{a.nothingYet}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-col gap-2.5 border border-[var(--line)] bg-[var(--surface-raised)] p-5">
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
                  <span className={`${badgeClass} border-[var(--line-strong)] text-[var(--ink-muted)]`}>
                    {ORDER_STATUS_LABEL[o.status]}
                  </span>
                  <span className={`${badgeClass} border-[var(--line-strong)] text-[var(--ink-muted)]`}>
                    {PAYMENT_STATUS_LABEL[o.paymentStatus]}
                  </span>
                  <span className="font-[family-name:var(--font-oswald)] text-[16px] font-semibold">
                    {formatMoney(o.total.toString())}
                  </span>
                </span>
              </div>

              <ul className="flex flex-col gap-0.5">
                {o.items.map((i) => (
                  <li key={i.id} className="font-[family-name:var(--font-barlow)] text-[13.5px] text-[var(--ink-muted)]">
                    {i.quantity}× {i.description} ({i.sku})
                  </li>
                ))}
              </ul>

              <div>
                {/* Deliberately a link to a review screen, not a one-click
                    submit — prices and stock may have moved since. */}
                <Link href={localePath(locale, `/account/orders/${o.id}`)} className={secondaryButtonClass}>
                  {a.reorder}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={localePath(locale, "/account")}
        className="text-center font-[family-name:var(--font-barlow)] text-[12px] font-semibold tracking-[0.14em] text-[var(--ink-faint)] transition-colors hover:text-[var(--ink-muted)]"
      >
        {a.backToAccount}
      </Link>
    </main>
  );
}
