import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatFit, formatMoney, formatPartType, formatPosition, getAvailability } from "@/lib/format";
import { CatalogHeader } from "../catalog-header";
import { PhotoGallery } from "./photo-gallery";
import { ProductQuoteForm } from "./product-quote-form";

const ORG_SLUG = "ads-auto-parts";
const PHONE_DISPLAY = "(407) 743-4644";
const PHONE_HREF = "4077434644";
const EMAIL = "autodoorstorewest@gmail.com";

export default async function PartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const organization = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!organization) notFound();

  const product = await prisma.product.findFirst({
    where: { id, organizationId: organization.id, isPublic: true },
    include: { vehicleFits: { orderBy: [{ make: "asc" }, { model: "asc" }, { yearStart: "asc" }] } },
  });
  if (!product) notFound();

  const availability = getAvailability(product.quantity, product.reorderPoint);
  const title = product.position
    ? `${formatPartType(product.partType)} — ${formatPosition(product.position)}`
    : formatPartType(product.partType);
  const fitLabel = formatFit(product.make, product.model, product.yearStart, product.yearEnd);

  const emailHref = `mailto:${EMAIL}?subject=${encodeURIComponent(`Quote request — ${title}, ${fitLabel} (${product.sku})`)}`;
  const smsHref = `sms:${PHONE_HREF}?body=${encodeURIComponent(`Hi, I'm interested in the ${title} for a ${fitLabel} (${product.sku}).`)}`;

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-[family-name:var(--font-barlow)] text-white">
      <CatalogHeader />

      <div className="border-b border-white/10 px-4 py-3.5 text-[13px] text-[#6B6B6B] lg:px-10">
        <Link href="/catalog" className="text-[#A1A1A1] hover:text-white">
          ← Back to results
        </Link>
        <span className="mx-2">/</span>
        {product.make}
        <span className="mx-2">/</span>
        {product.model}
        <span className="mx-2">/</span>
        {formatPartType(product.partType)}
      </div>

      <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-8 px-4 py-6 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-10 lg:py-10">
        <div className="flex flex-col gap-3">
          <PhotoGallery photos={product.photos} alt={`${fitLabel} — ${title}`} />

          <div className="mt-3 flex flex-col gap-2.5 border border-white/10 bg-[#1A1A1A] p-5 lg:p-6">
            <span className="font-[family-name:var(--font-oswald)] text-[12px] tracking-[0.22em] text-[#E31E24]">
              DELIVERY &amp; PICKUP
            </span>
            <div className="grid grid-cols-1 gap-1.5 text-[14px] text-[#D4D4D4] sm:grid-cols-2 sm:gap-x-6">
              <span>Same-day delivery, Central FL</span>
              <span>Free delivery in Orlando</span>
              <span>Local pickup available</span>
              <span>Phones answered 24/7</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {product.capaCertified ? (
                <span className="border border-[#E31E24] bg-[#0A0A0A] px-2.5 py-1 font-[family-name:var(--font-oswald)] text-[11px] tracking-[0.16em] text-[#E31E24]">
                  CAPA CERTIFIED
                </span>
              ) : null}
              <span
                className="border px-2.5 py-1 font-[family-name:var(--font-oswald)] text-[11px] tracking-[0.16em]"
                style={{ borderColor: availability.color, color: availability.color }}
              >
                {availability.label}
              </span>
            </div>
            <h1 className="mt-1 font-[family-name:var(--font-oswald)] text-[26px] font-semibold uppercase tracking-[0.05em] lg:text-[32px]">
              {title}
            </h1>
            <span className="text-[15px] text-[#A1A1A1] lg:text-[16px]">{fitLabel}</span>
          </div>

          <div className="flex items-baseline gap-3.5 border-y border-white/10 py-4">
            <span className="font-[family-name:var(--font-oswald)] text-[30px] font-semibold lg:text-[38px]">
              {formatMoney(product.price.toString())}
            </span>
            <span className="text-[13px] text-[#6B6B6B]">
              {product.capaCertified ? "New aftermarket · CAPA certified" : "New aftermarket"}
            </span>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[14px]">
            <span className="text-[#6B6B6B]">Part type</span>
            <span>{formatPartType(product.partType)}</span>
            <span className="text-[#6B6B6B]">Position</span>
            <span>{formatPosition(product.position)}</span>
            <span className="text-[#6B6B6B]">Condition</span>
            <span>
              Grade {product.condition}
              {product.conditionNotes ? ` — ${product.conditionNotes}` : ""}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 border border-white/10 bg-[#1A1A1A] p-4 lg:p-5">
            <span className="font-[family-name:var(--font-oswald)] text-[12px] tracking-[0.22em] text-[#6B6B6B]">
              FITS THESE VEHICLES
            </span>
            {product.vehicleFits.map((fit) => (
              <span key={fit.id} className="border-b border-[#242424] pb-2 text-[14px] text-[#D4D4D4] last:border-b-0">
                {formatFit(fit.make, fit.model, fit.yearStart, fit.yearEnd)}
                {fit.position ? ` — ${formatPosition(fit.position)}` : ""}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <a
              href={`tel:${PHONE_HREF}`}
              className="flex min-h-[48px] items-center justify-center bg-[#E31E24] font-[family-name:var(--font-oswald)] text-[14px] tracking-[0.14em] text-white transition-colors hover:bg-[#ff3a40] lg:text-[15px]"
            >
              CALL
            </a>
            <a
              href={smsHref}
              className="flex min-h-[48px] items-center justify-center border border-[#4A4A4A] font-[family-name:var(--font-oswald)] text-[14px] tracking-[0.14em] text-white transition-colors hover:border-[#E31E24] lg:text-[15px]"
            >
              TEXT
            </a>
            <a
              href={emailHref}
              className="flex min-h-[48px] items-center justify-center border border-[#4A4A4A] font-[family-name:var(--font-oswald)] text-[14px] tracking-[0.14em] text-white transition-colors hover:border-[#E31E24] lg:text-[15px]"
            >
              EMAIL
            </a>
            <a
              href="#quote"
              className="flex min-h-[48px] items-center justify-center border border-[#4A4A4A] font-[family-name:var(--font-oswald)] text-[14px] tracking-[0.14em] text-white transition-colors hover:border-[#E31E24] lg:text-[15px]"
            >
              QUOTE
            </a>
          </div>

          <div id="quote">
            <ProductQuoteForm productId={product.id} />
          </div>
        </div>
      </div>

      {/* sticky mobile call bar */}
      <div className="sticky bottom-0 border-t border-white/10 bg-[#0A0A0A] p-3 lg:hidden">
        <a
          href={`tel:${PHONE_HREF}`}
          className="flex min-h-[52px] items-center justify-center bg-[#E31E24] font-[family-name:var(--font-oswald)] text-[15px] tracking-[0.16em] text-white"
        >
          CALL {PHONE_DISPLAY}
        </a>
      </div>
    </div>
  );
}
