import { readFile } from 'node:fs/promises'
import { boundedFetch } from '../../utils/bounded-fetch'

type SensioEnvironmentSnapshot = {
  data: Record<string, string>
  revision: number
  sharedRevision?: number | null
}

type CachedSnapshot = {
  cacheKey: string
  expiresAt: number
  snapshot: SensioEnvironmentSnapshot
}

let cachedSnapshot: CachedSnapshot | null = null

async function resolveConfigToken(inlineToken: string, tokenFile: string) {
  const inline = inlineToken.trim()
  if (inline) return inline
  const path = tokenFile.trim()
  if (!path) throw new Error('Sensio Env service token is not configured.')
  const fromFile = (await readFile(path, 'utf8')).trim()
  if (!fromFile) throw new Error('Sensio Env service token file is empty.')
  return fromFile
}

function internalSnapshotUrl(baseUrl: string, workspaceId: string, projectId: string) {
  const parsed = new URL(baseUrl)
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('Sensio Env base URL is invalid.')
  }
  const basePath = parsed.pathname.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')
  parsed.pathname = `${basePath}/api/internal/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/env`
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString()
}

function parseSnapshot(value: unknown): SensioEnvironmentSnapshot {
  if (!value || typeof value !== 'object') throw new Error('Sensio Env returned an invalid configuration snapshot.')
  const payload = value as Record<string, unknown>
  if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) throw new Error('Sensio Env snapshot is missing data.')
  if (!Number.isSafeInteger(payload.revision) || Number(payload.revision) < 0) throw new Error('Sensio Env snapshot has an invalid revision.')
  const data: Record<string, string> = {}
  for (const [key, raw] of Object.entries(payload.data as Record<string, unknown>)) {
    if (typeof raw === 'string') data[key] = raw
  }
  return {
    data,
    revision: Number(payload.revision),
    sharedRevision: Number.isSafeInteger(payload.sharedRevision) ? Number(payload.sharedRevision) : null,
  }
}

export async function loadSensioEnvironmentSnapshot() {
  const config = useRuntimeConfig()
  const baseUrl = config.sensioEnv.baseUrl.trim().replace(/\/$/, '')
  const workspaceId = config.sensioEnv.workspaceId.trim()
  const projectId = config.sensioEnv.projectId.trim()
  if (!baseUrl || !workspaceId || !projectId) throw new Error('Sensio Env runtime scope is not configured.')

  const cacheKey = `${baseUrl}|${workspaceId}|${projectId}`
  if (cachedSnapshot?.cacheKey === cacheKey && cachedSnapshot.expiresAt > Date.now()) return cachedSnapshot.snapshot

  const token = await resolveConfigToken(config.sensioEnv.configToken, config.sensioEnv.configTokenFile)
  const response = await boundedFetch(internalSnapshotUrl(baseUrl, workspaceId, projectId), {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }, 5_000)
  if (!response.ok) throw new Error(`Sensio Env configuration request failed with HTTP ${response.status}.`)

  const snapshot = parseSnapshot(await response.json())
  cachedSnapshot = { cacheKey, expiresAt: Date.now() + 60_000, snapshot }
  return snapshot
}
