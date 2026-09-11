export function positiveQueryId(value: unknown) {
  const candidate = Array.isArray(value) ? value[0] : value
  const parsed = typeof candidate === 'string' ? Number(candidate) : Number.NaN
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

export function buildNativeMapHref(
  mobile: { universalLinkBaseUrl?: string; appScheme?: string },
  workspaceId: string | null | undefined,
  buildingId: number | null
) {
  const base = mobile.universalLinkBaseUrl?.replace(/\/$/, '') || (mobile.appScheme ? `${mobile.appScheme}:/` : '')
  if (!base) return undefined

  const query = new URLSearchParams()
  if (workspaceId && /^[a-zA-Z0-9_-]{1,128}$/.test(workspaceId)) query.set('workspaceId', workspaceId)
  if (buildingId && Number.isSafeInteger(buildingId)) query.set('buildingId', String(buildingId))
  return `${base}/map${query.size ? `?${query.toString()}` : ''}`
}
