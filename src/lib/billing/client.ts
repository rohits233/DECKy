import Stripe from 'stripe'

// Single Stripe client — all billing code imports from here, never from 'stripe' directly.
// Lazily instantiated so the build doesn't fail when STRIPE_SECRET_KEY is absent.
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
      typescript:  true,
    })
  }
  return _stripe
}

// Convenience re-export for code that wants the old `stripe.*` call pattern.
// This will throw at call time (not module load time) if the key is missing.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
