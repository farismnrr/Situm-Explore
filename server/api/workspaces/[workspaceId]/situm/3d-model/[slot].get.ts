import { serveWorkspace3dModel } from '../../../../../utils/indoor-3d-model'

export default defineEventHandler(event => serveWorkspace3dModel(
  event,
  getRouterParam(event, 'workspaceId') || '',
  getRouterParam(event, 'slot')
))
