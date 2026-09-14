import { getAndroidReleaseApkRedirect, getLatestAndroidReleaseManifest } from '../../../utils/mobile-release-storage'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  try {
    const manifest = await getLatestAndroidReleaseManifest()
    return sendRedirect(event, await getAndroidReleaseApkRedirect(manifest.version), 302)
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Android download is temporarily unavailable.' })
  }
})
