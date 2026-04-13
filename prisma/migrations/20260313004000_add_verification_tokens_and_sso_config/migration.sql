-- Add sso_config to organizations (nullable JSON, ENTERPRISE tier only)
ALTER TABLE "organizations" ADD COLUMN "sso_config" JSONB;

-- CreateTable: verification tokens for magic-link sign-in
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token"      TEXT NOT NULL,
    "expires"    TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key"            ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");
