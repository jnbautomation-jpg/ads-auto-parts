// Shared catalog implementation, rendered by BOTH the English route
// (/catalog) and the Spanish one (/es/catalog). Extracted so the two
// languages can never drift apart in behaviour — only in strings.

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PartType } from "@/generated/prisma/enums";
import { PART_SLUG_TO_TYPES } from "@/lib/format";
import { ORG_SLUG, PHONE_DISPLAY, PHONE_HREF } from "@/lib/site";
import { bodyClass, eyebrowClass, primaryButtonClass, subHeadingClass } from "@/lib/public-ui";
import { productSelectFor } from "@/lib/pricing";
import { getViewerTier } from "@/lib/customer-auth";
import { CatalogHeader } from "./catalog-header";
import { SiteFooter } from "@/components/site-footer";
import { PartCard } from "./part-card";
import { CatalogFilters, type FitRow } from "./catalog-filters";
import { PartAlertForm } from "@/components/part-alert-form";
import type { Locale } from "@/lib/i18n";
import { localePath } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { formatPartTypeIn } from "@/lib/format";

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

export type SearchParams = {
  year?: string;
  make?: string;
  model?: string;
  partType?: string;
  part?: string;
  capa?: string;
};

function hrefWith(
  current: URLSearchParams,
  updates: Record<string, string | null>,
  basePath: string,
): string {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) next.delete(key);
    else next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export async function CatalogView({
  searchParams,
  locale,
}: {
  searchParams: Promise<SearchParams>;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  const lp = (path: string) => localePath(locale, path);
  const basePath = lp("/catalog");
  const href = (updates: Record<string, string | null>) => hrefWith(current, updates, basePath);

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

  const viewerTier = await getViewerTier();

  const organization = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!organization) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--surface-page)] font-[family-name:var(--font-barlow)] text-[var(--ink)]">
        <CatalogHeader locale={locale} path="/catalog" />
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

  const [makeCounts, partTypeCounts, fitMatrixRows, products] = await Promise.all([
    prisma.vehicleFit.groupBy({
      by: ["make"],
      where: publicFitWhere,
      _count: { _all: true },
      orderBy: { make: "asc" },
    }),
    prisma.product.groupBy({
      by: ["partType"],
      where: { organizationId: organization.id, isPublic: true },
      _count: { _all: true },
      orderBy: { partType: "asc" },
    }),
    // Fit matrix for the cascading selects: every public vehicle fit paired
    // with its product's part type. A few hundred rows, deduped below, so the
    // dropdowns can narrow instantly without a round-trip per change.
    prisma.vehicleFit.findMany({
      where: publicFitWhere,
      select: {
        make: true,
        model: true,
        yearStart: true,
        yearEnd: true,
        product: { select: { partType: true } },
      },
    }),
    prisma.product.findMany({
      where: {
        organizationId: organization.id,
        isPublic: true,
        ...(partTypes ? { partType: { in: partTypes } } : {}),
        ...(capaOnly ? { capaCertified: true } : {}),
        ...(hasFitFilter ? { vehicleFits: { some: fitWhere } } : {}),
      },
      // The select depends on who is asking: a guest or retail customer's
      // query never fetches the wholesale price at all. See
      // productSelectFor() in src/lib/pricing.ts.
      select: productSelectFor(viewerTier),
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Deduped so the payload carries distinct combinations, not one row per
  // product — the selects only care about which combinations exist.
  const fitRows: FitRow[] = [
    ...new Map(
      fitMatrixRows.map((r) => [
        `${r.make}|${r.model}|${r.yearStart}|${r.yearEnd}|${r.product.partType}`,
        {
          make: r.make,
          model: r.model,
          yearStart: r.yearStart,
          yearEnd: r.yearEnd,
          partType: r.product.partType as string,
        },
      ]),
    ).values(),
  ];

  const partTypeOptions = partTypeCounts
    .map((row) => ({ value: row.partType, label: formatPartTypeIn(row.partType, locale), count: row._count._all }))
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
      ? { value: activePartParam, label: slugTypes.map((t) => formatPartTypeIn(t, locale)).join(" & ") }
      : null;

  return (
    <div className="min-h-screen bg-[var(--surface-page)] font-[family-name:var(--font-barlow)] text-[var(--ink)]">
      <CatalogHeader locale={locale} path="/catalog" />

      {/* search band */}
      <div id="find-your-part" className="border-b border-[var(--line)] bg-[var(--surface-raised)] px-4 py-6 lg:px-10 lg:py-7">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-3.5">
          <span className={eyebrowClass}>{dict.catalog.findYourPart}</span>
          <CatalogFilters
            rows={fitRows}
            initial={{ year, make, model, partType: partSelectValue }}
            multiTypeOption={multiTypeOption}
            locale={locale}
            action={basePath}
          />

          {/* mobile active-filter chips */}
          {activeFilterChips.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto lg:hidden">
              <a
                href="#find-your-part"
                className="whitespace-nowrap border border-[var(--accent)] bg-[var(--surface-raised)] px-3 py-2 font-[family-name:var(--font-barlow)] text-[14px] font-medium text-[var(--ink)]"
              >
                {dict.catalog.filters}
              </a>
              {activeFilterChips.map((chip) => (
                <Link
                  key={chip.key}
                  href={href({ [chip.key]: null })}
                  className="whitespace-nowrap border border-[var(--line)] px-3 py-2 text-[13px] text-[var(--ink-muted)]"
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
        <aside className="hidden flex-col gap-8 border-r border-[var(--line)] px-7 py-8 lg:flex">
          <div className="flex flex-col gap-3.5">
            <span className={`border-b border-[var(--line)] pb-2.5 ${eyebrowClass}`}>{dict.catalog.make}</span>
            {makeCounts.map((m) => (
              <Link
                key={m.make}
                href={href({ make: make === m.make ? null : m.make })}
                className="flex items-center gap-2.5 text-[14px] text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                <span
                  className="h-3.5 w-3.5 border"
                  style={
                    make === m.make
                      ? { borderColor: "var(--accent)", background: "var(--accent)", boxShadow: "inset 0 0 0 3px #0A0A0A" }
                      : { borderColor: "var(--line-strong)" }
                  }
                />
                {m.make}
                <span className="ml-auto font-mono text-[12px] text-[var(--ink-faint)]">{m._count._all}</span>
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3.5">
            <span className={`border-b border-[var(--line)] pb-2.5 ${eyebrowClass}`}>{dict.catalog.partType}</span>
            {partTypeOptions.map((pt) => (
              <Link
                key={pt.value}
                href={href({ partType: params.partType === pt.value ? null : pt.value, part: null })}
                className="flex items-center gap-2.5 text-[14px] text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                <span
                  className="h-3.5 w-3.5 border"
                  style={
                    params.partType === pt.value
                      ? { borderColor: "var(--accent)", background: "var(--accent)", boxShadow: "inset 0 0 0 3px #0A0A0A" }
                      : { borderColor: "var(--line-strong)" }
                  }
                />
                {pt.label}
                <span className="ml-auto font-mono text-[12px] text-[var(--ink-faint)]">{pt.count}</span>
              </Link>
            ))}
          </div>

          <Link
            href={href({ capa: capaOnly ? null : "1" })}
            className="flex items-center gap-2.5 border-t border-[var(--line)] pt-5 text-[14px] text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            <span
              className="h-3.5 w-3.5 border"
              style={
                capaOnly
                  ? { borderColor: "var(--accent)", background: "var(--accent)", boxShadow: "inset 0 0 0 3px #0A0A0A" }
                  : { borderColor: "var(--line-strong)" }
              }
            />
            {dict.catalog.capaOnly}
          </Link>
        </aside>

        {/* results */}
        <div className="flex flex-col gap-5 px-4 py-6 lg:px-10 lg:py-8">
          <div className="flex items-baseline justify-between">
            <span className={subHeadingClass}>
              {products.length} {products.length === 1 ? dict.catalog.partsOne : dict.catalog.partsOther}
            </span>
          </div>
          <p className={`-mt-2 ${bodyClass}`}>{summary || dict.catalog.showingEverything}</p>

          {products.length === 0 ? (
            <div className="flex flex-col items-center gap-4 border border-[var(--line)] bg-[var(--surface-raised)] px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center border border-[var(--line)]">
                <span className="font-[family-name:var(--font-oswald)] text-2xl text-[var(--accent)]">0</span>
              </div>
              <span className={subHeadingClass}>{dict.catalog.noMatchTitle}</span>
              <p className="max-w-sm text-sm text-[var(--ink-muted)]">
                {dict.catalog.noMatchBody}
              </p>
              <a
                href={`tel:${PHONE_HREF}`}
                className={primaryButtonClass}
              >
                {dict.catalog.callUs} {PHONE_DISPLAY}
              </a>
              {/* Spec 2B: "turns every empty search result into a lead
                  instead of a bounce". Pre-filled with the search they just
                  ran, so leaving details is one tap. */}
              <div className="w-full max-w-[520px] pt-2">
                <PartAlertForm
                  make={make}
                  model={model}
                  year={year}
                  partType={partTypes?.length === 1 ? partTypes[0] : ""}
                  compact
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
              {products.map((p) => (
                <PartCard key={p.id} product={p} viewerTier={viewerTier} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </div>

      <SiteFooter locale={locale} />
    </div>
  );
}
