import { z } from 'zod'
import { syncSitumReport } from '../../../../integrations/situm/reports'
import { isValidDateRange } from '../../../../utils/date-range'
import { requireOwnedWorkspace } from '../../../../utils/workspace-owner'
import { getWorkspaceSitumApiKey } from '../../../../utils/workspace-situm'
import { ensureClickHouseSchema } from '../../../../integrations/clickhouse/schema'
import { requireUserRateLimit } from '../../../../utils/rate-limit'

const syncSchema = z.object({
  report: z.enum(['visitors', 'positioning_time', 'geofencing_stay_time']),
  fromDate: z.string(),
  toDate: z.string(),
  buildingId: z.number().int().positive().optional(),
  buildingIds: z.array(z.number().int().positive()).max(100).optional(),
})

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  requireUserRateLimit(session.user.id, 'workspace-analytics-sync', 10, 15 * 60_000)
  const workspaceId = await requireOwnedWorkspace(event, getRouterParam(event, 'workspaceId') || '')
  const apiKey = await getWorkspaceSitumApiKey(event, workspaceId)
  const parsed = syncSchema.safeParse(await readBody(event))
  if (!parsed.success || !isValidDateRange(parsed.data.fromDate, parsed.data.toDate)) throw createError({ statusCode: 400, statusMessage: 'A valid analytics sync request is required.' })
  const body = parsed.data
  await ensureClickHouseSchema()
  return syncSitumReport({ workspaceId, apiKey, report: body.report, fromDate: body.fromDate, toDate: body.toDate, buildingId: body.buildingId, buildingIds: body.buildingIds })
})
