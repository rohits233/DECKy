'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl  = searchParams.get('callbackUrl') ?? '/dashboard'

  const [tab,      setTab]      = useState<'signin' | 'magic'>('signin')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [sent,     setSent]     = useState(false)

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.error) {
      setError('Invalid email or password.')
      setLoading(false)
    } else {
      router.push(callbackUrl)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    await signIn('google', { callbackUrl })
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('resend', { email, redirect: false })
    if (res?.error) {
      setError('Could not send magic link. Try again.')
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-8">
      <h1 className="text-[22px] font-semibold mb-6">Sign in to Decky</h1>

      {/* Google */}
      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-md hover:bg-white/[0.08] transition disabled:opacity-50 text-[14px] font-medium mb-5"
      >
        <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-white/[0.08]" />
        <span className="text-[12px] text-white/30">or</span>
        <div className="flex-1 h-px bg-white/[0.08]" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white/[0.04] rounded-lg p-1">
        {(['signin', 'magic'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(''); setSent(false) }}
            className={`flex-1 py-1.5 rounded-md text-[13px] font-medium transition ${
              tab === t ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {t === 'signin' ? 'Password' : 'Magic link'}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-[13px]">
          {error}
        </div>
      )}

      {tab === 'signin' ? (
        <form onSubmit={handleCredentials} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-white/60 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-md focus:outline-none focus:ring-1 focus:ring-white/20 text-[14px]" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-white/60 mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-md focus:outline-none focus:ring-1 focus:ring-white/20 text-[14px]" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-white text-black rounded-md hover:bg-white/90 transition disabled:opacity-50 text-[14px] font-medium">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      ) : sent ? (
        <div className="text-center py-4">
          <p className="text-[15px] font-medium mb-1">Check your inbox</p>
          <p className="text-[13px] text-white/50">We sent a magic link to <strong className="text-white/70">{email}</strong></p>
        </div>
      ) : (
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-white/60 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-md focus:outline-none focus:ring-1 focus:ring-white/20 text-[14px]" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-white text-black rounded-md hover:bg-white/90 transition disabled:opacity-50 text-[14px] font-medium">
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '64px 64px'
      }} />

      <div className="relative z-10 w-full max-w-[400px] mx-4">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-[15px] text-black">D</div>
          <span className="text-[15px] font-semibold">Decky</span>
        </div>

        <Suspense fallback={<div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-8 h-64" />}>
          <LoginForm />
        </Suspense>

        <p className="text-center mt-4 text-[13px] text-white/30">
          <Link href="/" className="hover:text-white/60 transition">← Back to home</Link>
        </p>
      </div>
    </div>
  )
}
