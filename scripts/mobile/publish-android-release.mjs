#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const repoRoot = resolve(import.meta.dirname, '../..')
const mobileRoot = resolve(repoRoot, 'mobile')
const activate = process.argv.includes('--activate')
const version = process.env.EXPO_PUBLIC_APP_VERSION?.trim() || '0.1.1'
const versionCode = Number(process.env.EXPO_PUBLIC_ANDROID_VERSION_CODE || '5')
const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

if (!semver.test(version)) throw new Error(`Invalid Android release version: ${version}`)
if (!Number.isSafeInteger(versionCode) || versionCode < 1) throw new Error(`Invalid Android versionCode: ${versionCode}`)

const artifactBase = `situm-explore-v${version}-android-arm64`
const distDir = resolve(mobileRoot, 'dist')
const apkPath = resolve(distDir, `${artifactBase}.apk`)
const checksumPath = resolve(distDir, `${artifactBase}.apk.sha256`)
const manifestPath = resolve(distDir, `${artifactBase}.json`)
const latestManifestPath = resolve(distDir, 'situm-explore-latest-android.json')

async function resolveSensioToken() {
  const inline = process.env.SENSIO_ENV_CONFIG_TOKEN?.trim()
  if (inline) return inline
  const tokenFile = process.env.SENSIO_ENV_CONFIG_TOKEN_FILE?.trim()
  if (!tokenFile) throw new Error('Set SENSIO_ENV_CONFIG_TOKEN or SENSIO_ENV_CONFIG_TOKEN_FILE before publishing.')
  const token = (await readFile(tokenFile, 'utf8')).trim()
  if (!token) throw new Error('Sensio Env service token file is empty.')
  return token
}

async function loadSensioSnapshot() {
  const baseUrl = (process.env.SENSIO_ENV_BASE_URL || 'http://100.99.88.53:3002').trim().replace(/\/$/, '')
  const workspace = (process.env.SENSIO_ENV_WORKSPACE_ID || 'berjaya-inovasi-global').trim()
  const project = (process.env.SENSIO_ENV_PROJECT_ID || 'shared').trim()
  const parsed = new URL(baseUrl)
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Invalid SENSIO_ENV_BASE_URL.')
  const token = await resolveSensioToken()
  const response = await fetch(`${baseUrl}/api/internal/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(project)}/env`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5_000),
  })
  if (!response.ok) throw new Error(`Sensio Env configuration request failed with HTTP ${response.status}.`)
  const payload = await response.json()
  if (!payload?.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) throw new Error('Sensio Env returned an invalid snapshot.')
  return payload.data
}

function required(values, key) {
  const value = values[key]?.trim()
  if (!value) throw new Error(`Sensio Env S3 configuration is missing ${key}.`)
  return value
}

function createS3(values) {
  const region = required(values, 'S3_REGION')
  const accessKeyId = required(values, 'S3_ACCESS_KEY_ID')
  const secretAccessKey = required(values, 'S3_SECRET_ACCESS_KEY')
  const endpoint = values.S3_ENDPOINT?.trim() || undefined
  return {
    bucket: required(values, 'S3_BUCKET'),
    client: new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle: values.S3_FORCE_PATH_STYLE?.trim().toLowerCase() === 'true',
    }),
  }
}

async function sha256File(path) {
  const hash = createHash('sha256')
  const stream = createReadStream(path)
  for await (const chunk of stream) hash.update(chunk)
  return hash.digest('hex')
}

async function readExisting(client, bucket, key) {
  try {
    return await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404) return null
    throw error
  }
}

function verifyImmutableObject(existing, size, sha256, key) {
  if (existing.ContentLength !== size || existing.Metadata?.sha256 !== sha256) {
    throw new Error(`Immutable Android release object already exists with different content: ${key}`)
  }
}

async function writeObject(client, bucket, key, body, size, contentType, sha256, immutable) {
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentLength: size,
      ContentType: contentType,
      Metadata: { sha256 },
      ...(immutable ? { IfNoneMatch: '*', CacheControl: 'public, max-age=31536000, immutable' } : { CacheControl: 'no-cache' }),
    }))
  } catch (error) {
    if (immutable && error?.$metadata?.httpStatusCode === 412) {
      const existing = await readExisting(client, bucket, key)
      if (existing) {
        verifyImmutableObject(existing, size, sha256, key)
        console.log(`Verified existing immutable object: ${key}`)
        return
      }
    }
    throw error
  }
  console.log(`Uploaded ${key}`)
}

async function readAndValidateRelease() {
  const [apkInfo, checksumText, manifestText, latestManifestText] = await Promise.all([
    stat(apkPath),
    readFile(checksumPath, 'utf8'),
    readFile(manifestPath, 'utf8'),
    readFile(latestManifestPath, 'utf8'),
  ])
  const manifest = JSON.parse(manifestText)
  const latestManifest = JSON.parse(latestManifestText)
  const sha256 = await sha256File(apkPath)
  if (manifest.version !== version || manifest.versionCode !== versionCode || manifest.sha256 !== sha256) throw new Error('Versioned release manifest does not match the APK/version inputs.')
  if (JSON.stringify(manifest) !== JSON.stringify(latestManifest)) throw new Error('Latest release manifest does not match the versioned manifest.')
  if (!checksumText.startsWith(`${sha256}  ${artifactBase}.apk`)) throw new Error('Release checksum file does not match the APK.')
  return { apkInfo, checksumText, manifestText, sha256 }
}

async function putFile(client, bucket, key, path, contentType, sha256, immutable) {
  const info = await stat(path)
  if (immutable) {
    const existing = await readExisting(client, bucket, key)
    if (existing) {
      verifyImmutableObject(existing, info.size, sha256, key)
      console.log(`Verified existing immutable object: ${key}`)
      return
    }
  }
  await writeObject(client, bucket, key, createReadStream(path), info.size, contentType, sha256, immutable)
}

async function putText(client, bucket, key, text, contentType, sha256, immutable) {
  const body = Buffer.from(text)
  if (immutable) {
    const existing = await readExisting(client, bucket, key)
    if (existing) {
      verifyImmutableObject(existing, body.length, sha256, key)
      console.log(`Verified existing immutable object: ${key}`)
      return
    }
  }
  await writeObject(client, bucket, key, body, body.length, contentType, sha256, immutable)
}

const release = await readAndValidateRelease()
const values = await loadSensioSnapshot()
const { client, bucket } = createS3(values)
const prefix = (process.env.NUXT_MOBILE_RELEASE_S3_PREFIX || 'situm-explore/android').trim().replace(/^\/+|\/+$/g, '')
if (!prefix || prefix.split('/').some(segment => !segment || segment === '.' || segment === '..')) throw new Error('Invalid Android release S3 prefix.')

const apkKey = `${prefix}/${artifactBase}.apk`
const checksumKey = `${prefix}/${artifactBase}.apk.sha256`
const manifestKey = `${prefix}/${artifactBase}.json`
const checksumSha = createHash('sha256').update(release.checksumText).digest('hex')
const manifestSha = createHash('sha256').update(release.manifestText).digest('hex')

await putFile(client, bucket, apkKey, apkPath, 'application/vnd.android.package-archive', release.sha256, true)
await putText(client, bucket, checksumKey, release.checksumText, 'text/plain; charset=utf-8', checksumSha, true)
await putText(client, bucket, manifestKey, release.manifestText, 'application/json; charset=utf-8', manifestSha, true)

if (!activate) {
  console.log(`\nAndroid ${version} (versionCode ${versionCode}) staged as immutable S3 objects.`)
  console.log('Stable aliases were NOT changed. Re-run with --activate only after the production OTA origin passes TLS/routing verification.')
  process.exit(0)
}

await putFile(client, bucket, `${prefix}/situm-explore-latest-android-arm64.apk`, apkPath, 'application/vnd.android.package-archive', release.sha256, false)
await putText(client, bucket, `${prefix}/situm-explore-latest-android-arm64.apk.sha256`, release.checksumText, 'text/plain; charset=utf-8', checksumSha, false)
// The stable manifest is deliberately published last so clients never see a release before its APK and aliases exist.
await putText(client, bucket, `${prefix}/situm-explore-latest-android.json`, release.manifestText, 'application/json; charset=utf-8', manifestSha, false)
console.log(`\nAndroid ${version} (versionCode ${versionCode}) is active in the OTA feed.`)
