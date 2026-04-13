-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'STARTER', 'GROWTH', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ApiKeyTier" AS ENUM ('STANDARD', 'PREMIUM', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "UsageEventType" AS ENUM ('DECK_CREATED', 'DECK_EXPORTED', 'SLIDE_GENERATED', 'DOCUMENT_PROCESSED', 'AI_TOKENS_CONSUMED', 'API_REQUEST');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan_tier" "PlanTier" NOT NULL DEFAULT 'FREE',
    "branding_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "auth_provider_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_memberships" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'VIEWER',
    "deleted_at" TIMESTAMP(3),
    "invited_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decks" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "current_version_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deck_versions" (
    "id" UUID NOT NULL,
    "deck_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "version_num" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deck_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "deck_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "tier" "ApiKeyTier" NOT NULL DEFAULT 'STANDARD',
    "requests_per_min" INTEGER NOT NULL DEFAULT 60,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID,
    "api_key_id" UUID,
    "event_type" "UsageEventType" NOT NULL,
    "resource_id" UUID,
    "deck_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_provider_id_key" ON "users"("auth_provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_auth_provider_id_idx" ON "users"("auth_provider_id");

-- CreateIndex
CREATE INDEX "org_memberships_org_id_deleted_at_idx" ON "org_memberships"("org_id", "deleted_at");

-- CreateIndex
CREATE INDEX "org_memberships_user_id_deleted_at_idx" ON "org_memberships"("user_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "org_memberships_org_id_user_id_key" ON "org_memberships"("org_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "decks_current_version_id_key" ON "decks"("current_version_id");

-- CreateIndex
CREATE INDEX "decks_org_id_created_at_idx" ON "decks"("org_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "decks_org_id_owner_id_idx" ON "decks"("org_id", "owner_id");

-- CreateIndex
CREATE INDEX "deck_versions_deck_id_version_num_idx" ON "deck_versions"("deck_id", "version_num" DESC);

-- CreateIndex
CREATE INDEX "deck_versions_org_id_created_at_idx" ON "deck_versions"("org_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "deck_versions_deck_id_version_num_key" ON "deck_versions"("deck_id", "version_num");

-- CreateIndex
CREATE INDEX "documents_deck_id_idx" ON "documents"("deck_id");

-- CreateIndex
CREATE INDEX "documents_org_id_status_idx" ON "documents"("org_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_org_id_revoked_at_idx" ON "api_keys"("org_id", "revoked_at");

-- CreateIndex
CREATE INDEX "api_keys_key_prefix_idx" ON "api_keys"("key_prefix");

-- CreateIndex
CREATE UNIQUE INDEX "usage_events_idempotency_key_key" ON "usage_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "usage_events_org_id_created_at_idx" ON "usage_events"("org_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "usage_events_org_id_event_type_created_at_idx" ON "usage_events"("org_id", "event_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "usage_events_deck_id_event_type_idx" ON "usage_events"("deck_id", "event_type");

-- CreateIndex
CREATE INDEX "usage_events_api_key_id_created_at_idx" ON "usage_events"("api_key_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decks" ADD CONSTRAINT "decks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decks" ADD CONSTRAINT "decks_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "deck_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_versions" ADD CONSTRAINT "deck_versions_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck_versions" ADD CONSTRAINT "deck_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "decks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_deck_id_fkey" FOREIGN KEY ("deck_id") REFERENCES "decks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
