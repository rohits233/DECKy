// Pipeline orchestrator - runs full or partial pipeline

import type { PipelineContext } from './types';
import { ingestDocument } from './stages/1-ingestion';
import { chunkDocument } from './stages/2-chunking';
import { retrieve } from './stages/3-retrieval';
import { extractInsights } from './stages/4-insights';
import { planNarrative } from './stages/5-planning';
import { generateSlides } from './stages/6-slides';
import { generatePresenterScripts } from './stages/7-scripts';
import { defaultProvider, createProvider, type ProviderName } from './ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '@/lib/supabase';

export interface PipelineInput {
  documentIds: string[];
  documentBuffers?: Map<string, { buffer: Buffer; fileName: string; mimeType: string }>;
  projectId: string;
  projectTitle?: string;
  userId: string;
  prompt?: string;
  generateScripts?: boolean;
  supabase?: SupabaseClient;
  // AI provider override — defaults to DECKY_AI_PROVIDER env var (fallback: openai)
  aiProvider?: ProviderName;
  aiModel?: string;
}

export interface PipelineResult {
  slides: { title: string; content: string; layout: string; icon: string; color: string }[];
  scripts?: { speakerNotes: string; talkingPoints: string[]; suggestedDuration: number }[];
  insights: { type: string; content: string }[];
  jobId?: string;
}

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const db = input.supabase ?? defaultSupabase;
  const ai = input.aiProvider
    ? createProvider(input.aiProvider, { model: input.aiModel })
    : defaultProvider();

  const ctx: PipelineContext = {
    projectId: input.projectId,
    userId: input.userId,
    supabase: db,
    ai,
  };

  // Create job record
  const { data: job } = await db
    .from('pipeline_jobs')
    .insert({
      project_id: input.projectId,
      type: 'full_pipeline',
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  ctx.jobId = job?.id;

  try {
    const ingestedDocs: Awaited<ReturnType<typeof ingestDocument>>[] = [];
    const chunkedDocs: { documentId: string; chunks: { id: string; content: string }[] }[] = [];

    // 1. Ingest documents (from buffers or fetch from storage)
    for (const docId of input.documentIds) {
      let ingested;

      if (input.documentBuffers?.has(docId)) {
        const buf = input.documentBuffers.get(docId)!;
        ingested = await ingestDocument(
          {
            buffer: buf.buffer,
            fileName: buf.fileName,
            mimeType: buf.mimeType,
            documentId: docId,
          },
          ctx
        );
      } else {
        const { data: doc } = await db
          .from('documents')
          .select('file_path, filename, file_type, content')
          .eq('id', docId)
          .single();

        if (!doc) continue;

        let buffer: Buffer;
        if (doc.content) {
          ingested = {
            id: docId,
            content: doc.content,
            metadata: { type: 'research' as const, fileName: doc.filename },
          };
        } else {
          const { data: fileData } = await db.storage
            .from('documents')
            .download(doc.file_path);

          if (!fileData) continue;
          buffer = Buffer.from(await fileData.arrayBuffer());
          ingested = await ingestDocument(
            {
              buffer,
              fileName: doc.filename,
              mimeType: doc.file_type || 'text/plain',
              documentId: docId,
            },
            ctx
          );
        }
      }

      ingestedDocs.push(ingested);

      // 2. Chunk (and store chunks)
      const chunked = await chunkDocument(ingested, ctx);
      chunkedDocs.push({
        documentId: chunked.documentId,
        chunks: chunked.chunks.map((c) => ({ id: c.id, content: c.content })),
      });
    }

    if (ingestedDocs.length === 0) {
      throw new Error('No documents could be ingested');
    }

    // Update document status
    for (const docId of input.documentIds) {
      await db
        .from('documents')
        .update({ status: 'ready', processed_at: new Date().toISOString() })
        .eq('id', docId);
    }

    // 3. Retrieve context
    const retrieval = await retrieve(
      {
        query: 'key findings recommendations insights',
        documentIds: input.documentIds,
        projectId: input.projectId,
        topK: 15,
      },
      ctx
    );

    // 4. Extract insights
    const insights = await extractInsights(chunkedDocs, ctx);

    // Store insights in DB
    for (const item of insights.items) {
      await db.from('insights').insert({
        project_id: input.projectId,
        type: item.type,
        content: item.content,
        evidence: item.evidence,
        confidence: item.confidence,
      });
    }

    // 5. Plan narrative
    const plan = await planNarrative(
      {
        insights,
        prompt: input.prompt,
        contextChunks: retrieval.chunks,
      },
      ctx
    );

    // 6. Generate slides
    const slides = await generateSlides(
      {
        plan,
        insights,
        context: retrieval,
        projectTitle: input.projectTitle,
      },
      ctx
    );

    // 7. Generate presenter scripts (optional)
    let scripts: { speakerNotes: string; talkingPoints: string[]; suggestedDuration: number }[] | undefined;
    if (input.generateScripts !== false) {
      const scriptResults = await generatePresenterScripts(slides, ctx);
      scripts = scriptResults.map((s) => ({
        speakerNotes: s.speakerNotes,
        talkingPoints: s.talkingPoints,
        suggestedDuration: s.suggestedDuration,
      }));
    }

    await db
      .from('pipeline_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: { slidesCount: slides.length },
      })
      .eq('id', ctx.jobId);

    return {
      slides,
      scripts,
      insights: insights.items.map((i) => ({ type: i.type, content: i.content })),
      jobId: ctx.jobId,
    };
  } catch (err) {
    await db
      .from('pipeline_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Unknown error',
      })
      .eq('id', ctx.jobId);

    throw err;
  }
}
