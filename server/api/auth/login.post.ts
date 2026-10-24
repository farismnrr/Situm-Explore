import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../../db/client'
import { users } from '../../db/schema'

const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(128),
})
const DUMMY_PASSWORD_HASH = '$scrypt$n=16384,r=8,p=1$iILKD1gVSx6bqualYqyLBQ$DNzIISdmTQS6sFdQ1tJ3UCZ7Uun4uGHNjj0x8FHOqB0pf2LYsu9Xaj5MFhHg21qBz8l5q/oxpeV+ZkgTAj+OzQ'

export default defineEventHandler(async (event) => {
  requireRateLimit(event, 'auth:login', 10, 15 * 60_000)

  const parsed = loginSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Email and password are required.' })

  const email = parsed.data.email.toLowerCase()
  requireEmailRateLimit(email, 'auth:login', 10, 15 * 60_000)
  const record = await getDb().select({ id: users.id, email: users.email, passwordHash: users.passwordHash, sessionVersion: users.sessionVersion }).from(users).where(eq(users.email, email)).limit(1)
  const passwordMatches = await verifyPassword(record[0]?.passwordHash || DUMMY_PASSWORD_HASH, parsed.data.password)

  if (!record[0] || !passwordMatches) throw createError({ statusCode: 401, statusMessage: 'Invalid credentials.' })

  await setUserSession(event, { user: { id: record[0].id, email: record[0].email, sessionVersion: record[0].sessionVersion } })
  return { ok: true }
})
