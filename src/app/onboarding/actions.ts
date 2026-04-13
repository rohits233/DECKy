'use server'

import { redirect }  from 'next/navigation'
import { auth, update } from '@/auth'
import { prisma }    from '@/lib/prisma'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

export async function createOrgAction(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const name = (formData.get('name') as string | null)?.trim()
  if (!name || name.length < 2) redirect('/onboarding')

  // Generate a unique slug (append random suffix on collision)
  let slug     = slugify(name)
  const exists = await prisma.organization.findUnique({ where: { slug } })
  if (exists) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      users: {
        create: {
          userId: session.user.id,
          role:   'OWNER',
        },
      },
    },
  })

  // Refresh the session JWT so the new org is immediately in context
  await update({ refreshOrgs: true, activeOrgId: org.id })

  redirect('/dashboard')
}
