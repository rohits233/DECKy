// ---------------------------------------------------------------------------
// Sliding-window rate limiter — in-process, zero dependencies.
//
// Each API key gets a bucket of timestamps for the last 60 seconds.
// On every request we:
//   1. Evict timestamps older than the window
//   2. Check count against the limit
//   3. If allowed, append the current timestamp
//
// PRODUCTION NOTE: This works correctly for a single Next.js process
// (local dev, single Vercel instance). For multi-instance / edge deployments,
// replace with Upstash Ratelimit (@upstash/ratelimit + @upstash/redis) —
// the call-site interface is identical; only this file changes.
//
// Upgrade path:
//   import { Ratelimit } from "@upstash/ratelimit"
//   import { Redis }     from "@upstash/redis"
//   const ratelimit = new Ratelimit({
//     redis: Redis.fromEnv(),
//     limiter: Ratelimit.slidingWindow(limit, "60 s"),
//   })
//   const { success } = await ratelimit.limit(keyId)
// ---------------------------------------------------------------------------

const WINDOW_MS = 60_000 // 1 minute

// Map<apiKeyId, sorted array of request timestamps (ms)>
const buckets = new Map<string, number[]>()

export interface RateLimitResult {
  allowed:    boolean
  remaining:  number  // requests left in current window
  resetAt:    number  // epoch ms when the oldest request falls out of the window
  limit:      number
}

export function checkRateLimit(keyId: string, limitPerMin: number): RateLimitResult {
  const now  = Date.now()
  const prev = buckets.get(keyId) ?? []

  // Evict timestamps outside the rolling window
  const current = prev.filter(t => now - t < WINDOW_MS)

  if (current.length >= limitPerMin) {
    return {
      allowed:   false,
      remaining: 0,
      resetAt:   current[0] + WINDOW_MS, // oldest request expires next
      limit:     limitPerMin,
    }
  }

  current.push(now)
  buckets.set(keyId, current)

  return {
    allowed:   true,
    remaining: limitPerMin - current.length,
    resetAt:   current[0] + WINDOW_MS,
    limit:     limitPerMin,
  }
}
