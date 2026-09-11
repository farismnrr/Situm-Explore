import type { SitumPathsResponse } from '#shared/situm-paths'
import { getWorkspaceSitumClient } from '../../../../utils/workspace-situm'

export default defineEventHandler(async (event): Promise<SitumPathsResponse> => {
  const { client } = await getWorkspaceSitumClient(event, getRouterParam(event, 'workspaceId') || '')
  return { paths: await client.cartography.getPaths() }
})
