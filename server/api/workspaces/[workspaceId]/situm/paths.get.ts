import type { SitumPathsResponse } from '#shared/situm-paths'
import { getWorkspaceSitumClient } from '../../../../utils/workspace-situm'

export default defineEventHandler(async (event): Promise<SitumPathsResponse> => {
  const { client } = await getWorkspaceSitumClient(event, getRouterParam(event, 'workspaceId') || '')
  const query = getQuery(event)
  if (query.buildingId === undefined) return { paths: await client.cartography.getPaths() }
  const buildingId = Number(query.buildingId)
  if (!Number.isInteger(buildingId) || buildingId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'A valid building ID is required.' })
  }
  return { paths: await client.cartography.getPaths({ buildingId }) }
})
