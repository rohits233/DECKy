import { redirect }              from 'next/navigation'
import { auth }                  from '@/auth'
import { prisma }                from '@/lib/prisma'
import { PLANS, GRACE_PERIOD_DAYS } from '@/lib/billing/plans'
import { aggregateUsage }        from '@/lib/billing/metering'
import { isInGracePeriod }       from '@/lib/billing/subscription'
import { checkoutAction, portalAction } from './actions'
import type { PlanTier }         from '@prisma/client'

// ---------------------------------------------------------------------------
// Data fetching — always fresh from DB, not from the (potentially stale) JWT
// ---------------------------------------------------------------------------
async function getBillingData(orgId: string) {
  const org = await prisma.organization.findUniqueOrThrow({
    where:  { id: orgId },
    select: {
      planTier:           true,
      subscriptionId:     true,
      currentPeriodEnd:   true,
      gracePeriodEndsAt:  true,
    },
  })

  // Usage period: current calendar month (matches how we show it to users)
  // For Stripe reporting we use the subscription period, but for display
  // calendar month is more intuitive for consulting teams.
  const now          = new Date()
  const periodStart  = new Date(now.getFullYear(), now.getMonth(), 1)
  const periodEnd    = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const usage = await aggregateUsage(orgId, periodStart, periodEnd)
  const plan  = PLANS[org.planTier]

  return { org, usage, plan, periodStart, periodEnd }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GracePeriodBanner({ endsAt }: { endsAt: Date }) {
  const daysLeft = Math.max(
    0,
    Math.ceil((endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
      <span className="text-red-500 text-xl mt-0.5">⚠️</span>
      <div>
        <p className="font-semibold text-red-800">Payment failed — grace period active</p>
        <p className="text-sm text-red-700 mt-1">
          Your account is in read-only mode. New deck generation is disabled.
          Update your payment method to restore full access.{' '}
          <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining.</strong>
        </p>
      </div>
    </div>
  )
}

function UsageBar({ label, value, max }: { label: string; value: number; max: number | null }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  const overLimit = max !== null && value >= max
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className={`font-medium ${overLimit ? 'text-red-600' : 'text-gray-900'}`}>
          {value.toLocaleString()}{max !== null ? ` / ${max.toLocaleString()}` : ''}
        </span>
      </div>
      {max !== null && (
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${overLimit ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

function PlanCard({
  tier,
  current,
  inGracePeriod,
}: {
  tier: PlanTier
  current: boolean
  inGracePeriod: boolean
}) {
  const plan = PLANS[tier]
  if (tier === 'FREE') return null // don't show FREE as an upgrade option

  return (
    <div className={`rounded-xl border-2 p-6 flex flex-col gap-4 ${
      current ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-gray-900">{plan.name}</h3>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${plan.monthlyUsd}
            <span className="text-sm font-normal text-gray-500">/mo</span>
          </p>
        </div>
        {current && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
            Current plan
          </span>
        )}
      </div>

      <ul className="space-y-1.5 text-sm text-gray-600 flex-1">
        {plan.features.map(f => (
          <li key={f} className="flex items-center gap-2">
            <span className="text-green-500">✓</span> {f}
          </li>
        ))}
      </ul>

      {current ? (
        <form action={portalAction}>
          <button
            type="submit"
            className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Manage subscription
          </button>
        </form>
      ) : (
        <form action={checkoutAction.bind(null, tier as Exclude<PlanTier, 'FREE'>)}>
          <button
            type="submit"
            disabled={inGracePeriod}
            className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {inGracePeriod ? 'Resolve payment first' : `Upgrade to ${plan.name}`}
          </button>
        </form>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function BillingPage() {
  const session = await auth()
  if (!session?.activeOrg) redirect('/auth/login')

  // Only OWNER and ADMIN can see billing
  if (session.activeOrg.role === 'EDITOR' || session.activeOrg.role === 'VIEWER') {
    redirect('/dashboard')
  }

  const { org, usage, plan, periodStart } = await getBillingData(session.activeOrg.id)
  const gracePeriod = isInGracePeriod(org.gracePeriodEndsAt)

  const periodLabel = periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

      {/* Grace period banner — shown above everything else */}
      {gracePeriod && org.gracePeriodEndsAt && (
        <GracePeriodBanner endsAt={org.gracePeriodEndsAt} />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 mt-1">
          Manage your plan and view usage for{' '}
          <span className="font-medium text-gray-700">{session.activeOrg.name}</span>
        </p>
      </div>

      {/* Current plan summary */}
      <section className="rounded-xl border border-gray-200 p-6 bg-white space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Current plan</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{plan.name}</p>
          </div>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
            gracePeriod
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {gracePeriod ? 'Payment overdue' : 'Active'}
          </span>
        </div>

        {org.currentPeriodEnd && (
          <p className="text-sm text-gray-500">
            Next billing date:{' '}
            <span className="text-gray-700">
              {org.currentPeriodEnd.toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric'
              })}
            </span>
          </p>
        )}
      </section>

      {/* Usage this period */}
      <section className="rounded-xl border border-gray-200 p-6 bg-white space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900">Usage — {periodLabel}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Resets on the 1st of each month</p>
        </div>

        <div className="space-y-4">
          <UsageBar
            label="Decks created"
            value={usage.decksCreated}
            max={plan.deckLimit}
          />
          <UsageBar
            label="Slides generated"
            value={usage.slidesGenerated}
            max={null} // unlimited — metered for billing but no hard cap shown
          />
          <UsageBar
            label="Documents processed"
            value={usage.documentsProcessed}
            max={null}
          />
          {plan.apiAccess && (
            <UsageBar
              label="API requests"
              value={usage.apiRequests}
              max={null}
            />
          )}
        </div>
      </section>

      {/* Plan upgrade grid */}
      <section className="space-y-4">
        <h2 className="font-semibold text-gray-900">Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['STARTER', 'GROWTH', 'ENTERPRISE'] as const).map(tier => (
            <PlanCard
              key={tier}
              tier={tier}
              current={org.planTier === tier}
              inGracePeriod={gracePeriod}
            />
          ))}
        </div>
      </section>

      {/* Billing portal link for existing subscribers */}
      {org.subscriptionId && (
        <section className="rounded-xl border border-gray-200 p-6 bg-white flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Payment & invoices</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Update your card, download receipts, or cancel your subscription.
            </p>
          </div>
          <form action={portalAction}>
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap"
            >
              Open billing portal →
            </button>
          </form>
        </section>
      )}
    </div>
  )
}
