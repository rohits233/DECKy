-- AlterTable: make auth_provider_id nullable (email/pass users have none)
-- and add password_hash for credentials auth
ALTER TABLE "users" ALTER COLUMN "auth_provider_id" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "password_hash" TEXT;
