-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('BACK_IN_STOCK', 'PRICE_DROP');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'NOTIFIED', 'CANCELLED');

-- CreateTable
CREATE TABLE "part_alerts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL DEFAULT 'BACK_IN_STOCK',
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "partType" "PartType",
    "productId" TEXT,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "customerAccountId" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "notifiedAt" TIMESTAMP(3),
    "staffNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "part_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "part_alerts_organizationId_status_createdAt_idx" ON "part_alerts"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "part_alerts_organizationId_make_model_partType_status_idx" ON "part_alerts"("organizationId", "make", "model", "partType", "status");

-- CreateIndex
CREATE INDEX "part_alerts_productId_idx" ON "part_alerts"("productId");

-- AddForeignKey
ALTER TABLE "part_alerts" ADD CONSTRAINT "part_alerts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_alerts" ADD CONSTRAINT "part_alerts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_alerts" ADD CONSTRAINT "part_alerts_customerAccountId_fkey" FOREIGN KEY ("customerAccountId") REFERENCES "customer_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
