// Stage 2: Chunking - split documents into semantic chunks for retrieval

import type { IngestedDocument, DocumentChunk, ChunkedDocument, PipelineContext } from '../../types';
import { supabase as defaultSupabase } from '@/lib/supabase';

const CHUNK_SIZE = 800; // chars, ~200 tokens
const CHUNK_OVERLAP = 100;

export async function chunkDocument(
  doc: IngestedDocument,
  context: PipelineContext
): Promise<ChunkedDocument> {
  const db = context.supabase ?? defaultSupabase;
  const sections = splitIntoChunks(doc.content, CHUNK_SIZE, CHUNK_OVERLAP);

  await db.from('document_chunks').delete().eq('document_id', doc.id);

  const rows = sections.map((content, i) => ({
    document_id: doc.id,
    chunk_index: i,
    content,
    metadata: { type: doc.metadata.type },
  }));

  const { data: inserted } = await db
    .from('document_chunks')
    .insert(rows)
    .select('id, chunk_index');

  const chunks: DocumentChunk[] = (inserted ?? []).map((r, idx) => ({
    id: r.id,
    documentId: doc.id,
    chunkIndex: r.chunk_index,
    content: sections[idx] ?? rows[idx]?.content ?? '',
    metadata: { type: doc.metadata.type },
  }));

  return { documentId: doc.id, chunks };
}

function splitIntoChunks(
  text: string,
  size: number,
  overlap: number
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + size;
    if (end < text.length) {
      // Try to break at paragraph or sentence
      const slice = text.slice(start, end + 200);
      const breakMatch = slice.match(/\n\n|\.\s+[A-Z]|;\s+/g);
      if (breakMatch) {
        const lastBreak = slice.lastIndexOf('\n\n');
        const lastSentence = slice.search(/\.[^.]*\s*$/);
        if (lastBreak > size / 2) end = start + lastBreak + 2;
        else if (lastSentence > size / 2) end = start + lastSentence + 1;
      }
    }
    const chunk = text.slice(start, Math.min(end, text.length)).trim();
    if (chunk.length > 0) chunks.push(chunk);
    start = end - overlap;
  }

  return chunks.length > 0 ? chunks : [text];
}
