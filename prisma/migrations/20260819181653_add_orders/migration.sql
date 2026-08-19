-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'READY', 'DELIVERED', 'PICKED_UP', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FulfillmentMethod" AS ENUM ('DELIVERY', 'PICKUP');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'DEPOSIT_PAID', 'PAID', 'REFUNDED');

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "customerAccountId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "fulfillment" "FulfillmentMethod" NOT NULL DEFAULT 'PICKUP',
    "deliveryAddress" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "stripePaymentIntentId" TEXT,
    "pricedAsTier" "CustomerTier" NOT NULL DEFAULT 'RETAIL',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "sku" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripePaymentIntentId_key" ON "orders"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "orders_organizationId_status_createdAt_idx" ON "orders"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "orders_organizationId_createdAt_idx" ON "orders"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_customerAccountId_idx" ON "orders"("customerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_organizationId_orderNumber_key" ON "orders"("organizationId", "orderNumber");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerAccountId_fkey" FOREIGN KEY ("customerAccountId") REFERENCES "customer_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Order numbers come from a sequence, not from MAX(orderNumber) + 1.
--
-- Two checkouts completing at the same moment would both read the same MAX
-- and both try to write the same number; one would fail on the unique
-- constraint and lose a real customer order. nextval() is atomic and never
-- hands the same value out twice, even under concurrency.
--
-- Starts at 1000 so the shop's first order isn't "order #1".
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1000;
