import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { H3Event } from 'h3'
import { requireOwnedWorkspace } from '../../utils/workspace-owner'

const modelFiles = {
  lt1: 'situm-explore-lt1.glb',
  lt2: 'situm-explore-lt2.glb'
} as const

type ModelSlot = keyof typeof modelFiles

function modelSlot(value: string | undefined): ModelSlot {
  if (value === 'lt1' || value === 'lt2') return value
  throw createError({ statusCode: 404, statusMessage: '3D model not found.' })
}

function remoteModelUrl(baseUrl: string, filename: string) {
  if (!baseUrl) return null
  const url = new URL(filename, `${baseUrl.replace(/\/$/, '')}/`)
  if (url.protocol !== 'https:') throw createError({ statusCode: 503, statusMessage: '3D model source is not configured securely.' })
  return url
}

function validatePayload(payload: Uint8Array) {
  if (!payload.byteLength || payload.byteLength > 25 * 1024 * 1024) {
    throw createError({ statusCode: 502, statusMessage: '3D model asset is invalid.' })
  }
  return payload
}

async function loadRemoteModel(url: URL) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000) })
  if (!response.ok) throw createError({ statusCode: 502, statusMessage: '3D model source is unavailable.' })
  const declaredLength = Number(response.headers.get('content-length') || 0)
  if (declaredLength > 25 * 1024 * 1024) throw createError({ statusCode: 502, statusMessage: '3D model asset is too large.' })
  return validatePayload(new Uint8Array(await response.arrayBuffer()))
}

export async function serveWorkspace3dModel(event: H3Event, workspaceId: string, requestedSlot: string | undefined) {
  await requireOwnedWorkspace(event, workspaceId)
  const slot = modelSlot(requestedSlot)
  const filename = modelFiles[slot]
  const config = useRuntimeConfig(event).situm3d
  let payload: Uint8Array

  if (config.assetDir) {
    let localPayload: Uint8Array
    try {
      localPayload = new Uint8Array(await readFile(join(config.assetDir, filename)))
    } catch {
      throw createError({ statusCode: 404, statusMessage: '3D model asset is not available.' })
    }
    payload = validatePayload(localPayload)
  } else {
    const remoteUrl = remoteModelUrl(config.modelBaseUrl, filename)
    if (!remoteUrl) throw createError({ statusCode: 404, statusMessage: '3D model asset is not configured.' })
    payload = await loadRemoteModel(remoteUrl)
  }

  setResponseHeader(event, 'content-type', 'model/gltf-binary')
  setResponseHeader(event, 'cache-control', 'private, max-age=300')
  setResponseHeader(event, 'content-length', payload.byteLength)
  return payload
}
