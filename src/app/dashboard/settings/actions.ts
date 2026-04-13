'use server'

import { redirect }       from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { auth }           from '@/auth'
import { prisma }         from '@/lib/prisma'
import { randomBytes }    from 'crypto'

function requireAdmin(role: string) {
  if (role !== 'OWNER' && role !== 'ADMIN') redirect('/dashboard')
}

export async function updateOrgAction(formData: FormData) {
  const session = await auth()
  if (!session?.activeOrg) redirect('/auth/login')
  requireAdmin(session.activeOrg.role)

  const name       = (formData.get('name') as string).trim()
  const webhookUrl = (formData.get('webhookUrl') as string | null)?.trim() || null

  if (!name || name.length < 2) return { error: 'Name must be at least 2 characters.' }
  if (webhookUrl && !webhookUrl.startsWith('https://')) {
    return { error: 'Webhook URL must start with https://' }
  }

  await prisma.organization.update({
    where: { id: session.activeOrg.id },
    data:  { name, webhookUrl },
  })

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function rotateWebhookSecretAction() {
  const session = await auth()
  if (!session?.activeOrg) redirect('/auth/login')
  requireAdmin(session.activeOrg.role)

  const secret = randomBytes(32).toString('hex')

  await prisma.organization.update({
    where: { id: session.activeOrg.id },
    data:  { webhookSecret: secret },
  })

  revalidatePath('/dashboard/settings')
  return { secret }
}
