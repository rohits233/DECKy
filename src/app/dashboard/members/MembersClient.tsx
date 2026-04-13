'use client'

import { useState, useTransition } from 'react'
import { inviteMemberAction, changeRoleAction, removeMemberAction } from './actions'
import type { OrgRole } from '@prisma/client'

const ROLES: OrgRole[] = ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']

interface Member {
  id:        string
  role:      OrgRole
  createdAt: Date
  user: {
    id:          string
    email:       string
    displayName: string | null
    avatarUrl:   string | null
  }
}

export function MembersClient({
  memberships,
  currentUserId,
  atMemberLimit,
  planName,
  currentUserRole,
}: {
  memberships:     Member[]
  currentUserId:   string
  atMemberLimit:   boolean
  planName:        string
  currentUserRole: string
}) {
  const [pending, startTransition] = useTransition()
  const [error,   setError]        = useState('')
  const [success, setSuccess]      = useState('')

  const isOwner = currentUserRole === 'OWNER'
  const isAdmin = isOwner || currentUserRole === 'ADMIN'

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setSuccess('')
    const fd = new FormData(e.currentTarget)
    ;(e.currentTarget as HTMLFormElement).reset()
    startTransition(async () => {
      const res = await inviteMemberAction(fd)
      if (res?.error)   setError(res.error)
      if (res?.success) setSuccess('Member added successfully.')
    })
  }

  async function handleRoleChange(membershipId: string, newRole: OrgRole) {
    startTransition(async () => {
      await changeRoleAction(membershipId, newRole)
    })
  }

  async function handleRemove(membershipId: string) {
    if (!confirm('Remove this member?')) return
    startTransition(async () => {
      const res = await removeMemberAction(membershipId)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div className="space-y-5">
      {/* Invite form */}
      {isAdmin && (
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-5">
          <h2 className="text-[15px] font-semibold mb-1">Invite member</h2>

          {atMemberLimit ? (
            <div className="mt-3 text-[13px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              Member limit reached for the {planName} plan.{' '}
              <a href="/dashboard/billing" className="underline hover:text-amber-300">Upgrade</a> to add more.
            </div>
          ) : (
            <>
              {error   && <p className="mt-2 text-[13px] text-red-400">{error}</p>}
              {success && <p className="mt-2 text-[13px] text-green-400">{success}</p>}
              <form onSubmit={handleInvite} className="mt-4 flex gap-2 flex-wrap">
                <input
                  type="email"
                  name="email"
                  placeholder="colleague@company.com"
                  required
                  className="flex-1 min-w-[200px] px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-md focus:outline-none focus:ring-1 focus:ring-white/20 text-[14px] placeholder:text-white/20"
                />
                <select
                  name="role"
                  defaultValue="EDITOR"
                  className="px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-md focus:outline-none text-[14px] text-white"
                >
                  {ROLES.filter(r => r !== 'OWNER').map(r => (
                    <option key={r} value={r} className="bg-[#1a1a1a]">{r}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2 bg-white text-black rounded-md text-[13px] font-medium hover:bg-white/90 disabled:opacity-50 transition"
                >
                  {pending ? 'Adding…' : 'Add member'}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Member list */}
      <div className="divide-y divide-white/[0.06] bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-hidden">
        {memberships.map(m => {
          const isSelf  = m.user.id === currentUserId
          const canEdit = isAdmin && !isSelf

          return (
            <div key={m.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center text-[13px] font-semibold shrink-0">
                  {(m.user.displayName ?? m.user.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium truncate">
                    {m.user.displayName ?? m.user.email}
                    {isSelf && <span className="ml-2 text-[11px] text-white/30">(you)</span>}
                  </p>
                  {m.user.displayName && (
                    <p className="text-[12px] text-white/30 truncate">{m.user.email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {canEdit ? (
                  <select
                    value={m.role}
                    onChange={e => handleRoleChange(m.id, e.target.value as OrgRole)}
                    disabled={pending}
                    className="px-2 py-1 bg-white/[0.05] border border-white/[0.08] rounded-md text-[12px] text-white disabled:opacity-50"
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r} className="bg-[#1a1a1a]">{r}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[12px] text-white/40 px-2 py-1">{m.role}</span>
                )}

                {canEdit && (
                  <button
                    onClick={() => handleRemove(m.id)}
                    disabled={pending}
                    className="px-2 py-1 border border-red-500/20 text-red-400/70 rounded-md text-[12px] hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-50 transition"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[12px] text-white/25 px-1">
        Roles: <strong className="text-white/40">OWNER</strong> full control ·{' '}
        <strong className="text-white/40">ADMIN</strong> manage members & settings ·{' '}
        <strong className="text-white/40">EDITOR</strong> create/edit decks ·{' '}
        <strong className="text-white/40">VIEWER</strong> read-only
      </p>
    </div>
  )
}
