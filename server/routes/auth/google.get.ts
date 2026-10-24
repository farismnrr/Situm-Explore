import { and, eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { providerIdentities, users } from '../../db/schema'

const googleHandler = defineOAuthGoogleEventHandler({
  async onSuccess(event, { user }) {
    const profile = user as { sub?: string; id?: string; email?: string; email_verified?: boolean; verified_email?: boolean }
    const providerAccountId = profile.sub || profile.id
    const email = profile.email?.trim().toLowerCase()
    const verified = profile.email_verified === true || profile.verified_email === true

    if (!providerAccountId || !email || !verified) throw createError({ statusCode: 403, statusMessage: 'Google account verification is unavailable.' })

    const db = getDb()
    const linked = await db.select({ id: users.id, email: users.email, sessionVersion: users.sessionVersion }).from(providerIdentities).innerJoin(users, eq(providerIdentities.userId, users.id)).where(and(eq(providerIdentities.provider, 'google'), eq(providerIdentities.providerAccountId, providerAccountId))).limit(1)
    let account = linked[0]
    if (!account) {
      const existing = await db.select({ id: users.id, email: users.email, sessionVersion: users.sessionVersion }).from(users).where(eq(users.email, email)).limit(1)
      if (existing[0]) account = existing[0]
      else [account] = await db
        .insert(users)
        .values({ email })
        .returning({ id: users.id, email: users.email, sessionVersion: users.sessionVersion })
        .all()
      if (!account) throw createError({ statusCode: 500, statusMessage: 'Unable to create account.' })
      await db.insert(providerIdentities).values({ userId: account.id, provider: 'google', providerAccountId }).onConflictDoNothing()
    }

    await setUserSession(event, { user: { id: account.id, email: account.email, sessionVersion: account.sessionVersion } })
    return sendRedirect(event, '/app')
  },
})

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  if (!config.oauth.google.clientId || !config.oauth.google.clientSecret) throw createError({ statusCode: 404, statusMessage: 'Google sign-in is not enabled.' })
  return googleHandler(event)
})
