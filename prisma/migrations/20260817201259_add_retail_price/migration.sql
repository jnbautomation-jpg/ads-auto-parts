-- Two-tier pricing (Phase 2 spec 1.3 / step 6).
--
-- "price" keeps its column name but is now explicitly the WHOLESALE price —
-- what a trade account pays. "retailPrice" is the only price the public
-- catalog shows.
--
-- Written in three steps rather than the single NOT NULL ADD COLUMN that
-- Prisma generated: there are existing product rows, so the column has to be
-- added nullable, backfilled, and only then constrained.

-- 1. Add nullable so existing rows are valid.
ALTER TABLE "products" ADD COLUMN "retailPrice" DECIMAL(10,2);

-- 2. Backfill: retail = wholesale + $100 (RETAIL_MARKUP_USD in
--    src/lib/pricing.ts). Keep the two in sync if the markup rule changes.
UPDATE "products" SET "retailPrice" = "price" + 100 WHERE "retailPrice" IS NULL;

-- 3. Now that every row has a value, enforce the constraint.
ALTER TABLE "products" ALTER COLUMN "retailPrice" SET NOT NULL;
