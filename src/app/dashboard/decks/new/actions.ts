'use server'

import { redirect }        from 'next/navigation'
import { auth }            from '@/auth'
import { prisma }          from '@/lib/prisma'
import { PLANS }           from '@/lib/billing/plans'
import { defaultProvider } from '@/lib/pipeline/ai'
import { checkAndSendUsageAlert } from '@/lib/alerts/usage-alerts'

// ---------------------------------------------------------------------------
// createDeckAction
//
// Called from the new-deck form. Runs a lightweight AI generation directly
// (no document ingestion — that requires upload flow). The result is stored
// as a DeckVersion so the full versioning model is in use from day one.
// ---------------------------------------------------------------------------
export async function createDeckAction(formData: FormData) {
  const session = await auth()
  if (!session?.activeOrg) redirect('/auth/login')

  const orgId  = session.activeOrg.id
  const userId = session.user!.id!
  const plan   = PLANS[session.activeOrg.planTier]

  // Enforce deck limit
  if (plan.deckLimit !== null) {
    const now         = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const used        = await prisma.usageEvent.aggregate({
      where:  { orgId, eventType: 'DECK_CREATED', createdAt: { gte: periodStart } },
      _sum:   { quantity: true },
    })
    if ((used._sum.quantity ?? 0) >= plan.deckLimit) {
      return { error: `You've used all ${plan.deckLimit} decks for this month. Upgrade to continue.` }
    }
  }

  const title  = (formData.get('title') as string).trim()
  const prompt = (formData.get('prompt') as string | null)?.trim() ?? ''
  const slideCountRaw = parseInt(formData.get('slideCount') as string) || 8
  const slideCount    = Math.min(Math.max(slideCountRaw, 3), 20)

  if (!title) return { error: 'Title is required.' }

  // Generate slides via AI
  const ai = defaultProvider()
  const systemPrompt = `You are a professional presentation designer. Generate a structured slide deck as JSON.`

  const userPrompt = `Create a ${slideCount}-slide presentation titled "${title}".
${prompt ? `Additional context: ${prompt}` : ''}

Return a JSON object with this exact shape:
{
  "slides": [
    {
      "title": "string (3-7 words)",
      "subtitle": "string (one strong sentence, 15-25 words, expanding on the title)",
      "layout": "title" | "bullets" | "numbers" | "timeline" | "two-column" | "content" | "image-text",
      "content": "string (bullet points separated by \\n — see rules below)",
      "icon": "single emoji",
      "color": "blue" | "indigo" | "purple" | "green" | "red" | "orange"
    }
  ]
}

Rules:
- First slide must be layout "title"
- Vary layouts meaningfully: use "numbers" for stats/metrics, "timeline" for sequences/roadmaps, "two-column" for comparisons, "image-text" for visual storytelling, "bullets" for key points
- For ALL content fields: write 5-6 bullet points, each 25-40 words, specific and data-driven. Prefix each with "• "
- For "numbers" layout: each bullet must start with a specific metric or percentage (e.g. "• 47% increase in…")
- For "timeline" layout: each bullet is a named phase or milestone (e.g. "• Q1 2024: Launched beta…")
- If source context is provided, extract real numbers, quotes, and facts — do NOT invent data
- If no source context, write substantive, credible filler content that a consultant would use — include plausible ranges, percentages, and named concepts
- Every slide must feel full and authoritative — no sparse 2-word bullets
- Return ONLY valid JSON, no markdown fences`

  let snapshot: { slides: object[] }
  try {
    const raw = await ai.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      { json: true, temperature: 0.4 }
    )
    snapshot = JSON.parse(raw)
    if (!Array.isArray(snapshot?.slides)) throw new Error('Invalid AI response shape')
  } catch {
    return { error: 'AI generation failed. Please try again.' }
  }

  // Persist deck + first version in a transaction
  const deck = await prisma.$transaction(async tx => {
    const d = await tx.deck.create({
      data: { orgId, ownerId: userId, title },
    })

    const version = await tx.deckVersion.create({
      data: {
        deckId:      d.id,
        orgId,
        versionNum:  1,
        snapshot,
        createdById: userId,
      },
    })

    return tx.deck.update({
      where: { id: d.id },
      data:  { currentVersionId: version.id },
    })
  })

  // Usage metering (non-fatal)
  await prisma.usageEvent.create({
    data: {
      orgId,
      userId,
      eventType:      'DECK_CREATED',
      resourceId:     deck.id,
      quantity:       snapshot.slides.length,
      idempotencyKey: `DECK_CREATED:${deck.id}`,
      metadata:       { slides: snapshot.slides.length, source: 'dashboard' },
    },
  }).catch(() => {})

  // Usage alert check (non-fatal, fire-and-forget)
  checkAndSendUsageAlert(orgId).catch(() => {})

  redirect(`/dashboard/decks/${deck.id}`)
}
