import { redirect }    from 'next/navigation'
import { auth }        from '@/auth'
import { prisma }      from '@/lib/prisma'
import { PLANS }       from '@/lib/billing/plans'
import { ApiKeysClient } from './ApiKeysClient'

export default async function ApiKeysPage() {
  const session = await auth()
  if (!session?.activeOrg) redirect('/auth/login')

  const role = session.activeOrg.role
  if (role !== 'OWNER' && role !== 'ADMIN') redirect('/dashboard')

  const plan = PLANS[session.activeOrg.planTier]
  if (!plan.apiAccess) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-[26px] font-semibold">API Keys</h1>
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-8 text-center space-y-3">
          <p className="text-[15px] font-medium">API access requires Starter plan or above</p>
          <p className="text-[13px] text-white/40">Upgrade to generate decks programmatically via the REST API.</p>
          <a href="/dashboard/billing"
            className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded-md text-[13px] font-medium hover:bg-blue-700 transition">
            View plans →
          </a>
        </div>
      </div>
    )
  }

  const keys = await prisma.apiKey.findMany({
    where:   { orgId: session.activeOrg.id, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id:            true,
      name:          true,
      keyPrefix:     true,
      tier:          true,
      requestsPerMin: true,
      lastUsedAt:    true,
      createdAt:     true,
    },
  })

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold">API Keys</h1>
        <p className="text-[14px] text-white/50 mt-1">
          Keys authenticate requests to <code className="text-white/60 bg-white/[0.06] px-1 py-0.5 rounded text-[12px]">POST /api/v1/decks</code>.
          Each key is shown once — store it securely.
        </p>
      </div>

      <ApiKeysClient keys={keys} />
    </div>
  )
}
