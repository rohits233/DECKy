// Stateless file-to-text extractor.
// Accepts a single file via multipart form, returns { text: string }.
// Used by the new-deck page to inject document context into the AI prompt.

import { NextResponse }  from 'next/server';
import { auth }          from '@/auth';
import { parsePdf }      from '@/lib/pipeline/stages/parsers/pdf';
import { parseDocx }     from '@/lib/pipeline/stages/parsers/docx';
import { parseText }     from '@/lib/pipeline/stages/parsers/text';
import { openai }        from '@/lib/openai';
import { toFile }        from 'openai/uploads';

const AUDIO_VIDEO_TYPES = /\.(mp4|mov|webm|m4a|mp3|wav|ogg)$/i;
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File must be under 25 MB' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';

    if (AUDIO_VIDEO_TYPES.test(file.name)) {
      // Transcribe audio/video with Whisper
      const whisperFile = await toFile(buffer, file.name, { type: file.type });
      const result = await openai.audio.transcriptions.create({
        file:  whisperFile,
        model: 'whisper-1',
      });
      text = result.text;
    } else if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) {
      const result = await parsePdf(buffer);
      text = result.text;
    } else if (
      file.type.includes('word') ||
      file.type.includes('document') ||
      /\.(docx?|doc)$/i.test(file.name)
    ) {
      text = await parseDocx(buffer);
    } else {
      text = parseText(buffer);
    }

    return NextResponse.json({ text: text.trim() });
  } catch (error: any) {
    console.error('Extract error:', error);
    return NextResponse.json(
      { error: error.message || 'Extraction failed' },
      { status: 500 },
    );
  }
}
