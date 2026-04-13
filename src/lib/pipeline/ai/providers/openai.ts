import OpenAI from 'openai'
import type { AIProvider, AIMessage, AICompletionOptions } from '../types'

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'
  readonly model: string
  private client: OpenAI

  constructor(apiKey: string, model = 'gpt-4o-mini') {
    this.client = new OpenAI({ apiKey })
    this.model = model
  }

  async complete(messages: AIMessage[], opts: AICompletionOptions = {}): Promise<string> {
    const res = await this.client.chat.completions.create({
      model:           this.model,
      messages,
      temperature:     opts.temperature ?? 0.4,
      max_tokens:      opts.maxTokens,
      // Native JSON mode — guarantees valid JSON without prompt hacks
      response_format: opts.json ? { type: 'json_object' } : undefined,
    })
    return res.choices[0].message.content ?? ''
  }
}
