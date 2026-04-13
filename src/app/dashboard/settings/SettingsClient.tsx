'use client'

import { useState, useTransition } from 'react'
import { updateOrgAction, rotateWebhookSecretAction } from './actions'

interface Org {
  id:            string
  name:          string
  slug:          string
  webhookUrl:    string | null
  webhookSecret: string | null
  planTier:      string
}

export function SettingsClient({ org, isOwner }: { org: Org; isOwner: boolean }) {
  const [pending,       startTransition] = useTransition()
  const [error,         setError]        = useState('')
  const [success,       setSuccess]      = useState('')
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)
  const [copiedSecret,   setCopiedSecret]   = useState(false)

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setSuccess('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await updateOrgAction(fd)
      if (res?.error)   setError(res.error)
      if (res?.success) setSuccess('Settings saved.')
    })
  }

  async function handleRotateSecret() {
    if (!confirm('Rotate webhook secret? Existing integrations will break until updated.')) return
    startTransition(async () => {
      const res = await rotateWebhookSecretAction()
      if (res?.secret) {
        setRevealedSecret(res.secret)
        setSuccess('Webhook secret rotated.')
      }
    })
  }

  function copySecret(s: string) {
    navigator.clipboard.writeText(s)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  return (
    <div className="space-y-5">
      {error   && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-[13px]">{error}</div>}
      {success && <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-[13px]">{success}</div>}

      {/* General */}
      <form onSubmit={handleSave} className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5 space-y-4">
        <h2 className="text-[15px] font-semibold">General</h2>

        <div>
          <label className="block text-[13px] font-medium text-white/60 mb-1.5">Workspace name</label>
          <input
            type="text"
            name="name"
            defaultValue={org.name}
            required
            minLength={2}
            maxLength={80}
            className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-md focus:outline-none focus:ring-1 focus:ring-white/20 text-[14px]"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-white/60 mb-1.5">Slug</label>
          <input
            type="text"
            value={org.slug}
            disabled
            className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.05] rounded-md text-[14px] text-white/30 cursor-not-allowed"
          />
          <p className="mt-1 text-[12px] text-white/25">Slugs can't be changed after creation.</p>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-white text-black rounded-md text-[13px] font-medium hover:bg-white/90 disabled:opacity-50 transition"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      {/* Webhooks */}
      <form onSubmit={handleSave} className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-[15px] font-semibold">Webhook</h2>
          <p className="text-[13px] text-white/40 mt-0.5">
            Receive a POST when a deck generation job completes. Signed with HMAC-SHA256.
          </p>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-white/60 mb-1.5">Endpoint URL</label>
          <input
            type="url"
            name="webhookUrl"
            defaultValue={org.webhookUrl ?? ''}
            placeholder="https://your-app.com/webhooks/decky"
            className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-md focus:outline-none focus:ring-1 focus:ring-white/20 text-[14px] placeholder:text-white/20"
          />
        </div>

        {/* Webhook secret */}
        <div>
          <label className="block text-[13px] font-medium text-white/60 mb-1.5">Signing secret</label>
          {revealedSecret ? (
            <div className="flex gap-2">
              <code className="flex-1 text-[12px] bg-black/30 px-3 py-2 rounded-md break-all text-green-300 font-mono">
                {revealedSecret}
              </code>
              <button
                type="button"
                onClick={() => copySecret(revealedSecret)}
                className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-md text-[12px] text-green-400"
              >
                {copiedSecret ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <code className="text-[13px] text-white/30 font-mono">
                {org.webhookSecret ? '••••••••••••••••' : 'Not set'}
              </code>
              <button
                type="button"
                onClick={handleRotateSecret}
                disabled={pending}
                className="text-[12px] text-white/40 hover:text-white/70 underline transition"
              >
                {org.webhookSecret ? 'Rotate secret' : 'Generate secret'}
              </button>
            </div>
          )}
          <p className="mt-1 text-[12px] text-white/25">
            Verify requests with: <code className="text-white/35">X-Decky-Signature: sha256=&lt;hmac&gt;</code>
          </p>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-white text-black rounded-md text-[13px] font-medium hover:bg-white/90 disabled:opacity-50 transition"
        >
          {pending ? 'Saving…' : 'Save webhook'}
        </button>
      </form>

      {/* Danger zone — OWNER only */}
      {isOwner && (
        <div className="bg-red-500/[0.04] border border-red-500/20 rounded-xl p-5 space-y-3">
          <h2 className="text-[15px] font-semibold text-red-400">Danger zone</h2>
          <p className="text-[13px] text-white/40">
            Deleting the workspace is permanent. All decks, members, and billing data will be removed.
          </p>
          <button
            type="button"
            className="px-4 py-2 border border-red-500/30 text-red-400 rounded-md text-[13px] hover:bg-red-500/10 transition"
            onClick={() => alert('Contact support to delete your workspace.')}
          >
            Delete workspace
          </button>
        </div>
      )}
    </div>
  )
}
