import { eq } from 'drizzle-orm'
import { appSettings, users } from '../db/schema'
import { getDb } from '../db/client'
import { withServerSpan } from '../utils/telemetry'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const user = await withServerSpan(
    event,
    'db.user_lookup',
    { 'db.system': 'sqlite', 'db.operation.name': 'select', 'app.user_id': session.user.id },
    () => getDb()
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
  )
  if (!user[0]) {
    await clearUserSession(event)
    throw createError({ statusCode: 401, statusMessage: 'Authentication required.' })
  }
  try {
    const records = await withServerSpan(
      event,
      'db.foundation_lookup',
      { 'db.system': 'sqlite', 'db.operation.name': 'select' },
      () => getDb()
        .select({ key: appSettings.key, value: appSettings.value })
        .from(appSettings)
        .where(eq(appSettings.key, 'foundation'))
        .limit(1),
    )
    return { status: records[0] ? 'connected' : 'connected-empty', setting: records[0] ?? null, user: user[0] }
  } catch (error: unknown) {
    const databaseError = error as { code?: string; message?: string }
    if (databaseError.code === 'SQLITE_ERROR' && databaseError.message?.includes('no such table: app_settings')) {
      return { status: 'not-migrated', setting: null, user: user[0] }
    }
    throw createError({ statusCode: 503, statusMessage: 'Database is unavailable.' })
  }
})
