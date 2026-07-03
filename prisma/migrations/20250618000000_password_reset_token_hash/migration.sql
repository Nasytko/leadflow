-- Rename password reset token column to tokenHash (stores SHA-256 hash only, never raw token)
ALTER TABLE "password_reset_tokens" RENAME COLUMN "token" TO "tokenHash";
