import { NextResponse } from 'next/server';
import { parseDocument, generateSlidesFromContent } from '@/lib/documentParser';
import { openai } from '@/lib/openai';

export async function POST(request: Request) {
  try {
    const { content, fileName } = await request.json();
    
    const parsed = await parseDocument(content, fileName);
    
    // Use AI to enhance the content and create professional slides
    const aiPrompt = `You are a professional presentation consultant. Transform this document content into consultant-grade presentation slides.

DOCUMENT CONTENT:
${parsed.sections.map(s => `${s.title}:\n${s.content.join('\n')}`).join('\n\n')}

REQUIREMENTS:
- Create 5-8 professional slides from this content
- Each slide must have 4-5 detailed bullet points
- Each bullet must be 15-25 words with specific information, metrics, or insights
- Use business language and consultant-style phrasing
- Make content actionable and valuable
- Include relevant data points or examples where applicable

RESPONSE FORMAT (JSON only):
{
  "slides": [
    {
      "title": "Professional Title (3-7 words)",
      "content": "• First comprehensive point with specific details and context (15-25 words)\\n• Second detailed point with metrics, examples, or data (15-25 words)\\n• Third strategic point with actionable insights (15-25 words)\\n• Fourth analytical point with supporting evidence (15-25 words)\\n• Fifth forward-looking point with recommendations (15-25 words)",
      "layout": "bullets|content|numbers|timeline|title|two-column",
      "icon": "📊|📈|💡|🎯|📅|💰|⚠️|✅|🚀|💼|🔍",
      "color": "blue|indigo|purple|green|red|orange|emerald"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional presentation consultant creating detailed, high-quality slide content.' },
        { role: 'user', content: aiPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4
    });

    const result = JSON.parse(response.choices[0].message.content || '{"slides":[]}');
    
    return NextResponse.json({ slides: result.slides || [] });
  } catch (error: any) {
    console.error('Document parsing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse document' },
      { status: 500 }
    );
  }
}
