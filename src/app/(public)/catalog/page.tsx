import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PartType } from "@/generated/prisma/enums";
import { formatFit, formatMoney, formatPartType } from "@/lib/format";
import { SiteHeader } from "../site-header";

// Single-tenant public site — same lookup as the quote form.
const ORG_SLUG = "ads-auto-parts";

// The landing page's part-type filter uses marketing labels, not the
// PartType enum's own values (and groups tailgates/trunks into one option),
// so results here need a small reverse map rather than a direct enum match.
const PART_TYPE_QUERY_MAP: Record<string, PartType[]> = {
  Doors: ["DOOR"],
  Hoods: ["HOOD"],
  Fenders: ["FENDER"],
  Bumpers: ["BUMPER"],
  "Tailgates & Trunks": ["TAILGATE", "TRUNK"],
  Liftgates: ["LIFTGATE"],
  "Quarter Panels": ["QUARTER_PANEL"],
  "Rear Body Panels": ["REAR_BODY_PANEL"],
};

type SearchParams = {
  year?: string;
  make?: string;
  model?: string;
  partType?: string;
};

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const year = params.year?.trim() || "";
  const make = params.make?.trim() || "";
  const model = params.model?.trim() || "";
  const partTypeLabel = params.partType?.trim() || "";

  const organization = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });

  const yearNum = year ? Number(year) : null;
  const partTypes = partTypeLabel ? (PART_TYPE_QUERY_MAP[partTypeLabel] ?? null) : null;

  // Matched against a single VehicleFit row at a time (not separate `some`
  // clauses per field) so a multi-vehicle product only matches when one of
  // its actual fits satisfies make/model/year together — not a mix-and-match
  // across two different fits.
  const fitWhere: Prisma.VehicleFitWhereInput = {};
  if (make) fitWhere.make = { equals: make, mode: "insensitive" };
  if (model) fitWhere.model = { contains: model, mode: "insensitive" };
  if (yearNum !== null && Number.isInteger(yearNum)) {
    fitWhere.yearStart = { lte: yearNum };
    fitWhere.yearEnd = { gte: yearNum };
  }
  const hasFitFilter = Object.keys(fitWhere).length > 0;

  const products = organization
    ? await prisma.product.findMany({
        where: {
          organizationId: organization.id,
          isPublic: true,
          ...(partTypes ? { partType: { in: partTypes } } : {}),
          ...(hasFitFilter ? { vehicleFits: { some: fitWhere } } : {}),
        },
        orderBy: [{ make: "asc" }, { model: "asc" }],
        take: 50,
      })
    : [];

  const hasFilters = Boolean(year || make || model || partTypeLabel);

  return (
    <div className="motion-scope min-h-screen bg-[#050505] font-[family-name:var(--font-barlow)] text-white">
      <SiteHeader heroId="catalog-top" />

      <div className="mx-auto flex max-w-[1060px] flex-col gap-4 px-4 py-8 lg:px-14 lg:py-12">
        <Link href="/" className="text-xs text-[#999] transition-colors hover:text-white">
          ← BACK TO HOME
        </Link>

        <h1 className="font-[family-name:var(--font-oswald)] text-2xl font-semibold uppercase tracking-[0.1em]">
          {hasFilters ? "Search results" : "All parts"}
        </h1>
        <p className="text-sm text-[#999]">
          {[year, make, model, partTypeLabel].filter(Boolean).join(" · ") || "Showing everything in stock"}
        </p>

        {products.length === 0 ? (
          <p className="border border-white/10 bg-[#111] px-4 py-8 text-center text-sm text-[#999]">
            No parts match that search.{" "}
            <a href="tel:4077434644" className="text-[#E31E24] hover:text-[#ff4a50]">
              Call (407) 743-4644
            </a>{" "}
            and we&apos;ll check what&apos;s available.
          </p>
        ) : (
          <div className="flex flex-col border border-white/10">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 last:border-b-0"
              >
                <div>
                  <div className="font-semibold">{formatFit(p.make, p.model, p.yearStart, p.yearEnd)}</div>
                  <div className="text-xs text-[#999]">{formatPartType(p.partType)}</div>
                </div>
                <div className="font-[family-name:var(--font-oswald)] text-lg font-semibold">
                  {formatMoney(p.price.toString())}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
