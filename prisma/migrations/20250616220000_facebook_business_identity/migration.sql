-- CreateTable
CREATE TABLE "facebook_businesses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "verificationStatus" TEXT,
    "pictureUrl" TEXT,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_businesses_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "facebook_connections" ADD COLUMN "businessIds" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "facebook_connections" ADD COLUMN "primaryBusinessId" TEXT;

ALTER TABLE "facebook_pages" ADD COLUMN "pictureUrl" TEXT;
ALTER TABLE "facebook_pages" ADD COLUMN "category" TEXT;
ALTER TABLE "facebook_pages" ADD COLUMN "link" TEXT;
ALTER TABLE "facebook_pages" ADD COLUMN "about" TEXT;
ALTER TABLE "facebook_pages" ADD COLUMN "tasks" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "facebook_pages" ADD COLUMN "businessId" TEXT;
ALTER TABLE "facebook_pages" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "facebook_businesses_userId_idx" ON "facebook_businesses"("userId");
CREATE UNIQUE INDEX "facebook_businesses_userId_businessId_key" ON "facebook_businesses"("userId", "businessId");
CREATE INDEX "facebook_pages_businessId_idx" ON "facebook_pages"("businessId");

-- AddForeignKey
ALTER TABLE "facebook_businesses" ADD CONSTRAINT "facebook_businesses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "facebook_pages" ADD CONSTRAINT "facebook_pages_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "facebook_businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
