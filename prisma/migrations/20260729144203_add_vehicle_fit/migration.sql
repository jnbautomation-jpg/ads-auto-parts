-- CreateTable
CREATE TABLE "vehicle_fits" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "yearStart" INTEGER NOT NULL,
    "yearEnd" INTEGER NOT NULL,
    "position" "PartPosition",

    CONSTRAINT "vehicle_fits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_fits_organizationId_make_model_yearStart_yearEnd_idx" ON "vehicle_fits"("organizationId", "make", "model", "yearStart", "yearEnd");

-- CreateIndex
CREATE INDEX "vehicle_fits_productId_idx" ON "vehicle_fits"("productId");

-- AddForeignKey
ALTER TABLE "vehicle_fits" ADD CONSTRAINT "vehicle_fits_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_fits" ADD CONSTRAINT "vehicle_fits_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: give every existing product its one (primary) vehicle fit,
-- mirroring the make/model/yearStart/yearEnd/position it already has.
INSERT INTO "vehicle_fits" ("id", "organizationId", "productId", "make", "model", "yearStart", "yearEnd", "position")
SELECT gen_random_uuid()::text, "organizationId", "id", "make", "model", "yearStart", "yearEnd", "position"
FROM "products";
