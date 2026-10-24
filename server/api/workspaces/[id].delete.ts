import { and, eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { workspaces } from '../../db/schema'
import { ensureClickHouseSchema } from '../../integrations/clickhouse/schema'
import { deleteWorkspaceAnalytics } from '../../integrations/clickhouse/analytics'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = getRouterParam(event, 'id') || ''
  const [owned] = await getDb().select({ id: workspaces.id }).from(workspaces).where(and(eq(workspaces.id, id), eq(workspaces.ownerId, session.user.id))).limit(1)
  if (!owned) throw createError({ statusCode: 404, statusMessage: 'Workspace not found.' })

  try {
    await ensureClickHouseSchema()
    await deleteWorkspaceAnalytics(id)
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Workspace analytics could not be cleaned up; the workspace was not deleted.' })
  }

  const [workspace] = await getDb()
    .delete(workspaces)
    .where(and(eq(workspaces.id, id), eq(workspaces.ownerId, session.user.id)))
    .returning({ id: workspaces.id })
    .all()
  if (!workspace) throw createError({ statusCode: 404, statusMessage: 'Workspace not found.' })
  return { ok: true }
})
