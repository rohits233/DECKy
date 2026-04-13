// Stage 3: Knowledge Retrieval - fetch relevant chunks for a query

import type { RetrievedContext, PipelineContext } from '../../types';
import { supabase as defaultSupabase } from '@/lib/supabase';

export interface RetrievalInput {
  query: string;
  documentIds: string[];
  projectId: string;
  topK?: number;
}

export async function retrieve(
  input: RetrievalInput,
  _context: PipelineContext
): Promise<RetrievedContext> {
  const db = _context.supabase ?? defaultSupabase;
  const { documentIds, topK = 15 } = input;
  if (documentIds.length === 0) return { chunks: [] };

  const { data: chunks } = await db
    .from('document_chunks')
    .select('id, document_id, chunk_index, content, metadata')
    .in('document_id', documentIds)
    .order('chunk_index', { ascending: true })
    .limit(topK * 2); // fetch extra for simple scoring

  if (!chunks || chunks.length === 0) return { chunks: [] };

  // Simple relevance: prefer chunks containing query terms
  const terms = input.query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const scored = chunks.map((c) => {
    const text = (c.content as string).toLowerCase();
    const score = terms.reduce((s, t) => s + (text.includes(t) ? 1 : 0), 0);
    return {
      id: c.id,
      documentId: c.document_id,
      chunkIndex: c.chunk_index,
      content: c.content,
      metadata: c.metadata ?? {},
      score,
    };
  });

  const sorted = scored.sort((a, b) => b.score - a.score).slice(0, topK);

  return {
    chunks: sorted.map((s) => ({
      id: s.id,
      documentId: s.documentId,
      chunkIndex: s.chunkIndex,
      content: s.content,
      metadata: s.metadata,
      score: s.score,
    })),
  };
}
