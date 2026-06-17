-- Auth hardening: user status + email verification + invites
ALTER TABLE "users" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending_email_verification';
ALTER TABLE "users" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "users" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- Do not break existing users on deploy
UPDATE "users"
SET "status" = 'active',
    "emailVerifiedAt" = COALESCE("emailVerifiedAt", "createdAt")
WHERE "status" = 'pending_email_verification';

CREATE TABLE "email_verification_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_verification_tokens_tokenHash_key" ON "email_verification_tokens"("tokenHash");
CREATE INDEX "email_verification_tokens_userId_idx" ON "email_verification_tokens"("userId");

ALTER TABLE "email_verification_tokens"
  ADD CONSTRAINT "email_verification_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "invite_codes" (
  "id" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "createdById" TEXT,
  "usedById" TEXT,
  "usedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invite_codes_codeHash_key" ON "invite_codes"("codeHash");
CREATE INDEX "invite_codes_usedById_idx" ON "invite_codes"("usedById");

