export type { AIProvider, AIMessage, AICompletionOptions } from './types'
export { OpenAIProvider }    from './providers/openai'
export { AnthropicProvider } from './providers/anthropic'

import type { AIProvider } from './types'
import { OpenAIProvider }    from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'

export type ProviderName = 'openai' | 'anthropic'

export interface ProviderOptions {
  model?: string
}

// ---------------------------------------------------------------------------
// createProvider — resolves env vars and returns a ready-to-use AIProvider.
// Called once by the orchestrator; passed into PipelineContext so every stage
// shares the same configured instance without re-instantiating per call.
//
// Adding a new provider (e.g. Google Gemini):
//   1. Implement AIProvider in providers/gemini.ts
//   2. Add 'gemini' to ProviderName union
//   3. Add a case here
//   — No stage code changes required.
// ---------------------------------------------------------------------------
export function createProvider(name: ProviderName, opts: ProviderOptions = {}): AIProvider {
  switch (name) {
    case 'openai':
      if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set')
      return new OpenAIProvider(process.env.OPENAI_API_KEY, opts.model)

    case 'anthropic':
      if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')
      return new AnthropicProvider(process.env.ANTHROPIC_API_KEY, opts.model)

    default:
      throw new Error(`Unknown AI provider: "${name}". Valid options: openai, anthropic`)
  }
}

// Default provider for when no explicit override is passed.
// Reads DECKY_AI_PROVIDER env var so ops can flip providers without deploys.
export function defaultProvider(): AIProvider {
  const name = (process.env.DECKY_AI_PROVIDER ?? 'openai') as ProviderName
  const model = process.env.DECKY_AI_MODEL ?? undefined
  return createProvider(name, { model })
}
