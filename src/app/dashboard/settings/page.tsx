import { redirect }      from 'next/navigation'
import { auth }          from '@/auth'
import { prisma }        from '@/lib/prisma'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.activeOrg) redirect('/auth/login')

  const role = session.activeOrg.role
  if (role !== 'OWNER' && role !== 'ADMIN') redirect('/dashboard')

  const org = await prisma.organization.findUniqueOrThrow({
    where:  { id: session.activeOrg.id },
    select: {
      id:            true,
      name:          true,
      slug:          true,
      webhookUrl:    true,
      webhookSecret: true,
      planTier:      true,
    },
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold">Settings</h1>
        <p className="text-[14px] text-white/50 mt-1">Manage workspace configuration.</p>
      </div>

      <SettingsClient org={org} isOwner={role === 'OWNER'} />
    </div>
  )
}
