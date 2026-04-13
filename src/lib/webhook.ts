import { createHmac } from 'crypto'
import { prisma } from './prisma'

// ---------------------------------------------------------------------------
// Webhook payload shape — sent to the customer's configured URL on job
// completion or failure.
// ---------------------------------------------------------------------------
export interface WebhookPayload {
  event:     'deck.completed' | 'deck.failed'
  jobId:     string
  orgId:     string
  timestamp: string            // ISO-8601
  data: {
    status:   'COMPLETED' | 'FAILED'
    result?:  unknown           // slide JSON when completed
    error?:   string            // message when failed
  }
}

// ---------------------------------------------------------------------------
// sign — HMAC-SHA256 of the raw JSON body using the org's webhook secret.
//
// Signature header: X-Decky-Signature: sha256=<hex>
//
// Customers verify like this (Node.js example):
//   const sig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
//   const expected = `sha256=${sig}`
//   if (!crypto.timingSafeEqual(Buffer.from(incoming), Buffer.from(expected))) throw new Error('Bad signature')
// ---------------------------------------------------------------------------
function sign(body: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
}

// ---------------------------------------------------------------------------
// deliverWebhook — sends the payload to the customer URL with retry.
//
// Strategy: up to MAX_ATTEMPTS with exponential backoff (1s, 2s, 4s).
// Any 2xx response is a success. Records delivery attempt result on the job.
//
// Called fire-and-forget from job completion — do NOT await in hot paths.
// ---------------------------------------------------------------------------
const MAX_ATTEMPTS  = 3
const BASE_DELAY_MS = 1_000

export async function deliverWebhook(jobId: string): Promise<void> {
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    include: { org: { select: { webhookUrl: true, webhookSecret: true } } },
  })

  // Skip if no webhook configured, or job is missing
  const url    = job?.webhookUrl
  const secret = job?.org?.webhookSecret
  if (!job || !url || !secret) return

  const payload: WebhookPayload = {
    event:     job.status === 'COMPLETED' ? 'deck.completed' : 'deck.failed',
    jobId:     job.id,
    orgId:     job.orgId,
    timestamp: new Date().toISOString(),
    data: {
      status: job.status as 'COMPLETED' | 'FAILED',
      result: job.result  ?? undefined,
      error:  job.error   ?? undefined,
    },
  }

  const body      = JSON.stringify(payload)
  const signature = sign(body, secret)

  let lastError = ''

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: {
          'Content-Type':       'application/json',
          'X-Decky-Signature':  signature,
          'X-Decky-Event':      payload.event,
          'X-Decky-Delivery':   jobId,         // idempotency key for the customer
          'User-Agent':         'Decky-Webhook/1.0',
        },
        body,
        signal: AbortSignal.timeout(10_000), // 10s timeout per attempt
      })

      if (res.ok) {
        // ✅ Success — record delivery time and exit
        await prisma.generationJob.update({
          where: { id: jobId },
          data: {
            webhookDeliveredAt: new Date(),
            webhookAttempts:    attempt,
            webhookLastError:   null,
          },
        })
        return
      }

      lastError = `HTTP ${res.status}: ${await res.text().catch(() => '').then(t => t.slice(0, 200))}`
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }

    // Exponential backoff before next attempt (skip delay after last attempt)
    if (attempt < MAX_ATTEMPTS) {
      await new Promise(r => setTimeout(r, BASE_DELAY_MS * 2 ** (attempt - 1)))
    }
  }

  // All attempts exhausted — record the failure
  await prisma.generationJob.update({
    where: { id: jobId },
    data: {
      webhookAttempts:  MAX_ATTEMPTS,
      webhookLastError: lastError,
    },
  })
}
