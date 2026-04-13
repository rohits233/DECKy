// Stage 5: Slide Narrative Planning - structure and story arc

import type { InsightsResult, SlidePlan, SlideOutline, PipelineContext } from '../../types';

export interface PlanningInput {
  insights: InsightsResult;
  prompt?: string;
  contextChunks?: { content: string }[];
}

export async function planNarrative(
  input: PlanningInput,
  context: PipelineContext
): Promise<SlidePlan> {
  const insightSummary = input.insights.items
    .map((i) => `[${i.type}] ${i.content}`)
    .join('\n');

  const contextText = input.contextChunks?.map((c) => c.content).join('\n\n').slice(0, 4000) ?? '';
  const userGuidance = input.prompt ? `User guidance: ${input.prompt}\n\n` : '';

  const raw = JSON.parse(
    await context.ai.complete(
      [
        {
          role: 'system',
          content: 'Create a professional slide outline as JSON.',
        },
        {
          role: 'user',
          content: `${userGuidance}You are a consulting presentation strategist. Create a slide outline for a consultant-grade deck.

INSIGHTS:
${insightSummary}

${contextText ? `CONTEXT:\n${contextText}\n\n` : ''}

Create 5-8 slides with:
- Title slide
- Agenda/Context
- Key findings (can be 2-3 slides)
- "So what" / implications
- Recommendations
- Next steps / summary

RESPONSE FORMAT (JSON only):
{
  "slides": [
    {
      "title": "Slide Title",
      "purpose": "What this slide achieves",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "suggestedLayout": "title|bullets|content|numbers|timeline|two-column"
    }
  ]
}`,
        },
      ],
      { json: true, temperature: 0.4 }
    )
  );

  const slides: SlideOutline[] = (raw.slides ?? []).map((s: any) => ({
    title:           s.title           ?? 'Untitled',
    purpose:         s.purpose         ?? '',
    keyPoints:       s.keyPoints       ?? [],
    suggestedLayout: s.suggestedLayout ?? 'bullets',
  }));

  return { slides };
}
