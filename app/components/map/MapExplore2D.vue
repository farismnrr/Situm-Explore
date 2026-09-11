<script setup lang="ts">
import type { SitumCartographyBuilding, SitumCartographyFloor, SitumCartographyPoi } from '#shared/situm-cartography'
import type { IndoorRoute } from '~/utils/indoor-route'

defineProps<{
  building: SitumCartographyBuilding
  floor: SitumCartographyFloor
  floors: SitumCartographyFloor[]
  pois: SitumCartographyPoi[]
  selectedPoi?: SitumCartographyPoi | null
  selectedPoiFloorName: string
  nativeHref?: string
  route?: IndoorRoute | null
  routeStartPoiId?: number | null
  routeDestinationPoiId?: number | null
  routeStartPoi?: SitumCartographyPoi | null
  routeDestinationPoi?: SitumCartographyPoi | null
  routeStartFloorName: string
  routeDestinationFloorName: string
  routeState: 'idle' | 'loading' | 'ready' | 'error'
  routeError?: string
  fullscreen: boolean
}>()

const emit = defineEmits<{
  poiSelect: [poi: SitumCartographyPoi]
  mapPress: []
  floorSelect: [floorId: number]
  clearDestination: []
  closePoi: []
  changePoi: []
  setRouteStart: []
  setRouteDestination: []
  calculateRoute: []
  clearRoute: []
  reset: []
  fullscreenToggle: []
}>()

const mapCanvas = ref<{ resetView: () => void } | null>(null)
const searchDock = ref<{ dismiss: () => void; focusSearch: () => void; clearQuery: () => void } | null>(null)

defineExpose({
  resetView: () => mapCanvas.value?.resetView(),
  dismissSearch: () => searchDock.value?.dismiss(),
  focusSearch: () => searchDock.value?.focusSearch(),
  clearSearch: () => searchDock.value?.clearQuery()
})
</script>

<template>
  <MapIndoorMapCanvas
    ref="mapCanvas"
    :building="building"
    :floor="floor"
    :pois="pois"
    :selected-poi="selectedPoi"
    :route="route"
    :route-start-poi-id="routeStartPoiId"
    :route-destination-poi-id="routeDestinationPoiId"
    @poi-select="emit('poiSelect', $event)"
    @map-press="emit('mapPress')"
  />
  <MapSearchDock
    ref="searchDock"
    :building-name="building.name"
    :floors="floors"
    :active-floor-id="floor.id"
    :pois="pois"
    :selected-poi="selectedPoi"
    @floor-select="emit('floorSelect', $event)"
    @poi-select="emit('poiSelect', $event)"
    @clear-destination="emit('clearDestination')"
  />
  <MapControlStack :fullscreen="fullscreen" @reset="emit('reset')" @fullscreen-toggle="emit('fullscreenToggle')" />
  <MapDestinationCard
    v-if="selectedPoi"
    :poi="selectedPoi"
    :floor-name="selectedPoiFloorName"
    :native-href="nativeHref"
    @close="emit('closePoi')"
    @change="emit('changePoi')"
    @set-route-start="emit('setRouteStart')"
    @set-route-destination="emit('setRouteDestination')"
  />
  <MapRouteCard
    v-if="!selectedPoi && (routeStartPoi || routeDestinationPoi)"
    :start-poi="routeStartPoi"
    :destination-poi="routeDestinationPoi"
    :start-floor-name="routeStartFloorName"
    :destination-floor-name="routeDestinationFloorName"
    :state="routeState"
    :error="routeError"
    @calculate="emit('calculateRoute')"
    @clear="emit('clearRoute')"
  />
</template>
