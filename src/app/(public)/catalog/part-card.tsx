import Link from "next/link";
import { formatFit, formatMoney, formatPartType, formatPosition, getAvailability } from "@/lib/format";
import { getPartTypeImage } from "@/lib/part-images";
import { badgeClass } from "@/lib/public-ui";
import { canSeeWholesale, priceForViewer, type ViewerTier } from "@/lib/pricing";

const PHOTO_PLACEHOLDER = {
  backgroundImage: "repeating-linear-gradient(45deg,#1E1E1E 0,#1E1E1E 12px,#232323 12px,#232323 24px)",
};

export type PartCardData = {
  id: string;
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
  partType: string;
  position: string | null;
  retailPrice: unknown;
  // Present ONLY for wholesale and staff viewers — productSelectFor() leaves
  // it out of the query entirely for guests and retail customers, which is
  // why it is optional here rather than always fetched and conditionally
  // rendered.
  price?: unknown;
  capaCertified: boolean;
  photos: string[];
  // Never the raw number — only ever a label derived from quantity/reorderPoint
  // server-side, so the exact count never reaches markup.
  quantity: number;
  reorderPoint: number;
};

// Same card markup serves both the mobile horizontal-list layout (1B) and the
// desktop vertical-grid layout (1A) — the breakpoint just flips the internal
// flex direction rather than needing two components.
export function PartCard({
  product,
  viewerTier,
}: {
  product: PartCardData;
  viewerTier: ViewerTier;
}) {
  const availability = getAvailability(product.quantity, product.reorderPoint);
  const typePos = product.position
    ? `${formatPartType(product.partType)} — ${formatPosition(product.position)}`
    : formatPartType(product.partType);
  const photo = product.photos[0];
  const defaultImage = getPartTypeImage(product.partType);

  return (
    <Link
      href={`/catalog/${product.id}`}
      className="group flex border border-white/10 bg-[#1A1A1A] text-white transition-all duration-150 hover:-translate-y-1 hover:border-[#E31E24] hover:shadow-[0_10px_24px_rgba(0,0,0,0.5)] sm:block sm:hover:-translate-y-1"
    >
      <div
        className="relative flex min-h-[110px] w-[120px] shrink-0 items-center justify-center overflow-hidden border-r border-white/10 sm:aspect-[4/3] sm:w-full sm:border-r-0 sm:border-b"
        style={photo || defaultImage ? undefined : PHOTO_PLACEHOLDER}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={typePos} className="h-full w-full object-cover" />
        ) : defaultImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={defaultImage} alt={typePos} className="h-[72%] w-[72%] object-contain opacity-90" />
        ) : (
          <span className="font-mono text-[10px] text-[#5A5A5A]">no photo</span>
        )}
        {product.capaCertified ? (
          <span className={`absolute left-1.5 top-1.5 ${badgeClass} border-[#E31E24] bg-[#0A0A0A] text-[#E31E24] sm:left-2.5 sm:top-2.5`}>
            CAPA
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        <span className="font-[family-name:var(--font-oswald)] text-[14px] font-medium tracking-[0.03em] sm:text-[16px]">
          {formatFit(product.make, product.model, product.yearStart, product.yearEnd)}
        </span>
        <span className="text-[12px] text-[#A1A1A1] sm:text-[13px]">{typePos}</span>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 sm:mt-1.5 sm:border-t sm:border-white/10 sm:pt-3">
          <span className="font-[family-name:var(--font-oswald)] text-[17px] font-semibold sm:text-[20px]">
            {formatMoney(priceForViewer(product, viewerTier) as never)}
            {canSeeWholesale(viewerTier) ? (
              // Staff quote trade customers off this page, so the price on
              // screen has to say which one it is.
              <span className="ml-1.5 align-middle text-[10px] font-semibold tracking-[0.14em] text-[#E31E24]">
                TRADE
              </span>
            ) : null}
          </span>
          <span
            className={badgeClass}
            style={{ borderColor: availability.color, color: availability.color }}
          >
            {availability.label}
          </span>
        </div>
      </div>
    </Link>
  );
}
