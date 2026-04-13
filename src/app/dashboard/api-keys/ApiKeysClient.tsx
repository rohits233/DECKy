'use client'

import { useState, useTransition } from 'react'
import { createApiKeyAction, revokeApiKeyAction } from './actions'

interface ApiKey {
  id:             string
  name:           string
  keyPrefix:      string
  tier:           string
  requestsPerMin: number
  lastUsedAt:     Date | null
  createdAt:      Date
}

export function ApiKeysClient({ keys }: { keys: ApiKey[] }) {
  const [pending,  startTransition] = useTransition()
  const [newKey,   setNewKey]       = useState<string | null>(null)
  const [error,    setError]        = useState('')
  const [copied,   setCopied]       = useState(false)
  const [revoking, setRevoking]     = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setNewKey(null)
    const fd = new FormData(e.currentTarget)
    ;(e.currentTarget as HTMLFormElement).reset()
    startTransition(async () => {
      const result = await createApiKeyAction(fd)
      if (result?.error) setError(result.error)
      if (result?.key)   setNewKey(result.key)
    })
  }

  async function handleRevoke(keyId: string) {
    setRevoking(keyId)
    startTransition(async () => {
      await revokeApiKeyAction(keyId)
      setRevoking(null)
    })
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* New key revealed */}
      {newKey && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-2">
          <p className="text-[13px] font-semibold text-green-400">Key created — copy it now, it won't be shown again</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[12px] bg-black/30 px-3 py-2 rounded-md break-all text-green-300 font-mono">
              {newKey}
            </code>
            <button
              onClick={() => copy(newKey)}
              className="shrink-0 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-md text-[12px] text-green-400 hover:bg-green-500/30 transition"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-[12px] text-white/30 hover:text-white/50 transition">
            Dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5">
        <h2 className="text-[15px] font-semibold mb-4">Create new key</h2>
        {error && (
          <p className="mb-3 text-[13px] text-red-400">{error}</p>
        )}
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            name="name"
            placeholder="e.g. CI Pipeline, Zapier"
            required
            maxLength={80}
            className="flex-1 px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-md focus:outline-none focus:ring-1 focus:ring-white/20 text-[14px] placeholder:text-white/20"
          />
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 bg-white text-black rounded-md text-[13px] font-medium hover:bg-white/90 disabled:opacity-50 transition"
          >
            {pending ? 'Creating…' : 'Create key'}
          </button>
        </form>
      </div>

      {/* Key list */}
      {keys.length === 0 ? (
        <p className="text-[14px] text-white/30 py-4 text-center">No active keys yet.</p>
      ) : (
        <div className="divide-y divide-white/[0.06] bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-hidden">
          {keys.map(k => (
            <div key={k.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[14px] font-medium">{k.name}</p>
                <p className="text-[12px] text-white/30 mt-0.5 font-mono">
                  {k.keyPrefix}••••••••
                  <span className="ml-3 not-italic font-sans text-white/20">
                    {k.tier} · {k.requestsPerMin} req/min
                  </span>
                </p>
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                <p className="text-[12px] text-white/25">
                  Created {k.createdAt.toLocaleDateString()}
                </p>
                {k.lastUsedAt && (
                  <p className="text-[12px] text-white/25">
                    Last used {k.lastUsedAt.toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleRevoke(k.id)}
                disabled={revoking === k.id}
                className="shrink-0 px-3 py-1.5 border border-red-500/30 text-red-400 rounded-md text-[12px] hover:bg-red-500/10 disabled:opacity-50 transition"
              >
                {revoking === k.id ? 'Revoking…' : 'Revoke'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Docs hint */}
      <div className="text-[13px] text-white/30 space-y-1 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
        <p className="font-medium text-white/50">Quick start</p>
        <pre className="text-[12px] bg-black/30 p-3 rounded-md overflow-x-auto text-white/50">{`curl -X POST https://yourapp.com/api/v1/decks \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Q3 Review","prompt":"..."}'`}</pre>
      </div>
    </div>
  )
}
