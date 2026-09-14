#!/usr/bin/env node
const { spawnSync } = require('node:child_process')
const { copyFileSync, existsSync, mkdirSync, writeFileSync } = require('node:fs')
const { createHash } = require('node:crypto')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { homedir } = require('node:os')

const root = resolve(__dirname, '..')
const gradleUserHome = process.env.GRADLE_USER_HOME || resolve(root, '.gradle-agent-home')
const version = process.env.EXPO_PUBLIC_APP_VERSION?.trim()
const versionCode = process.env.EXPO_PUBLIC_ANDROID_VERSION_CODE?.trim()
if (!version) throw new Error('EXPO_PUBLIC_APP_VERSION is required for release builds.')
if (!versionCode) throw new Error('EXPO_PUBLIC_ANDROID_VERSION_CODE is required for release builds.')
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim()
const environment = process.env.EXPO_PUBLIC_ENVIRONMENT?.trim() || 'staging'
const releaseBaseUrl = (process.env.EXPO_PUBLIC_ANDROID_RELEASE_BASE_URL || 'https://situm.devoutsys.com/api/mobile/android/releases').trim().replace(/\/$/, '')
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new Error(`Invalid EXPO_PUBLIC_APP_VERSION: ${version}`)
if (!/^[1-9]\d*$/.test(versionCode)) throw new Error(`Invalid EXPO_PUBLIC_ANDROID_VERSION_CODE: ${versionCode}`)
if (!apiBaseUrl) throw new Error('EXPO_PUBLIC_API_BASE_URL is required for release builds; do not rely on mobile/.env.')
let parsedApiBaseUrl
try { parsedApiBaseUrl = new URL(apiBaseUrl) } catch { throw new Error(`Invalid EXPO_PUBLIC_API_BASE_URL: ${apiBaseUrl}`) }
if (parsedApiBaseUrl.protocol !== 'https:' || ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedApiBaseUrl.hostname)) {
  throw new Error(`Release API base URL must be public HTTPS, got: ${apiBaseUrl}`)
}
let parsedReleaseBaseUrl
try { parsedReleaseBaseUrl = new URL(releaseBaseUrl) } catch { throw new Error(`Invalid EXPO_PUBLIC_ANDROID_RELEASE_BASE_URL: ${releaseBaseUrl}`) }
if (parsedReleaseBaseUrl.protocol !== 'https:' || ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsedReleaseBaseUrl.hostname)) {
  throw new Error(`Android release base URL must be public HTTPS, got: ${releaseBaseUrl}`)
}

const artifactBase = `situm-explore-v${version}-android-arm64`
const sourceApk = resolve(root, 'android/app/build/outputs/apk/release/app-release.apk')
const distDir = resolve(root, 'dist')
const targetApk = resolve(distDir, `${artifactBase}.apk`)
const checksumFile = resolve(distDir, `${artifactBase}.apk.sha256`)
const versionedManifestFile = resolve(distDir, `${artifactBase}.json`)
const latestManifestFile = resolve(distDir, 'situm-explore-latest-android.json')

const releaseEnv = { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production', EXPO_PUBLIC_API_BASE_URL: apiBaseUrl, EXPO_PUBLIC_ENVIRONMENT: environment, EXPO_PUBLIC_APP_VERSION: version, EXPO_PUBLIC_ANDROID_VERSION_CODE: versionCode }

const jdkCandidates = [
  process.env.JAVA_HOME,
  '/home/farismnrr/Services/android-toolchain/jdk-21',
  resolve(root, '../../.toolchains/android/jdk-21'),
].filter(Boolean)
const jdkDir = jdkCandidates.find(candidate => existsSync(candidate))

const sdkCandidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  '/home/farismnrr/Services/android-toolchain/sdk',
  resolve(root, '../../.toolchains/android/sdk'),
  resolve(homedir(), 'Android/Sdk'),
  resolve(homedir(), 'Android/sdk'),
].filter(Boolean)
const sdkDir = sdkCandidates.find(candidate => existsSync(candidate))
if (!sdkDir) throw new Error('Android SDK not found. Set ANDROID_HOME or ANDROID_SDK_ROOT.')

const effectiveEnv = {
  ...releaseEnv,
  ANDROID_HOME: sdkDir,
  ANDROID_SDK_ROOT: sdkDir,
  ...(jdkDir ? { JAVA_HOME: jdkDir, PATH: `${resolve(jdkDir, 'bin')}:${process.env.PATH || ''}` } : {}),
}

const prebuild = spawnSync('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install', '--no-clean'], {
  cwd: root,
  env: effectiveEnv,
  stdio: 'inherit',
})
if (prebuild.status !== 0) process.exit(prebuild.status || 1)

writeFileSync(resolve(root, 'android/local.properties'), `sdk.dir=${sdkDir.replace(/\\/g, '\\\\')}\n`)

const gradleEnv = { ...effectiveEnv, GRADLE_USER_HOME: gradleUserHome }
console.log(`Gradle cache: ${gradleUserHome}`)
const gradle = spawnSync('./gradlew', ['assembleRelease', '-PreactNativeArchitectures=arm64-v8a', '--build-cache', '--console=plain'], {
  cwd: resolve(root, 'android'),
  env: gradleEnv,
  stdio: 'inherit',
})
if (gradle.status !== 0) process.exit(gradle.status || 1)

mkdirSync(distDir, { recursive: true })
copyFileSync(sourceApk, targetApk)
const sha256 = createHash('sha256').update(readFileSync(targetApk)).digest('hex')
writeFileSync(checksumFile, `${sha256}  ${artifactBase}.apk\n`)
const manifest = {
  schemaVersion: 1,
  platform: 'android',
  version,
  versionCode: Number(versionCode),
  downloadUrl: `${releaseBaseUrl}/${encodeURIComponent(version)}/apk`,
  sha256,
  publishedAt: new Date().toISOString(),
}
const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`
writeFileSync(versionedManifestFile, manifestJson)
writeFileSync(latestManifestFile, manifestJson)

console.log(`\nRelease artifact: dist/${artifactBase}.apk`)
console.log(`Checksum:         dist/${artifactBase}.apk.sha256`)
console.log(`Manifest:         dist/${artifactBase}.json`)
console.log('Latest manifest:  dist/situm-explore-latest-android.json')
console.log(`SHA-256:          ${sha256}`)
