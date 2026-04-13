import { stripe } from './client'
import { PLANS, tierFromPriceId, GRACE_PERIOD_DAYS } from './plans'
import { prisma } from '@/lib/prisma'
import type { PlanTier } from '@prisma/client'

// ---------------------------------------------------------------------------
// getOrCreateCustomer
// Called before any Stripe interaction. If the org already has a customer ID
// we return it. Otherwise we create one, storing the orgId in metadata so
// webhooks can look up the org without an extra query.
// ---------------------------------------------------------------------------
export async function getOrCreateCustomer(orgId: string): Promise<string> {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } })

  if (org.billingCustomerId) return org.billingCustomerId

  const customer = await stripe.customers.create({
    name:     org.name,
    metadata: { orgId },          // ← the webhook uses this to resolve the org
  })

  await prisma.organization.update({
    where: { id: orgId },
    data:  { billingCustomerId: customer.id },
  })

  return customer.id
}

// ---------------------------------------------------------------------------
// createCheckoutSession
// Sends the user through Stripe Checkout to subscribe to a plan.
// On success Stripe fires checkout.session.completed which flips planTier.
// ---------------------------------------------------------------------------
export async function createCheckoutSession(
  orgId:     string,
  targetTier: Exclude<PlanTier, 'FREE'>,
  returnUrl:  string,
): Promise<string> {
  const plan       = PLANS[targetTier]
  const customerId = await getOrCreateCustomer(orgId)

  const session = await stripe.checkout.sessions.create({
    customer:   customerId,
    mode:       'subscription',
    line_items: [{ price: plan.priceId!, quantity: 1 }],
    // Pass orgId so the webhook handler can resolve without an extra lookup
    metadata:        { orgId },
    subscription_data: { metadata: { orgId } },
    success_url: `${returnUrl}?upgraded=true`,
    cancel_url:  `${returnUrl}?cancelled=true`,
    // Pre-fill email if they have one
    customer_update: { address: 'auto' },
    allow_promotion_codes: true,
  })

  return session.url!
}

// ---------------------------------------------------------------------------
// createPortalSession
// Lets existing subscribers manage their subscription (cancel, update card,
// download invoices) without us building any of that UI.
// ---------------------------------------------------------------------------
export async function createPortalSession(
  orgId:     string,
  returnUrl:  string,
): Promise<string> {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } })

  if (!org.billingCustomerId) {
    throw new Error('Organisation has no Stripe customer — they need to subscribe first.')
  }

  const session = await stripe.billingPortal.sessions.create({
    customer:    org.billingCustomerId,
    return_url:  returnUrl,
  })

  return session.url
}

// ---------------------------------------------------------------------------
// applySubscriptionUpdate
// Called from the webhook handler for both checkout.session.completed and
// customer.subscription.updated. Syncs Stripe state → our DB.
// ---------------------------------------------------------------------------
export async function applySubscriptionUpdate(
  subscription: import('stripe').Stripe.Subscription,
): Promise<void> {
  const orgId = subscription.metadata?.orgId
  if (!orgId) {
    console.warn('[billing] subscription has no orgId metadata, skipping', subscription.id)
    return
  }

  const priceId  = subscription.items.data[0]?.price.id
  const newTier  = priceId ? (tierFromPriceId(priceId) ?? 'FREE') : 'FREE'
  const isActive = subscription.status === 'active' || subscription.status === 'trialing'

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      planTier:           newTier,
      subscriptionId:     subscription.id,
      subscriptionItemId: subscription.items.data[0]?.id ?? null,
      currentPeriodEnd:   new Date((subscription as any).current_period_end * 1000),
      billingCustomerId:  subscription.customer as string,
      // Clear grace period on any successful payment/renewal
      gracePeriodEndsAt:  isActive ? null : undefined,
    },
  })
}

// ---------------------------------------------------------------------------
// enterGracePeriod
// Called on invoice.payment_failed. Gives the org GRACE_PERIOD_DAYS days
// of read-only access before full restriction.
// ---------------------------------------------------------------------------
export async function enterGracePeriod(customerId: string): Promise<void> {
  const gracePeriodEndsAt = new Date()
  gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + GRACE_PERIOD_DAYS)

  await prisma.organization.updateMany({
    where: { billingCustomerId: customerId },
    data:  { gracePeriodEndsAt },
  })
}

// ---------------------------------------------------------------------------
// isInGracePeriod — pure helper, no DB call
// ---------------------------------------------------------------------------
export function isInGracePeriod(gracePeriodEndsAt: Date | null): boolean {
  if (!gracePeriodEndsAt) return false
  return gracePeriodEndsAt > new Date()
}
