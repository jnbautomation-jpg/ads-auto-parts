-- Volume discount on orders. Defaults to 0, so every existing order reads as
-- undiscounted with subtotal - 0 = the amount that was taxed, which is what
-- actually happened. Additive; nothing dropped.

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discount" DECIMAL(10,2) NOT NULL DEFAULT 0;
