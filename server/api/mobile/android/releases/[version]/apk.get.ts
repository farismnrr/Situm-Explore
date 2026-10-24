import { getAndroidReleaseApkRedirect } from '../../../../../utils/mobile-release-storage'
import { requireRateLimit } from '../../../../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  requireRateLimit(event, 'mobile-android-version-download', 20, 10 * 60_000)
  setHeader(event, 'Cache-Control', 'public, max-age=30')
  const version = getRouterParam(event, 'version')?.trim() || ''
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw createError({ statusCode: 404, statusMessage: 'Android release not found.' })
  }
  try {
    return sendRedirect(event, await getAndroidReleaseApkRedirect(version), 302)
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Android release not found.' })
  }
})
