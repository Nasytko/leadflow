-- AlterTable
ALTER TABLE "facebook_connections" ADD COLUMN "granularScopes" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "facebook_connections" ADD COLUMN "metaLoginConfigIdAtAuth" TEXT;
