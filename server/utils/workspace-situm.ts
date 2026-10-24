import SitumSDK from '@situm/sdk-js'
import { and, eq } from 'drizzle-orm'
import { getDb } from '../db/client'
import { workspaceSitumConfigs, workspaces } from '../db/schema'
import { decryptWorkspaceApiKey } from './workspace-credentials'
import { assertWorkspaceId } from './workspace-owner'

async function getOwnedWorkspaceSitumConfig(event: Parameters<typeof requireUserSession>[0], workspaceId: string) {
  workspaceId = assertWorkspaceId(workspaceId)
  const session = await requireUserSession(event)
  const [config] = await getDb().select({
    workspaceId: workspaceSitumConfigs.workspaceId,
    situmAccountId: workspaceSitumConfigs.situmAccountId,
    encryptedApiKey: workspaceSitumConfigs.encryptedApiKey,
    encryptedViewerApiKey: workspaceSitumConfigs.encryptedViewerApiKey,
  }).from(workspaceSitumConfigs).innerJoin(workspaces, eq(workspaces.id, workspaceSitumConfigs.workspaceId)).where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, session.user.id))).limit(1)
  if (!config) throw createError({ statusCode: 404, statusMessage: 'Workspace Situm configuration not found.' })
  return config
}

export async function getWorkspaceSitumClient(event: Parameters<typeof requireUserSession>[0], workspaceId: string) {
  const config = await getOwnedWorkspaceSitumConfig(event, workspaceId)
  if (!config.encryptedViewerApiKey) throw createError({ statusCode: 409, statusMessage: 'This feature needs an Only Read Situm API key. Add one in Workspace → Situm configuration.' })
  return { client: new SitumSDK({ auth: { apiKey: decryptWorkspaceApiKey(config.encryptedViewerApiKey, config.workspaceId) }, compact: true }), situmAccountId: config.situmAccountId }
}

export async function getWorkspaceSitumApiKey(event: Parameters<typeof requireUserSession>[0], workspaceId: string) {
  const config = await getOwnedWorkspaceSitumConfig(event, workspaceId)
  if (!config.encryptedViewerApiKey) throw createError({ statusCode: 409, statusMessage: 'This feature needs an Only Read Situm API key. Add one in Workspace → Situm configuration.' })
  return decryptWorkspaceApiKey(config.encryptedViewerApiKey, config.workspaceId)
}

export async function getWorkspaceSitumReadWriteClient(event: Parameters<typeof requireUserSession>[0], workspaceId: string) {
  const config = await getOwnedWorkspaceSitumConfig(event, workspaceId)
  if (!config.encryptedApiKey) throw createError({ statusCode: 409, statusMessage: 'This operation needs a Read & Write Situm API key. Add one in Workspace → Situm configuration.' })
  return { client: new SitumSDK({ auth: { apiKey: decryptWorkspaceApiKey(config.encryptedApiKey, config.workspaceId) }, compact: true }), situmAccountId: config.situmAccountId }
}
