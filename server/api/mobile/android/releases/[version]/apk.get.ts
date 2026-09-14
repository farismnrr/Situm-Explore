import { getAndroidReleaseApkRedirect } from '../../../../../utils/mobile-release-storage'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
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
