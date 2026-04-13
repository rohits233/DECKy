import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { openai } from '@/lib/openai';
import { toFile } from 'openai/uploads';

const MAX_BYTES = 25 * 1024 * 1024; // Whisper API hard limit

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file     = formData.get('file')      as File   | null;
    const projectId = formData.get('projectId') as string | null;

    if (!file || !projectId) {
      return NextResponse.json({ error: 'file and projectId required' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File must be under 25 MB (Whisper API limit)' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Store raw video/audio in the recordings bucket
    const videoPath = `${user.id}/${projectId}/${file.name}`;
    const { error: storageErr } = await supabase.storage
      .from('recordings')
      .upload(videoPath, buffer, { contentType: file.type, upsert: true });
    if (storageErr) throw new Error(storageErr.message);

    // 2. Transcribe with OpenAI Whisper
    const whisperFile = await toFile(buffer, file.name, { type: file.type });
    const transcription = await openai.audio.transcriptions.create({
      file:  whisperFile,
      model: 'whisper-1',
    });
    const transcriptText = transcription.text;

    // 3. Save transcript as a document so the pipeline can ingest it
    const transcriptFilename = `transcript_${file.name.replace(/\.[^.]+$/, '')}.txt`;
    const transcriptPath     = `${user.id}/${projectId}/${transcriptFilename}`;

    await supabase.storage
      .from('documents')
      .upload(transcriptPath, Buffer.from(transcriptText, 'utf-8'), {
        contentType: 'text/plain',
        upsert: true,
      });

    const { data: doc, error: insertErr } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        filename:   transcriptFilename,
        file_path:  transcriptPath,
        file_type:  'text/plain',
        status:     'ready',
        type:       'transcript',
        content:    transcriptText,
      })
      .select('id, filename, status, type')
      .single();

    if (insertErr) throw new Error(insertErr.message);

    return NextResponse.json({
      document: doc,
      message:  'Video transcribed and stored as a transcript document.',
    });
  } catch (error: any) {
    console.error('Video upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Video upload failed' },
      { status: 500 },
    );
  }
}
