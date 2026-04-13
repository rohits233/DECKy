import type { PlanTier } from '@prisma/client'

// ---------------------------------------------------------------------------
// Plan definitions — single source of truth for what each tier includes.
// Price IDs come from env so you can have separate test/live keys without
// code changes. Set these in your Stripe dashboard and copy the IDs.
// ---------------------------------------------------------------------------

export interface PlanDefinition {
  tier:           PlanTier
  name:           string
  priceId:        string | null  // null = FREE (no Stripe price)
  monthlyUsd:     number         // for display only — Stripe is authoritative
  deckLimit:      number | null  // null = unlimited
  memberLimit:    number | null
  apiAccess:      boolean
  customBranding: boolean
  ssoAccess:      boolean
  features:       string[]       // marketing bullets for the upgrade CTA
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  FREE: {
    tier:           'FREE',
    name:           'Free',
    priceId:        null,
    monthlyUsd:     0,
    deckLimit:      3,
    memberLimit:    1,
    apiAccess:      false,
    customBranding: false,
    ssoAccess:      false,
    features:       ['3 decks/month', '1 user', 'Decky watermark'],
  },
  STARTER: {
    tier:           'STARTER',
    name:           'Starter',
    priceId:        process.env.STRIPE_PRICE_STARTER!,
    monthlyUsd:     49,
    deckLimit:      50,
    memberLimit:    10,
    apiAccess:      true,
    customBranding: false,
    ssoAccess:      false,
    features:       ['50 decks/month', '10 members', 'API access (60 req/min)', 'No watermark'],
  },
  GROWTH: {
    tier:           'GROWTH',
    name:           'Growth',
    priceId:        process.env.STRIPE_PRICE_GROWTH!,
    monthlyUsd:     149,
    deckLimit:      null,
    memberLimit:    50,
    apiAccess:      true,
    customBranding: true,
    ssoAccess:      false,
    features:       ['Unlimited decks', '50 members', 'API access (600 req/min)', 'Custom branding'],
  },
  ENTERPRISE: {
    tier:           'ENTERPRISE',
    name:           'Enterprise',
    priceId:        process.env.STRIPE_PRICE_ENTERPRISE!,
    monthlyUsd:     499,
    deckLimit:      null,
    memberLimit:    null,
    apiAccess:      true,
    customBranding: true,
    ssoAccess:      true,
    features:       ['Unlimited everything', 'Unlimited members', 'SSO/SAML', 'SLA + dedicated support'],
  },
}

// Reverse lookup: Stripe price ID → PlanTier (used in webhook handler)
export function tierFromPriceId(priceId: string): PlanTier | null {
  const match = Object.values(PLANS).find(p => p.priceId === priceId)
  return match?.tier ?? null
}

export const GRACE_PERIOD_DAYS = 7
