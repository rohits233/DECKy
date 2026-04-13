-- AddTable: usage_alerts
-- Idempotent threshold-breach emails (one row per org + alert type + billing period).
-- The @@unique([orgId, alertType, period]) constraint is the idempotency key so
-- checkAndSendUsageAlert can be called on every deck creation without sending
-- duplicate emails.

CREATE TABLE "usage_alerts" (
    "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
    "org_id"     UUID         NOT NULL,
    "alert_type" TEXT         NOT NULL,
    "period"     TEXT         NOT NULL,
    "sent_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT "usage_alerts_pkey"           PRIMARY KEY ("id"),
    CONSTRAINT "usage_alerts_org_id_fkey"    FOREIGN KEY ("org_id")
        REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "usage_alerts_org_type_period_key"
        UNIQUE ("org_id", "alert_type", "period")
);

-- Index: audit log query (most recent alerts for an org)
CREATE INDEX "usage_alerts_org_id_sent_at_idx"
    ON "usage_alerts" ("org_id", "sent_at" DESC);
