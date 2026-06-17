-- Facebook Login for Business configuration ID (per user)
ALTER TABLE "integration_settings" ADD COLUMN "metaLoginConfigId" TEXT;

-- OAuth granted scopes and pages snapshot at auth time
ALTER TABLE "facebook_connections" ADD COLUMN "grantedScopes" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "facebook_connections" ADD COLUMN "pagesCountAtAuth" INTEGER;
