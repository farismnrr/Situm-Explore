import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const LEGACY_VERSION = 'v1'
const VERSION = 'v2'

function keyFromRuntime() {
  const value = useRuntimeConfig().workspaceCredentialEncryptionKey
  if (!value) throw createError({ statusCode: 503, statusMessage: 'Workspace credential protection is unavailable.' })
  const key = Buffer.from(value, 'base64')
  if (key.length !== 32) throw createError({ statusCode: 503, statusMessage: 'Workspace credential protection is unavailable.' })
  return key
}

export function encryptWorkspaceApiKey(apiKey: string, workspaceId: string) {
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyFromRuntime(), nonce)
  cipher.setAAD(Buffer.from(workspaceId, 'utf8'))
  const ciphertext = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()])
  return `${VERSION}.${nonce.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`
}

export function decryptWorkspaceApiKey(envelope: string, workspaceId: string) {
  const [version, nonceValue, tagValue, ciphertextValue] = envelope.split('.')
  if (![LEGACY_VERSION, VERSION].includes(version || '') || !nonceValue || !tagValue || !ciphertextValue) {
    throw createError({ statusCode: 503, statusMessage: 'Workspace credential protection is unavailable.' })
  }
  try {
    const decipher = createDecipheriv('aes-256-gcm', keyFromRuntime(), Buffer.from(nonceValue, 'base64url'))
    if (version === VERSION) decipher.setAAD(Buffer.from(workspaceId, 'utf8'))
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Workspace credential protection is unavailable.' })
  }
}
