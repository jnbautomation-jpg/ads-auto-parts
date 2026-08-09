import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PART_SLUG_LABELS, PART_SLUG_TO_TYPES } from "@/lib/format";
import {
  ADDRESS,
  BUSINESS_NAME,
  EMAIL,
  HOURS_DISPLAY,
  PHONE_NOTE,
  LOCALITY,
  MAPS_URL,
  ORG_SLUG,
  PHONE_DISPLAY,
  PHONE_HREF,
} from "@/lib/site";
import { BrandLogo } from "@/components/brand-logo";

// One footer for every public page. The catalog and product pages previously
// had none at all — no address, no hours, no way back into the catalog — which
// is a problem when those are the pages Google actually lands people on.
//
// It carries navigation and the NAP block, not a second copy of the header nav.
// The old version repeated PARTS / WHY ADS / DELIVERY / CONTACT as #hash links,
// which would have been broken on /catalog anyway (no such sections there).

const COLUMN_LIMIT = 6;

const headingClass =
  "font-[family-name:var(--font-barlow-condensed)] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A8A8A]";
const linkClass =
  "flex items-baseline justify-between gap-4 font-[family-name:var(--font-barlow)] text-[14px] text-[#B4B4B4] transition-colors hover:text-white";
const countClass = "font-mono text-[12px] text-[#8A8A8A]";

async function getFooterData() {
  const organization = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!organization) return { categories: [], makes: [] };

  const [partTypeCounts, makeCounts] = await Promise.all([
    prisma.product.groupBy({
      by: ["partType"],
      where: { organizationId: organization.id, isPublic: true },
      _count: { _all: true },
    }),
    prisma.vehicleFit.groupBy({
      by: ["make"],
      where: { organizationId: organization.id, product: { isPublic: true } },
      _count: { _all: true },
    }),
  ]);

  const countByType = new Map(partTypeCounts.map((r) => [String(r.partType), r._count._all]));

  const categories = Object.entries(PART_SLUG_TO_TYPES)
    .map(([slug, types]) => ({
      slug,
      label: PART_SLUG_LABELS[slug] ?? slug,
      count: types.reduce((sum, t) => sum + (countByType.get(t) ?? 0), 0),
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, COLUMN_LIMIT);

  const makes = makeCounts
    .map((r) => ({ make: r.make, count: r._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, COLUMN_LIMIT);

  return { categories, makes };
}

export async function SiteFooter() {
  const { categories, makes } = await getFooterData();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/8 bg-[#070707] px-4 pt-12 lg:px-14 lg:pt-16">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-10">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
          <div className="flex flex-col gap-4">
            <BrandLogo size="sm" />
            <p className="font-[family-name:var(--font-barlow)] text-[14px] leading-[1.6] text-[#B4B4B4] lg:max-w-[34ch]">
              New aftermarket auto body parts — never used salvage. Dispatched from our Orlando warehouse.
            </p>
          </div>

          {categories.length > 0 ? (
            <nav className="flex flex-col gap-3">
              <h2 className={headingClass}>Parts</h2>
              {categories.map((c) => (
                <Link key={c.slug} href={`/catalog?part=${c.slug}`} className={linkClass}>
                  <span>{c.label}</span>
                  <span className={countClass}>{c.count}</span>
                </Link>
              ))}
            </nav>
          ) : null}

          {makes.length > 0 ? (
            <nav className="flex flex-col gap-3">
              <h2 className={headingClass}>Makes</h2>
              {makes.map((m) => (
                <Link
                  key={m.make}
                  href={`/catalog?make=${encodeURIComponent(m.make)}`}
                  className={linkClass}
                >
                  <span>{m.make}</span>
                  <span className={countClass}>{m.count}</span>
                </Link>
              ))}
            </nav>
          ) : null}

          {/* Name / address / phone. Kept byte-identical to the Google Business
              listing — local search matches on the exact string. */}
          <div className="flex flex-col gap-3">
            <h2 className={headingClass}>Visit or call</h2>
            <address className="flex flex-col gap-2 font-[family-name:var(--font-barlow)] text-[14px] not-italic leading-[1.6] text-[#B4B4B4]">
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                {ADDRESS}
              </a>
              <a href={`tel:${PHONE_HREF}`} className="transition-colors hover:text-white">
                {PHONE_DISPLAY}
              </a>
              <a href={`mailto:${EMAIL}`} className="transition-colors hover:text-white">
                {EMAIL}
              </a>
            </address>
            <div className="font-[family-name:var(--font-barlow)] text-[14px] leading-[1.6] text-[#8A8A8A]">
              {HOURS_DISPLAY}
              <br />
              <span className="text-[#B4B4B4]">{PHONE_NOTE}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 py-5 font-[family-name:var(--font-barlow)] text-[13px] text-[#8A8A8A]">
          © {year} {BUSINESS_NAME} · {LOCALITY}
        </div>
      </div>
    </footer>
  );
}
