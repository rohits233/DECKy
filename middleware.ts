import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextAuthRequest } from "next-auth"

// auth() wraps our middleware so req.auth is populated from the JWT —
// no DB call per request; everything comes from the signed token.
export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // ── 1. Unauthenticated ──────────────────────────────────────────────────
  if (!session) {
    const loginUrl = new URL("/auth/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname) // restore destination after login
    return NextResponse.redirect(loginUrl)
  }

  // ── 2. Authenticated but no org yet (new user, hasn't completed onboarding)
  if (!session.activeOrg && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/onboarding", req.url))
  }

  // ── 3. Role-based route guards ───────────────────────────────────────────
  // Admin-only routes: settings, billing, member management, API keys
  const isAdminRoute =
    pathname.startsWith("/dashboard/settings") ||
    pathname.startsWith("/dashboard/billing")  ||
    pathname.startsWith("/dashboard/members")  ||
    pathname.startsWith("/dashboard/api-keys")

  if (isAdminRoute) {
    const role = session.activeOrg?.role
    if (role !== "OWNER" && role !== "ADMIN") {
      // Redirect non-admins to the dashboard root rather than a hard 403,
      // so they don't see a broken page — they just can't navigate there.
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  // ── 4. Plan-tier feature gates ───────────────────────────────────────────
  // API key management requires STARTER or above
  if (pathname.startsWith("/dashboard/api-keys")) {
    const tier = session.activeOrg?.planTier
    if (tier === "FREE") {
      return NextResponse.redirect(new URL("/dashboard/billing?upgrade=api-keys", req.url))
    }
  }

  return NextResponse.next()
})

// Only run middleware on protected routes.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
  ],
}
