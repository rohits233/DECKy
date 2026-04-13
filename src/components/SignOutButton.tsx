'use client'

import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="text-[13px] text-white/40 hover:text-white/70 transition"
    >
      Sign out
    </button>
  )
}
