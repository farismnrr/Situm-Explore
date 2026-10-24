import { sealSession } from 'h3'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../../db/client'
import { users } from '../../db/schema'
import { mobileSessionConfig } from '../../utils/mobile-session'

const schema = z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(128) })
const DUMMY_PASSWORD_HASH = '$scrypt$n=16384,r=8,p=1$iILKD1gVSx6bqualYqyLBQ$DNzIISdmTQS6sFdQ1tJ3UCZ7Uun4uGHNjj0x8FHOqB0pf2LYsu9Xaj5MFhHg21qBz8l5q/oxpeV+ZkgTAj+OzQ'

export default defineEventHandler(async (event) => {
  requireRateLimit(event, 'auth:mobile-login', 10, 15 * 60_000)
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Email and password are required.' })
  const email = parsed.data.email.toLowerCase()
  requireEmailRateLimit(email, 'auth:login', 10, 15 * 60_000)
  const [record] = await getDb().select({ id: users.id, email: users.email, passwordHash: users.passwordHash, sessionVersion: users.sessionVersion }).from(users).where(eq(users.email, email)).limit(1)
  const matches = await verifyPassword(record?.passwordHash || DUMMY_PASSWORD_HASH, parsed.data.password)
  if (!record || !matches) throw createError({ statusCode: 401, statusMessage: 'Invalid credentials.' })
  const config = mobileSessionConfig()
  await setUserSession(event, { user: { id: record.id, email: record.email, sessionVersion: record.sessionVersion } }, config)
  const session = await sealSession(event, config)
  return { ok: true, session, user: { id: record.id, email: record.email } }
})
