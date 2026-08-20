import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ORG_SLUG, PHONE_DISPLAY, PHONE_HREF, BUSINESS_NAME, ADDRESS } from "@/lib/site";
import { deliveryForLocation, findLocation } from "@/lib/locations";
import { formatPartType } from "@/lib/format";
import { localePath, type Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { jsonLdScript } from "@/lib/structured-data";
import { SITE_URL } from "@/lib/site";
import { CatalogHeader } from "../../catalog/catalog-header";
import { SiteFooter } from "@/components/site-footer";
import {
  badgeClass,
  bodyClass,
  eyebrowClass,
  h1Class,
  primaryButtonClass,
  secondaryButtonClass,
  subHeadingClass,
} from "@/lib/public-ui";

// Shared implementation for /parts/<city> and /es/parts/<city>.
//
// The content is deliberately city-specific rather than a template with a
// name swapped in — see the warning at the top of src/lib/locations.ts.
export async function LocationView({
  city,
  locale,
}: {
  city: string;
  locale: Locale;
}) {
  const location = findLocation(city);
  if (!location) notFound();

  const dict = getDictionary(locale);
  const delivery = deliveryForLocation(location);

  const organization = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
    select: { id: true },
  });

  // Live counts. These make each page genuinely useful rather than filler,
  // and they keep the page honest — it can't advertise categories the shop
  // has run out of.
  const [partTypeCounts, makeCounts, total] = organization
    ? await Promise.all([
        prisma.product.groupBy({
          by: ["partType"],
          where: { organizationId: organization.id, isPublic: true, quantity: { gt: 0 } },
          _count: { _all: true },
        }),
        prisma.vehicleFit.groupBy({
          by: ["make"],
          where: { organizationId: organization.id, product: { isPublic: true, quantity: { gt: 0 } } },
          _count: { _all: true },
        }),
        prisma.product.count({
          where: { organizationId: organization.id, isPublic: true, quantity: { gt: 0 } },
        }),
      ])
    : [[], [], 0];

  const topParts = [...partTypeCounts]
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 6);
  const topMakes = [...makeCounts].sort((a, b) => b._count._all - a._count._all).slice(0, 8);

  const catalogHref = localePath(locale, "/catalog");

  // Service-area markup so the page can rank for the city rather than
  // competing with the homepage for Orlando.
  const schema = {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    name: BUSINESS_NAME,
    url: `${SITE_URL}${localePath(locale, `/parts/${location.slug}`)}`,
    telephone: PHONE_DISPLAY,
    address: { "@type": "PostalAddress", streetAddress: ADDRESS },
    areaServed: {
      "@type": "City",
      name: location.name,
      containedInPlace: { "@type": "AdministrativeArea", name: location.county },
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A0A] font-[family-name:var(--font-barlow)] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(schema) }}
      />
      <CatalogHeader locale={locale} path={`/parts/${location.slug}`} />

      <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col gap-8 px-4 py-10 lg:py-14">
        <div className="flex flex-col gap-3">
          <span className={eyebrowClass}>{location.county}</span>
          <h1 className={h1Class}>
            {locale === "es"
              ? `Piezas de carrocería en ${location.name}`
              : `Auto body parts in ${location.name}`}
          </h1>
          <p className={bodyClass}>{location.note}</p>
        </div>

        {/* The genuinely local facts: distance and what delivery means here. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1 border border-white/10 bg-[#111] p-4">
            <span className={eyebrowClass}>{locale === "es" ? "Distancia" : "Distance"}</span>
            <span className="font-[family-name:var(--font-oswald)] text-[20px] font-semibold">
              {locale === "es"
                ? `~${location.approxMiles} millas`
                : `~${location.approxMiles} miles`}
            </span>
            <span className="text-[13px] text-[#8A8A8A]">
              {locale === "es"
                ? `unos ${location.approxDriveMinutes} min desde el almacén`
                : `about ${location.approxDriveMinutes} min from our warehouse`}
            </span>
          </div>
          <div className="flex flex-col gap-1 border border-white/10 bg-[#111] p-4">
            <span className={eyebrowClass}>{locale === "es" ? "Entrega" : "Delivery"}</span>
            <span className="font-[family-name:var(--font-oswald)] text-[20px] font-semibold">
              {delivery.sameDayAvailable
                ? locale === "es"
                  ? "El mismo día"
                  : "Same day"
                : locale === "es"
                  ? "Al día siguiente"
                  : "Next day"}
            </span>
            <span className="text-[13px] text-[#8A8A8A]">
              {locale === "es"
                ? `pedidos antes de las ${delivery.cutoffLabel}`
                : `on orders before ${delivery.cutoffLabel}`}
            </span>
          </div>
          <div className="flex flex-col gap-1 border border-white/10 bg-[#111] p-4">
            <span className={eyebrowClass}>{locale === "es" ? "En existencia" : "In stock now"}</span>
            <span className="font-[family-name:var(--font-oswald)] text-[20px] font-semibold">
              {total}
            </span>
            <span className="text-[13px] text-[#8A8A8A]">
              {locale === "es" ? "piezas listas para enviar" : "parts ready to ship"}
            </span>
          </div>
        </div>

        {topParts.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h2 className={subHeadingClass}>
              {locale === "es"
                ? `Lo que enviamos a ${location.name}`
                : `What we ship to ${location.name}`}
            </h2>
            <div className="flex flex-wrap gap-2">
              {topParts.map((p) => (
                <Link
                  key={p.partType}
                  href={`${catalogHref}?partType=${p.partType}`}
                  className={`${badgeClass} border-white/25 text-[#D4D4D4] transition-colors hover:border-[#E31E24] hover:text-white`}
                >
                  {formatPartType(p.partType)} · {p._count._all}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {topMakes.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h2 className={subHeadingClass}>{dict.catalog.make}</h2>
            <div className="flex flex-wrap gap-2">
              {topMakes.map((m) => (
                <Link
                  key={m.make}
                  href={`${catalogHref}?make=${encodeURIComponent(m.make)}`}
                  className={`${badgeClass} border-white/25 text-[#D4D4D4] transition-colors hover:border-[#E31E24] hover:text-white`}
                >
                  {m.make}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <Link href={catalogHref} className={primaryButtonClass}>
            {locale === "es" ? "Ver el catálogo" : "Browse the catalog"}
          </Link>
          <a href={`tel:${PHONE_HREF}`} className={secondaryButtonClass}>
            {dict.catalog.callUs} {PHONE_DISPLAY}
          </a>
          <Link href={localePath(locale, "/vin")} className={secondaryButtonClass}>
            {dict.nav.searchByVin}
          </Link>
        </div>
      </main>

      <SiteFooter locale={locale} />
    </div>
  );
}
