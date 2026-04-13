// src/lib/alerts/usage-alerts.ts
//
// Fires a one-time email to every OWNER and ADMIN in an org when they cross
// the 80% deck-limit threshold for the current billing month.
//
// Idempotency: the `usage_alerts` table has a @@unique([orgId, alertType, period])
// constraint. We attempt an INSERT — if the row already exists, Prisma throws
// P2002 (unique violation) and we bail early without sending a duplicate email.
// This means it's safe to call checkAndSendUsageAlert on every deck creation.
//
// Called fire-and-forget from runJobAsync after the DECK_CREATED UsageEvent.

import { Resend }          from 'resend'
import { prisma }          from '@/lib/prisma'
import { PLANS }           from '@/lib/billing/plans'
import { aggregateUsage }  from '@/lib/billing/metering'
import type { PlanTier }   from '@prisma/client'

const getResend = () => new Resend(process.env.RESEND_API_KEY ?? 'placeholder')

const ALERT_TYPE = 'DECK_LIMIT_80PCT'
const THRESHOLD  = 0.8 // 80 %

// ---------------------------------------------------------------------------
// periodKey — "YYYY-MM-01" string for the current calendar month.
// Stored on the UsageAlert row so the alert fires once per month, not once ever.
// ---------------------------------------------------------------------------
function periodKey(): string {
  const now = new Date()
  const y   = now.getFullYear()
  const m   = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

// ---------------------------------------------------------------------------
// checkAndSendUsageAlert
//
// Called after every successful deck creation. Returns early (no email sent) if:
//   • The plan has no deck limit (unlimited — null deckLimit)
//   • Usage is below the 80% threshold
//   • An alert has already been sent this period (unique constraint catch)
// ---------------------------------------------------------------------------
export async function checkAndSendUsageAlert(orgId: string): Promise<void> {
  // 1. Load org plan tier (we only need planTier — keep the query lean)
  const org = await prisma.organization.findUnique({
    where:  { id: orgId },
    select: { planTier: true, name: true },
  })
  if (!org) return

  const plan       = PLANS[org.planTier as PlanTier]
  const deckLimit  = plan.deckLimit
  if (deckLimit === null) return // unlimited plan — nothing to alert on

  // 2. Aggregate current-month deck creations
  const now         = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const usage = await aggregateUsage(orgId, periodStart, periodEnd)
  const ratio = usage.decksCreated / deckLimit

  if (ratio < THRESHOLD) return // under threshold — nothing to do

  // 3. Insert idempotency guard row.
  //    If the row already exists for this org + alertType + period, Prisma throws
  //    P2002. We catch it and bail — no duplicate email.
  const period = periodKey()
  try {
    await prisma.usageAlert.create({
      data: { orgId, alertType: ALERT_TYPE, period },
    })
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'P2002') return // already sent this period
    throw err // unexpected error — let the caller decide
  }

  // 4. Fetch all OWNER + ADMIN emails for this org
  const memberships = await prisma.orgMembership.findMany({
    where: {
      orgId,
      deletedAt: null,
      role: { in: ['OWNER', 'ADMIN'] },
    },
    select: { user: { select: { email: true } } },
  })

  const recipients = memberships.map(m => m.user.email)
  if (recipients.length === 0) return

  // 5. Send the email via Resend
  const pctUsed     = Math.round(ratio * 100)
  const remaining   = deckLimit - usage.decksCreated
  const fromAddress = process.env.EMAIL_FROM ?? 'noreply@decky.app'

  await getResend().emails.send({
    from:    fromAddress,
    to:      recipients,
    subject: `[Decky] ${org.name} has used ${pctUsed}% of its monthly deck limit`,
    html: buildEmailHtml({
      orgName:     org.name,
      planName:    plan.name,
      decksUsed:   usage.decksCreated,
      deckLimit,
      pctUsed,
      remaining,
    }),
    text: buildEmailText({
      orgName:     org.name,
      planName:    plan.name,
      decksUsed:   usage.decksCreated,
      deckLimit,
      pctUsed,
      remaining,
    }),
  })
}

// ---------------------------------------------------------------------------
// Email templates — plain function, no JSX dependency in this lib file.
// ---------------------------------------------------------------------------

interface TemplateVars {
  orgName:   string
  planName:  string
  decksUsed: number
  deckLimit: number
  pctUsed:   number
  remaining: number
}

function buildEmailText(v: TemplateVars): string {
  return [
    `Usage alert for ${v.orgName}`,
    '',
    `Your organization has used ${v.decksUsed} of ${v.deckLimit} decks this month`,
    `(${v.pctUsed}% of your ${v.planName} plan limit).`,
    '',
    `You have ${v.remaining} deck${v.remaining !== 1 ? 's' : ''} remaining this month.`,
    '',
    'To avoid hitting your limit, upgrade your plan or wait for the monthly reset on the 1st.',
    '',
    `Manage billing: ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.decky.ai'}/dashboard/billing`,
  ].join('\n')
}

function buildEmailHtml(v: TemplateVars): string {
  const billingUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.decky.ai'}/dashboard/billing`
  const barWidth   = Math.min(v.pctUsed, 100)
  const barColor   = v.pctUsed >= 100 ? '#ef4444' : v.pctUsed >= 80 ? '#f97316' : '#3b82f6'

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:32px 0">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">

    <!-- Header -->
    <div style="background:#1e40af;padding:24px 32px">
      <p style="margin:0;font-size:20px;font-weight:700;color:#fff">Decky Usage Alert</p>
    </div>

    <!-- Body -->
    <div style="padding:32px">
      <p style="margin:0 0 8px;font-size:15px;color:#374151">
        <strong>${v.orgName}</strong> has used
        <strong>${v.decksUsed} of ${v.deckLimit} decks</strong>
        this month on the <strong>${v.planName}</strong> plan.
      </p>

      <!-- Usage bar -->
      <div style="margin:20px 0;background:#f3f4f6;border-radius:99px;height:10px;overflow:hidden">
        <div style="width:${barWidth}%;height:100%;background:${barColor};border-radius:99px"></div>
      </div>
      <p style="margin:0 0 20px;font-size:13px;color:#6b7280">
        ${v.pctUsed}% used &mdash; ${v.remaining} deck${v.remaining !== 1 ? 's' : ''} remaining
      </p>

      <p style="margin:0 0 24px;font-size:14px;color:#374151">
        To keep generating without interruption, upgrade your plan before the 1st of next month.
      </p>

      <a href="${billingUrl}"
         style="display:inline-block;background:#1e40af;color:#fff;font-size:14px;font-weight:600;
                padding:10px 24px;border-radius:8px;text-decoration:none">
        Manage billing →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:12px;color:#9ca3af">
        You're receiving this because you are an Owner or Admin of ${v.orgName} on Decky.
      </p>
    </div>
  </div>
</body>
</html>`
}
