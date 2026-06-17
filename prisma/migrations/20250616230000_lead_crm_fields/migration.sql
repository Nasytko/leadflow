-- Lead CRM fields
ALTER TABLE "leads" ADD COLUMN "crmStatus" TEXT NOT NULL DEFAULT 'new';
ALTER TABLE "leads" ADD COLUMN "telegramStatus" TEXT NOT NULL DEFAULT 'not_sent';
ALTER TABLE "leads" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'webhook';
ALTER TABLE "leads" ADD COLUMN "managerNote" TEXT;
ALTER TABLE "leads" ADD COLUMN "campaignName" TEXT;
ALTER TABLE "leads" ADD COLUMN "adsetName" TEXT;
ALTER TABLE "leads" ADD COLUMN "adName" TEXT;

UPDATE "leads" SET "crmStatus" = 'new' WHERE "status" IN ('new', 'imported');
UPDATE "leads" SET "crmStatus" = 'processed' WHERE "status" = 'delivered';
UPDATE "leads" SET "telegramStatus" = 'sent' WHERE "status" = 'delivered';
UPDATE "leads" SET "telegramStatus" = 'failed' WHERE "status" = 'delivery_failed';
UPDATE "leads" SET "source" = 'manual_import' WHERE "status" = 'imported';

CREATE INDEX "leads_userId_crmStatus_idx" ON "leads"("userId", "crmStatus");
CREATE INDEX "leads_userId_telegramStatus_idx" ON "leads"("userId", "telegramStatus");
