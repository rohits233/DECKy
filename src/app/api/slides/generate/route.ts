import { NextResponse } from 'next/server';
import { generateSlideContent } from '@/lib/openai';

export async function POST(request: Request) {
  try {
    const { prompt, context } = await request.json();
    
    console.log('Generating slide with prompt:', prompt);
    
    const content = await generateSlideContent(prompt, context);
    
    return NextResponse.json({ content });
  } catch (error: any) {
    console.error('Slide generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    );
  }
}
