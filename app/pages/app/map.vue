<script setup lang="ts">
import type { SitumCartographyPoi, SitumCartographyResponse } from '#shared/situm-cartography'
import { isWorkspaceRequestLoading } from '~/utils/async-state'

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const workspaceElement = ref<HTMLElement | null>(null)
const mapCanvas = ref<{ resetView: () => void } | null>(null)
const searchDock = ref<{ dismiss: () => void; focusSearch: () => void; clearQuery: () => void } | null>(null)
const actionMessage = ref('')
const isFullscreen = ref(false)
const activeBuildingId = ref<number | null>(null)
const activeFloorId = ref<number | null>(null)
const selectedPoi = ref<SitumCartographyPoi | null>(null)

const { selectedWorkspaceId, loaded: workspaceLoaded } = useWorkspaceContext()
const { data: cartography, error: cartographyError, status: cartographyStatus, refresh: refreshCartography } = await useFetch<SitumCartographyResponse>(useWorkspaceEndpoint('/situm/cartography'), { immediate: false })
watch(selectedWorkspaceId, (workspaceId) => { if (workspaceId) refreshCartography() }, { immediate: true })

const cartographyLoading = computed(() => isWorkspaceRequestLoading(workspaceLoaded.value, selectedWorkspaceId.value, String(cartographyStatus.value)))
const activeBuilding = computed(() => cartography.value?.buildings.find(building => building.id === activeBuildingId.value) ?? null)
const buildingFloors = computed(() => (cartography.value?.floors ?? []).filter(floor => floor.buildingId === activeBuildingId.value).sort((a, b) => b.level - a.level))
const activeFloor = computed(() => buildingFloors.value.find(floor => floor.id === activeFloorId.value) ?? buildingFloors.value[0] ?? null)
const buildingPois = computed(() => (cartography.value?.pois ?? []).filter(poi => poi.buildingId === activeBuildingId.value))
const selectedPoiFloorName = computed(() => cartography.value?.floors.find(floor => floor.id === selectedPoi.value?.floorId)?.name || activeFloor.value?.name || 'Floor')

const nativeMapHref = computed(() => {
  const mobile = config.public.mobile
  const base = mobile.universalLinkBaseUrl?.replace(/\/$/, '') || (mobile.appScheme ? `${mobile.appScheme}:/` : '')
  if (!base) return undefined
  const query = new URLSearchParams()
  if (selectedWorkspaceId.value && /^[a-zA-Z0-9_-]{1,128}$/.test(selectedWorkspaceId.value)) query.set('workspaceId', selectedWorkspaceId.value)
  if (activeBuildingId.value && Number.isSafeInteger(activeBuildingId.value)) query.set('buildingId', String(activeBuildingId.value))
  return `${base}/map${query.size ? `?${query.toString()}` : ''}`
})

function queryId(value: unknown) {
  const candidate = Array.isArray(value) ? value[0] : value
  const parsed = typeof candidate === 'string' ? Number(candidate) : Number.NaN
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function resolveMapContext() {
  if (!cartography.value?.buildings.length) {
    activeBuildingId.value = null
    activeFloorId.value = null
    return
  }
  const requestedBuildingId = queryId(route.query.buildingId)
  const building = cartography.value.buildings.find(candidate => candidate.id === requestedBuildingId)
    ?? cartography.value.buildings.find(candidate => candidate.id === activeBuildingId.value)
    ?? cartography.value.buildings[0]!
  activeBuildingId.value = building.id

  const floors = cartography.value.floors.filter(floor => floor.buildingId === building.id).sort((a, b) => b.level - a.level)
  const requestedFloorId = queryId(route.query.floorId)
  const floor = floors.find(candidate => candidate.id === requestedFloorId)
    ?? floors.find(candidate => candidate.id === activeFloorId.value)
    ?? floors[0]
  activeFloorId.value = floor?.id ?? null
  if (selectedPoi.value?.buildingId !== building.id) selectedPoi.value = null
}

watch([cartography, () => route.query.buildingId, () => route.query.floorId], resolveMapContext, { immediate: true })
watch(selectedWorkspaceId, () => {
  activeBuildingId.value = null
  activeFloorId.value = null
  selectedPoi.value = null
})

function syncFloorQuery(floorId: number) {
  if (!activeBuildingId.value) return
  void router.replace({
    query: {
      ...route.query,
      buildingId: String(activeBuildingId.value),
      floorId: String(floorId)
    }
  })
}

function selectFloor(floorId: number) {
  if (!buildingFloors.value.some(floor => floor.id === floorId)) return
  activeFloorId.value = floorId
  syncFloorQuery(floorId)
}

function selectPoi(poi: SitumCartographyPoi) {
  selectedPoi.value = poi
  if (activeFloorId.value !== poi.floorId) selectFloor(poi.floorId)
  searchDock.value?.dismiss()
}

function clearDestination() {
  selectedPoi.value = null
}

function closeDestination() {
  selectedPoi.value = null
  searchDock.value?.clearQuery()
}

function dismissMapOverlays() {
  searchDock.value?.dismiss()
}

function changeDestination() {
  clearDestination()
  searchDock.value?.focusSearch()
}

function resetView() {
  mapCanvas.value?.resetView()
}

async function toggleFullscreen() {
  actionMessage.value = ''
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else if (workspaceElement.value) await workspaceElement.value.requestFullscreen()
  } catch (error) {
    actionMessage.value = error instanceof Error ? error.message : 'Fullscreen mode is unavailable in this browser.'
  }
}

function updateFullscreenState() {
  isFullscreen.value = document.fullscreenElement === workspaceElement.value
}

onMounted(() => document.addEventListener('fullscreenchange', updateFullscreenState))
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', updateFullscreenState))

definePageMeta({ middleware: 'auth', layout: 'app', title: 'Map', fullWidth: true })
</script>

<template>
  <div v-if="!workspaceLoaded" class="map-workspace relative -m-4 h-[calc(100vh-4rem)] min-h-0 overflow-hidden border border-default bg-default sm:-m-6 lg:-m-8" aria-label="Loading map workspace" aria-busy="true">
    <USkeleton class="h-full w-full rounded-none" />
  </div>

  <div v-else ref="workspaceElement" class="map-workspace relative -m-4 flex h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden border border-default bg-default sm:-m-6 lg:-m-8">
    <div v-if="actionMessage" class="absolute left-1/2 top-3 z-40 w-[min(92%,34rem)] -translate-x-1/2">
      <UAlert color="warning" variant="subtle" :description="actionMessage" />
    </div>

    <div class="relative min-h-0 min-w-0 flex-1">
      <USkeleton v-if="cartographyLoading" class="h-full w-full rounded-none" aria-label="Loading map cartography" aria-busy="true" />
      <div v-else-if="!selectedWorkspaceId" class="absolute inset-0 flex items-center justify-center bg-default px-6">
        <UAlert color="neutral" variant="subtle" title="No workspace selected" description="Create or select a workspace before opening the Map." class="max-w-md" />
      </div>
      <div v-else-if="cartographyError" class="absolute inset-0 flex items-center justify-center bg-default px-6">
        <UAlert color="error" variant="subtle" title="Map cartography unavailable" description="The selected workspace cartography could not be loaded." class="max-w-md" />
      </div>
      <div v-else-if="String(cartographyStatus) === 'success' && !activeBuilding" class="absolute inset-0 flex items-center justify-center bg-default px-6">
        <UAlert color="neutral" variant="subtle" title="No building data" description="The selected workspace did not return a Situm building for the Map." class="max-w-md" />
      </div>
      <div v-else-if="activeBuilding && !activeFloor" class="absolute inset-0 flex items-center justify-center bg-default px-6">
        <UAlert color="neutral" variant="subtle" title="Floor plan unavailable" description="This building has no floor plan that can be rendered." class="max-w-md" />
      </div>

      <template v-else-if="activeBuilding && activeFloor">
        <MapIndoorMapCanvas
          ref="mapCanvas"
          :building="activeBuilding"
          :floor="activeFloor"
          :pois="buildingPois"
          :selected-poi="selectedPoi"
          @poi-select="selectPoi"
          @map-press="dismissMapOverlays"
        />
        <MapMapSearchDock
          ref="searchDock"
          :building-name="activeBuilding.name"
          :floors="buildingFloors"
          :active-floor-id="activeFloor.id"
          :pois="buildingPois"
          :selected-poi="selectedPoi"
          @floor-select="selectFloor"
          @poi-select="selectPoi"
          @clear-destination="clearDestination"
        />
        <MapMapControlStack :fullscreen="isFullscreen" @reset="resetView" @fullscreen-toggle="toggleFullscreen" />
        <MapMapDestinationCard
          v-if="selectedPoi"
          :poi="selectedPoi"
          :floor-name="selectedPoiFloorName"
          :native-href="nativeMapHref"
          @close="closeDestination"
          @change="changeDestination"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.map-workspace { border-radius: 1rem; background: #e8edf1; }
.map-workspace:fullscreen { width: 100vw; height: 100vh; margin: 0 !important; border: 0; border-radius: 0; }
@media (max-width: 640px) {
  .map-workspace { border-radius: 0; }
}
</style>
