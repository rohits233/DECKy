import { redirect }    from 'next/navigation'
import { auth }        from '@/auth'
import { prisma }      from '@/lib/prisma'
import { PLANS }       from '@/lib/billing/plans'
import { MembersClient } from './MembersClient'

export default async function MembersPage() {
  const session = await auth()
  if (!session?.activeOrg) redirect('/auth/login')

  const role = session.activeOrg.role
  if (role !== 'OWNER' && role !== 'ADMIN') redirect('/dashboard')

  const orgId = session.activeOrg.id
  const plan  = PLANS[session.activeOrg.planTier]

  const memberships = await prisma.orgMembership.findMany({
    where:   { orgId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: {
      id:        true,
      role:      true,
      createdAt: true,
      user: {
        select: { id: true, email: true, displayName: true, avatarUrl: true },
      },
    },
  })

  const atMemberLimit =
    plan.memberLimit !== null && memberships.length >= plan.memberLimit

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold">Members</h1>
          <p className="text-[14px] text-white/50 mt-1">
            {memberships.length}{plan.memberLimit ? ` / ${plan.memberLimit}` : ''} member{memberships.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <MembersClient
        memberships={memberships}
        currentUserId={session.user!.id!}
        atMemberLimit={atMemberLimit}
        planName={plan.name}
        currentUserRole={role}
      />
    </div>
  )
}
