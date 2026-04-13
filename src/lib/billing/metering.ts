import { stripe } from './client'
import { prisma } from '@/lib/prisma'

// ---------------------------------------------------------------------------
// UsageSummary — aggregated usage_events for one org in a billing period.
// ---------------------------------------------------------------------------
export interface UsageSummary {
  orgId:              string
  periodStart:        Date
  periodEnd:          Date
  slidesGenerated:    number
  decksCreated:       number
  documentsProcessed: number
  apiRequests:        number
  aiTokensConsumed:   number
}

// ---------------------------------------------------------------------------
// aggregateUsage
// Sums usage_events by event_type for a single org within a period window.
// This is also used by the billing page to show "usage this period".
// ---------------------------------------------------------------------------
export async function aggregateUsage(
  orgId:       string,
  periodStart: Date,
  periodEnd:   Date,
): Promise<UsageSummary> {
  const rows = await prisma.usageEvent.groupBy({
    by:    ['eventType'],
    where: {
      orgId,
      createdAt: { gte: periodStart, lt: periodEnd },
    },
    _sum: { quantity: true },
  })

  const sum = (type: string) =>
    rows.find(r => r.eventType === type)?._sum.quantity ?? 0

  return {
    orgId,
    periodStart,
    periodEnd,
    slidesGenerated:    sum('SLIDE_GENERATED'),
    decksCreated:       sum('DECK_CREATED'),
    documentsProcessed: sum('DOCUMENT_PROCESSED'),
    apiRequests:        sum('API_REQUEST'),
    aiTokensConsumed:   sum('AI_TOKENS_CONSUMED'),
  }
}

// ---------------------------------------------------------------------------
// reportUsageToStripe
// Reports metered usage to Stripe for a single org.
//
// Stripe model assumed:
//   - The subscription has one metered price item (usage_type: 'metered')
//   - We report SLIDE_GENERATED as the billable unit
//   - action: 'set' resets the counter (idempotent for the billing period)
//
// Call this at period end from the /api/cron/usage-report route, triggered
// by invoice.upcoming or a scheduled cron (Vercel Cron / GitHub Actions).
// ---------------------------------------------------------------------------
export async function reportUsageToStripe(orgId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      subscriptionItemId: true,
      currentPeriodEnd:   true,
      billingCustomerId:  true,
    },
  })

  if (!org?.subscriptionItemId) return // not a paying org

  // Period: from the start of the billing period to now
  const periodEnd   = org.currentPeriodEnd ?? new Date()
  // Back-calculate period start: Stripe's billing period is typically 1 month
  const periodStart = new Date(periodEnd)
  periodStart.setMonth(periodStart.getMonth() - 1)

  const summary = await aggregateUsage(orgId, periodStart, periodEnd)

  if (summary.slidesGenerated === 0) return // nothing to report

  // Stripe 2026+ uses Billing Meter events instead of subscription item usage records.
  // Requires a meter with event_name 'slides_generated' created in the Stripe dashboard
  // and its ID stored in STRIPE_SLIDES_METER_ID env var.
  // See: https://docs.stripe.com/billing/subscriptions/usage-based/recording-usage
  await stripe.billing.meterEvents.create({
    event_name:  'slides_generated',
    payload: {
      stripe_customer_id: org.billingCustomerId ?? '',
      value:              String(summary.slidesGenerated),
    },
    timestamp: Math.floor(Date.now() / 1000),
  })
}

// ---------------------------------------------------------------------------
// reportAllOrgsToStripe
// Iterates every active paying org and reports usage.
// Called by /api/cron/usage-report once per day (or at period end).
// ---------------------------------------------------------------------------
export async function reportAllOrgsToStripe(): Promise<{ reported: number; errors: string[] }> {
  const orgs = await prisma.organization.findMany({
    where: {
      subscriptionItemId: { not: null },
      planTier:           { not: 'FREE' },
    },
    select: { id: true },
  })

  const errors: string[] = []
  let reported = 0

  for (const org of orgs) {
    try {
      await reportUsageToStripe(org.id)
      reported++
    } catch (err) {
      errors.push(`${org.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { reported, errors }
}
