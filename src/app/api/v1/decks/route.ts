// POST /api/v1/decks
//
// Accepts a generation request, creates a GenerationJob row, returns 202
// immediately, and runs the pipeline in the background.
//
// Request body:
//   {
//     "title":           string (required)
//     "prompt":          string (optional — user guidance for slide narrative)
//     "documentIds":     string[] (optional — IDs of previously-uploaded documents)
//     "generateScripts": boolean (default true)
//     "aiProvider":      "openai" | "anthropic" (optional — org default otherwise)
//     "aiModel":         string (optional)
//   }
//
// Response 202:
//   { "jobId": "<uuid>", "status": "PENDING", "pollUrl": "/api/v1/decks/<uuid>" }

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withApiKey } from '../_middleware/with-api-key'
import { runPipeline } from '@/lib/pipeline/orchestrator'
import { deliverWebhook } from '@/lib/webhook'
import { checkAndSendUsageAlert } from '@/lib/alerts/usage-alerts'
import type { ProviderName } from '@/lib/pipeline/ai'

// ---------------------------------------------------------------------------
// Input schema — validated before the job is created
// ---------------------------------------------------------------------------
const CreateDeckSchema = z.object({
  title:           z.string().min(1).max(200),
  prompt:          z.string().max(2000).optional(),
  documentIds:     z.array(z.string().uuid()).max(20).default([]),
  generateScripts: z.boolean().default(true),
  aiProvider:      z.enum(['openai', 'anthropic']).optional(),
  aiModel:         z.string().max(100).optional(),
})

// ---------------------------------------------------------------------------
// runJobAsync — runs the pipeline entirely in the background.
//
// Next.js note: in serverless environments this promise will be cancelled if
// the function times out. For long-running jobs (>30s) use a proper job queue:
//   Vercel:  Vercel Queues / QStash
//   AWS:     SQS + Lambda
//   Self-host: BullMQ + Redis
// The schema + webhook pattern here is queue-agnostic — swap the trigger,
// keep the GenerationJob row + webhook delivery unchanged.
// ---------------------------------------------------------------------------
async function runJobAsync(
  jobId:     string,
  orgId:     string,
  userId:    string,
  input:     z.infer<typeof CreateDeckSchema>
): Promise<void> {
  // Mark running
  await prisma.generationJob.update({
    where: { id: jobId },
    data:  { status: 'RUNNING' },
  })

  try {
    const result = await runPipeline({
      projectId:       jobId,      // use jobId as the projectId scope
      userId,
      documentIds:     input.documentIds,
      projectTitle:    input.title,
      prompt:          input.prompt,
      generateScripts: input.generateScripts,
      aiProvider:      input.aiProvider as ProviderName | undefined,
      aiModel:         input.aiModel,
    })

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        result: result as object,
      },
    })

    // Fire webhook delivery — non-blocking, errors are recorded on the job
    deliverWebhook(jobId).catch(() => {})

    // Write a UsageEvent for billing metering
    await prisma.usageEvent.create({
      data: {
        orgId,
        eventType:      'DECK_CREATED',
        resourceId:     jobId,
        quantity:       result.slides.length,
        idempotencyKey: `DECK_CREATED:${jobId}`,
        metadata: {
          provider: input.aiProvider ?? process.env.DECKY_AI_PROVIDER ?? 'openai',
          slides:   result.slides.length,
        },
      },
    }).catch(() => {}) // non-fatal — don't fail the job over a billing event

    // Check if the org has crossed the 80% usage threshold and send an alert
    // email to OWNER/ADMIN members. Fire-and-forget — idempotent, won't re-send.
    checkAndSendUsageAlert(orgId).catch(() => {})

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await prisma.generationJob.update({
      where: { id: jobId },
      data:  { status: 'FAILED', error: message },
    })
    deliverWebhook(jobId).catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export const POST = withApiKey(async (req: NextRequest, ctx) => {
  // Parse + validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 }
    )
  }

  const parsed = CreateDeckSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', issues: parsed.error.issues } },
      { status: 422 }
    )
  }

  const input = parsed.data

  // Plan-tier guard — FREE orgs can't call the API at all
  if (ctx.org.planTier === 'FREE') {
    return NextResponse.json(
      { error: { code: 'PLAN_REQUIRED', message: 'API access requires STARTER plan or above.' } },
      { status: 403 }
    )
  }

  // Create the job row — this is the source of truth for status polling
  const job = await prisma.generationJob.create({
    data: {
      orgId:      ctx.orgId,
      apiKeyId:   ctx.keyId,
      status:     'PENDING',
      input:      input as object,
      webhookUrl: ctx.org.webhookUrl, // snapshot at creation time
    },
  })

  // 🔥 Fire-and-forget — return 202 immediately
  runJobAsync(job.id, ctx.orgId, ctx.orgId /* userId = orgId for API calls */, input)
    .catch(() => {}) // errors are recorded inside runJobAsync

  return NextResponse.json(
    {
      jobId:   job.id,
      status:  'PENDING',
      pollUrl: `/api/v1/decks/${job.id}`,
    },
    { status: 202 }
  )
})
