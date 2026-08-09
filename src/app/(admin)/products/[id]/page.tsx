import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth";
import { canEditCatalog } from "@/lib/permissions";
import { formatFit, formatMoney, formatPartType, formatPosition } from "@/lib/format";
import { StockButtons } from "@/components/stock-buttons";
import { getPartTypeImage } from "@/lib/part-images";
import {
  buttonSecondaryClass,
  capaBadgeClass,
  cardClass,
  linkMutedClass,
  mutedClass,
  tableHeaderRowClass,
  tableRowClass,
} from "@/lib/admin-ui";
import { toggleProductVisibility } from "../actions";

const MOVE_COLS = "grid-cols-[110px_70px_60px_90px_1fr]";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organization, user } = await requireAuthContext();
  const canEdit = canEditCatalog(user.role);

  const product = await prisma.product.findFirst({
    where: { id, organizationId: organization.id },
    include: {
      supplier: true,
      stockMovements: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true } } },
      },
    },
  });

  if (!product) notFound();

  const lowStock = product.quantity <= product.reorderPoint;

  const infoRows: { k: string; v: string; color?: string; bold?: boolean }[] = [
    { k: "VEHICLE FIT", v: formatFit(product.make, product.model, product.yearStart, product.yearEnd), bold: true },
    { k: "PART", v: formatPartType(product.partType) + (product.position ? `, ${formatPosition(product.position)}` : "") },
    { k: "CODE", v: product.sku, bold: true },
    { k: "BIN LOCATION", v: product.binLocation ?? "—" },
    {
      k: "CONDITION",
      v: `Grade ${product.condition}${product.conditionNotes ? ` — ${product.conditionNotes}` : ""}`,
    },
    { k: "QTY ON HAND", v: String(product.quantity), color: lowStock ? "#B45309" : "#15803d", bold: true },
    { k: "REORDER PT", v: String(product.reorderPoint) },
    { k: "PRICE", v: formatMoney(product.price.toString()), bold: true },
    { k: "SUPPLIER", v: product.supplier?.name ?? "—" },
  ];

  return (
    <div className="flex max-w-5xl flex-col gap-3">
      <Link href="/products" className={`${linkMutedClass} text-xs font-semibold tracking-[0.08em]`}>
        ← PRODUCTS
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 pt-1.5 md:gap-3">
          <h1 className="font-[family-name:var(--font-oswald)] text-xl font-semibold tracking-[0.1em]">{product.sku}</h1>
          <span className={capaBadgeClass(product.capaCertified)}>
            {product.capaCertified ? "CAPA CERTIFIED" : "NOT CAPA"}
          </span>
          <span className={mutedClass}>
            {product.isPublic ? "Visible on public catalog" : "Hidden from public catalog"}
          </span>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-start">
          <StockButtons productId={product.id} />
          {canEdit ? (
            <Link href={`/products/${product.id}/edit`} className={`${buttonSecondaryClass} w-full md:w-auto`}>
              EDIT
            </Link>
          ) : null}
        </div>
      </div>

      {canEdit ? (
        <form action={toggleProductVisibility} className="-mt-1">
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="next" value={(!product.isPublic).toString()} />
          <button type="submit" className={`${linkMutedClass} text-xs`}>
            {product.isPublic ? "Hide from public catalog" : "Show on public catalog"}
          </button>
        </form>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[320px_1fr]">
        <div className={cardClass}>
          <div className="border-b border-black/8 px-3.5 py-2.5 font-[family-name:var(--font-oswald)] text-xs font-semibold tracking-[0.16em]">
            PRODUCT INFO
          </div>
          {infoRows.map((r) => (
            <div key={r.k} className="grid grid-cols-[110px_1fr] gap-2 border-b border-black/5 px-3.5 py-[7px] font-[family-name:var(--font-barlow)] text-[13px] last:border-b-0">
              <div className="pt-0.5 font-[family-name:var(--font-oswald)] text-[10.5px] font-semibold tracking-[0.14em] text-[#8a8a8a]">
                {r.k}
              </div>
              <div className={r.bold ? "font-semibold" : "font-medium"} style={r.color ? { color: r.color } : undefined}>
                {r.v}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <div className={`${cardClass} flex flex-col gap-2.5 px-3.5 py-3`}>
            <div className="font-[family-name:var(--font-oswald)] text-xs font-semibold tracking-[0.16em]">PHOTOS</div>
            {product.photos.length === 0 ? (
              (() => {
                const defaultImage = getPartTypeImage(product.partType);
                return defaultImage ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex h-[140px] w-[200px] items-center justify-center border border-black/10 bg-[#FAFAFA]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={defaultImage} alt="" className="h-[72%] w-[72%] object-contain" />
                    </div>
                    <p className={mutedClass}>No photos uploaded — showing the default {formatPartType(product.partType)} image.</p>
                  </div>
                ) : (
                  <p className="text-sm text-[#8a8a8a]">No photos uploaded.</p>
                );
              })()
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {product.photos.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className={`border border-black/10 object-cover ${i === 0 ? "h-[120px] w-[180px]" : "h-[120px] w-[120px]"}`}
                    />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className={cardClass}>
            <div className="border-b border-black/8 px-3.5 py-2.5 font-[family-name:var(--font-oswald)] text-xs font-semibold tracking-[0.16em]">
              MOVEMENT HISTORY
            </div>
            {product.stockMovements.length === 0 ? (
              <p className="px-3.5 py-6 text-sm text-[#8a8a8a]">No movements recorded yet.</p>
            ) : (
              <>
                {/* Desktop dense table */}
                <div className="hidden md:block">
                  <div className={`${tableHeaderRowClass} ${MOVE_COLS} h-7`}>
                    <div>DATE</div>
                    <div>TYPE</div>
                    <div className="text-right">QTY</div>
                    <div className="pl-4">BY</div>
                    <div>REFERENCE</div>
                  </div>
                  {product.stockMovements.map((m) => (
                    <div key={m.id} className={`${tableRowClass} ${MOVE_COLS} last:border-b-0`}>
                      <div className="text-[#666]">
                        {m.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      <div
                        className="font-[family-name:var(--font-oswald)] text-[11px] font-bold tracking-[0.12em]"
                        style={{ color: m.type === "IN" ? "#15803d" : "#555" }}
                      >
                        {m.type}
                      </div>
                      <div className="text-right font-semibold">
                        {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                      </div>
                      <div className="truncate pl-4 text-[#666]">{m.user?.email.split("@")[0] ?? "—"}</div>
                      <div className="truncate text-[#8a8a8a]">{m.note ?? "—"}</div>
                    </div>
                  ))}
                </div>

                {/* Mobile stacked list */}
                <div className="flex flex-col md:hidden">
                  {product.stockMovements.map((m) => (
                    <div key={m.id} className="flex flex-col gap-0.5 border-b border-black/5 px-3.5 py-2.5 last:border-b-0">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="font-[family-name:var(--font-oswald)] text-[12px] font-bold tracking-[0.12em]"
                          style={{ color: m.type === "IN" ? "#15803d" : "#555" }}
                        >
                          {m.type} {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                        </div>
                        <div className="text-[12px] text-[#666]">
                          {m.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      <div className="truncate text-[12px] text-[#8a8a8a]">
                        {m.user?.email.split("@")[0] ?? "—"}
                        {m.note ? ` · ${m.note}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
