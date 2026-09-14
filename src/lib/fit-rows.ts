// The fit matrix behind every cascading vehicle select on the public site.
//
// One query, one dedupe, two callers: the catalog band and the landing
// hero. Until 14 Sep 2026 the catalog built this inline and the landing page
// ran three flat queries of its own (distinct makes, distinct models, a year
// range) — which is exactly why the hero did not cascade (spec 1.4): a flat
// list of every model cannot know which ones belong to Toyota. Sharing the
// rows means both forms are narrowed by the same engine
// (src/lib/catalog-filter.ts) from the same data, and cannot disagree about
// which combinations exist.
//
// A few hundred rows, deduped to distinct combinations — the selects only
// care which combinations exist, not how many products carry each. Public
// data by construction: it is exactly what the catalog already lists.

import { prisma } from "@/lib/prisma";
import type { FitRow } from "@/lib/catalog-filter";

export type { FitRow };

/** What the query returns per vehicle fit, before deduping. */
export type RawFitRow = {
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
  product: { partType: string };
};

/**
 * Collapse one-row-per-product into distinct combinations. Pure, so the
 * keying is unit-tested. First-seen order is kept; callers sort as they
 * render.
 */
export function dedupeFitRows(raw: RawFitRow[]): FitRow[] {
  return [
    ...new Map(
      raw.map((r) => [
        `${r.make}|${r.model}|${r.yearStart}|${r.yearEnd}|${r.product.partType}`,
        {
          make: r.make,
          model: r.model,
          yearStart: r.yearStart,
          yearEnd: r.yearEnd,
          partType: r.product.partType,
        },
      ]),
    ).values(),
  ];
}

/** Every public vehicle fit for the org, paired with its product's part type, deduped. */
export async function loadFitRows(organizationId: string): Promise<FitRow[]> {
  const raw = await prisma.vehicleFit.findMany({
    where: { organizationId, product: { isPublic: true } },
    select: {
      make: true,
      model: true,
      yearStart: true,
      yearEnd: true,
      product: { select: { partType: true } },
    },
  });
  return dedupeFitRows(raw);
}
