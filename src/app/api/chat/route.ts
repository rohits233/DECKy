import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function POST(request: Request) {
  try {
    const { messages, slides, phase, documents } = await request.json();
    
    const systemPrompt = phase === 'content' 
      ? `You are an expert presentation builder AI creating consultant-grade slide decks. You MUST preserve ALL existing slides unless explicitly told to delete them.

CURRENT DECK STATE:
Total slides: ${slides.length}
${slides.map((s: any, i: number) => `Slide ${i+1}: "${s.title}" - ${s.content.substring(0, 50)}...`).join('\n')}

CRITICAL RULES FOR EDITING:
1. When user says "change slide X" or "edit slide X" → Return ALL ${slides.length} slides, with ONLY slide X modified
2. When user says "delete slide X" → Return ALL slides EXCEPT slide X (${slides.length - 1} slides)
3. When user says "add N slides" → Return ONLY the N NEW slides with action:"add"
4. When user says "create N slides" → Replace everything, return N slides with action:"create"

CONTENT QUALITY STANDARDS:
- Write detailed, professional content (3-5 bullet points per slide minimum)
- Use business language and consultant-style phrasing
- Include specific examples, metrics, or data points where relevant
- Make content actionable and insightful
- Each bullet should be a complete thought (10-20 words)
- Avoid generic statements - be specific and valuable

EXAMPLE GOOD CONTENT:
Title: "Market Opportunity Analysis"
Content: "• Total addressable market estimated at $45B with 23% CAGR through 2027
• Primary customer segments include enterprise (60%) and mid-market (30%) organizations
• Key competitive advantages: proprietary technology, established partnerships, and 40% cost reduction
• Go-to-market strategy focuses on direct sales and strategic channel partnerships
• Expected market penetration of 2.5% within 18 months based on pilot program results"

EXAMPLE - User says "change slide 3 title to Risk Management":
You MUST return ALL ${slides.length} slides in the slides array, with only slide 3's title changed.

RESPONSE FORMAT (JSON only):
{
  "message": "I've updated slide 3's title. All other slides remain unchanged.",
  "action": "update",
  "slides": [
    // ALL ${slides.length} SLIDES HERE, with modifications to slide 3 only
  ]
}

Each slide object MUST have this structure with DETAILED content:
{
  "title": "Professional Title (3-7 words)",
  "content": "• First detailed point with specifics, metrics, and context (minimum 15 words explaining the concept thoroughly)\\n• Second comprehensive point with data, examples, or case studies (minimum 15 words with actionable insights)\\n• Third strategic point with implications and recommendations (minimum 15 words showing business value)\\n• Fourth analytical point with supporting evidence or rationale (minimum 15 words demonstrating expertise)\\n• Fifth forward-looking point with next steps or future considerations (minimum 15 words providing clear direction)",
  "layout": "bullets|content|numbers|timeline|title|two-column",
  "icon": "📊|📈|💡|🎯|📅|💰|⚠️|✅|🚀|💼|🔍|📱|🌐|⚡|🎨",
  "color": "blue|indigo|purple|green|red|orange|pink|emerald"
}

MANDATORY: Every slide MUST have AT LEAST 4 bullet points. Each bullet MUST be AT LEAST 15 words long with specific details, not generic statements.`
      : `You are a presentation design expert. Apply visual styling to slides.

Current slides: ${slides.length} slides

DESIGN COMMANDS - Return ALL ${slides.length} slides with styling applied:
- "make it blue" → Set color:"blue" on ALL slides
- "add icons" → Add appropriate icons to ALL slides
- "use gradient backgrounds" → Set background:"gradient-blue" on ALL slides
- "make text bigger" → Set font_size:"large" on ALL slides

RESPONSE FORMAT (JSON only):
{
  "message": "I've applied blue theme to all ${slides.length} slides",
  "action": "update",
  "slides": [
    // ALL ${slides.length} SLIDES with styling properties updated
  ]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'system', content: 'CRITICAL: Generate DETAILED, PROFESSIONAL content. Each bullet point must be 15+ words with specific information, metrics, examples, or insights. NO generic or short statements.' },
        ...messages.map((m: any) => ({ role: m.role, content: m.content }))
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    let content = response.choices[0].message.content || '{}';
    
    console.log('=== AI RESPONSE ===');
    console.log(content);
    console.log('==================');
    
    const result = JSON.parse(content);
    
    if (!result.message) result.message = "I've updated your slides.";
    if (!result.action) result.action = "none";
    if (!result.slides) result.slides = [];
    
    // VALIDATION: Check if AI returned correct number of slides for update action
    if (result.action === 'update' && result.slides.length !== slides.length) {
      console.error(`ERROR: AI returned ${result.slides.length} slides but should return ${slides.length} for update action`);
      return NextResponse.json({
        message: "I had trouble with that. Can you try rephrasing? For edits, be specific like 'change slide 3 title to X'",
        action: 'none',
        slides: []
      });
    }
    
    console.log(`Action: ${result.action}, Slides returned: ${result.slides.length}, Expected: ${result.action === 'update' ? slides.length : 'varies'}`);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Chat error:', error);
    console.error('Error details:', error.message);
    
    return NextResponse.json({
      message: "I'm having trouble with that. Try being more specific.",
      action: 'none',
      slides: []
    });
  }
}
