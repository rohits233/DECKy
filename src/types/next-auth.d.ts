import type { OrgRole, PlanTier } from "@prisma/client"
import "next-auth"
import "next-auth/jwt"

// ---------------------------------------------------------------------------
// OrgContext — the org-scoped payload embedded in both the JWT and session.
// Exported so auth.ts and the middleware can share the same shape.
// ---------------------------------------------------------------------------
export type OrgContext = {
  id:       string
  slug:     string
  name:     string
  role:     OrgRole    // from the OrgMembership row — enforced by middleware
  planTier: PlanTier   // from the Organization row — used for feature gates
}

// ---------------------------------------------------------------------------
// Augment next-auth Session so useSession() / auth() are fully typed
// ---------------------------------------------------------------------------
declare module "next-auth" {
  interface Session {
    user: {
      id:    string       // our internal UUID (not the provider sub)
      email: string
      name?:  string | null
      image?: string | null
    }
    // The org the user is currently operating as — null only during onboarding
    activeOrg: OrgContext | null
    // All orgs the user belongs to — drives the OrgSwitcher dropdown
    orgs: OrgContext[]
    // Used in update() calls to trigger JWT refresh side-effects
    activeOrgId?: string
    refreshOrgs?: boolean
  }
}

// ---------------------------------------------------------------------------
// Augment the JWT so our callbacks are typed end-to-end
// ---------------------------------------------------------------------------
declare module "next-auth/jwt" {
  interface JWT {
    userId:      string
    activeOrgId: string | null
    orgs:        OrgContext[]
  }
}
