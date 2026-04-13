'use server'

import { redirect }       from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { auth }           from '@/auth'
import { prisma }         from '@/lib/prisma'
import type { OrgRole }   from '@prisma/client'

function requireAdmin(role: string) {
  if (role !== 'OWNER' && role !== 'ADMIN') redirect('/dashboard')
}

// ---------------------------------------------------------------------------
// inviteMemberAction
//
// Looks up the user by email. If they exist, creates the OrgMembership.
// If they don't, we create a stub user row so the invite survives until
// they sign up. (Full invite-email flow via Resend is a follow-up.)
// ---------------------------------------------------------------------------
export async function inviteMemberAction(formData: FormData) {
  const session = await auth()
  if (!session?.activeOrg) redirect('/auth/login')
  requireAdmin(session.activeOrg.role)

  const email = (formData.get('email') as string).trim().toLowerCase()
  const role  = (formData.get('role') as OrgRole) ?? 'EDITOR'
  const orgId = session.activeOrg.id

  if (!email) return { error: 'Email is required.' }

  // Check if already a member
  const existing = await prisma.orgMembership.findFirst({
    where: {
      orgId,
      deletedAt: null,
      user: { email },
    },
  })
  if (existing) return { error: 'This user is already a member.' }

  // Upsert user by email (creates stub if new)
  const user = await prisma.user.upsert({
    where:  { email },
    update: {},
    create: { email },
  })

  // Create membership (restore if soft-deleted)
  await prisma.orgMembership.upsert({
    where:  { orgId_userId: { orgId, userId: user.id } },
    create: { orgId, userId: user.id, role, invitedBy: session.user!.id },
    update: { role, deletedAt: null, invitedBy: session.user!.id },
  })

  revalidatePath('/dashboard/members')
  return { success: true }
}

export async function changeRoleAction(membershipId: string, newRole: OrgRole) {
  const session = await auth()
  if (!session?.activeOrg) redirect('/auth/login')
  requireAdmin(session.activeOrg.role)

  await prisma.orgMembership.updateMany({
    where: { id: membershipId, orgId: session.activeOrg.id },
    data:  { role: newRole },
  })

  revalidatePath('/dashboard/members')
}

export async function removeMemberAction(membershipId: string) {
  const session = await auth()
  if (!session?.activeOrg) redirect('/auth/login')
  requireAdmin(session.activeOrg.role)

  // Prevent removing yourself
  const membership = await prisma.orgMembership.findFirst({
    where: { id: membershipId, orgId: session.activeOrg.id },
    select: { userId: true },
  })
  if (membership?.userId === session.user!.id) {
    return { error: "You can't remove yourself." }
  }

  await prisma.orgMembership.updateMany({
    where: { id: membershipId, orgId: session.activeOrg.id },
    data:  { deletedAt: new Date() },
  })

  revalidatePath('/dashboard/members')
}
