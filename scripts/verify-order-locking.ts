// Proves the row locking in src/lib/orders.ts actually prevents double-selling.
//
//   npx tsx scripts/verify-order-locking.ts
//
// This needs a real Postgres — SELECT ... FOR UPDATE is the thing under test,
// so it cannot be unit-tested with a mock. It runs against whatever DATABASE_URL
// points at, which for local development is the DEV Supabase project. It creates
// and then deletes its own orders, and restores the product's original quantity.
//
// Run it after any change to createOrder(). The failure it guards against is
// silent and expensive: two customers buy the last door, both get a
// confirmation, and the shop finds out when the second one arrives.

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { createOrder } from "@/lib/orders";

async function main() {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org) throw new Error("no organization");

  const product = await prisma.product.findFirst({
    where: { organizationId: org.id, isPublic: true },
    select: { id: true, sku: true, quantity: true },
  });
  if (!product) throw new Error("no public product");

  const originalQuantity = product.quantity;
  console.log(`Product ${product.sku} — original quantity ${originalQuantity}`);

  let failures = 0;
  const check = (label: string, pass: boolean, detail: string) => {
    console.log(`  ${pass ? "PASS" : "FAIL"}  ${label} — ${detail}`);
    if (!pass) failures++;
  };

  // ---- Scenario 1: two buyers, one unit, fired simultaneously ----
  await prisma.product.update({ where: { id: product.id }, data: { quantity: 1 } });
  console.log("\nScenario 1: last unit in stock, two simultaneous orders");

  const base = {
    organizationId: org.id,
    customerPhone: "4077434644",
    fulfillment: "PICKUP" as const,
    tier: "RETAIL" as const,
    lines: [{ productId: product.id, quantity: 1 }],
  };

  const [a, b] = await Promise.all([
    createOrder({ ...base, customerName: "Buyer A" }),
    createOrder({ ...base, customerName: "Buyer B" }),
  ]);

  const succeeded = [a, b].filter((r) => r.ok);
  const failed = [a, b].filter((r) => !r.ok);
  check("exactly one order succeeded", succeeded.length === 1, `${succeeded.length} succeeded, ${failed.length} rejected`);
  check(
    "the loser was told it sold out",
    failed.length === 1 && !failed[0].ok && /sold out|enough/i.test(failed[0].error),
    failed.length === 1 && !failed[0].ok ? `"${failed[0].error}"` : "no rejection",
  );

  const after = await prisma.product.findUnique({
    where: { id: product.id },
    select: { quantity: true },
  });
  check("stock landed at 0, never negative", after?.quantity === 0, `quantity = ${after?.quantity}`);

  const movements = await prisma.stockMovement.count({
    where: { productId: product.id, note: { startsWith: "Order ADS-" } },
  });
  check("exactly one stock movement was logged", movements === 1, `${movements} logged`);

  // ---- Scenario 2: ordering more than exists is rejected outright ----
  console.log("\nScenario 2: ordering more than the shelf holds");
  await prisma.product.update({ where: { id: product.id }, data: { quantity: 2 } });
  const tooMany = await createOrder({ ...base, customerName: "Buyer C", lines: [{ productId: product.id, quantity: 5 }] });
  check("rejected", !tooMany.ok, tooMany.ok ? "it succeeded" : `"${tooMany.error}"`);

  const stillTwo = await prisma.product.findUnique({
    where: { id: product.id },
    select: { quantity: true },
  });
  check("stock untouched by the rejected order", stillTwo?.quantity === 2, `quantity = ${stillTwo?.quantity}`);

  // ---- Scenario 3: a normal order decrements by exactly what was bought ----
  console.log("\nScenario 3: a normal order");
  const normal = await createOrder({ ...base, customerName: "Buyer D", lines: [{ productId: product.id, quantity: 2 }] });
  check("succeeded", normal.ok, normal.ok ? `order ADS-${normal.orderNumber}` : normal.error);
  const emptied = await prisma.product.findUnique({
    where: { id: product.id },
    select: { quantity: true },
  });
  check("stock decremented by 2", emptied?.quantity === 0, `quantity = ${emptied?.quantity}`);

  // ---- Cleanup ----
  const testOrders = await prisma.order.findMany({
    where: { customerName: { in: ["Buyer A", "Buyer B", "Buyer C", "Buyer D"] } },
    select: { id: true },
  });
  const ids = testOrders.map((o) => o.id);
  await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
  await prisma.order.deleteMany({ where: { id: { in: ids } } });
  await prisma.stockMovement.deleteMany({
    where: { productId: product.id, note: { startsWith: "Order ADS-" } },
  });
  await prisma.product.update({ where: { id: product.id }, data: { quantity: originalQuantity } });
  console.log(`\nCleaned up ${ids.length} test orders; quantity restored to ${originalQuantity}.`);

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
