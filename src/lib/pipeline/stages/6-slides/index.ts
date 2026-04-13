// Stage 6: Slide Generation - create full slide content from plan

import type {
  SlidePlan,
  GeneratedSlide,
  InsightsResult,
  RetrievedContext,
  PipelineContext,
} from '../../types';

export interface SlideGenInput {
  plan: SlidePlan;
  insights: InsightsResult;
  context?: RetrievedContext;
  projectTitle?: string;
}

export async function generateSlides(
  input: SlideGenInput,
  context: PipelineContext
): Promise<GeneratedSlide[]> {
  const insightText = input.insights.items.map((i) => `[${i.type}] ${i.content}`).join('\n');
  const contextText = input.context?.chunks.map((c) => c.content).join('\n\n').slice(0, 6000) ?? '';
  const outline = input.plan.slides
    .map((s, i) => `Slide ${i + 1}: ${s.title} (${s.suggestedLayout}) - ${s.keyPoints.join('; ')}`)
    .join('\n');

  const raw = JSON.parse(
    await context.ai.complete(
      [
        {
          role: 'system',
          content: 'Generate professional slide content as JSON.',
        },
        {
          role: 'user',
          content: `Generate consultant-grade slide content from this outline.

OUTLINE:
${outline}

INSIGHTS:
${insightText}

${contextText ? `SOURCE CONTEXT:\n${contextText}\n\n` : ''}

For EACH slide in the outline, produce:
- title: 3-7 words
- subtitle: one strong sentence (15-25 words) that expands on the title and previews the key insight
- content: 5-6 bullet points, each 25-40 words, specific and data-driven, prefixed with "• "
  - For numbers layout: each bullet must lead with a metric or percentage
  - For timeline layout: each bullet is a named phase (e.g. "Q1 2024: …")
  - For all layouts: write substantive, authoritative bullets — no vague 2-word items
- layout: one of bullets, content, numbers, timeline, title, two-column, image-text
- icon: one of 📊 📈 💡 🎯 📅 💰 ⚠️ ✅ 🚀 💼 🔍
- color: one of blue, indigo, purple, green, red, orange, emerald

Project title: ${input.projectTitle ?? 'Presentation'}

RESPONSE FORMAT (JSON only):
{
  "slides": [
    {
      "title": "Title",
      "subtitle": "One strong sentence expanding on the title and previewing the key insight.",
      "content": "• Bullet 1 with 25-40 words of specific detail\\n• Bullet 2 with 25-40 words of specific detail\\n• Bullet 3 with 25-40 words of specific detail\\n• Bullet 4 with 25-40 words of specific detail\\n• Bullet 5 with 25-40 words of specific detail",
      "layout": "bullets",
      "icon": "📊",
      "color": "blue"
    }
  ]
}`,
        },
      ],
      { json: true, temperature: 0.4 }
    )
  );

  return (raw.slides ?? []).map((s: any) => ({
    title:    s.title    ?? 'Untitled',
    subtitle: s.subtitle ?? '',
    content:  s.content  ?? '',
    layout:   s.layout   ?? 'content',
    icon:     s.icon     ?? '📄',
    color:    s.color    ?? 'indigo',
  }));
}
