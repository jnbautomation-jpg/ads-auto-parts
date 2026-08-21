-- CreateEnum
CREATE TYPE "CustomerTier" AS ENUM ('RETAIL', 'WHOLESALE');

-- CreateEnum
CREATE TYPE "WholesaleStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "customer_accounts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "tier" "CustomerTier" NOT NULL DEFAULT 'RETAIL',
    "wholesaleStatus" "WholesaleStatus",
    "wholesaleNote" TEXT,
    "appliedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_vehicles" (
    "id" TEXT NOT NULL,
    "customerAccountId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_accounts_authUserId_key" ON "customer_accounts"("authUserId");

-- CreateIndex
CREATE INDEX "customer_accounts_organizationId_tier_idx" ON "customer_accounts"("organizationId", "tier");

-- CreateIndex
CREATE INDEX "customer_accounts_organizationId_wholesaleStatus_idx" ON "customer_accounts"("organizationId", "wholesaleStatus");

-- CreateIndex
CREATE UNIQUE INDEX "customer_accounts_organizationId_email_key" ON "customer_accounts"("organizationId", "email");

-- CreateIndex
CREATE INDEX "saved_vehicles_customerAccountId_idx" ON "saved_vehicles"("customerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_vehicles_customerAccountId_make_model_year_key" ON "saved_vehicles"("customerAccountId", "make", "model", "year");

-- AddForeignKey
ALTER TABLE "customer_accounts" ADD CONSTRAINT "customer_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_accounts" ADD CONSTRAINT "customer_accounts_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_vehicles" ADD CONSTRAINT "saved_vehicles_customerAccountId_fkey" FOREIGN KEY ("customerAccountId") REFERENCES "customer_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
