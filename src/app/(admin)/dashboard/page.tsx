import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { formatFit, formatMoney, formatPartType } from "@/lib/format";
import { cardClass, codeClass, mutedClass, pageHeadingClass, tableHeaderRowClass, tableRowClass } from "@/lib/admin-ui";

type Stats = {
  totalProducts: number;
  totalUnits: number;
  totalValue: string;
  lowStockCount: number;
};

type LowStockRow = {
  id: string;
  sku: string;
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
  partType: string;
  quantity: number;
  reorderPoint: number;
};

const ROW_COLS = "grid-cols-[160px_110px_1fr_70px_80px_70px]";

export default async function DashboardPage() {
  const { organization } = await requireAuthContext();

  const [stats] = await prisma.$queryRaw<Stats[]>`
    SELECT
      COUNT(*)::int AS "totalProducts",
      COALESCE(SUM(quantity), 0)::int AS "totalUnits",
      COALESCE(SUM(quantity * cost), 0)::numeric AS "totalValue",
      COUNT(*) FILTER (WHERE quantity <= "reorderPoint")::int AS "lowStockCount"
    FROM products
    WHERE "organizationId" = ${organization.id}
  `;

  const needsRestock = await prisma.$queryRaw<LowStockRow[]>`
    SELECT p.id, p.sku, p.make, p.model, p."yearStart", p."yearEnd", p."partType", p.quantity, p."reorderPoint"
    FROM products p
    WHERE p."organizationId" = ${organization.id} AND p.quantity <= p."reorderPoint"
    ORDER BY p.quantity ASC
    LIMIT 50
  `;

  const cards = [
    { label: "TOTAL PRODUCTS", value: stats.totalProducts.toLocaleString() },
    { label: "UNITS IN STOCK", value: stats.totalUnits.toLocaleString() },
    { label: "NEEDS RESTOCK", value: stats.lowStockCount.toLocaleString(), flag: true },
    { label: "INVENTORY VALUE", value: formatMoney(stats.totalValue) },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col items-start gap-1 md:flex-row md:items-baseline md:justify-between md:gap-0">
        <h1 className={pageHeadingClass}>Overview</h1>
        <p className={mutedClass}>Snapshot of current inventory</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`${cardClass} flex flex-col gap-1 px-4 py-3.5 ${card.flag ? "border-t-2 border-t-[#F59E0B]" : ""}`}
          >
            <div className="font-[family-name:var(--font-oswald)] text-[10.5px] font-semibold tracking-[0.18em] text-[#8a8a8a]">
              {card.label}
            </div>
            <div
              className={`font-[family-name:var(--font-oswald)] text-[26px] font-semibold tracking-[0.04em] ${
                card.flag ? "text-[#B45309]" : "text-black"
              }`}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between border-b border-black/8 px-3.5 py-2.5">
          <div className="font-[family-name:var(--font-oswald)] text-[13px] font-semibold tracking-[0.16em]">
            NEEDS RESTOCK
          </div>
          <div className={mutedClass}>{needsRestock.length} items at or below reorder point</div>
        </div>
        {needsRestock.length === 0 ? (
          <p className="px-3.5 py-6 text-sm text-[#8a8a8a]">Nothing at or below its reorder point.</p>
        ) : (
          <>
            {/* Desktop dense table */}
            <div className="hidden md:block">
              <div className={`${tableHeaderRowClass} ${ROW_COLS}`}>
                <div>CODE</div>
                <div>PART</div>
                <div>VEHICLE FIT</div>
                <div className="text-right">QTY</div>
                <div className="text-right">REORDER</div>
                <div />
              </div>
              {needsRestock.map((row) => (
                <Link
                  key={row.id}
                  href={`/products/${row.id}`}
                  className={`${tableRowClass} ${ROW_COLS} cursor-pointer border-l-2 border-l-[#F59E0B] bg-[#F59E0B]/[0.05] last:border-b-0 hover:bg-[#F59E0B]/[0.12]`}
                >
                  <div className={codeClass}>{row.sku}</div>
                  <div>{formatPartType(row.partType)}</div>
                  <div className="truncate">{formatFit(row.make, row.model, row.yearStart, row.yearEnd)}</div>
                  <div className="text-right font-bold text-[#B45309]">{row.quantity}</div>
                  <div className="text-right text-[#8a8a8a]">{row.reorderPoint}</div>
                  <div className="text-right font-[family-name:var(--font-barlow)] text-[11px] font-semibold tracking-[0.08em] text-[#E31E24]">
                    OPEN →
                  </div>
                </Link>
              ))}
            </div>

            {/* Mobile stacked cards */}
            <div className="flex flex-col md:hidden">
              {needsRestock.map((row) => (
                <Link
                  key={row.id}
                  href={`/products/${row.id}`}
                  className="flex flex-col gap-1 border-b border-l-2 border-l-[#F59E0B] bg-[#F59E0B]/[0.05] px-3.5 py-3 last:border-b-0 active:bg-[#F59E0B]/[0.12]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-[family-name:var(--font-oswald)] text-[14px] font-semibold leading-tight">
                      {formatFit(row.make, row.model, row.yearStart, row.yearEnd)}
                    </div>
                    <span className="shrink-0 font-[family-name:var(--font-barlow)] text-[11px] font-semibold tracking-[0.08em] text-[#E31E24]">
                      OPEN →
                    </span>
                  </div>
                  <div className={`${codeClass} text-[#666]`}>
                    {row.sku} · {formatPartType(row.partType)}
                  </div>
                  <div className="flex items-center gap-3 font-[family-name:var(--font-barlow)] text-[13px]">
                    <span className="font-bold text-[#B45309]">{row.quantity} on hand</span>
                    <span className="text-[#8a8a8a]">reorder at {row.reorderPoint}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
