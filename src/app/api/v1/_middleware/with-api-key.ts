import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limiter'
import { isInGracePeriod } from '@/lib/billing/subscription'
import type { ApiKeyTier, PlanTier } from '@prisma/client'

// ---------------------------------------------------------------------------
// ApiKeyContext — resolved and validated key + org payload.
// Passed to every route handler that uses withApiKey().
// ---------------------------------------------------------------------------
export interface ApiKeyContext {
  keyId:         string
  orgId:         string
  org: {
    id:              string
    slug:            string
    name:            string
    planTier:        PlanTier
    webhookUrl:      string | null
    webhookSecret:   string | null
    gracePeriodEndsAt: Date | null
  }
  tier:           ApiKeyTier
  requestsPerMin: number
}

// ---------------------------------------------------------------------------
// hashKey — SHA-256 of the raw key string.
// Must match how keys were stored at creation time.
// ---------------------------------------------------------------------------
function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

// ---------------------------------------------------------------------------
// resolveApiKey — pulls the Bearer token, hashes it, fetches from DB.
// Uses keyPrefix for a cheap indexed pre-filter before comparing hashes,
// mirroring the GitHub-style lookup pattern in the schema design.
// ---------------------------------------------------------------------------
async function resolveApiKey(req: NextRequest): Promise<ApiKeyContext | null> {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null

  const raw    = auth.slice(7).trim()
  if (!raw)    return null

  // First 8 chars are the prefix (indexed column) — avoids a full hash-scan
  const prefix = raw.slice(0, 8)
  const hash   = hashKey(raw)

  const key = await prisma.apiKey.findFirst({
    where: {
      keyPrefix: prefix,
      keyHash:   hash,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    include: {
      org: {
        select: {
          id:                true,
          slug:              true,
          name:              true,
          planTier:          true,
          webhookUrl:        true,
          webhookSecret:     true,
          gracePeriodEndsAt: true,
        },
      },
    },
  })

  if (!key) return null

  // Fire-and-forget last-used timestamp update — don't block the request
  prisma.apiKey.update({
    where: { id: key.id },
    data:  { lastUsedAt: new Date() },
  }).catch(() => {}) // non-fatal

  return {
    keyId:         key.id,
    orgId:         key.orgId,
    org:           key.org,
    tier:          key.tier,
    requestsPerMin: key.requestsPerMin,
  }
}

// ---------------------------------------------------------------------------
// apiError — consistent JSON error envelope for the v1 API.
// ---------------------------------------------------------------------------
function apiError(status: number, code: string, message: string, extra?: object) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status })
}

// ---------------------------------------------------------------------------
// withApiKey — higher-order function that wraps a v1 route handler.
//
// Usage:
//   export const POST = withApiKey(async (req, ctx) => {
//     // ctx.org, ctx.tier, ctx.keyId are all verified here
//     return NextResponse.json({ ok: true })
//   })
//
// Responsibilities:
//   1. Extract + validate Bearer token
//   2. Resolve org context from DB (prefix-indexed, then hash-compare)
//   3. Check revocation + expiry
//   4. Sliding-window rate limit (tier-aware, from DB field)
//   5. Inject rate-limit headers on every response
// ---------------------------------------------------------------------------
export function withApiKey(
  handler: (req: NextRequest, ctx: ApiKeyContext) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // ── 1. Resolve key ───────────────────────────────────────────────────────
    const ctx = await resolveApiKey(req)

    if (!ctx) {
      return apiError(401, 'UNAUTHORIZED',
        'Missing or invalid API key. Pass your key as: Authorization: Bearer <key>')
    }

    // ── 2. Rate limit ────────────────────────────────────────────────────────
    const rl = checkRateLimit(ctx.keyId, ctx.requestsPerMin)

    // Always attach rate-limit headers so clients can backoff correctly
    const rlHeaders = {
      'X-RateLimit-Limit':     String(rl.limit),
      'X-RateLimit-Remaining': String(rl.remaining),
      'X-RateLimit-Reset':     String(Math.ceil(rl.resetAt / 1000)), // Unix seconds
    }

    // ── 3. Grace period — block mutations, allow reads ───────────────────────
    if (isInGracePeriod(ctx.org.gracePeriodEndsAt) && req.method !== 'GET') {
      return apiError(402, 'PAYMENT_REQUIRED',
        `Your organisation is in a grace period due to a failed payment. ` +
        `New generations are disabled. Update your payment method at /dashboard/billing.`
      )
    }

    if (!rl.allowed) {
      return NextResponse.json(
        { error: {
            code:    'RATE_LIMIT_EXCEEDED',
            message: `Rate limit of ${rl.limit} req/min exceeded. Retry after ${new Date(rl.resetAt).toISOString()}.`,
            retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000),
        }},
        { status: 429, headers: { ...rlHeaders, 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    // ── 3. Delegate to handler, inject headers on response ───────────────────
    const response = await handler(req, ctx)

    Object.entries(rlHeaders).forEach(([k, v]) => response.headers.set(k, v))
    return response
  }
}
