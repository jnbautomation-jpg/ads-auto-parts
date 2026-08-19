// Shared product-detail implementation, rendered by both /catalog/<id> and
// /es/catalog/<id>. Same extract-and-wrap pattern as catalog-view.tsx.

import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatFit } from "@/lib/format";
import {
  canSeeWholesale,
  priceForViewer,
  productSelectFor,
  type ViewerTier,
} from "@/lib/pricing";
import { getViewerTier } from "@/lib/customer-auth";
import { buildProductSchema, jsonLdScript } from "@/lib/structured-data";
import { alternatesFor, localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import {
  formatMoneyIn,
  formatPartTypeIn,
  formatPositionIn,
  getAvailabilityIn,
} from "@/lib/format";
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
const loadPublicProduct = cache(async (id: string, tier: ViewerTier) => {
  const organization = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!organization) return null;

  // Explicit select, not a whole-row fetch: wholesale price, cost, bin
  // location, and supplier never load into this page's data at all, so they
  // cannot leak through the RSC payload or a later refactor.
  return prisma.product.findFirst({
    where: { id, organizationId: organization.id, isPublic: true },
    select: {
      ...productSelectFor(tier),
      vehicleFits: { orderBy: [{ make: "asc" }, { model: "asc" }, { yearStart: "asc" }] },
    },
  });
});

// Every catalog page shared the one static title from (public)/layout.tsx
// before this, so search results and shared links could not tell two parts
// apart. Titles lead with the fit, since that is what customers search for.
export async function buildProductMetadata(
  params: Promise<{ id: string }>,
  locale: Locale,
): Promise<Metadata> {
  const { id } = await params;
  const dict = getDictionary(locale);
  // Deliberately resolved as a GUEST: page metadata is shared and cacheable,
  // so it must never contain a trade price.
  const product = await loadPublicProduct(id, "GUEST");

  // notFound() belongs to the page, not to metadata — returning a plain
  // title here keeps the 404 path rendering the real not-found UI.
  if (!product) return { title: dict.product.notFoundTitle };

  const partLabel = product.position
    ? `${formatPartTypeIn(product.partType, locale)} — ${formatPositionIn(product.position, locale)}`
    : formatPartTypeIn(product.partType, locale);
  const fitLabel = formatFit(product.make, product.model, product.yearStart, product.yearEnd);

  const title = `${fitLabel} ${partLabel}`;
  const description =
    locale === "es"
      ? [
          `${dict.product.newAftermarket}: ${partLabel.toLowerCase()} para ${fitLabel}.`,
          product.capaCertified ? `${dict.product.capaCertified}.` : null,
          `Disponible en ${BUSINESS_NAME}, ${LOCALITY} — llame al ${PHONE_DISPLAY} para cotizar.`,
        ]
          .filter(Boolean)
          .join(" ")
      : [
          `New aftermarket ${partLabel.toLowerCase()} for ${fitLabel}.`,
          product.capaCertified ? "CAPA certified." : null,
          `Available from ${BUSINESS_NAME} in ${LOCALITY} — call ${PHONE_DISPLAY} for a quote.`,
        ]
          .filter(Boolean)
          .join(" ");

  const image = product.photos[0] ?? "/ads-logo.jpg";
  const path = `/catalog/${product.id}`;
  const canonical = localePath(locale, path);

  return {
    title,
    description,
    alternates: alternatesFor(locale, path),
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

export async function ProductView({
  params,
  locale,
}: {
  params: Promise<{ id: string }>;
  locale: Locale;
}) {
  const { id } = await params;
  const dict = getDictionary(locale);

  const viewerTier = await getViewerTier();
  const product = await loadPublicProduct(id, viewerTier);
  if (!product) notFound();

  const availability = getAvailabilityIn(product.quantity, product.reorderPoint, locale);
  const title = product.position
    ? `${formatPartTypeIn(product.partType, locale)} — ${formatPositionIn(product.position, locale)}`
    : formatPartTypeIn(product.partType, locale);
  const fitLabel = formatFit(product.make, product.model, product.yearStart, product.yearEnd);

  const emailHref = `mailto:${EMAIL}?subject=${encodeURIComponent(`Quote request — ${title}, ${fitLabel} (${product.sku})`)}`;
  const smsHref = `sms:${PHONE_HREF}?body=${encodeURIComponent(`Hi, I'm interested in the ${title} for a ${fitLabel} (${product.sku}).`)}`;

  // Product + Offer markup (spec 1.13). Always priced at RETAIL regardless of
  // who is viewing: search engines cache this, so emitting a trade price for a
  // signed-in wholesale account would publish trade pricing publicly.
  const productSchema = buildProductSchema({
    id: product.id,
    sku: product.sku,
    name: `${fitLabel} ${title}`,
    description: `New aftermarket ${title.toLowerCase()} for ${fitLabel}.`,
    make: product.make,
    image: product.photos[0] ?? null,
    retailPrice: product.retailPrice.toString(),
    quantity: product.quantity,
    reorderPoint: product.reorderPoint,
    capaCertified: product.capaCertified,
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-[family-name:var(--font-barlow)] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(productSchema) }}
      />
      <CatalogHeader locale={locale} path={`/catalog/${product.id}`} />

      <div className="border-b border-white/10 px-4 py-3.5 text-[13px] text-[#9A9A9A] lg:px-10">
        <Link href={localePath(locale, "/catalog")} className="text-[#A1A1A1] hover:text-white">
          {dict.nav.backToResults}
        </Link>
        <span className="mx-2">/</span>
        {product.make}
        <span className="mx-2">/</span>
        {product.model}
        <span className="mx-2">/</span>
        {formatPartTypeIn(product.partType, locale)}
      </div>

      <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-8 px-4 py-6 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-10 lg:py-10">
        <div className="flex flex-col gap-3">
          <PhotoGallery photos={product.photos} alt={`${fitLabel} — ${title}`} partType={product.partType} />

          <div className="mt-3 flex flex-col gap-2.5 border border-white/10 bg-[#1A1A1A] p-5 lg:p-6">
            <span className={eyebrowClass}>{dict.product.deliveryPickup}</span>
            <div className="grid grid-cols-1 gap-1.5 text-[14px] text-[#D4D4D4] sm:grid-cols-2 sm:gap-x-6">
              <span>{dict.product.sameDay}</span>
              <span>{dict.product.freeOrlando}</span>
              <span>{dict.product.localPickup}</span>
              <span>{dict.product.phones247}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {product.capaCertified ? (
                <span className={`${badgeClass} border-[#E31E24] bg-[#0A0A0A] text-[#E31E24]`}>{dict.product.capaCertified}</span>
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
              {formatMoneyIn(priceForViewer(product, viewerTier), locale)}
            </span>
            {canSeeWholesale(viewerTier) ? (
              <span className={`${badgeClass} border-[#E31E24] text-[#E31E24]`}>{dict.product.tradePrice}</span>
            ) : null}
            <span className="text-[13px] text-[#9A9A9A]">
              {product.capaCertified ? dict.product.newAftermarketCapa : dict.product.newAftermarket}
            </span>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[14px]">
            <span className="text-[#9A9A9A]">{dict.product.partTypeLabel}</span>
            <span>{formatPartTypeIn(product.partType, locale)}</span>
            <span className="text-[#9A9A9A]">{dict.product.positionLabel}</span>
            <span>{formatPositionIn(product.position, locale)}</span>
            <span className="text-[#9A9A9A]">{dict.product.conditionLabel}</span>
            <span>
              {dict.product.grade} {product.condition}
              {product.conditionNotes ? ` — ${product.conditionNotes}` : ""}
            </span>
          </div>

          <div className="flex flex-col gap-2.5 border border-white/10 bg-[#1A1A1A] p-4 lg:p-5">
            <span className={eyebrowClass}>{dict.product.fitsThese}</span>
            {product.vehicleFits.map((fit) => (
              <span key={fit.id} className="border-b border-[#242424] pb-2 text-[14px] text-[#D4D4D4] last:border-b-0">
                {formatFit(fit.make, fit.model, fit.yearStart, fit.yearEnd)}
                {fit.position ? ` — ${formatPositionIn(fit.position, locale)}` : ""}
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
