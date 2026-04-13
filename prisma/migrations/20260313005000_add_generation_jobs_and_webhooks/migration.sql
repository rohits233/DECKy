-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- AlterTable: add webhook config to organizations
ALTER TABLE "organizations"
  ADD COLUMN "webhook_url"    TEXT,
  ADD COLUMN "webhook_secret" TEXT;

-- CreateTable
CREATE TABLE "generation_jobs" (
    "id"                    UUID         NOT NULL,
    "org_id"                UUID         NOT NULL,
    "api_key_id"            UUID,
    "status"                "JobStatus"  NOT NULL DEFAULT 'PENDING',
    "input"                 JSONB        NOT NULL,
    "result"                JSONB,
    "error"                 TEXT,
    "webhook_url"           TEXT,
    "webhook_delivered_at"  TIMESTAMP(3),
    "webhook_attempts"      INTEGER      NOT NULL DEFAULT 0,
    "webhook_last_error"    TEXT,
    "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generation_jobs_org_id_created_at_idx"  ON "generation_jobs"("org_id", "created_at" DESC);
CREATE INDEX "generation_jobs_api_key_id_status_idx"  ON "generation_jobs"("api_key_id", "status");
CREATE INDEX "generation_jobs_status_created_at_idx"  ON "generation_jobs"("status", "created_at");

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_api_key_id_fkey"
  FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
