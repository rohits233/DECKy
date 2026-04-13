'use client'

import { useState } from 'react'
import type { Slide } from './page'

export function ExportButtonClient({ deckId, title, slides }: { deckId: string; title: string; slides: Slide[] }) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const res = await fetch('/api/export/pptx', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ slides, title }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pptx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Export failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading || slides.length === 0}
      className="shrink-0 px-4 py-2 bg-white/[0.05] border border-white/[0.08] rounded-md text-[13px] font-medium text-white/70 hover:text-white hover:bg-white/[0.08] disabled:opacity-40 transition flex items-center gap-2"
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
        </svg>
      ) : '↓'}
      Export .pptx
    </button>
  )
}
