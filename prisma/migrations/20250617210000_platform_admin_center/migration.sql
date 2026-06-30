-- CreateTable
CREATE TABLE "platform_email_settings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "provider" TEXT NOT NULL DEFAULT 'smtp',
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUsername" TEXT,
    "smtpPasswordEncrypted" TEXT,
    "fromName" TEXT,
    "fromEmail" TEXT,
    "replyToEmail" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lastSentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_email_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_diagnostic_runs" (
    "id" TEXT NOT NULL,
    "triggeredByUserId" TEXT,
    "status" TEXT NOT NULL,
    "summary" JSONB NOT NULL DEFAULT '{}',
    "checks" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_diagnostic_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "admin_diagnostic_runs_createdAt_idx" ON "admin_diagnostic_runs"("createdAt");

-- AddForeignKey
ALTER TABLE "admin_diagnostic_runs" ADD CONSTRAINT "admin_diagnostic_runs_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default feature flags
INSERT INTO "feature_flags" ("id", "key", "enabled", "description", "createdAt", "updatedAt") VALUES
  ('ff_meta_audit', 'meta_audit', true, 'Meta Ad Audit', NOW(), NOW()),
  ('ff_tg_templates', 'telegram_message_templates', true, 'Telegram message templates', NOW(), NOW()),
  ('ff_premium_templates', 'premium_templates', false, 'Premium templates', NOW(), NOW()),
  ('ff_ai_recommendations', 'ai_recommendations', false, 'AI recommendations', NOW(), NOW()),
  ('ff_user_registration', 'user_registration_enabled', true, 'User registration', NOW(), NOW()),
  ('ff_email_verification', 'email_verification_required', true, 'Email verification required', NOW(), NOW()),
  ('ff_self_hosted', 'self_hosted_advanced_settings', false, 'Self-hosted advanced settings', NOW(), NOW()),
  ('ff_debug_mode', 'debug_mode', false, 'Debug mode', NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
