import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PartType } from "@/generated/prisma/enums";
import { formatPartType, PART_SLUG_TO_TYPES } from "@/lib/format";
import { ORG_SLUG, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";
import { bodyClass, eyebrowClass, primaryButtonClass, subHeadingClass } from "@/lib/public-ui";
import { CatalogHeader } from "./catalog-header";
import { SiteFooter } from "@/components/site-footer";
import { PartCard } from "./part-card";

// The landing hero form (src/app/(public)/page.tsx) submits `partType` as a
// marketing label ("Doors", "Tailgates & Trunks", ...), not the PartType enum
// — this search band submits real enum values instead (see the `partType`
// select below), so both vocabularies have to resolve on read.
const PART_TYPE_LABEL_MAP: Record<string, PartType[]> = {
  Doors: ["DOOR"],
  Hoods: ["HOOD"],
  Fenders: ["FENDER"],
  Bumpers: ["BUMPER"],
  "Tailgates & Trunks": ["TAILGATE", "TRUNK"],
  Liftgates: ["LIFTGATE"],
  "Quarter Panels": ["QUARTER_PANEL"],
  "Rear Body Panels": ["REAR_BODY_PANEL"],
  Grilles: ["GRILLE"],
  Hinges: ["HINGE"],
  "Radiator Supports": ["RADIATOR_SUPPORT"],
  "Reinforcement Bars": ["REINFORCEMENT_BAR"],
};
const PART_TYPE_VALUES = new Set<string>(Object.values(PartType));

function resolvePartTypes(partTypeParam: string, partSlugParam: string): PartType[] | null {
  if (partTypeParam) {
    if (PART_TYPE_LABEL_MAP[partTypeParam]) return PART_TYPE_LABEL_MAP[partTypeParam];
    if (PART_TYPE_VALUES.has(partTypeParam)) return [partTypeParam as PartType];
    // A tile slug submitted through the part-type select below. Needed for
    // categories that span two enum values ("tailgates-trunks"), which have
    // no single enum option to carry them back through the form.
    if (PART_SLUG_TO_TYPES[partTypeParam]) return PART_SLUG_TO_TYPES[partTypeParam] as PartType[];
  }
  if (partSlugParam && PART_SLUG_TO_TYPES[partSlugParam]) {
    return PART_SLUG_TO_TYPES[partSlugParam] as PartType[];
  }
  return null;
}

const bandSelectClass =
  "min-h-[44px] border border-[#2A2A2A] bg-[#0A0A0A] px-3.5 text-[15px] text-white lg:border-0";

type SearchParams = {
  year?: string;
  make?: string;
  model?: string;
  partType?: string;
  part?: string;
  capa?: string;
};

function hrefWith(current: URLSearchParams, updates: Record<string, string | null>): string {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) next.delete(key);
    else next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const year = params.year?.trim() || "";
  const make = params.make?.trim() || "";
  const model = params.model?.trim() || "";
  const capaOnly = params.capa === "1";
  const partTypes = resolvePartTypes(params.partType?.trim() || "", params.part?.trim() || "");

  const current = new URLSearchParams();
  if (year) current.set("year", year);
  if (make) current.set("make", make);
  if (model) current.set("model", model);
  if (params.partType) current.set("partType", params.partType);
  if (params.part) current.set("part", params.part);
  if (capaOnly) current.set("capa", "1");

  const organization = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!organization) {
    return (
      <div className="flex min-h-screen flex-col bg-[#0A0A0A] font-[family-name:var(--font-barlow)] text-white">
        <CatalogHeader />
        <div className="flex flex-1 items-center justify-center text-sm text-[#999]">Catalog unavailable.</div>
      </div>
    );
  }

  const yearNum = year ? Number(year) : null;

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

  const publicFitWhere: Prisma.VehicleFitWhereInput = {
    organizationId: organization.id,
    product: { isPublic: true },
  };

  const [makeCounts, modelRows, yearBounds, partTypeCounts, products] = await Promise.all([
    prisma.vehicleFit.groupBy({
      by: ["make"],
      where: publicFitWhere,
      _count: { _all: true },
      orderBy: { make: "asc" },
    }),
    prisma.vehicleFit.findMany({
      where: { ...publicFitWhere, ...(make ? { make: { equals: make, mode: "insensitive" } } : {}) },
      distinct: ["model"],
      select: { model: true },
      orderBy: { model: "asc" },
    }),
    prisma.vehicleFit.aggregate({
      where: publicFitWhere,
      _min: { yearStart: true },
      _max: { yearEnd: true },
    }),
    prisma.product.groupBy({
      by: ["partType"],
      where: { organizationId: organization.id, isPublic: true },
      _count: { _all: true },
      orderBy: { partType: "asc" },
    }),
    prisma.product.findMany({
      where: {
        organizationId: organization.id,
        isPublic: true,
        ...(partTypes ? { partType: { in: partTypes } } : {}),
        ...(capaOnly ? { capaCertified: true } : {}),
        ...(hasFitFilter ? { vehicleFits: { some: fitWhere } } : {}),
      },
      select: {
        id: true,
        make: true,
        model: true,
        yearStart: true,
        yearEnd: true,
        partType: true,
        position: true,
        price: true,
        capaCertified: true,
        photos: true,
        quantity: true,
        reorderPoint: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const models = modelRows.map((r) => r.model);
  const minYear = yearBounds._min.yearStart;
  const maxYear = yearBounds._max.yearEnd;
  const years =
    minYear != null && maxYear != null
      ? Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i)
      : [];

  const partTypeOptions = partTypeCounts
    .map((row) => ({ value: row.partType, label: formatPartType(row.partType), count: row._count._all }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const activeFilterChips = [
    year ? { key: "year", value: year, label: year } : null,
    make ? { key: "make", value: make, label: make } : null,
    model ? { key: "model", value: model, label: model } : null,
    capaOnly ? { key: "capa", value: "1", label: "CAPA only" } : null,
  ].filter((c): c is { key: string; value: string; label: string } => c !== null);

  const summary = [year, make, model, params.partType].filter(Boolean).join(" · ");

  // The landing tiles link with ?part=<slug>; this form submits ?partType=<enum>.
  // Both vocabularies have to round-trip through the select — otherwise arriving
  // from a tile and pressing Search dropped the category and returned the whole
  // catalog, with the select showing "Part Type" the entire time.
  const activePartParam = params.partType?.trim() || params.part?.trim() || "";
  const slugTypes = PART_SLUG_TO_TYPES[activePartParam];
  const partSelectValue = PART_TYPE_VALUES.has(activePartParam)
    ? activePartParam
    : slugTypes?.length === 1
      ? slugTypes[0]
      : slugTypes
        ? activePartParam
        : "";
  const multiTypeOption =
    slugTypes && slugTypes.length > 1
      ? { value: activePartParam, label: slugTypes.map((t) => formatPartType(t)).join(" & ") }
      : null;

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-[family-name:var(--font-barlow)] text-white">
      <CatalogHeader />

      {/* search band */}
      <div id="find-your-part" className="border-b border-white/10 bg-[#1A1A1A] px-4 py-6 lg:px-10 lg:py-7">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-3.5">
          <span className={eyebrowClass}>Find your part</span>
          <form
            action="/catalog"
            method="GET"
            className="grid grid-cols-2 gap-2 lg:grid-cols-[1fr_1.2fr_1.2fr_1.4fr_160px] lg:gap-px lg:border lg:border-[#2A2A2A] lg:bg-[#2A2A2A]"
          >
            {/* sr-only labels are position:absolute, so they stay out of the
                grid's flow and don't consume a column. */}
            <label htmlFor="band-year" className="sr-only">
              Year
            </label>
            <select id="band-year" name="year" defaultValue={year} className={bandSelectClass}>
              <option value="">Year</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <label htmlFor="band-make" className="sr-only">
              Make
            </label>
            <select id="band-make" name="make" defaultValue={make} className={bandSelectClass}>
              <option value="">Make</option>
              {makeCounts.map((m) => (
                <option key={m.make} value={m.make}>
                  {m.make}
                </option>
              ))}
            </select>
            <label htmlFor="band-model" className="sr-only">
              Model
            </label>
            <select id="band-model" name="model" defaultValue={model} className={bandSelectClass}>
              <option value="">Model</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <label htmlFor="band-part-type" className="sr-only">
              Part type
            </label>
            <select
              id="band-part-type"
              name="partType"
              defaultValue={partSelectValue}
              className={bandSelectClass}
            >
              <option value="">Part Type</option>
              {multiTypeOption ? (
                <option value={multiTypeOption.value}>{multiTypeOption.label}</option>
              ) : null}
              {partTypeOptions.map((pt) => (
                <option key={pt.value} value={pt.value}>
                  {pt.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className={`col-span-2 ${primaryButtonClass} lg:col-span-1`}
            >
              Search
            </button>
          </form>

          {/* mobile active-filter chips */}
          {activeFilterChips.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto lg:hidden">
              <a
                href="#find-your-part"
                className="whitespace-nowrap border border-[#E31E24] bg-[#1A1A1A] px-3 py-2 font-[family-name:var(--font-barlow)] text-[14px] font-medium text-white"
              >
                Filters
              </a>
              {activeFilterChips.map((chip) => (
                <Link
                  key={chip.key}
                  href={hrefWith(current, { [chip.key]: null })}
                  className="whitespace-nowrap border border-[#2A2A2A] px-3 py-2 text-[13px] text-[#D4D4D4]"
                >
                  {chip.label} ×
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto grid max-w-[1360px] grid-cols-1 lg:grid-cols-[260px_1fr]">
        {/* sidebar (desktop only) */}
        <aside className="hidden flex-col gap-8 border-r border-white/10 px-7 py-8 lg:flex">
          <div className="flex flex-col gap-3.5">
            <span className={`border-b border-[#2A2A2A] pb-2.5 ${eyebrowClass}`}>Make</span>
            {makeCounts.map((m) => (
              <Link
                key={m.make}
                href={hrefWith(current, { make: make === m.make ? null : m.make })}
                className="flex items-center gap-2.5 text-[14px] text-[#D4D4D4] hover:text-white"
              >
                <span
                  className="h-3.5 w-3.5 border"
                  style={
                    make === m.make
                      ? { borderColor: "#4A4A4A", background: "#E31E24", boxShadow: "inset 0 0 0 3px #0A0A0A" }
                      : { borderColor: "#4A4A4A" }
                  }
                />
                {m.make}
                <span className="ml-auto font-mono text-[12px] text-[#9A9A9A]">{m._count._all}</span>
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3.5">
            <span className={`border-b border-[#2A2A2A] pb-2.5 ${eyebrowClass}`}>Part type</span>
            {partTypeOptions.map((pt) => (
              <Link
                key={pt.value}
                href={hrefWith(current, { partType: params.partType === pt.value ? null : pt.value, part: null })}
                className="flex items-center gap-2.5 text-[14px] text-[#D4D4D4] hover:text-white"
              >
                <span
                  className="h-3.5 w-3.5 border"
                  style={
                    params.partType === pt.value
                      ? { borderColor: "#4A4A4A", background: "#E31E24", boxShadow: "inset 0 0 0 3px #0A0A0A" }
                      : { borderColor: "#4A4A4A" }
                  }
                />
                {pt.label}
                <span className="ml-auto font-mono text-[12px] text-[#9A9A9A]">{pt.count}</span>
              </Link>
            ))}
          </div>

          <Link
            href={hrefWith(current, { capa: capaOnly ? null : "1" })}
            className="flex items-center gap-2.5 border-t border-[#2A2A2A] pt-5 text-[14px] text-[#D4D4D4] hover:text-white"
          >
            <span
              className="h-3.5 w-3.5 border"
              style={
                capaOnly
                  ? { borderColor: "#4A4A4A", background: "#E31E24", boxShadow: "inset 0 0 0 3px #0A0A0A" }
                  : { borderColor: "#4A4A4A" }
              }
            />
            CAPA certified only
          </Link>
        </aside>

        {/* results */}
        <div className="flex flex-col gap-5 px-4 py-6 lg:px-10 lg:py-8">
          <div className="flex items-baseline justify-between">
            <span className={subHeadingClass}>
              {products.length} {products.length === 1 ? "part" : "parts"}
            </span>
          </div>
          <p className={`-mt-2 ${bodyClass}`}>{summary || "Showing everything in stock"}</p>

          {products.length === 0 ? (
            <div className="flex flex-col items-center gap-4 border border-white/10 bg-[#111] px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center border border-[#2A2A2A]">
                <span className="font-[family-name:var(--font-oswald)] text-2xl text-[#E31E24]">0</span>
              </div>
              <span className={subHeadingClass}>No parts match</span>
              <p className="max-w-sm text-sm text-[#A1A1A1]">
                We stock more than we list. Call us — if it&apos;s a body part, we can probably get it same-day.
              </p>
              <a
                href={`tel:${PHONE_HREF}`}
                className={primaryButtonClass}
              >
                Call {PHONE_DISPLAY}
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
              {products.map((p) => (
                <PartCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
