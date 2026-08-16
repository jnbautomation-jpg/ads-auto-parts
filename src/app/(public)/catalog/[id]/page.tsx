import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatFit, formatMoney, formatPartType, formatPosition, getAvailability } from "@/lib/format";
import {
  BUSINESS_NAME,
  EMAIL,
  LOCALITY,
  ORG_SLUG,
  PHONE_DISPLAY,
  PHONE_HREF,
  SITE_URL,
} from "@/lib/site";
import {
  badgeClass,
  bodyClass,
  eyebrowClass,
  pageTitleClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/lib/public-ui";
import { CatalogHeader } from "../catalog-header";
import { PhotoGallery } from "./photo-gallery";
import { SiteFooter } from "@/components/site-footer";
import { ProductQuoteForm } from "./product-quote-form";

// Wrapped in React's cache() so generateMetadata and the page body share one
// database round-trip per request instead of each issuing their own.
const loadPublicProduct = cache(async (id: string) => {
  const organization = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!organization) return null;

  return prisma.product.findFirst({
    where: { id, organizationId: organization.id, isPublic: true },
    include: { vehicleFits: { orderBy: [{ make: "asc" }, { model: "asc" }, { yearStart: "asc" }] } },
  });
});

// Every catalog page shared the one static title from (public)/layout.tsx
// before this, so search results and shared links could not tell two parts
// apart. Titles lead with the fit, since that is what customers search for.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await loadPublicProduct(id);

  // notFound() belongs to the page, not to metadata — returning a plain
  // title here keeps the 404 path rendering the real not-found UI.
  if (!product) return { title: "Part not found" };

  const partLabel = product.position
    ? `${formatPartType(product.partType)} — ${formatPosition(product.position)}`
    : formatPartType(product.partType);
  const fitLabel = formatFit(product.make, product.model, product.yearStart, product.yearEnd);

  const title = `${fitLabel} ${partLabel}`;
  const description = [
    `New aftermarket ${partLabel.toLowerCase()} for ${fitLabel}.`,
    product.capaCertified ? "CAPA certified." : null,
    `Available from ${BUSINESS_NAME} in ${LOCALITY} — call ${PHONE_DISPLAY} for a quote.`,
  ]
    .filter(Boolean)
    .join(" ");

  const image = product.photos[0] ?? "/ads-logo.jpg";
  const canonical = `/catalog/${product.id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: `${SITE_URL}${canonical}`,
      title,
      description,
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function PartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const product = await loadPublicProduct(id);
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

      <div className="border-b border-white/10 px-4 py-3.5 text-[13px] text-[#9A9A9A] lg:px-10">
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
          <PhotoGallery photos={product.photos} alt={`${fitLabel} — ${title}`} partType={product.partType} />

          <div className="mt-3 flex flex-col gap-2.5 border border-white/10 bg-[#1A1A1A] p-5 lg:p-6">
            <span className={eyebrowClass}>Delivery &amp; pickup</span>
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
                <span className={`${badgeClass} border-[#E31E24] bg-[#0A0A0A] text-[#E31E24]`}>CAPA certified</span>
              ) : null}
              <span
                className={badgeClass}
                style={{ borderColor: availability.color, color: availability.color }}
              >
                {availability.label}
              </span>
            </div>
            <h1 className={`mt-1 ${pageTitleClass}`}>
              {title}
            </h1>
            <span className={bodyClass}>{fitLabel}</span>
          </div>

          <div className="flex items-baseline gap-3.5 border-y border-white/10 py-4">
            <span className="font-[family-name:var(--font-oswald)] text-[30px] font-semibold lg:text-[38px]">
              {formatMoney(product.price.toString())}
            </span>
            <span className="text-[13px] text-[#9A9A9A]">
              {product.capaCertified ? "New aftermarket · CAPA certified" : "New aftermarket"}
            </span>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[14px]">
            <span className="text-[#9A9A9A]">Part type</span>
            <span>{formatPartType(product.partType)}</span>
            <span className="text-[#9A9A9A]">Position</span>
            <span>{formatPosition(product.position)}</span>
            <span className="text-[#9A9A9A]">Condition</span>
            <span>
              Grade {product.condition}
              {product.conditionNotes ? ` — ${product.conditionNotes}` : ""}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 border border-white/10 bg-[#1A1A1A] p-4 lg:p-5">
            <span className={eyebrowClass}>Fits these vehicles</span>
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
              className={primaryButtonClass}
            >
              Call
            </a>
            <a
              href={smsHref}
              className={secondaryButtonClass}
            >
              Text
            </a>
            <a
              href={emailHref}
              className={secondaryButtonClass}
            >
              Email
            </a>
            <a
              href="#quote"
              className={secondaryButtonClass}
            >
              Quote
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
          className={primaryButtonClass}
        >
          Call {PHONE_DISPLAY}
        </a>
      </div>

      <SiteFooter />
    </div>
  );
}
