import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Resend from "next-auth/providers/resend"
import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { deckAdapter } from "@/lib/auth-adapter"
import type { OrgContext } from "@/types/next-auth"

// ---------------------------------------------------------------------------
// Enterprise SSO stub — custom OAuth provider shape.
//
// TODAY: reads from env vars pointing at your IdP's OAuth2 endpoints.
// This works for any IdP that exposes standard OAuth2 (Okta, Azure AD,
// PingFederate). For SAML specifically, see the EXTENDING TO SAML section
// at the bottom of this file.
//
// The `profile` function normalises the IdP's userinfo response into the
// shape NextAuth expects. Different IdPs use different claim names:
//   Okta:     profile.sub, profile.email, profile.name
//   Azure AD: profile.oid, profile.upn,   profile.displayName
//   WorkOS:   profile.id,  profile.email, profile.first_name
//
// When you're ready to go live, replace this stub with one of:
//   A) @auth/workos-adapter  — managed SAML/OIDC, handles cert rotation
//   B) BoxyHQ SAML Jackson   — self-hosted, stores per-org SAML config in DB
//   C) Okta / Azure AD OIDC  — keep this shape, just fill in real endpoints
// ---------------------------------------------------------------------------
function EnterpriseSSO(
  _options: OAuthUserConfig<Record<string, unknown>>
): OAuthConfig<Record<string, unknown>> {
  return {
    id:   "enterprise-sso",
    name: "Enterprise SSO",
    type: "oauth",

    // TODO: swap these for real IdP discovery URLs or hardcode per-org
    // in a dynamic provider (see EXTENDING TO SAML below)
    authorization: process.env.ENTERPRISE_SSO_AUTHORIZATION_URL ?? "https://stub.example.com/oauth/authorize",
    token:         process.env.ENTERPRISE_SSO_TOKEN_URL         ?? "https://stub.example.com/oauth/token",
    userinfo:      process.env.ENTERPRISE_SSO_USERINFO_URL      ?? "https://stub.example.com/userinfo",

    clientId:     process.env.ENTERPRISE_SSO_CLIENT_ID     ?? "stub-client-id",
    clientSecret: process.env.ENTERPRISE_SSO_CLIENT_SECRET ?? "stub-client-secret",

    // Normalise IdP claims → NextAuth user object.
    // Real SAML assertions arrive here as JSON after your SAML proxy
    // (WorkOS / BoxyHQ) converts them to OAuth2 userinfo.
    profile(profile) {
      return {
        id:    profile.sub as string ?? profile.id as string,
        email: profile.email as string,
        name:  profile.name as string ?? profile.displayName as string,
        // Carry the raw IdP profile so signIn callback can map to org
        idpProfile: profile,
      }
    },

    checks: ["pkce", "state"],
  }
}

export const { handlers, auth, signIn, signOut, unstable_update: update } = NextAuth({
  // JWT strategy — no NextAuth session tables needed. Org context lives
  // in the token so every request is self-contained (no DB round-trip on
  // each page load). Trade-off: org membership changes aren't instant;
  // they take effect on next sign-in or explicit session refresh.
  session: { strategy: "jwt" },

  // Adapter is only used for VerificationToken (magic link).
  // All user/session logic stays in JWT callbacks.
  adapter: deckAdapter,

  pages: {
    signIn:    "/auth/login",
    newUser:   "/onboarding",   // first-login → org create / accept invite
    verifyRequest: "/auth/verify-email", // "check your inbox" page
  },

  providers: [
    // -------------------------------------------------------------------------
    // Google OAuth — only registered when keys are present
    // -------------------------------------------------------------------------
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      Google({
        clientId:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: { params: { scope: "openid email profile" } },
      }),
    ] : []),

    // -------------------------------------------------------------------------
    // Magic link — only registered when RESEND_KEY is present
    // -------------------------------------------------------------------------
    ...(process.env.RESEND_KEY ? [
      Resend({
        apiKey: process.env.RESEND_KEY,
        from:   process.env.AUTH_RESEND_FROM ?? "Decky <noreply@decky.app>",
        sendVerificationRequest: async ({ identifier: email, url, provider }) => {
          const { Resend: ResendClient } = await import("resend")
          const client = new ResendClient(provider.apiKey as string)
          await client.emails.send({
            from:    provider.from as string,
            to:      email,
            subject: "Sign in to Decky",
            html: `
              <p>Click the link below to sign in. This link expires in 10 minutes and can only be used once.</p>
              <p><a href="${url}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Sign in to Decky</a></p>
              <p style="color:#6b7280;font-size:12px">Or copy this URL: ${url}</p>
            `,
          })
        },
      }),
    ] : []),

    // -------------------------------------------------------------------------
    // Email / Password — bcrypt compare on every attempt
    // -------------------------------------------------------------------------
    Credentials({
      name: "Email",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user?.passwordHash) return null

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.displayName, image: user.avatarUrl }
      },
    }),

    // -------------------------------------------------------------------------
    // Enterprise SSO (stub) — SAML-ready OAuth2 shell
    // -------------------------------------------------------------------------
    EnterpriseSSO({}),
  ],

  callbacks: {
    // -------------------------------------------------------------------------
    // signIn — upsert our users table for every OAuth / magic-link sign-in.
    // Credentials are handled in authorize() above.
    // -------------------------------------------------------------------------
    async signIn({ user, account }) {
      // Resend magic link: user.email is set, account.provider === "resend"
      // Google OAuth:      account.provider === "google"
      // Enterprise SSO:    account.provider === "enterprise-sso"
      const oauthProviders = ["google", "resend", "enterprise-sso"]

      if (account && oauthProviders.includes(account.provider) && user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } })

        if (!existing) {
          await prisma.user.create({
            data: {
              authProviderId: account.providerAccountId,
              email:          user.email,
              displayName:    user.name  ?? null,
              avatarUrl:      user.image ?? null,
            },
          })
        } else if (!existing.authProviderId) {
          // Link OAuth identity to existing email/pass account
          await prisma.user.update({
            where: { id: existing.id },
            data:  { authProviderId: account.providerAccountId },
          })
        }

        // Enterprise SSO: enforce that the email domain matches an org with
        // SSO configured. Block sign-in if no matching org found.
        if (account.provider === "enterprise-sso") {
          const domain = user.email.split("@")[1]
          const org = await prisma.organization.findFirst({
            where: {
              ssoConfig: { path: ["domain"], equals: domain },
              planTier:  { in: ["ENTERPRISE"] },
            },
          })
          if (!org) return false // deny — domain not registered for SSO
        }
      }
      return true
    },

    // -------------------------------------------------------------------------
    // jwt — load org context on first sign-in; handle org switch + refresh.
    // -------------------------------------------------------------------------
    async jwt({ token, user, trigger, session }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } })
        if (dbUser) {
          token.userId      = dbUser.id
          token.orgs        = await loadOrgContext(dbUser.id)
          token.activeOrgId = (token.orgs as OrgContext[])[0]?.id ?? null
        }
      }

      if (trigger === "update" && session?.activeOrgId) {
        const isMember = (token.orgs as OrgContext[]).some(o => o.id === session.activeOrgId)
        if (isMember) token.activeOrgId = session.activeOrgId
      }

      if (trigger === "update" && session?.refreshOrgs && token.userId) {
        token.orgs = await loadOrgContext(token.userId as string)
        const stillMember = (token.orgs as OrgContext[]).some(o => o.id === token.activeOrgId)
        if (!stillMember) token.activeOrgId = (token.orgs as OrgContext[])[0]?.id ?? null
      }

      return token
    },

    async session({ session, token }) {
      session.user.id   = token.userId   as string
      session.orgs      = token.orgs     as OrgContext[]
      session.activeOrg = (token.orgs as OrgContext[]).find(o => o.id === token.activeOrgId) ?? null
      return session
    },
  },
})

// ---------------------------------------------------------------------------
// Helper — loads active org memberships for JWT payload
// ---------------------------------------------------------------------------
async function loadOrgContext(userId: string): Promise<OrgContext[]> {
  const memberships = await prisma.orgMembership.findMany({
    where:   { userId, deletedAt: null },
    include: { org: { select: { id: true, slug: true, name: true, planTier: true } } },
    orderBy: { createdAt: "asc" },
  })
  return memberships.map((m) => ({
    id:       m.org.id,
    slug:     m.org.slug,
    name:     m.org.name,
    role:     m.role,
    planTier: m.org.planTier,
  }))
}

// =============================================================================
// EXTENDING TO SAML
// =============================================================================
//
// SAML is just OAuth2 with XML assertions instead of JSON userinfo. The two
// most practical paths from this stub:
//
// ── A) WorkOS (recommended for speed) ────────────────────────────────────────
//
//   npm install @auth/workos-provider
//
//   import WorkOS from "@auth/workos-provider"
//   providers: [WorkOS({ clientId: process.env.WORKOS_CLIENT_ID! })]
//
//   WorkOS handles: cert rotation, IdP discovery, SP metadata generation,
//   per-org connection config (stored in their dashboard, not your DB).
//   Your signIn callback receives a normalised profile — same shape as above.
//   The `ssoConfig.connectionId` on Organization maps to a WorkOS Connection ID.
//
// ── B) BoxyHQ SAML Jackson (self-hosted) ─────────────────────────────────────
//
//   npm install @boxyhq/saml-jackson
//   Deploy Jackson as a sidecar (Docker) or use their hosted service.
//
//   Jackson exposes an OAuth2 proxy in front of SAML — so this EnterpriseSSO
//   provider shape works unchanged. Just point the URLs at Jackson:
//     authorization: https://jackson.yourdomain.com/api/oauth/authorize
//     token:         https://jackson.yourdomain.com/api/oauth/token
//     userinfo:      https://jackson.yourdomain.com/api/oauth/userinfo
//
//   Per-org SAML config (entityId, metadataUrl, ACS URL) is stored in Jackson's
//   DB and mapped by `tenant` + `product`. Store the Jackson `tenant` value in
//   org.ssoConfig.connectionId.
//
// ── C) Dynamic per-org provider (multi-IdP) ──────────────────────────────────
//
//   When different orgs use different IdPs, generate providers dynamically:
//
//   async function getProvidersForRequest(req) {
//     const orgSlug = req.nextUrl.searchParams.get("org")
//     const org = await prisma.organization.findUnique({ where: { slug: orgSlug } })
//     if (!org?.ssoConfig) return []
//     const cfg = org.ssoConfig as { provider: string; authUrl: string; ... }
//     return [EnterpriseSSO({ ...cfg })]
//   }
//
//   Then pass to NextAuth({ providers: [...baseProviders, ...dynamicProviders] })
//
// ── What stays the same ───────────────────────────────────────────────────────
//
//   • The VerificationToken table is not used for SAML (no email OTP needed).
//   • The signIn callback domain-check logic above works for all three paths.
//   • The JWT callbacks, session shape, and OrgSwitcher are all provider-agnostic.
//   • org.ssoConfig JSON is already in the DB — add fields without a migration.
// =============================================================================
