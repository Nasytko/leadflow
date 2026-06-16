-- WebhookEvent diagnostics fields
ALTER TABLE "webhook_events" ADD COLUMN "pageId" TEXT;
ALTER TABLE "webhook_events" ADD COLUMN "formId" TEXT;
ALTER TABLE "webhook_events" ADD COLUMN "leadgenId" TEXT;
ALTER TABLE "webhook_events" ADD COLUMN "lastError" TEXT;
ALTER TABLE "webhook_events" ADD COLUMN "lastErrorCode" TEXT;
ALTER TABLE "webhook_events" ADD COLUMN "lastErrorAt" TIMESTAMP(3);
ALTER TABLE "webhook_events" ADD COLUMN "sourceIp" TEXT;
ALTER TABLE "webhook_events" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "webhook_events" ALTER COLUMN "status" SET DEFAULT 'received';
CREATE INDEX "webhook_events_leadgenId_idx" ON "webhook_events"("leadgenId");

-- TelegramConnection lastCheckedAt
ALTER TABLE "telegram_connections" ADD COLUMN "lastCheckedAt" TIMESTAMP(3);

-- DeliveryLog error tracking
ALTER TABLE "delivery_logs" ADD COLUMN "lastErrorCode" TEXT;
ALTER TABLE "delivery_logs" ADD COLUMN "lastErrorAt" TIMESTAMP(3);

-- Webhook verification audit
CREATE TABLE "webhook_verification_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "mode" TEXT,
    "tokenMasked" TEXT,
    "challengePresent" BOOLEAN NOT NULL DEFAULT false,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhook_verification_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "webhook_verification_logs_userId_createdAt_idx" ON "webhook_verification_logs"("userId", "createdAt");
CREATE INDEX "webhook_verification_logs_success_createdAt_idx" ON "webhook_verification_logs"("success", "createdAt");
ALTER TABLE "webhook_verification_logs" ADD CONSTRAINT "webhook_verification_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- System logs
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "level" TEXT NOT NULL DEFAULT 'info',
    "source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "system_logs_userId_createdAt_idx" ON "system_logs"("userId", "createdAt");
CREATE INDEX "system_logs_source_level_createdAt_idx" ON "system_logs"("source", "level", "createdAt");
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
