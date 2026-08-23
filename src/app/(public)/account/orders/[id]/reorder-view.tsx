import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { orderNumberLabel } from "@/lib/orders";
import { badgeClass, bodyClass, eyebrowClass, h1Class } from "@/lib/public-ui";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { loadReorderPlan } from "../../order-actions";
import { ReorderConfirmForm } from "./reorder-form";

// Reorder statuses are customer-facing, so they translate like everything
// else the spec lists (statuses, not just marketing copy).
function statusLabelFor(status: string, a: ReturnType<typeof getDictionary>["account"]): string {
  if (status === "UNCHANGED") return a.statusUnchanged;
  if (status === "PRICE_CHANGED") return a.statusPriceChanged;
  if (status === "PARTIAL_STOCK") return a.statusPartial;
  if (status === "OUT_OF_STOCK") return a.statusOutOfStock;
  return a.statusDiscontinued;
}

function statusColor(status: string): string {
  if (status === "UNCHANGED") return "border-[var(--line-strong)] text-[var(--ink-muted)]";
  if (status === "PRICE_CHANGED") return "border-[var(--stock-low)] text-[var(--stock-low)]";
  return "border-[var(--danger)] text-[var(--danger)]";
}

export async function ReorderView({
  params,
  locale,
}: {
  params: Promise<{ id: string }>;
  locale: Locale;
}) {
  const a = getDictionary(locale).account;
  const statusLabel = (s: string) => statusLabelFor(s, a);
  const { id } = await params;
  const loaded = await loadReorderPlan(id);
  if (!loaded) notFound();

  const { order, plan } = loaded;

  return (
    <main className="mx-auto flex min-h-screen max-w-[760px] flex-col gap-6 px-5 py-12 lg:py-16">
      <div className="flex flex-col gap-1.5">
        <span className={eyebrowClass}>Reorder {orderNumberLabel(order.orderNumber)}</span>
        <h1 className={h1Class}>{a.checkBeforeOrder}</h1>
        <p className={bodyClass}>
{a.reorderExplain}
        </p>
      </div>

      {plan.hasChanges ? (
        <p className="border-l-2 border-[var(--stock-low)] bg-[var(--stock-low)]/[0.08] px-4 py-3 font-[family-name:var(--font-barlow)] text-[14px] text-[var(--stock-low)]">
          {a.somethingChanged}
        </p>
      ) : null}

      <ul className="flex flex-col divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {plan.lines.map((line) => (
          <li key={line.sku} className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 py-3.5">
            <span className="font-[family-name:var(--font-barlow)] text-[14.5px] font-medium text-[var(--ink)]">
              {line.wantedQuantity}× {line.description}
            </span>
            <span className="font-mono text-[12px] text-[var(--ink-faint)]">{line.sku}</span>

            <span className="ml-auto flex flex-wrap items-center gap-2.5">
              {line.status === "PRICE_CHANGED" && line.currentUnitPrice !== null ? (
                <span className="font-[family-name:var(--font-barlow)] text-[13.5px]">
                  <span className="text-[var(--ink-faint)] line-through">
                    {formatMoney(line.previousUnitPrice)}
                  </span>{" "}
                  <span className="font-semibold text-[var(--ink)]">
                    {formatMoney(line.currentUnitPrice)}
                  </span>
                </span>
              ) : line.currentUnitPrice !== null ? (
                <span className="font-[family-name:var(--font-barlow)] text-[13.5px] font-semibold text-[var(--ink)]">
                  {formatMoney(line.currentUnitPrice)}
                </span>
              ) : null}

              <span className={`${badgeClass} ${statusColor(line.status)}`}>
                {statusLabel(line.status)}
                {line.status === "PARTIAL_STOCK" ? ` (${line.availableQuantity})` : ""}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-baseline justify-between">
        <span className={bodyClass}>{a.totalToday}</span>
        <span className="font-[family-name:var(--font-oswald)] text-[26px] font-semibold">
          {formatMoney(plan.currentTotal)}
        </span>
      </div>

      <ReorderConfirmForm orderId={order.id} disabled={plan.empty} locale={locale} />

      {plan.empty ? (
        <p className={bodyClass}>
{a.noneAvailable}
        </p>
      ) : null}

      <Link
        href={localePath(locale, "/account/orders")}
        className="text-center font-[family-name:var(--font-barlow)] text-[12px] font-semibold tracking-[0.14em] text-[var(--ink-faint)] transition-colors hover:text-[var(--ink-muted)]"
      >
        {a.backToOrders}
      </Link>
    </main>
  );
}
