import { createError } from 'h3'
import { decryptWorkspaceApiKey } from './workspace-credentials'

export type MobilePositioningConfig = { encryptedViewerApiKey: string | null, situmAccountId: string }

export async function resolveMobilePositioningCredential(input: { workspaceId: string, userId: string, findOwnedConfig: (workspaceId: string, userId: string) => Promise<MobilePositioningConfig | undefined>, decryptApiKey?: (value: string, workspaceId: string) => string }) {
  const config = await input.findOwnedConfig(input.workspaceId, input.userId)
  if (!config) throw createError({ statusCode: 404, statusMessage: 'Workspace Situm configuration not found.' })
  if (!config.encryptedViewerApiKey) throw createError({ statusCode: 409, statusMessage: 'Mobile positioning needs an Only Read Situm API key. Add one in Workspace → Situm configuration.' })
  return { configured: true, workspaceId: input.workspaceId, situmAccountId: config.situmAccountId, apiKey: (input.decryptApiKey || decryptWorkspaceApiKey)(config.encryptedViewerApiKey, input.workspaceId) }
}
