import SitumSDK, { SitumApiPermissionLevel } from '@situm/sdk-js'
import { and, eq } from 'drizzle-orm'
import { getDb } from '../../../../db/client'
import { workspaceSitumConfigs, workspaces } from '../../../../db/schema'
import { decryptWorkspaceApiKey } from '../../../../utils/workspace-credentials'
import { assertWorkspaceId } from '../../../../utils/workspace-owner'
import { requireUserRateLimit } from '../../../../utils/rate-limit'

async function validateCredential(encrypted: string, workspaceId: string, permission: SitumApiPermissionLevel, accountId: string) {
  const sdk = new SitumSDK({ auth: { apiKey: decryptWorkspaceApiKey(encrypted, workspaceId) }, compact: true })
  const auth = await sdk.authSession
  if (auth.apiPermissionLevel !== permission || auth.organizationId !== accountId) throw new Error('Credential context mismatch')
  return sdk
}

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  requireUserRateLimit(session.user.id, 'workspace-situm-check', 10, 15 * 60_000)
  const workspaceId = assertWorkspaceId(getRouterParam(event, 'workspaceId') || '')
  const [config] = await getDb().select({
    situmAccountId: workspaceSitumConfigs.situmAccountId,
    encryptedApiKey: workspaceSitumConfigs.encryptedApiKey,
    encryptedViewerApiKey: workspaceSitumConfigs.encryptedViewerApiKey,
  }).from(workspaceSitumConfigs).innerJoin(workspaces, eq(workspaceSitumConfigs.workspaceId, workspaces.id)).where(and(eq(workspaceSitumConfigs.workspaceId, workspaceId), eq(workspaces.ownerId, session.user.id))).limit(1)
  if (!config) throw createError({ statusCode: 404, statusMessage: 'Situm configuration not found.' })

  try {
    if (config.encryptedApiKey) await validateCredential(config.encryptedApiKey, workspaceId, SitumApiPermissionLevel.READ_WRITE, config.situmAccountId)
    if (config.encryptedViewerApiKey) await validateCredential(config.encryptedViewerApiKey, workspaceId, SitumApiPermissionLevel.READ_ONLY, config.situmAccountId)
  } catch {
    throw createError({ statusCode: 422, statusMessage: 'One or more configured Situm API keys are no longer valid or no longer have the expected permission.' })
  }

  return {
    valid: true,
    status: 'validated',
    accountContext: 'matched',
    readWriteConfigured: Boolean(config.encryptedApiKey),
    readOnlyConfigured: Boolean(config.encryptedViewerApiKey),
  }
})
