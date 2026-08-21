-- CreateEnum
CREATE TYPE "PanelConstruction" AS ENUM ('SHELL', 'SKIN');

-- CreateEnum
CREATE TYPE "PanelMaterial" AS ENUM ('STEEL', 'ALUMINUM');

-- CreateEnum
CREATE TYPE "PaintPrep" AS ENUM ('BARE', 'PRIMED', 'EDP_COATED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "construction" "PanelConstruction",
ADD COLUMN     "hasHandleHole" BOOLEAN,
ADD COLUMN     "hasMirrorHole" BOOLEAN,
ADD COLUMN     "material" "PanelMaterial",
ADD COLUMN     "oemPartNumber" TEXT,
ADD COLUMN     "paintPrep" "PaintPrep";
