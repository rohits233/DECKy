import { redirect } from 'next/navigation'
import { auth }     from '@/auth'
import { prisma }   from '@/lib/prisma'
import Link         from 'next/link'
import { PLANS }    from '@/lib/billing/plans'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.activeOrg) redirect('/onboarding')

  const orgId    = session.activeOrg.id
  const planTier = session.activeOrg.planTier
  const plan     = PLANS[planTier]

  const decks = await prisma.deck.findMany({
    where:   { orgId },
    orderBy: { createdAt: 'desc' },
    select: {
      id:             true,
      title:          true,
      description:    true,
      createdAt:      true,
      currentVersion: {
        select: { versionNum: true, snapshot: true },
      },
    },
  })

  // Usage this month for the deck-limit progress bar
  const now         = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const deckCount   = await prisma.usageEvent.aggregate({
    where: {
      orgId,
      eventType:  'DECK_CREATED',
      createdAt:  { gte: periodStart },
    },
    _sum: { quantity: true },
  })
  const usedDecks  = deckCount._sum.quantity ?? 0
  const atLimit    = plan.deckLimit !== null && usedDecks >= plan.deckLimit

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold">Decks</h1>
          {plan.deckLimit !== null && (
            <p className="text-[13px] text-white/40 mt-0.5">
              {usedDecks} / {plan.deckLimit} created this month
            </p>
          )}
        </div>
        {atLimit ? (
          <Link
            href="/dashboard/billing"
            className="px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md text-[13px] font-medium hover:bg-amber-500/30 transition"
          >
            Upgrade to create more
          </Link>
        ) : (
          <Link
            href="/dashboard/decks/new"
            className="px-4 py-2 bg-white text-black rounded-md hover:bg-white/90 transition text-[13px] font-medium"
          >
            + New deck
          </Link>
        )}
      </div>

      {/* Deck grid */}
      {decks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 bg-white/[0.04] rounded-2xl flex items-center justify-center text-3xl mb-4">🗂</div>
          <h2 className="text-[17px] font-medium mb-2">No decks yet</h2>
          <p className="text-[14px] text-white/40 mb-6 max-w-xs">
            Generate your first AI-powered slide deck from a document or a prompt.
          </p>
          <Link
            href="/dashboard/decks/new"
            className="px-5 py-2.5 bg-white text-black rounded-md hover:bg-white/90 transition text-[14px] font-medium"
          >
            Create first deck
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map(deck => {
            const slideCount = Array.isArray((deck.currentVersion?.snapshot as { slides?: unknown[] } | null)?.slides)
              ? ((deck.currentVersion!.snapshot as { slides: unknown[] }).slides.length)
              : null

            return (
              <Link
                key={deck.id}
                href={`/dashboard/decks/${deck.id}`}
                className="group bg-white/[0.02] border border-white/[0.08] rounded-xl p-5 hover:bg-white/[0.04] hover:border-white/[0.14] transition space-y-3"
              >
                {/* Slide count badge */}
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 bg-white/[0.06] rounded-lg flex items-center justify-center text-[18px]">📊</div>
                  {slideCount !== null && (
                    <span className="text-[11px] text-white/30">{slideCount} slide{slideCount !== 1 ? 's' : ''}</span>
                  )}
                </div>

                <div>
                  <h3 className="text-[15px] font-semibold leading-snug line-clamp-2 group-hover:text-white transition">
                    {deck.title}
                  </h3>
                  {deck.description && (
                    <p className="text-[13px] text-white/40 mt-1 line-clamp-2">{deck.description}</p>
                  )}
                </div>

                <p className="text-[12px] text-white/25">
                  {deck.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
