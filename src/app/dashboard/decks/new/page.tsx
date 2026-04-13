'use client'

import { useState, useTransition, useRef } from 'react'
import { createDeckAction }                from './actions'
import Link                                from 'next/link'

type UploadedFile = {
  file:   File
  status: 'ready' | 'extracting' | 'done' | 'error'
  error?: string
}

const DOC_ACCEPT = '.pdf,.doc,.docx,.txt'
const VID_ACCEPT = '.mp4,.mov,.webm,.m4a,.mp3,.wav'
const isMedia = (f: File) => /\.(mp4|mov|webm|m4a|mp3|wav)$/i.test(f.name)

function fileIcon(f: File) {
  if (isMedia(f)) return '🎥'
  if (/\.pdf$/i.test(f.name)) return '📕'
  if (/\.docx?$/i.test(f.name)) return '📝'
  return '📄'
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function NewDeckPage() {
  const [pending,    startTransition] = useTransition()
  const [error,      setError]        = useState('')
  const [files,      setFiles]        = useState<UploadedFile[]>([])
  const [dragging,   setDragging]     = useState(false)
  const [extracting, setExtracting]   = useState(false)
  const docRef = useRef<HTMLInputElement>(null)
  const vidRef = useRef<HTMLInputElement>(null)

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter(f =>
      /\.(pdf|doc|docx|txt|mp4|mov|webm|m4a|mp3|wav)$/i.test(f.name)
    )
    setFiles(prev => [
      ...prev,
      ...arr
        .filter(f => !prev.some(p => p.file.name === f.name))
        .map(f => ({ file: f, status: 'ready' as const })),
    ])
  }

  const removeFile = (name: string) =>
    setFiles(prev => prev.filter(f => f.file.name !== name))

  const setFileStatus = (name: string, patch: Partial<UploadedFile>) =>
    setFiles(prev => prev.map(f => f.file.name === name ? { ...f, ...patch } : f))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)

    if (files.length > 0) {
      setExtracting(true)
      const chunks: string[] = []

      for (const entry of files) {
        setFileStatus(entry.file.name, { status: 'extracting' })
        try {
          const fileFd = new FormData()
          fileFd.append('file', entry.file)
          const res = await fetch('/api/docs/extract', { method: 'POST', body: fileFd })
          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || 'Extraction failed')
          }
          const { text } = await res.json()
          if (text) chunks.push(`[${entry.file.name}]\n${text}`)
          setFileStatus(entry.file.name, { status: 'done' })
        } catch (err: any) {
          setFileStatus(entry.file.name, { status: 'error', error: err.message })
        }
      }

      setExtracting(false)

      if (chunks.length > 0) {
        const existing = (fd.get('prompt') as string ?? '').trim()
        const context  = `Document context:\n\n${chunks.join('\n\n---\n\n')}`
        fd.set('prompt', existing ? `${context}\n\n${existing}` : context)
      }
    }

    startTransition(async () => {
      const result = await createDeckAction(fd)
      if (result?.error) setError(result.error)
    })
  }

  const busy = extracting || pending

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard" className="text-[13px] text-white/40 hover:text-white/70 transition">
          ← Back to decks
        </Link>
        <h1 className="text-[26px] font-semibold mt-3">New deck</h1>
        <p className="text-[14px] text-white/50 mt-1">
          Upload documents or videos and Decky will generate a full slide deck instantly.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-[13px]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 space-y-5">

        {/* Title */}
        <div>
          <label className="block text-[13px] font-medium text-white/60 mb-1.5">
            Deck title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="title"
            placeholder="Q3 Business Review"
            required
            maxLength={200}
            className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-md focus:outline-none focus:ring-1 focus:ring-white/20 text-[14px] placeholder:text-white/20"
          />
        </div>

        {/* File upload */}
        <div>
          <label className="block text-[13px] font-medium text-white/60 mb-1.5">
            Source documents <span className="text-white/25 font-normal">(optional)</span>
          </label>

          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
            className={`rounded-xl border-2 border-dashed p-5 text-center transition-all ${
              dragging
                ? 'border-indigo-500/50 bg-indigo-500/[0.05]'
                : 'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02]'
            }`}
          >
            <p className="text-[13px] text-white/40 mb-3">Drop files here or</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => docRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-[12px] text-white/60 hover:bg-white/[0.09] hover:text-white transition"
              >
                📄 Document
              </button>
              <button
                type="button"
                onClick={() => vidRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-[12px] text-white/60 hover:bg-white/[0.09] hover:text-white transition"
              >
                🎥 Video / Audio
              </button>
            </div>
            <p className="text-[11px] text-white/20 mt-3">PDF · DOCX · TXT · MP4 · MOV · MP3 · WAV — max 25 MB</p>

            <input ref={docRef} type="file" className="hidden" accept={DOC_ACCEPT} multiple
              onChange={e => e.target.files && addFiles(e.target.files)} />
            <input ref={vidRef} type="file" className="hidden" accept={VID_ACCEPT}
              onChange={e => e.target.files && addFiles(e.target.files)} />
          </div>

          {files.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {files.map(({ file, status, error: ferr }) => (
                <div key={file.name} className="flex items-center gap-2.5 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                  <span className="text-sm flex-shrink-0">{fileIcon(file)}</span>
                  <span className="flex-1 text-[12px] text-white/65 truncate">{file.name}</span>
                  <span className="text-[11px] flex-shrink-0">
                    {status === 'ready'      && <span className="text-white/30">ready</span>}
                    {status === 'extracting' && <span className="text-amber-400 animate-pulse">{isMedia(file) ? 'Transcribing…' : 'Reading…'}</span>}
                    {status === 'done'       && <span className="text-emerald-400">done ✓</span>}
                    {status === 'error'      && <span className="text-red-400" title={ferr}>failed</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(file.name)}
                    disabled={busy}
                    className="text-white/25 hover:text-red-400 transition text-lg leading-none flex-shrink-0 disabled:pointer-events-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-[13px] font-medium text-white/60 mb-1.5">
            Additional instructions <span className="text-white/25 font-normal">(optional)</span>
          </label>
          <textarea
            name="prompt"
            rows={3}
            placeholder="Focus on executive highlights. Keep a formal tone. Audience is the board."
            maxLength={2000}
            className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-md focus:outline-none focus:ring-1 focus:ring-white/20 text-[14px] placeholder:text-white/20 resize-none"
          />
        </div>

        {/* Slide count */}
        <div>
          <label className="block text-[13px] font-medium text-white/60 mb-1.5">
            Number of slides
          </label>
          <select
            name="slideCount"
            defaultValue="8"
            className="px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-md focus:outline-none focus:ring-1 focus:ring-white/20 text-[14px] text-white"
          >
            {[5, 6, 7, 8, 10, 12, 15, 20].map(n => (
              <option key={n} value={n} className="bg-[#1a1a1a]">{n} slides</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2.5 bg-white text-black rounded-md hover:bg-white/90 transition disabled:opacity-50 text-[14px] font-medium flex items-center gap-2"
          >
            {extracting ? <><Spinner /> Extracting…</>
              : pending  ? <><Spinner /> Generating…</>
              : 'Generate deck'}
          </button>
          <Link href="/dashboard" className="px-5 py-2.5 text-[14px] text-white/40 hover:text-white/70 transition">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
