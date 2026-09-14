import { getLatestAndroidReleaseManifest } from '../../../utils/mobile-release-storage'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  try {
    const manifest = await getLatestAndroidReleaseManifest()
    const baseUrl = useRuntimeConfig(event).mobileRelease.publicBaseUrl.trim().replace(/\/$/, '')
    const parsedBaseUrl = new URL(baseUrl)
    if (parsedBaseUrl.protocol !== 'https:' || parsedBaseUrl.username || parsedBaseUrl.password) {
      throw new Error('Android release public base URL is invalid.')
    }
    return {
      ...manifest,
      downloadUrl: `${parsedBaseUrl.origin}/api/mobile/android/releases/${encodeURIComponent(manifest.version)}/apk`,
    }
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Android update feed is unavailable.' })
  }
})
