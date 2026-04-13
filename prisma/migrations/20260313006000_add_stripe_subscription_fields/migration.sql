-- Add Stripe subscription tracking + grace period to organizations
ALTER TABLE "organizations"
  ADD COLUMN "subscription_id"      TEXT,
  ADD COLUMN "subscription_item_id" TEXT,
  ADD COLUMN "current_period_end"   TIMESTAMP(3),
  ADD COLUMN "grace_period_ends_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "organizations_subscription_id_key" ON "organizations"("subscription_id");
CREATE INDEX "organizations_grace_period_ends_at_idx" ON "organizations"("grace_period_ends_at")
  WHERE "grace_period_ends_at" IS NOT NULL; -- partial index: only rows in grace period
