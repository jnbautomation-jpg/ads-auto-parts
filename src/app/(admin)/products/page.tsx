import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PartType } from "@/generated/prisma/enums";
import { requireAuthContext } from "@/lib/auth";
import { formatFit, formatMoney, formatPartType, formatPosition } from "@/lib/format";
import {
  buttonPrimaryClass,
  capaBadgeClass,
  cardClass,
  codeClass,
  pageHeadingClass,
  tableHeaderRowClass,
  tableRowClass,
} from "@/lib/admin-ui";
import { ProductFilters } from "@/components/product-filters";
import { toggleProductVisibility } from "./actions";

const PART_TYPES = Object.values(PartType);
const ROW_COLS = "grid-cols-[152px_100px_1fr_52px_60px_62px_70px_84px_80px]";

type SearchParams = {
  q?: string;
  partType?: string;
  lowOnly?: string;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { organization } = await requireAuthContext();
  const params = await searchParams;

  const q = params.q?.trim() || undefined;
  const partType = params.partType && PART_TYPES.includes(params.partType as PartType) ? (params.partType as PartType) : undefined;
  const lowOnly = params.lowOnly === "on";

  const where: Prisma.ProductWhereInput = {
    organizationId: organization.id,
    ...(partType ? { partType } : {}),
    ...(q
      ? {
          OR: [
            { make: { contains: q, mode: "insensitive" as const } },
            { model: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const allMatching = await prisma.product.findMany({ where, orderBy: { quantity: "asc" } });
  const totalCount = await prisma.product.count({ where: { organizationId: organization.id } });
  const products = lowOnly ? allMatching.filter((p) => p.quantity <= p.reorderPoint) : allMatching;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className={pageHeadingClass}>Products</h1>
        <Link href="/products/new" className={buttonPrimaryClass}>
          + NEW PRODUCT
        </Link>
      </div>

      <ProductFilters
        q={q}
        partType={partType}
        lowOnly={lowOnly}
        partTypes={PART_TYPES.map((pt) => ({ value: pt, label: formatPartType(pt) }))}
        resultSummary={`${products.length} of ${totalCount} products`}
      />

      <div className={cardClass}>
        {/* Desktop dense table */}
        <div className="hidden md:block">
          <div className={`${tableHeaderRowClass} ${ROW_COLS}`}>
            <div>CODE</div>
            <div>PART</div>
            <div>VEHICLE FIT</div>
            <div>POS</div>
            <div>BIN</div>
            <div>CAPA</div>
            <div className="text-right">QTY</div>
            <div className="text-right">PRICE</div>
            <div className="text-center">PUBLIC</div>
          </div>
          {products.length === 0 ? (
            <p className="px-3.5 py-8 text-center text-sm text-[#8a8a8a]">No products match these filters.</p>
          ) : (
            products.map((product) => {
              const low = product.quantity <= product.reorderPoint;
              return (
                <div
                  key={product.id}
                  className={`${tableRowClass} ${ROW_COLS} border-l-2 last:border-b-0 hover:bg-[#f4f4f4] ${
                    low ? "border-l-[#F59E0B] bg-[#F59E0B]/[0.06]" : "border-l-transparent"
                  }`}
                >
                  <Link href={`/products/${product.id}`} className={`${codeClass} hover:underline`}>
                    {product.sku}
                  </Link>
                  <div>{formatPartType(product.partType)}</div>
                  <div className="truncate">{formatFit(product.make, product.model, product.yearStart, product.yearEnd)}</div>
                  <div className="text-[#666]">{product.position ? formatPosition(product.position) : "—"}</div>
                  <div className="text-[#666]">{product.binLocation ?? "—"}</div>
                  <div>
                    <span className={capaBadgeClass(product.capaCertified)}>
                      {product.capaCertified ? "CAPA" : "—"}
                    </span>
                  </div>
                  <div className={`text-right font-bold ${low ? "text-[#B45309]" : "text-[#15803d]"}`}>
                    {product.quantity}
                  </div>
                  <div className="text-right">{formatMoney(product.price.toString())}</div>
                  <div className="flex justify-center">
                    <form action={toggleProductVisibility}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="next" value={(!product.isPublic).toString()} />
                      <button
                        type="submit"
                        aria-label={product.isPublic ? "Hide from public catalog" : "Show on public catalog"}
                        className={`relative h-4 w-8 border border-black/15 transition-colors ${
                          product.isPublic ? "bg-black" : "bg-[#e2e2e2]"
                        }`}
                      >
                        <span
                          className={`absolute top-px h-[12px] w-[12px] border border-black/15 bg-white transition-all ${
                            product.isPublic ? "left-[17px]" : "left-px"
                          }`}
                        />
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Mobile stacked cards */}
        <div className="flex flex-col md:hidden">
          {products.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#8a8a8a]">No products match these filters.</p>
          ) : (
            products.map((product) => {
              const low = product.quantity <= product.reorderPoint;
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className={`flex flex-col gap-1.5 border-b border-l-2 border-black/5 px-4 py-3.5 last:border-b-0 active:bg-[#f4f4f4] ${
                    low ? "border-l-[#F59E0B] bg-[#F59E0B]/[0.06]" : "border-l-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-[family-name:var(--font-oswald)] text-[15px] font-semibold leading-tight">
                      {formatFit(product.make, product.model, product.yearStart, product.yearEnd)}
                    </div>
                    <span className={`shrink-0 ${capaBadgeClass(product.capaCertified)}`}>
                      {product.capaCertified ? "CAPA" : "—"}
                    </span>
                  </div>
                  <div className={`${codeClass} text-[#666]`}>{product.sku}</div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-[family-name:var(--font-barlow)] text-[13px] text-[#555]">
                    <span>
                      {formatPartType(product.partType)}
                      {product.position ? ` · ${formatPosition(product.position)}` : ""}
                    </span>
                    <span className="text-[#8a8a8a]">BIN {product.binLocation ?? "—"}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div
                      className={`flex items-baseline gap-1.5 font-[family-name:var(--font-oswald)] text-[20px] font-bold ${
                        low ? "text-[#B45309]" : "text-[#15803d]"
                      }`}
                    >
                      {product.quantity}
                      {low ? (
                        <span className="font-[family-name:var(--font-barlow)] text-[10.5px] font-semibold tracking-[0.1em] text-[#B45309]">
                          LOW STOCK
                        </span>
                      ) : null}
                    </div>
                    <div className="font-[family-name:var(--font-barlow)] text-[15px] font-semibold">
                      {formatMoney(product.price.toString())}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
