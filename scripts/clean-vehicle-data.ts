// Repair make/model data already in the database — Phase 2 spec 1.6, 1.7, 1.8.
//
//   npx tsx scripts/clean-vehicle-data.ts          # dry run, changes nothing
//   npx tsx scripts/clean-vehicle-data.ts --apply  # writes
//
// Dry run is the default deliberately. This rewrites customer-facing vehicle
// names across every product and every vehicle fit; read the summary first.
//
// The rules come from src/lib/normalize.ts, which the workbook importer also
// uses — so cleaning the table and importing new rows apply identical logic
// and the mess does not come back with the next upload.
//
// What it does:
//   1.6  one canonical spelling per model (Corrolla -> Corolla, the three
//        Cx-5 spellings -> CX-5, unbalanced brackets repaired)
//   1.7  VW and Volkswagen merged into one make
//   1.8  a CAPA marker baked into a model name is stripped out and set on
//        the capaCertified boolean instead
//
// Product and VehicleFit are both updated. Product carries the primary fit
// and VehicleFit carries every fit, so cleaning only one would leave the
// catalog filter and the product page disagreeing.

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { canonicalMake, canonicalModel, extractCapa } from "@/lib/normalize";

type Change = { label: string; from: string; to: string };

async function main() {
  const apply = process.argv.includes("--apply");

  const products = await prisma.product.findMany({
    select: { id: true, sku: true, make: true, model: true, capaCertified: true },
    orderBy: { sku: "asc" },
  });
  const fits = await prisma.vehicleFit.findMany({
    select: { id: true, make: true, model: true },
  });

  const productUpdates: { id: string; data: Record<string, unknown>; changes: Change[] }[] = [];

  for (const p of products) {
    const make = canonicalMake(p.make);
    const model = canonicalModel(p.model);
    // Only ever turns CAPA on — a product already flagged CAPA whose model
    // string happens not to say so must not be un-flagged by this script.
    const capa = extractCapa(p.model).capa || p.capaCertified;

    const changes: Change[] = [];
    if (make !== p.make) changes.push({ label: "make", from: p.make, to: make });
    if (model !== p.model) changes.push({ label: "model", from: p.model, to: model });
    if (capa !== p.capaCertified) {
      changes.push({ label: "capaCertified", from: String(p.capaCertified), to: String(capa) });
    }
    if (changes.length > 0) {
      productUpdates.push({ id: p.id, data: { make, model, capaCertified: capa }, changes });
    }
  }

  const fitUpdates: { id: string; data: Record<string, unknown>; changes: Change[] }[] = [];
  for (const f of fits) {
    const make = canonicalMake(f.make);
    const model = canonicalModel(f.model);
    const changes: Change[] = [];
    if (make !== f.make) changes.push({ label: "make", from: f.make, to: make });
    if (model !== f.model) changes.push({ label: "model", from: f.model, to: model });
    if (changes.length > 0) fitUpdates.push({ id: f.id, data: { make, model }, changes });
  }

  console.log(`Products:     ${products.length} scanned, ${productUpdates.length} would change`);
  console.log(`Vehicle fits: ${fits.length} scanned, ${fitUpdates.length} would change\n`);

  // Distinct value-level changes are what a human actually needs to review —
  // a per-row dump of 300 identical "Cx-5 -> CX-5" edits is unreadable.
  const distinct = new Map<string, number>();
  for (const u of [...productUpdates, ...fitUpdates]) {
    for (const c of u.changes) {
      const key = `${c.label}: ${JSON.stringify(c.from)} -> ${JSON.stringify(c.to)}`;
      distinct.set(key, (distinct.get(key) ?? 0) + 1);
    }
  }
  if (distinct.size === 0) {
    console.log("Nothing to change — the data is already canonical.");
  } else {
    console.log("Distinct changes:");
    for (const [key, count] of [...distinct.entries()].sort()) {
      console.log(`  ${String(count).padStart(4)}x  ${key}`);
    }
  }

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to commit these changes.");
    return;
  }

  // One transaction: a half-cleaned catalog, where Product says "CX-5" and
  // its VehicleFit still says "Cx-5", would break search for those parts.
  await prisma.$transaction(async (tx) => {
    for (const u of productUpdates) {
      await tx.product.update({ where: { id: u.id }, data: u.data });
    }
    for (const u of fitUpdates) {
      await tx.vehicleFit.update({ where: { id: u.id }, data: u.data });
    }
  });

  console.log(`\nUpdated ${productUpdates.length} products and ${fitUpdates.length} vehicle fits.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
