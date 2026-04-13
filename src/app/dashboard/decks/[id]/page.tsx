import { notFound, redirect } from 'next/navigation'
import { auth }                from '@/auth'
import { prisma }              from '@/lib/prisma'
import Link                    from 'next/link'
import { DeckViewer }          from './DeckViewer'

export default async function DeckPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.activeOrg) redirect('/auth/login')

  const deck = await prisma.deck.findUnique({
    where:  { id: params.id },
    select: {
      id:          true,
      orgId:       true,
      title:       true,
      description: true,
      createdAt:   true,
      currentVersion: {
        select: {
          id:         true,
          versionNum: true,
          snapshot:   true,
          createdAt:  true,
        },
      },
    },
  })

  // Tenant isolation + not-found
  if (!deck || deck.orgId !== session.activeOrg.id) notFound()

  const slides = (deck.currentVersion?.snapshot as { slides?: Slide[] } | null)?.slides ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-[13px] text-white/40 hover:text-white/70 transition">
            ← Decks
          </Link>
          <h1 className="text-[24px] font-semibold mt-2">{deck.title}</h1>
          <p className="text-[13px] text-white/40 mt-0.5">
            {slides.length} slide{slides.length !== 1 ? 's' : ''} ·{' '}
            {deck.createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {deck.currentVersion && ` · v${deck.currentVersion.versionNum}`}
          </p>
        </div>

        {/* Export button — calls existing /api/export/pptx */}
        <ExportButton deckId={deck.id} title={deck.title} slides={slides} />
      </div>

      {slides.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <p className="text-white/40 text-[14px]">This deck has no slides yet.</p>
        </div>
      ) : (
        <DeckViewer slides={slides} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Slide {
  title:    string
  subtitle?: string
  layout:   string
  content:  string
  icon:     string
  color:    string
}

// ---------------------------------------------------------------------------
// Export button — client component kept small and inlined
// ---------------------------------------------------------------------------
function ExportButton({ deckId, title, slides }: { deckId: string; title: string; slides: Slide[] }) {
  // We forward to a Client Component for the fetch call
  return <ExportButtonClient deckId={deckId} title={title} slides={slides} />
}

import { ExportButtonClient } from './ExportButtonClient'
