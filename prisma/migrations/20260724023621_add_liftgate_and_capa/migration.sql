-- AlterEnum
ALTER TYPE "PartType" ADD VALUE 'LIFTGATE';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "capaCertified" BOOLEAN NOT NULL DEFAULT false;
