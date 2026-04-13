// Stage 1: Document Ingestion - parse raw files into normalized text

import type { IngestedDocument, PipelineContext } from '../../types';
import { parsePdf } from '../parsers/pdf';
import { parseDocx } from '../parsers/docx';
import { parseText } from '../parsers/text';

export interface IngestionInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  documentId: string;
}

export async function ingestDocument(
  input: IngestionInput,
  _context: PipelineContext
): Promise<IngestedDocument> {
  const { buffer, fileName, mimeType, documentId } = input;

  let content: string;
  let type: 'research' | 'transcript' | 'memo' = 'research';
  let pageCount: number | undefined;

  if (mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
    const result = await parsePdf(buffer);
    content = result.text;
    pageCount = result.pageCount;
  } else if (
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    fileName.toLowerCase().match(/\.(docx?|doc)$/)
  ) {
    content = await parseDocx(buffer);
  } else {
    content = parseText(buffer);
  }

  if (fileName.toLowerCase().includes('transcript') || fileName.toLowerCase().includes('interview')) {
    type = 'transcript';
  }

  return {
    id: documentId,
    content: content.trim(),
    metadata: { type, fileName, pageCount },
  };
}
