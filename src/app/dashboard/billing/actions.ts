'use server'

import { redirect }                               from 'next/navigation'
import { auth }                                   from '@/auth'
import { createCheckoutSession, createPortalSession } from '@/lib/billing/subscription'
import type { PlanTier }                          from '@prisma/client'

const BILLING_URL = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`

export async function checkoutAction(targetTier: Exclude<PlanTier, 'FREE'>) {
  const session = await auth()
  if (!session?.activeOrg) throw new Error('Not authenticated')

  const url = await createCheckoutSession(session.activeOrg.id, targetTier, BILLING_URL)
  redirect(url)
}

export async function portalAction() {
  const session = await auth()
  if (!session?.activeOrg) throw new Error('Not authenticated')

  const url = await createPortalSession(session.activeOrg.id, BILLING_URL)
  redirect(url)
}
