-- AlterTable: facebook_forms
ALTER TABLE "facebook_forms" ADD COLUMN "metaCreatedAt" TIMESTAMP(3);

-- AlterTable: leads
ALTER TABLE "leads" ADD COLUMN "campaignId" TEXT;
ALTER TABLE "leads" ADD COLUMN "adsetId" TEXT;
ALTER TABLE "leads" ADD COLUMN "adId" TEXT;
ALTER TABLE "leads" ADD COLUMN "processedAt" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN "processedById" TEXT;

-- Migrate legacy CRM statuses to new pipeline
UPDATE "leads" SET "crmStatus" = 'contacted' WHERE "crmStatus" = 'in_progress';
UPDATE "leads" SET "crmStatus" = 'converted' WHERE "crmStatus" = 'processed';

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "leads_processedById_idx" ON "leads"("processedById");
