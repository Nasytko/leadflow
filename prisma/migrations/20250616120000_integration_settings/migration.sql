-- CreateTable
CREATE TABLE "integration_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metaAppId" TEXT,
    "metaAppSecretEncrypted" TEXT,
    "metaWebhookVerifyTokenEncrypted" TEXT,
    "metaWebhookVerifyTokenHash" TEXT,
    "configured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_settings_userId_key" ON "integration_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_settings_metaWebhookVerifyTokenHash_key" ON "integration_settings"("metaWebhookVerifyTokenHash");

-- AddForeignKey
ALTER TABLE "integration_settings" ADD CONSTRAINT "integration_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
