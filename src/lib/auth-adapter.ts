import type { Adapter } from "next-auth/adapters"
import { prisma } from "./prisma"

// ---------------------------------------------------------------------------
// Minimal Prisma adapter for Decky
//
// NextAuth requires an adapter when any provider needs server-side token
// storage (Email/Resend magic link, SAML). We only implement the two token
// methods — everything else stays in our JWT callbacks.
//
// If you later need full session storage (e.g. for server-side session
// revocation), swap this for @auth/prisma-adapter and align the User/Account
// model shapes, or add the missing methods here.
// ---------------------------------------------------------------------------

export const deckAdapter: Adapter = {
  // ── Verification tokens (magic link / email OTP) ─────────────────────────

  async createVerificationToken({ identifier, expires, token }) {
    return prisma.verificationToken.create({ data: { identifier, token, expires } })
  },

  async useVerificationToken({ identifier, token }) {
    try {
      // DELETE-on-use — tokens are single-use by design
      return await prisma.verificationToken.delete({
        where: { identifier_token: { identifier, token } },
      })
    } catch {
      // Token already used or expired — return null so NextAuth rejects the attempt
      return null
    }
  },

  // ── User methods — delegated to our JWT callbacks, not used by the adapter ─
  // NextAuth's type requires these to be present even when JWT strategy is
  // active. They are never called for our Email/Credentials/OAuth flow.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createUser(user)         { return { ...user, id: "" } as any },
  async getUser()                { return null },
  async getUserByEmail()         { return null },
  async getUserByAccount()       { return null },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateUser(user)         { return { ...user, id: user.id ?? "" } as any },
  async deleteUser()             { },
  async linkAccount()            { return undefined },
  async createSession()          { return { sessionToken: "", userId: "", expires: new Date() } },
  async getSessionAndUser()      { return null },
  async updateSession()          { return null },
  async deleteSession()          { },
}
