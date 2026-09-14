import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../../db/client'
import { registrationVerificationCodes, users } from '../../db/schema'

const registrationSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  code: z.string().regex(/^\d{6}$/),
})

export default defineEventHandler(async (event) => {
  requireRateLimit(event, 'auth:register', 5, 60_000)

  const parsed = registrationSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'A valid email, password, and 6-digit verification code are required.' })

  const email = parsed.data.email.toLowerCase()
  const db = getDb()

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing[0]) throw createError({ statusCode: 409, statusMessage: 'An account with that email already exists.' })

  const [verification] = await db.select({
    codeHash: registrationVerificationCodes.codeHash,
    expiresAt: registrationVerificationCodes.expiresAt,
    consumedAt: registrationVerificationCodes.consumedAt,
    failedAttempts: registrationVerificationCodes.failedAttempts,
  }).from(registrationVerificationCodes).where(eq(registrationVerificationCodes.email, email)).limit(1)

  if (!verification || verification.consumedAt || verification.expiresAt.getTime() <= Date.now() || verification.failedAttempts >= 5) {
    throw createError({ statusCode: 401, statusMessage: 'Verification code is invalid or expired.' })
  }

  const codeMatches = await verifyPassword(verification.codeHash, parsed.data.code)
  if (!codeMatches) {
    await db.update(registrationVerificationCodes)
      .set({ failedAttempts: sql`${registrationVerificationCodes.failedAttempts} + 1` })
      .where(and(
        eq(registrationVerificationCodes.email, email),
        eq(registrationVerificationCodes.codeHash, verification.codeHash),
        isNull(registrationVerificationCodes.consumedAt),
      ))
    throw createError({ statusCode: 401, statusMessage: 'Verification code is invalid or expired.' })
  }

  const passwordHash = await hashPassword(parsed.data.password)

  try {
    const user = await db.transaction(async (tx) => {
      const now = new Date()
      const consumed = await tx.update(registrationVerificationCodes)
        .set({ consumedAt: now })
        .where(and(
          eq(registrationVerificationCodes.email, email),
          eq(registrationVerificationCodes.codeHash, verification.codeHash),
          isNull(registrationVerificationCodes.consumedAt),
          gt(registrationVerificationCodes.expiresAt, now),
        ))
        .returning({ email: registrationVerificationCodes.email })
      if (consumed.length !== 1) throw createError({ statusCode: 401, statusMessage: 'Verification code is invalid or expired.' })

      const [created] = await tx.insert(users).values({ email, passwordHash }).returning({
        id: users.id,
        email: users.email,
        sessionVersion: users.sessionVersion,
      })
      return created
    })

    if (!user) throw createError({ statusCode: 500, statusMessage: 'Unable to create account.' })
    await setUserSession(event, { user: { id: user.id, email: user.email, sessionVersion: user.sessionVersion } })
    return { ok: true, user: { id: user.id, email: user.email } }
  } catch (error: unknown) {
    if ((error as { code?: string }).code === '23505') throw createError({ statusCode: 409, statusMessage: 'An account with that email already exists.' })
    throw error
  }
})
