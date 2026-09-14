import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { loadSensioEnvironmentSnapshot } from '../integrations/sensio-env/runtime'

const MAX_MANIFEST_BYTES = 64 * 1024
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

type AndroidReleaseManifest = {
  schemaVersion: 1
  platform: 'android'
  version: string
  versionCode: number
  downloadUrl: string
  sha256: string
  publishedAt: string
}

type ReleaseStorage = {
  client: S3Client
  bucket: string
  prefix: string
  signedUrlTtlSeconds: number
}

function required(values: Record<string, string>, key: string) {
  const value = values[key]?.trim()
  if (!value) throw new Error(`Sensio Env S3 configuration is missing ${key}.`)
  return value
}

function releasePrefix() {
  const value = useRuntimeConfig().mobileRelease.s3Prefix.trim().replace(/^\/+|\/+$/g, '')
  if (!value || value.split('/').some(segment => !segment || segment === '.' || segment === '..')) {
    throw new Error('Android release S3 prefix is invalid.')
  }
  return value
}

async function releaseStorage(): Promise<ReleaseStorage> {
  const { data } = await loadSensioEnvironmentSnapshot()
  const region = required(data, 'S3_REGION')
  const bucket = required(data, 'S3_BUCKET')
  const accessKeyId = required(data, 'S3_ACCESS_KEY_ID')
  const secretAccessKey = required(data, 'S3_SECRET_ACCESS_KEY')
  const endpoint = data.S3_ENDPOINT?.trim() || undefined
  const forcePathStyle = data.S3_FORCE_PATH_STYLE?.trim().toLowerCase() === 'true'
  const configuredTtl = Number(data.S3_SIGNED_URL_TTL_SECONDS || '600')
  const signedUrlTtlSeconds = Number.isSafeInteger(configuredTtl) ? Math.min(3600, Math.max(60, configuredTtl)) : 600

  return {
    client: new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle,
    }),
    bucket,
    prefix: releasePrefix(),
    signedUrlTtlSeconds,
  }
}

function parseAndroidReleaseManifest(value: unknown): AndroidReleaseManifest {
  if (!value || typeof value !== 'object') throw new Error('Android release manifest is invalid.')
  const manifest = value as Record<string, unknown>
  if (manifest.schemaVersion !== 1 || manifest.platform !== 'android') throw new Error('Android release manifest schema is unsupported.')
  if (typeof manifest.version !== 'string' || !SEMVER.test(manifest.version)) throw new Error('Android release manifest version is invalid.')
  if (!Number.isSafeInteger(manifest.versionCode) || Number(manifest.versionCode) < 1) throw new Error('Android release manifest versionCode is invalid.')
  if (typeof manifest.downloadUrl !== 'string') throw new Error('Android release manifest download URL is invalid.')
  if (typeof manifest.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(manifest.sha256)) throw new Error('Android release manifest checksum is invalid.')
  if (typeof manifest.publishedAt !== 'string' || Number.isNaN(Date.parse(manifest.publishedAt))) throw new Error('Android release manifest publish date is invalid.')
  return manifest as AndroidReleaseManifest
}

export async function getLatestAndroidReleaseManifest() {
  const storage = await releaseStorage()
  const key = `${storage.prefix}/situm-explore-latest-android.json`
  const head = await storage.client.send(new HeadObjectCommand({ Bucket: storage.bucket, Key: key }))
  if (!head.ContentLength || head.ContentLength > MAX_MANIFEST_BYTES) throw new Error('Android release manifest has an invalid size.')
  const object = await storage.client.send(new GetObjectCommand({ Bucket: storage.bucket, Key: key }))
  if (!object.Body) throw new Error('Android release manifest is empty.')
  return parseAndroidReleaseManifest(JSON.parse(await object.Body.transformToString('utf-8')))
}

export async function getAndroidReleaseApkRedirect(version: string) {
  if (!SEMVER.test(version)) throw new Error('Android release version is invalid.')
  const storage = await releaseStorage()
  const key = `${storage.prefix}/situm-explore-v${version}-android-arm64.apk`
  await storage.client.send(new HeadObjectCommand({ Bucket: storage.bucket, Key: key }))
  return getSignedUrl(
    storage.client,
    new GetObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      ResponseContentType: 'application/vnd.android.package-archive',
      ResponseContentDisposition: `attachment; filename="situm-explore-v${version}-android-arm64.apk"`,
    }),
    { expiresIn: storage.signedUrlTtlSeconds },
  )
}
