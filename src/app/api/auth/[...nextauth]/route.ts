// NextAuth v5 App Router handler — re-exports the GET/POST handlers
// from our root auth.ts config. All NextAuth endpoints (/auth/signin,
// /auth/callback/google, /auth/session, etc.) are handled here.
import { handlers } from "@/auth"

export const { GET, POST } = handlers
