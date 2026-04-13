'use client'

import { useEffect } from 'react'
import Link          from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error:  Error & { digest?: string }
  reset:  () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-2xl">⚠️</div>
      <h2 className="text-[18px] font-semibold">Something went wrong</h2>
      <p className="text-[14px] text-white/40 max-w-sm">
        {error.message ?? 'An unexpected error occurred.'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 bg-white text-black rounded-md text-[13px] font-medium hover:bg-white/90 transition"
        >
          Try again
        </button>
        <Link href="/dashboard" className="px-4 py-2 bg-white/[0.06] border border-white/[0.08] rounded-md text-[13px] text-white/60 hover:text-white transition">
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
