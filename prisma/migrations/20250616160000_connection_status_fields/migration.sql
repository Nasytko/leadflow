-- FacebookConnection identity & status
ALTER TABLE "facebook_connections" ADD COLUMN "facebookUserName" TEXT;
ALTER TABLE "facebook_connections" ADD COLUMN "facebookUserPictureUrl" TEXT;
ALTER TABLE "facebook_connections" ADD COLUMN "connectedAt" TIMESTAMP(3);
ALTER TABLE "facebook_connections" ADD COLUMN "lastCheckedAt" TIMESTAMP(3);
ALTER TABLE "facebook_connections" ADD COLUMN "lastError" TEXT;
ALTER TABLE "facebook_connections" ADD COLUMN "lastErrorCode" TEXT;
ALTER TABLE "facebook_connections" ADD COLUMN "lastErrorAt" TIMESTAMP(3);

-- FacebookPage sync status
ALTER TABLE "facebook_pages" ADD COLUMN "syncStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "facebook_pages" ADD COLUMN "webhookStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "facebook_pages" ADD COLUMN "lastError" TEXT;
ALTER TABLE "facebook_pages" ADD COLUMN "lastErrorAt" TIMESTAMP(3);

-- FacebookForm sync status
ALTER TABLE "facebook_forms" ADD COLUMN "syncStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "facebook_forms" ADD COLUMN "lastSyncError" TEXT;
ALTER TABLE "facebook_forms" ADD COLUMN "lastSyncAt" TIMESTAMP(3);

-- TelegramConnection status
ALTER TABLE "telegram_connections" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'disconnected';
ALTER TABLE "telegram_connections" ADD COLUMN "lastError" TEXT;
ALTER TABLE "telegram_connections" ADD COLUMN "lastErrorAt" TIMESTAMP(3);

UPDATE "telegram_connections" SET "status" = 'connected' WHERE "verified" = true;
