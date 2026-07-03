-- Store Facebook account email when granted via OAuth (email scope)
ALTER TABLE "facebook_connections" ADD COLUMN "facebookUserEmail" TEXT;
