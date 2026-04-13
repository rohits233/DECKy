'use server'

import { redirect }    from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { auth }        from '@/auth'
import { prisma }      from '@/lib/prisma'
import { randomBytes, createHash } from 'crypto'

function requireAdmin(role: string) {
  if (role !== 'OWNER' && role !== 'ADMIN') redirect('/dashboard')
}

export async function createApiKeyAction(formData: FormData) {
  const session = await auth()
  if (!session?.activeOrg) redirect('/auth/login')
  requireAdmin(session.activeOrg.role)

  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'Key name is required.' }

  // Generate: sk_live_<32 random hex bytes>
  const rawKey    = `sk_live_${randomBytes(32).toString('hex')}`
  const keyPrefix = rawKey.slice(0, 16)    // "sk_live_" + first 8 hex chars
  const keyHash   = createHash('sha256').update(rawKey).digest('hex')

  const tier           = session.activeOrg.planTier === 'ENTERPRISE' ? 'UNLIMITED'
                       : session.activeOrg.planTier === 'GROWTH'     ? 'PREMIUM'
                       : 'STANDARD'
  const requestsPerMin = tier === 'UNLIMITED' ? 99999 : tier === 'PREMIUM' ? 600 : 60

  await prisma.apiKey.create({
    data: {
      orgId:       session.activeOrg.id,
      createdById: session.user!.id!,
      name,
      keyPrefix,
      keyHash,
      tier,
      requestsPerMin,
    },
  })

  revalidatePath('/dashboard/api-keys')

  // Return the plaintext key — shown once, never retrievable again
  return { key: rawKey }
}

export async function revokeApiKeyAction(keyId: string) {
  const session = await auth()
  if (!session?.activeOrg) redirect('/auth/login')
  requireAdmin(session.activeOrg.role)

  // Verify the key belongs to this org before revoking
  await prisma.apiKey.updateMany({
    where: { id: keyId, orgId: session.activeOrg.id, revokedAt: null },
    data:  { revokedAt: new Date() },
  })

  revalidatePath('/dashboard/api-keys')
}
