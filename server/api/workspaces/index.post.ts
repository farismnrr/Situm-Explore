import { z } from 'zod'
import { getDb } from '../../db/client'
import { workspaces } from '../../db/schema'

const createSchema = z.object({ name: z.string().trim().min(1).max(120) })

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const parsed = createSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'A workspace name is required.' })
  const [workspace] = await getDb()
    .insert(workspaces)
    .values({ ownerId: session.user.id, name: parsed.data.name })
    .returning({
      id: workspaces.id,
      name: workspaces.name,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
    })
    .all()
  if (!workspace) throw createError({ statusCode: 500, statusMessage: 'Unable to create workspace.' })
  return workspace
})
