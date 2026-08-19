// Proves the chat's catalog tool can't leak trade pricing to a retail visitor.
//
//   npx tsx scripts/verify-chat-grounding.ts
//
// Needs a real database (it runs the actual query the tool runs) but NOT an
// Anthropic key — this checks the tool, which is the only channel through
// which catalog facts reach the model. If the tool can't see a trade price,
// no amount of clever prompting can make the assistant reveal one.

import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { searchCatalog } from "@/lib/chat";

async function main() {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org) throw new Error("no organization");

  const sample = await prisma.product.findFirst({
    where: { organizationId: org.id, isPublic: true },
    select: { sku: true, make: true, model: true, price: true, retailPrice: true, quantity: true },
  });
  if (!sample) throw new Error("no public product");

  const wholesale = Number(sample.price).toFixed(2);
  const retail = Number(sample.retailPrice).toFixed(2);
  console.log(`Sample ${sample.sku}: wholesale $${wholesale}, retail $${retail}, qty ${sample.quantity}\n`);

  let failures = 0;
  const check = (label: string, pass: boolean, detail: string) => {
    console.log(`  ${pass ? "PASS" : "FAIL"}  ${label} — ${detail}`);
    if (!pass) failures++;
  };

  const args = { make: sample.make, model: sample.model };

  for (const tier of ["GUEST", "RETAIL"] as const) {
    const out = await searchCatalog(org.id, args, tier);
    check(
      `${tier}: retail price present`,
      out.includes(retail),
      `found $${retail}`,
    );
    check(
      `${tier}: wholesale price absent`,
      !out.includes(wholesale),
      out.includes(wholesale) ? `LEAKED $${wholesale}` : `no $${wholesale} anywhere in tool output`,
    );
    check(`${tier}: priceType says retail`, out.includes('"priceType":"retail"'), "");
  }

  for (const tier of ["WHOLESALE", "STAFF"] as const) {
    const out = await searchCatalog(org.id, args, tier);
    check(`${tier}: trade price present`, out.includes(wholesale), `found $${wholesale}`);
    check(`${tier}: priceType says trade`, out.includes('"priceType":"trade"'), "");
  }

  // Availability must be a label, never the raw count — same public rule the
  // catalog pages follow.
  const guestOut = await searchCatalog(org.id, args, "GUEST");
  const parsed = JSON.parse(guestOut) as { parts?: { availability: string }[] };
  const labels = new Set((parsed.parts ?? []).map((p) => p.availability));
  check(
    "availability is a label, not a number",
    [...labels].every((l) => ["IN STOCK", "LOW STOCK", "CALL"].includes(l)),
    [...labels].join(", "),
  );
  check(
    "no exact quantity field in tool output",
    !/"quantity"/.test(guestOut),
    "quantity never serialised",
  );

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
