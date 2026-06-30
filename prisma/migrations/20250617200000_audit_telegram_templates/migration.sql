-- AlterTable
ALTER TABLE "users" ADD COLUMN "auditPreferences" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "telegram_connections" ADD COLUMN "messageTemplateSettings" JSONB NOT NULL DEFAULT '{}';
