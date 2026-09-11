import type { SitumCartographyPoi } from '#shared/situm-cartography'
import type { SitumPathsResponse } from '#shared/situm-paths'
import { calculateIndoorRoute, type IndoorRoute } from '~/utils/indoor-route'

type RouteRequestState = 'idle' | 'loading' | 'ready' | 'error'
type EndpointRole = 'start' | 'destination'

export function useExploreIndoorRoute(input: {
  workspaceId: Ref<string | null | undefined>
  buildingId: Ref<number | null>
  pois: ComputedRef<SitumCartographyPoi[]>
}) {
  const routeStartPoiId = ref<number | null>(null)
  const routeDestinationPoiId = ref<number | null>(null)
  const activeRoute = ref<IndoorRoute | null>(null)
  const routeRequestState = ref<RouteRequestState>('idle')
  const routeError = ref('')

  const routeStartPoi = computed(() => input.pois.value.find(poi => poi.id === routeStartPoiId.value) ?? null)
  const routeDestinationPoi = computed(() => input.pois.value.find(poi => poi.id === routeDestinationPoiId.value) ?? null)

  function invalidateRoute() {
    activeRoute.value = null
    routeRequestState.value = 'idle'
    routeError.value = ''
  }

  function setEndpoint(role: EndpointRole, poi: SitumCartographyPoi) {
    if (!input.buildingId.value || poi.buildingId !== input.buildingId.value) return
    const otherId = role === 'start' ? routeDestinationPoiId.value : routeStartPoiId.value
    if (otherId === poi.id) {
      invalidateRoute()
      routeRequestState.value = 'error'
      routeError.value = 'Choose different start and destination places.'
      return
    }
    if (role === 'start') routeStartPoiId.value = poi.id
    else routeDestinationPoiId.value = poi.id
    invalidateRoute()
  }

  function clearRoute() {
    routeStartPoiId.value = null
    routeDestinationPoiId.value = null
    invalidateRoute()
  }

  async function calculateRoute() {
    const workspaceId = input.workspaceId.value
    const buildingId = input.buildingId.value
    const from = routeStartPoi.value
    const to = routeDestinationPoi.value
    if (!workspaceId || !buildingId || !from || !to || from.id === to.id) {
      activeRoute.value = null
      routeRequestState.value = 'error'
      routeError.value = 'Choose two different places in this building.'
      return
    }

    routeRequestState.value = 'loading'
    routeError.value = ''
    activeRoute.value = null
    try {
      const response = await $fetch<SitumPathsResponse>(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/situm/paths?buildingId=${buildingId}`
      )
      if (input.workspaceId.value !== workspaceId || input.buildingId.value !== buildingId) return
      const result = calculateIndoorRoute(response, from, to)
      if (!result.ok) {
        routeRequestState.value = 'error'
        routeError.value = result.reason === 'no-path-data'
          ? 'This building has no configured Situm wayfinding paths.'
          : result.reason === 'unsupported-floor-transition'
            ? 'Static web routing is currently available only between places on the same floor.'
            : 'No configured Situm route is available between these places.'
        return
      }
      activeRoute.value = result.route
      routeRequestState.value = 'ready'
    } catch {
      if (input.workspaceId.value !== workspaceId || input.buildingId.value !== buildingId) return
      routeRequestState.value = 'error'
      routeError.value = 'The venue wayfinding paths could not be loaded.'
    }
  }

  watch([input.workspaceId, input.buildingId], clearRoute)

  return {
    routeStartPoiId,
    routeDestinationPoiId,
    routeStartPoi,
    routeDestinationPoi,
    activeRoute,
    routeRequestState,
    routeError,
    setRouteStart: (poi: SitumCartographyPoi) => setEndpoint('start', poi),
    setRouteDestination: (poi: SitumCartographyPoi) => setEndpoint('destination', poi),
    calculateRoute,
    clearRoute
  }
}
