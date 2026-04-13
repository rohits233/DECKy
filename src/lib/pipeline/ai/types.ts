// ---------------------------------------------------------------------------
// AIProvider — the single abstraction all pipeline stages talk to.
//
// Stages only depend on this interface; they never import a vendor SDK.
// Swap providers by passing a different implementation in PipelineContext.
// ---------------------------------------------------------------------------

export interface AIMessage {
  role: 'system' | 'user'
  content: string
}

export interface AICompletionOptions {
  temperature?: number
  maxTokens?: number
  // json: true tells the provider the caller expects a JSON string back.
  // Each adapter enforces this in the most reliable way for its vendor:
  //   OpenAI   → response_format: { type: 'json_object' }
  //   Anthropic → injects a system-prompt suffix + strips markdown fences
  //   Future    → implement in the adapter; callers never change
  json?: boolean
}

export interface AIProvider {
  /** Human-readable name used in logs and UsageEvent metadata */
  readonly name: string
  /** The model identifier being used (e.g. "gpt-4o-mini", "claude-sonnet-4-6") */
  readonly model: string
  /** Core completion — returns the raw text/JSON string */
  complete(messages: AIMessage[], opts?: AICompletionOptions): Promise<string>
}
