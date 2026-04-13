"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import type { OrgContext } from "@/types/next-auth"

// OrgSwitcher renders nothing if the user only belongs to one org.
// When they pick a different org, we call update() — NextAuth re-runs
// the jwt callback with trigger="update" + the new activeOrgId, mints
// a new token, and returns the updated session. No re-authentication needed.
export function OrgSwitcher() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Only render if the user has 2+ orgs — single-org users don't need this
  if (!session?.orgs || session.orgs.length <= 1) return null

  async function switchOrg(orgId: string) {
    if (orgId === session?.activeOrg?.id) return

    // update() PATCHes /api/auth/session → re-runs jwt callback with
    // trigger="update" and the payload we pass here → new token issued
    await update({ activeOrgId: orgId })

    // router.refresh() flushes the RSC cache so server components re-render
    // with the new activeOrg context (e.g. dashboard data scoped to new org)
    startTransition(() => router.refresh())
  }

  return (
    <select
      value={session.activeOrg?.id ?? ""}
      onChange={(e) => switchOrg(e.target.value)}
      disabled={isPending}
      className="text-[13px] bg-transparent border-none text-white/70 hover:text-white focus:outline-none disabled:opacity-50 cursor-pointer max-w-[160px] truncate"
      aria-label="Switch organisation"
    >
      {session.orgs.map((org: OrgContext) => (
        <option key={org.id} value={org.id} className="bg-[#1a1a1a] text-white">
          {org.name}
        </option>
      ))}
    </select>
  )
}
