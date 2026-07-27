import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// One-time cleanup so the ADS org can be re-imported through the fixed
// parser without a delete UI. Scoped entirely by organizationId — never
// touches another org's data even if one exists.
const ORG_SLUG = "ads-auto-parts";

async function main() {
  const confirmed = process.argv.includes("--confirm");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const organization = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!organization) {
    console.error(`No organization found with slug "${ORG_SLUG}".`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const where = { organizationId: organization.id };
  const [productCount, stockMovementCount, inquiryCount] = await Promise.all([
    prisma.product.count({ where }),
    prisma.stockMovement.count({ where }),
    prisma.inquiry.count({ where: { ...where, productId: { not: null } } }),
  ]);

  console.log(`Organization: ${organization.name} (${organization.slug})`);
  console.log(`  Products:                        ${productCount}`);
  console.log(`  Stock movements (on those products): ${stockMovementCount}`);
  console.log(`  Inquiries referencing a product:  ${inquiryCount}`);

  if (!confirmed) {
    console.log("\nDry run — nothing deleted. Re-run with --confirm to actually delete these rows.");
    await prisma.$disconnect();
    return;
  }

  // FK order: stock movements reference products directly (must go first),
  // inquiries only reference products optionally (detached, not deleted —
  // they're customer leads and stay on record), then products themselves.
  const result = await prisma.$transaction(async (tx) => {
    const stockMovements = await tx.stockMovement.deleteMany({ where });
    const inquiries = await tx.inquiry.updateMany({
      where: { ...where, productId: { not: null } },
      data: { productId: null },
    });
    const products = await tx.product.deleteMany({ where });
    return { stockMovements: stockMovements.count, inquiries: inquiries.count, products: products.count };
  });

  console.log("\nDeleted:");
  console.log(`  Stock movements:   ${result.stockMovements}`);
  console.log(`  Inquiries detached: ${result.inquiries}`);
  console.log(`  Products:          ${result.products}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
