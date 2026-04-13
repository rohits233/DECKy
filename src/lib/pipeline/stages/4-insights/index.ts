// Stage 4: Insight Extraction - structured findings from documents

import type { InsightsResult, Insight, PipelineContext } from '../../types';

export async function extractInsights(
  chunkedDocs: { documentId: string; chunks: { id: string; content: string }[] }[],
  context: PipelineContext
): Promise<InsightsResult> {
  const allChunks = chunkedDocs.flatMap((d) =>
    d.chunks.map((c) => ({ ...c, documentId: d.documentId }))
  );
  const combined = allChunks
    .map((c) => `[Chunk ${c.id}]\n${c.content}`)
    .join('\n\n---\n\n');

  const raw = JSON.parse(
    await context.ai.complete(
      [
        {
          role: 'system',
          content: 'Extract insights as JSON. Be specific and professional.',
        },
        {
          role: 'user',
          content: `You are a consulting analyst. Extract structured insights from this document content.

CONTENT:
${combined.slice(0, 12000)}

Extract:
1. Key findings (2-5)
2. Notable quotes (1-3, verbatim)
3. Recommendations (2-4)
4. Risks or concerns (1-3)
5. Opportunities (1-3)

RESPONSE FORMAT (JSON only):
{
  "findings": ["finding 1", "finding 2"],
  "quotes": [{"text": "exact quote", "context": "brief context"}],
  "recommendations": ["rec 1", "rec 2"],
  "risks": ["risk 1"],
  "opportunities": ["opp 1"]
}`,
        },
      ],
      { json: true, temperature: 0.3 }
    )
  );

  const items: Insight[] = [];
  (raw.findings        ?? []).forEach((c: string) =>
    items.push({ type: 'finding',        content: c,                                evidence: [], confidence: 0.9  }));
  (raw.quotes          ?? []).forEach((q: { text?: string; context?: string }) =>
    items.push({ type: 'quote',          content: `${q.text} (${q.context ?? ''})`, evidence: [], confidence: 0.95 }));
  (raw.recommendations ?? []).forEach((c: string) =>
    items.push({ type: 'recommendation', content: c,                                evidence: [], confidence: 0.85 }));
  (raw.risks           ?? []).forEach((c: string) =>
    items.push({ type: 'risk',           content: c,                                evidence: [], confidence: 0.85 }));
  (raw.opportunities   ?? []).forEach((c: string) =>
    items.push({ type: 'opportunity',    content: c,                                evidence: [], confidence: 0.8  }));

  return { items };
}
