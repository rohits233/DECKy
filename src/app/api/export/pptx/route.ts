import { NextResponse } from 'next/server';
import pptxgen from 'pptxgenjs';

export async function POST(request: Request) {
  try {
    const { slides, projectTitle } = await request.json();

    const pptx = new pptxgen();

    slides.forEach((slide: any) => {
      const pptSlide = pptx.addSlide();

      // Add title
      pptSlide.addText(slide.title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 1,
        fontSize: 32,
        bold: true,
        color: '1F2937',
      });

      // Add content
      pptSlide.addText(slide.content, {
        x: 0.5,
        y: 1.8,
        w: 9,
        h: 4.5,
        fontSize: 18,
        color: '374151',
        valign: 'top',
      });

      if (slide.presenter_notes) {
        pptSlide.addNotes(slide.presenter_notes);
      }

      // Add slide number
      pptSlide.addText(`${slide.order + 1}`, {
        x: 9.5,
        y: 7,
        w: 0.5,
        h: 0.3,
        fontSize: 12,
        color: '9CA3AF',
        align: 'right',
      });
    });

    // Generate the file as base64
    const pptxData = await pptx.write({ outputType: 'base64' });

    return NextResponse.json({ 
      data: pptxData,
      filename: `${projectTitle}.pptx`
    });
  } catch (error: any) {
    console.error('PowerPoint export error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export PowerPoint' },
      { status: 500 }
    );
  }
}
