// Pipeline types and contracts

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from './ai';

export interface PipelineContext {
  projectId: string;
  userId: string;
  jobId?: string;
  supabase?: SupabaseClient;
  // The AI provider to use for all generation stages.
  // Injected by the orchestrator — stages never import a vendor SDK directly.
  ai: AIProvider;
}

export interface IngestedDocument {
  id: string;
  content: string;
  metadata: {
    type: 'research' | 'transcript' | 'memo';
    fileName: string;
    pageCount?: number;
    speakers?: string[];
  };
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown>;
}

export interface ChunkedDocument {
  documentId: string;
  chunks: DocumentChunk[];
}

export interface RetrievedContext {
  chunks: (DocumentChunk & { score?: number })[];
  summary?: string;
}

export interface Insight {
  type: 'finding' | 'quote' | 'recommendation' | 'risk' | 'opportunity';
  content: string;
  evidence: { chunkId?: string; quote: string; page?: number }[];
  confidence: number;
  sourceDocumentId?: string;
}

export interface InsightsResult {
  items: Insight[];
}

export interface SlideOutline {
  title: string;
  purpose: string;
  keyPoints: string[];
  suggestedLayout: string;
}

export interface SlidePlan {
  slides: SlideOutline[];
}

export interface GeneratedSlide {
  title: string;
  content: string;
  layout: string;
  icon: string;
  color: string;
}

export interface PresenterScript {
  slideId: string;
  slideIndex: number;
  speakerNotes: string;
  talkingPoints: string[];
  suggestedDuration: number;
  transitionCue?: string;
  anticipatedQuestions?: { q: string; a: string }[];
}

export interface PipelineStage<TInput, TOutput> {
  name: string;
  run(input: TInput, context: PipelineContext): Promise<TOutput>;
}
