// Stage 7: Presenter Script Generation - speaker notes and recommendations

import type { GeneratedSlide, PresenterScript, PipelineContext } from '../../types';

export async function generatePresenterScripts(
  slides: GeneratedSlide[],
  context: PipelineContext
): Promise<PresenterScript[]> {
  const slidesText = slides
    .map((s, i) => `Slide ${i + 1} (${s.title}):\n${s.content}`)
    .join('\n\n---\n\n');

  const raw = JSON.parse(
    await context.ai.complete(
      [
        {
          role: 'system',
          content: 'Generate presenter scripts as JSON.',
        },
        {
          role: 'user',
          content: `Generate presenter scripts for this slide deck.

SLIDES:
${slidesText}

For each slide provide:
1. speakerNotes: 2-4 sentences the presenter can say
2. talkingPoints: 3-5 short bullet reminders
3. suggestedDuration: seconds (30-90 typical)
4. transitionCue: one sentence to move to next slide
5. anticipatedQuestions: 1-2 likely Q&A pairs

RESPONSE FORMAT (JSON only):
{
  "scripts": [
    {
      "speakerNotes": "Full script text...",
      "talkingPoints": ["Point 1", "Point 2"],
      "suggestedDuration": 60,
      "transitionCue": "Now let's move to...",
      "anticipatedQuestions": [{"q": "Question?", "a": "Answer"}]
    }
  ]
}`,
        },
      ],
      { json: true, temperature: 0.4 }
    )
  );

  const scripts = raw.scripts ?? [];

  return slides.map((slide, i) => {
    const s = scripts[i] ?? {};
    return {
      slideId:              `slide-${i}`,
      slideIndex:           i,
      speakerNotes:         s.speakerNotes         ?? '',
      talkingPoints:        s.talkingPoints        ?? [],
      suggestedDuration:    s.suggestedDuration    ?? 45,
      transitionCue:        s.transitionCue,
      anticipatedQuestions: s.anticipatedQuestions ?? [],
    };
  });
}
