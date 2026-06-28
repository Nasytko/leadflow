-- Meta Ads audit domain + lead attribution FKs

ALTER TABLE "facebook_forms" ADD COLUMN IF NOT EXISTS "leadCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "facebook_forms" ADD COLUMN IF NOT EXISTS "lastLeadAt" TIMESTAMP(3);

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "adAccountDbId" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "campaignDbId" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "adSetDbId" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "adDbId" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "pageDbId" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "businessDbId" TEXT;

CREATE TABLE "meta_ad_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "businessDbId" TEXT,
    "metaAdAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountStatus" INTEGER,
    "currency" TEXT,
    "timezoneName" TEXT,
    "businessName" TEXT,
    "amountSpent" TEXT,
    "balance" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_ad_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meta_campaigns" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adAccountDbId" TEXT NOT NULL,
    "metaCampaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT,
    "status" TEXT,
    "effectiveStatus" TEXT,
    "createdTime" TIMESTAMP(3),
    "updatedTime" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meta_ad_sets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adAccountDbId" TEXT NOT NULL,
    "campaignDbId" TEXT,
    "metaAdSetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT,
    "effectiveStatus" TEXT,
    "optimizationGoal" TEXT,
    "billingEvent" TEXT,
    "createdTime" TIMESTAMP(3),
    "updatedTime" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_ad_sets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meta_ads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adAccountDbId" TEXT NOT NULL,
    "campaignDbId" TEXT,
    "adSetDbId" TEXT,
    "metaAdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT,
    "effectiveStatus" TEXT,
    "creativeId" TEXT,
    "createdTime" TIMESTAMP(3),
    "updatedTime" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_ads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meta_insight_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adAccountDbId" TEXT NOT NULL,
    "campaignDbId" TEXT,
    "adSetDbId" TEXT,
    "adDbId" TEXT,
    "dateStart" TIMESTAMP(3) NOT NULL,
    "dateStop" TIMESTAMP(3) NOT NULL,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cpm" DOUBLE PRECISION,
    "cpc" DOUBLE PRECISION,
    "ctr" DOUBLE PRECISION,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "cpl" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meta_insight_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "meta_ad_accounts_userId_metaAdAccountId_key" ON "meta_ad_accounts"("userId", "metaAdAccountId");
CREATE INDEX "meta_ad_accounts_userId_idx" ON "meta_ad_accounts"("userId");
CREATE INDEX "meta_ad_accounts_connectionId_idx" ON "meta_ad_accounts"("connectionId");

CREATE UNIQUE INDEX "meta_campaigns_adAccountDbId_metaCampaignId_key" ON "meta_campaigns"("adAccountDbId", "metaCampaignId");
CREATE INDEX "meta_campaigns_userId_idx" ON "meta_campaigns"("userId");

CREATE UNIQUE INDEX "meta_ad_sets_adAccountDbId_metaAdSetId_key" ON "meta_ad_sets"("adAccountDbId", "metaAdSetId");
CREATE INDEX "meta_ad_sets_userId_idx" ON "meta_ad_sets"("userId");

CREATE UNIQUE INDEX "meta_ads_adAccountDbId_metaAdId_key" ON "meta_ads"("adAccountDbId", "metaAdId");
CREATE INDEX "meta_ads_userId_idx" ON "meta_ads"("userId");

CREATE INDEX "meta_insight_snapshots_userId_adAccountDbId_dateStart_idx" ON "meta_insight_snapshots"("userId", "adAccountDbId", "dateStart");
CREATE INDEX "meta_insight_snapshots_campaignDbId_idx" ON "meta_insight_snapshots"("campaignDbId");

ALTER TABLE "meta_ad_accounts" ADD CONSTRAINT "meta_ad_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meta_ad_accounts" ADD CONSTRAINT "meta_ad_accounts_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "facebook_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meta_ad_accounts" ADD CONSTRAINT "meta_ad_accounts_businessDbId_fkey" FOREIGN KEY ("businessDbId") REFERENCES "facebook_businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "meta_campaigns" ADD CONSTRAINT "meta_campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meta_campaigns" ADD CONSTRAINT "meta_campaigns_adAccountDbId_fkey" FOREIGN KEY ("adAccountDbId") REFERENCES "meta_ad_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meta_ad_sets" ADD CONSTRAINT "meta_ad_sets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meta_ad_sets" ADD CONSTRAINT "meta_ad_sets_adAccountDbId_fkey" FOREIGN KEY ("adAccountDbId") REFERENCES "meta_ad_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meta_ad_sets" ADD CONSTRAINT "meta_ad_sets_campaignDbId_fkey" FOREIGN KEY ("campaignDbId") REFERENCES "meta_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "meta_ads" ADD CONSTRAINT "meta_ads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meta_ads" ADD CONSTRAINT "meta_ads_adAccountDbId_fkey" FOREIGN KEY ("adAccountDbId") REFERENCES "meta_ad_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meta_ads" ADD CONSTRAINT "meta_ads_campaignDbId_fkey" FOREIGN KEY ("campaignDbId") REFERENCES "meta_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "meta_ads" ADD CONSTRAINT "meta_ads_adSetDbId_fkey" FOREIGN KEY ("adSetDbId") REFERENCES "meta_ad_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "meta_insight_snapshots" ADD CONSTRAINT "meta_insight_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meta_insight_snapshots" ADD CONSTRAINT "meta_insight_snapshots_adAccountDbId_fkey" FOREIGN KEY ("adAccountDbId") REFERENCES "meta_ad_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meta_insight_snapshots" ADD CONSTRAINT "meta_insight_snapshots_campaignDbId_fkey" FOREIGN KEY ("campaignDbId") REFERENCES "meta_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "meta_insight_snapshots" ADD CONSTRAINT "meta_insight_snapshots_adSetDbId_fkey" FOREIGN KEY ("adSetDbId") REFERENCES "meta_ad_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "meta_insight_snapshots" ADD CONSTRAINT "meta_insight_snapshots_adDbId_fkey" FOREIGN KEY ("adDbId") REFERENCES "meta_ads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leads" ADD CONSTRAINT "leads_adAccountDbId_fkey" FOREIGN KEY ("adAccountDbId") REFERENCES "meta_ad_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaignDbId_fkey" FOREIGN KEY ("campaignDbId") REFERENCES "meta_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_adSetDbId_fkey" FOREIGN KEY ("adSetDbId") REFERENCES "meta_ad_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_adDbId_fkey" FOREIGN KEY ("adDbId") REFERENCES "meta_ads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_pageDbId_fkey" FOREIGN KEY ("pageDbId") REFERENCES "facebook_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_businessDbId_fkey" FOREIGN KEY ("businessDbId") REFERENCES "facebook_businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
