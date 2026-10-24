type Bucket = { count: number, resetAt: number }

const buckets = new Map<string, Bucket>()

// Single-process, in-memory fixed-window limiter. Deliberately not
// distributed: this app runs as one Nitro server process (see Plan 026),
// so a shared store like Redis is not justified for this purpose.
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  pruneExpired(now)
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false
  bucket.count += 1
  return true
}

// Cleanup piggybacks on normal limiter operation (no background timers):
// every call sheds already-expired buckets so the map cannot grow without
// bound as more unique identities are seen.
function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function requireRateLimit(event: Parameters<typeof getRequestIP>[0], scope: string, limit: number, windowMs: number): void {
  const trustProxy = process.env.TRUSTED_PROXY === 'true'
  const ip = getRequestIP(event, { xForwardedFor: trustProxy }) || 'unknown'
  if (!rateLimit(`${scope}:${ip}`, limit, windowMs)) throw createError({ statusCode: 429, statusMessage: 'Too many requests. Try again later.' })
}

export function requireUserRateLimit(userId: string, scope: string, limit: number, windowMs: number): void {
  if (!rateLimit(`${scope}:user:${userId}`, limit, windowMs)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests. Try again later.' })
  }
}

export function requireEmailRateLimit(email: string, scope: string, limit: number, windowMs: number): void {
  if (!rateLimit(`${scope}:email:${email}`, limit, windowMs)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many sign-in attempts. Try again later.' })
  }
}
