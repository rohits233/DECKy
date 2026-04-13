import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, AIMessage, AICompletionOptions } from '../types'

// JSON fence stripper — Claude sometimes wraps JSON in ```json ... ``` even
// when told not to. Strip them so callers always get a bare JSON string.
function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic'
  readonly model: string
  private client: Anthropic

  constructor(apiKey: string, model = 'claude-sonnet-4-6') {
    this.client = new Anthropic({ apiKey })
    this.model = model
  }

  async complete(messages: AIMessage[], opts: AICompletionOptions = {}): Promise<string> {
    // Anthropic separates the system prompt from the conversation turn
    const systemMsg = messages.find(m => m.role === 'system')?.content ?? ''
    const userMsgs  = messages.filter(m => m.role === 'user')

    // For JSON mode: append a hard instruction to the system prompt.
    // Anthropic has no native json_object mode — the prompt is the contract.
    const system = opts.json
      ? `${systemMsg}\n\nCRITICAL: Your entire response must be valid JSON. No markdown code fences, no explanation, no preamble. Start your response with { or [.`
      : systemMsg

    const res = await this.client.messages.create({
      model:       this.model,
      max_tokens:  opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.4,
      system,
      messages: userMsgs.map(m => ({ role: 'user' as const, content: m.content })),
    })

    const text = res.content[0].type === 'text' ? res.content[0].text : ''
    return opts.json ? stripFences(text) : text
  }
}
