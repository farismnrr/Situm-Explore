#!/usr/bin/env node
const { spawnSync } = require('node:child_process')
const { existsSync, writeFileSync } = require('node:fs')
const { homedir } = require('node:os')
const { resolve } = require('node:path')

const root = resolve(__dirname, '..')
const androidRoot = resolve(root, 'android')
const gradlew = resolve(androidRoot, 'gradlew')
const gradleUserHome = process.env.GRADLE_USER_HOME || resolve(root, '.gradle-agent-home')

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, env: options.env || process.env, encoding: options.encoding, stdio: options.stdio || 'inherit' })
  if (result.status !== 0) process.exit(result.status || 1)
  return result.stdout?.trim() || ''
}

if (!existsSync(gradlew)) {
  console.log('Android native project is missing; generating it once with Expo Prebuild.')
  run('npx', ['expo', 'prebuild', '--platform', 'android', '--no-install'])
}

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
writeFileSync(resolve(androidRoot, 'local.properties'), `sdk.dir=${sdkDir.replace(/\\/g, '\\\\')}\n`)

const adbEnv = {
  ...process.env,
  ANDROID_HOME: sdkDir,
  ANDROID_SDK_ROOT: sdkDir,
  ...(jdkDir ? { JAVA_HOME: jdkDir, PATH: `${resolve(jdkDir, 'bin')}:${process.env.PATH || ''}` } : {}),
}
const abiResult = spawnSync('adb', ['shell', 'getprop', 'ro.product.cpu.abi'], { cwd: root, env: adbEnv, encoding: 'utf8' })
if (abiResult.status !== 0) {
  console.error('No usable Android device is connected. Set ANDROID_SERIAL if multiple devices are present.')
  process.exit(abiResult.status || 1)
}
const abi = abiResult.stdout.trim()
if (abi !== 'arm64-v8a') throw new Error(`This fast physical-device build is pinned to arm64-v8a, but the connected device reports ${abi || 'unknown'}.`)

console.log(`Building debug shell for ${abi}. Native prebuild is skipped because android/ already exists.`)
console.log(`Gradle cache: ${gradleUserHome}`)
const gradleEnv = {
  ...adbEnv,
  NODE_ENV: process.env.NODE_ENV || 'development',
  GRADLE_USER_HOME: gradleUserHome,
}
const gradle = spawnSync('./gradlew', [':app:assembleDebug', '-PreactNativeArchitectures=arm64-v8a', '--build-cache', '--console=plain'], {
  cwd: androidRoot,
  env: gradleEnv,
  stdio: 'inherit',
})
if (gradle.status !== 0) process.exit(gradle.status || 1)

const debugApk = resolve(androidRoot, 'app/build/outputs/apk/debug/app-debug.apk')
if (!existsSync(debugApk)) throw new Error(`Debug APK was not produced at ${debugApk}`)
console.log('Installing debug shell with data preserved. -d permits the lower dev versionCode used by local shells.')
const install = spawnSync('adb', ['install', '-r', '-d', debugApk], { cwd: root, env: adbEnv, stdio: 'inherit' })
process.exit(install.status || 0)
