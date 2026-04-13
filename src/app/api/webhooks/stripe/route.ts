// POST /api/webhooks/stripe
//
// Receives Stripe events and keeps our DB in sync with subscription state.
// Stripe retries failed webhooks with exponential backoff for up to 3 days,
// so every handler here must be idempotent (safe to receive twice).
//
// Events handled:
//   checkout.session.completed    → org subscribed, flip planTier
//   customer.subscription.updated → plan changed / renewed / cancelled
//   invoice.payment_failed        → enter grace period (read-only for 7 days)
//
// Stripe signature verification is mandatory — reject anything without it.
// Raw body is required for HMAC; Next.js must NOT parse the body first.

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe }                  from '@/lib/billing/client'
import { applySubscriptionUpdate, enterGracePeriod } from '@/lib/billing/subscription'
import { prisma }                  from '@/lib/prisma'

// Next.js App Router: disable body parsing so we get the raw bytes for HMAC
export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Handlers — one function per Stripe event type.
// Keep each handler pure: accept the Stripe object, update the DB, return.
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // session.subscription is the new sub ID — fetch it for full details
  if (!session.subscription) return

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  )

  // applySubscriptionUpdate handles the full DB sync (planTier, subscriptionId, etc.)
  await applySubscriptionUpdate(subscription)

  // If orgId wasn't on the subscription metadata, fall back to session metadata
  if (!subscription.metadata?.orgId && session.metadata?.orgId) {
    await stripe.subscriptions.update(subscription.id, {
      metadata: { orgId: session.metadata.orgId },
    })
    // Re-apply now that metadata is set
    const updated = await stripe.subscriptions.retrieve(subscription.id)
    await applySubscriptionUpdate(updated)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  await applySubscriptionUpdate(subscription)

  // If subscription is cancelled (at_period_end or immediately), downgrade to FREE
  if (subscription.status === 'canceled') {
    const orgId = subscription.metadata?.orgId
    if (orgId) {
      await prisma.organization.update({
        where: { id: orgId },
        data: {
          planTier:           'FREE',
          subscriptionId:     null,
          subscriptionItemId: null,
          currentPeriodEnd:   null,
          gracePeriodEndsAt:  null,
        },
      })
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // invoice.customer is the Stripe customer ID
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id

  if (!customerId) return

  await enterGracePeriod(customerId)

  // Optional: send an email via Resend here.
  // The org's billing contact email can be fetched from the Stripe customer.
  // We skip this for now but the hook is here.
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const sig    = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !secret) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header or STRIPE_WEBHOOK_SECRET' },
      { status: 400 }
    )
  }

  // Read raw body — must be Buffer for Stripe's HMAC verification
  const rawBody = Buffer.from(await req.arrayBuffer())

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret)
  } catch (err) {
    // Bad signature — could be a spoofed request or wrong webhook secret
    const msg = err instanceof Error ? err.message : 'Signature verification failed'
    console.error('[stripe-webhook] signature failed:', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Route to the right handler
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      // Acknowledge but don't process other events — Stripe expects 200
      default:
        break
    }

    return NextResponse.json({ received: true, type: event.type })

  } catch (err) {
    // Return 500 so Stripe will retry the event
    const msg = err instanceof Error ? err.message : 'Handler error'
    console.error(`[stripe-webhook] handler error for ${event.type}:`, msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
