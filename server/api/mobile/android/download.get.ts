import { getAndroidReleaseApkRedirect, getLatestAndroidReleaseManifest } from '../../../utils/mobile-release-storage'
import { requireRateLimit } from '../../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  requireRateLimit(event, 'mobile-android-download', 20, 10 * 60_000)
  setHeader(event, 'Cache-Control', 'public, max-age=30')
  try {
    const manifest = await getLatestAndroidReleaseManifest()
    return sendRedirect(event, await getAndroidReleaseApkRedirect(manifest.version), 302)
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Android download is temporarily unavailable.' })
  }
})
