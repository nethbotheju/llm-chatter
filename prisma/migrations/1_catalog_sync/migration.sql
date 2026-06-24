-- Catalog sync: track imported providers/models from models.dev

-- Add catalog sync columns to Provider
ALTER TABLE "Provider" ADD COLUMN "catalogId" TEXT;
ALTER TABLE "Provider" ADD COLUMN "lastSyncedAt" DATETIME;

-- Add catalog sync columns to Model
ALTER TABLE "Model" ADD COLUMN "catalogModelId" TEXT;
ALTER TABLE "Model" ADD COLUMN "metadata" TEXT;

-- Unique constraint so a catalog provider can only be imported once
CREATE UNIQUE INDEX "Provider_catalogId_key" ON "Provider"("catalogId");
