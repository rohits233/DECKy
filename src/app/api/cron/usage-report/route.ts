// GET /api/cron/usage-report
//
// Aggregates usage_events by org and reports to Stripe's metering API.
// Called by a scheduler — NOT a user-facing endpoint.
//
// Schedule recommendation: run once per day, or hook into invoice.upcoming
// webhook (fires ~1 hour before the billing period closes).
//
// Vercel Cron config (vercel.json):
//   { "crons": [{ "path": "/api/cron/usage-report", "schedule": "0 2 * * *" }] }
//
// Authentication: CRON_SECRET env var checked via Bearer token.
// Without this, anyone could trigger a Stripe usage report.

import { NextRequest, NextResponse } from 'next/server'
import { reportAllOrgsToStripe }     from '@/lib/billing/metering'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Guard: only allow Vercel Cron or callers with the secret
  const auth   = req.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET

  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const started = Date.now()

  try {
    const { reported, errors } = await reportAllOrgsToStripe()

    const summary = {
      reported,
      errors,
      durationMs: Date.now() - started,
      timestamp:  new Date().toISOString(),
    }

    if (errors.length > 0) {
      // Partial failure — log but return 200 so Vercel Cron doesn't retry
      // (retrying could double-report usage for orgs that succeeded)
      console.error('[usage-report] partial errors:', errors)
    }

    console.log('[usage-report] completed:', summary)
    return NextResponse.json(summary)

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[usage-report] fatal error:', msg)
    return NextResponse.json({ error: msg, durationMs: Date.now() - started }, { status: 500 })
  }
}
