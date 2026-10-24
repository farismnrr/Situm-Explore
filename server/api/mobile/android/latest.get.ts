import { getLatestAndroidReleaseManifest } from '../../../utils/mobile-release-storage'
import { requireRateLimit } from '../../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  requireRateLimit(event, 'mobile-android-latest', 60, 60_000)
  setHeader(event, 'Cache-Control', 'public, max-age=30, stale-while-revalidate=30')
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
