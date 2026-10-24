import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../../db/client'
import { workspaces } from '../../db/schema'

const updateSchema = z.object({ name: z.string().trim().min(1).max(120) }).strict()

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const id = getRouterParam(event, 'id')
  const parsed = updateSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'A workspace name is required.' })
  const [workspace] = await getDb()
    .update(workspaces)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(and(eq(workspaces.id, id || ''), eq(workspaces.ownerId, session.user.id)))
    .returning({
      id: workspaces.id,
      name: workspaces.name,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
    })
    .all()
  if (!workspace) throw createError({ statusCode: 404, statusMessage: 'Workspace not found.' })
  return workspace
})
