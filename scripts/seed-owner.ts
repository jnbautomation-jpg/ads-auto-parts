import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const [, , supabaseUserId, email] = process.argv;
  if (!supabaseUserId || !email) {
    console.error("Usage: npm run db:seed -- <supabase-user-id> <email>");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const organization = await prisma.organization.upsert({
    where: { slug: "ads-auto-parts" },
    update: {},
    create: { name: "ADS Auto Parts", slug: "ads-auto-parts" },
  });

  const user = await prisma.user.upsert({
    where: { id: supabaseUserId },
    update: { email, organizationId: organization.id },
    create: { id: supabaseUserId, organizationId: organization.id, email, role: "OWNER" },
  });

  console.log("Seeded owner:", { organization: organization.slug, user: user.email, role: user.role });
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
