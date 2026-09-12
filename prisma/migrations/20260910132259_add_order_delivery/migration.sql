-- Delivery fee and the zone it was priced from. Fee defaults to 0 and zone
-- to NULL, so every existing order reads as pickup / no delivery charge —
-- which is what was actually charged. Additive; nothing dropped.

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryZone" TEXT;
