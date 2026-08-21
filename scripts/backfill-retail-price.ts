// Recompute every product's public retail price from its wholesale price.
//
// The initial backfill already ran inside the add_retail_price migration.
// This script is for afterwards — when the pricing rule changes (a different
// flat amount, or a switch to a percentage), edit RETAIL_MARKUP_USD /
// defaultRetailPrice in src/lib/pricing.ts and re-run this.
//
//   npx tsx scripts/backfill-retail-price.ts          # dry run, changes nothing
//   npx tsx scripts/backfill-retail-price.ts --apply  # writes
//
// Dry run is the default deliberately: this rewrites the price of every part
// on the public catalog, and it is worth reading the summary before doing it.

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { RETAIL_MARKUP_USD, defaultRetailPrice, retailMarginPercent } from "@/lib/pricing";

async function main() {
  const apply = process.argv.includes("--apply");

  const products = await prisma.product.findMany({
    select: { id: true, sku: true, price: true, retailPrice: true },
    orderBy: { sku: "asc" },
  });

  const changes = products
    .map((p) => {
      const wholesale = Number(p.price);
      const current = Number(p.retailPrice);
      const next = defaultRetailPrice(wholesale);
      return { ...p, wholesale, current, next };
    })
    .filter((c) => c.current !== c.next);

  console.log(`Markup rule: wholesale + $${RETAIL_MARKUP_USD}`);
  console.log(`${products.length} products, ${changes.length} would change.\n`);

  for (const c of changes.slice(0, 20)) {
    const margin = retailMarginPercent(c.wholesale, c.next);
    console.log(
      `  ${c.sku.padEnd(20)} wholesale $${c.wholesale}  ${c.current} -> ${c.next}` +
        (margin === null ? "" : `  (${margin}% margin)`),
    );
  }
  if (changes.length > 20) console.log(`  ... and ${changes.length - 20} more`);

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to commit these changes.");
    return;
  }

  // Sequential rather than a single updateMany: each row gets its own value,
  // and this runs rarely on a few hundred rows, so clarity beats speed.
  for (const c of changes) {
    await prisma.product.update({ where: { id: c.id }, data: { retailPrice: c.next } });
  }
  console.log(`\nUpdated ${changes.length} products.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
