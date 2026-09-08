-- Sales tax on orders. Both columns default to 0, so every existing order
-- (all placed before tax existed) reads as untaxed with subtotal == total,
-- which is what was actually charged. Additive; nothing dropped.

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxRate" DECIMAL(6,4) NOT NULL DEFAULT 0;
