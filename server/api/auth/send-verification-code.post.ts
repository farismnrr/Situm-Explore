import { randomInt } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../../db/client'
import { registrationVerificationCodes, users } from '../../db/schema'
import { sendRegistrationVerificationCode } from '../../integrations/sensio-env/mail'

const requestSchema = z.object({
  email: z.string().trim().email().max(320),
})

const CODE_TTL_MS = 5 * 60_000
const RESEND_COOLDOWN_MS = 60_000

export default defineEventHandler(async (event) => {
  requireRateLimit(event, 'auth:verification-code', 10, 60_000)

  const parsed = requestSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'A valid email is required.' })

  const email = parsed.data.email.toLowerCase()
  if (!rateLimit(`auth:verification-code-email:${email}`, 5, 15 * 60_000)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many verification-code requests. Try again later.' })
  }

  const db = getDb()
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing[0]) throw createError({ statusCode: 409, statusMessage: 'An account with that email already exists.' })

  const current = await db.select({ resendAvailableAt: registrationVerificationCodes.resendAvailableAt })
    .from(registrationVerificationCodes)
    .where(eq(registrationVerificationCodes.email, email))
    .limit(1)
  const now = new Date()
  const currentCode = current[0]
  if (currentCode && currentCode.resendAvailableAt.getTime() > now.getTime()) {
    throw createError({ statusCode: 429, statusMessage: 'A verification code was requested recently. Try again shortly.' })
  }

  const code = randomInt(100_000, 1_000_000).toString()
  const codeHash = await hashPassword(code)
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS)
  const resendAvailableAt = new Date(now.getTime() + RESEND_COOLDOWN_MS)

  await db.insert(registrationVerificationCodes).values({
    email,
    codeHash,
    expiresAt,
    resendAvailableAt,
    failedAttempts: 0,
    consumedAt: null,
    createdAt: now,
  }).onConflictDoUpdate({
    target: registrationVerificationCodes.email,
    set: { codeHash, expiresAt, resendAvailableAt, failedAttempts: 0, consumedAt: null, createdAt: now },
  })

  try {
    await sendRegistrationVerificationCode(email, code)
  } catch {
    await db.delete(registrationVerificationCodes).where(and(
      eq(registrationVerificationCodes.email, email),
      eq(registrationVerificationCodes.codeHash, codeHash),
      isNull(registrationVerificationCodes.consumedAt),
    ))
    throw createError({ statusCode: 503, statusMessage: 'Verification email is unavailable. Please try again.' })
  }

  return {
    message: 'Verification code sent.',
    expiresAt: expiresAt.toISOString(),
    resendAvailableAt: resendAvailableAt.toISOString(),
  }
})
