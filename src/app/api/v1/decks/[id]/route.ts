// GET /api/v1/decks/:id
//
// Poll a generation job. Returns current status + result once completed.
//
// Response shape:
//
//   PENDING / RUNNING:
//   { "jobId": "...", "status": "RUNNING", "createdAt": "...", "updatedAt": "..." }
//
//   COMPLETED:
//   {
//     "jobId":     "...",
//     "status":    "COMPLETED",
//     "createdAt": "...",
//     "updatedAt": "...",
//     "result": {
//       "slides":   [{ "title", "content", "layout", "icon", "color" }],
//       "scripts":  [{ "speakerNotes", "talkingPoints", "suggestedDuration" }],
//       "insights": [{ "type", "content" }]
//     },
//     "webhook": {
//       "delivered":    true,
//       "deliveredAt":  "2026-03-13T...",
//       "attempts":     1
//     }
//   }
//
//   FAILED:
//   { "jobId": "...", "status": "FAILED", "error": "..." }

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withApiKey } from '../../_middleware/with-api-key'

export const GET = withApiKey(async (req: NextRequest, ctx) => {
  // Extract :id from the URL — App Router doesn't pass params to HOF-wrapped
  // handlers, so we parse from the URL directly.
  const id = req.nextUrl.pathname.split('/').pop()

  if (!id) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Job ID is required' } },
      { status: 404 }
    )
  }

  const job = await prisma.generationJob.findUnique({
    where: { id },
    select: {
      id:                    true,
      orgId:                 true,
      status:                true,
      result:                true,
      error:                 true,
      webhookUrl:            true,
      webhookDeliveredAt:    true,
      webhookAttempts:       true,
      webhookLastError:      true,
      createdAt:             true,
      updatedAt:             true,
    },
  })

  // 404 if not found, or if the job belongs to a different org (tenant isolation)
  if (!job || job.orgId !== ctx.orgId) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: `Job ${id} not found` } },
      { status: 404 }
    )
  }

  // ── Base response — always present ─────────────────────────────────────
  const base = {
    jobId:     job.id,
    status:    job.status,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  }

  // ── PENDING / RUNNING — no result yet ──────────────────────────────────
  if (job.status === 'PENDING' || job.status === 'RUNNING') {
    return NextResponse.json({
      ...base,
      // Hint: how often to poll. Clients should honour this.
      retryAfter: 2, // seconds
    })
  }

  // ── FAILED ──────────────────────────────────────────────────────────────
  if (job.status === 'FAILED') {
    return NextResponse.json({
      ...base,
      error: job.error ?? 'Generation failed',
    }, { status: 200 }) // 200 — the poll succeeded; the job itself failed
  }

  // ── COMPLETED — return full result ──────────────────────────────────────
  return NextResponse.json({
    ...base,
    result: job.result, // { slides, scripts, insights }
    webhook: job.webhookUrl
      ? {
          url:         job.webhookUrl,
          delivered:   job.webhookDeliveredAt !== null,
          deliveredAt: job.webhookDeliveredAt?.toISOString() ?? null,
          attempts:    job.webhookAttempts,
          lastError:   job.webhookLastError ?? null,
        }
      : null,
  })
})
