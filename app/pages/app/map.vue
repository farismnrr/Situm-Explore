<script setup lang="ts">
import type { IndoorWalkDestination } from '#shared/indoor-walk'
import type { SitumCartographyPoi, SitumCartographyResponse } from '#shared/situm-cartography'
import { isWorkspaceRequestLoading } from '~/utils/async-state'
import { buildNativeMapHref, positiveQueryId } from '~/utils/explore-map'
import type { IndoorWalkModelSlot } from '~/utils/indoor-walk-view'

type ExploreViewMode = '2d' | '3d'

const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const workspaceElement = ref<HTMLElement | null>(null)
const mapCanvas = ref<{ resetView: () => void } | null>(null)
const walkCanvas = ref<{ resetView: () => void; goToDestination: (destination: IndoorWalkDestination) => boolean } | null>(null)
const searchDock = ref<{ dismiss: () => void; focusSearch: () => void; clearQuery: () => void } | null>(null)
const walkSearchDock = ref<{ dismiss: () => void; focusSearch: () => void; clearQuery: () => void } | null>(null)
const actionMessage = ref('')
const isFullscreen = ref(false)
const activeBuildingId = ref<number | null>(null)
const activeFloorId = ref<number | null>(null)
const selectedPoi = ref<SitumCartographyPoi | null>(null)
const destinations = ref<IndoorWalkDestination[]>([])
const selectedDestination = ref<IndoorWalkDestination | null>(null)
const walkReady = ref(false)
const walkError = ref('')
const viewMode = ref<ExploreViewMode>(route.query.view === '3d' ? '3d' : '2d')

const { selectedWorkspaceId, loaded: workspaceLoaded } = useWorkspaceContext()
const cartography = ref<SitumCartographyResponse | null>(null)
const cartographyError = ref<unknown>(null)
const cartographyStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')

async function refreshCartography() {
  const workspaceId = selectedWorkspaceId.value
  if (!workspaceId) {
    cartography.value = null
    cartographyError.value = null
    cartographyStatus.value = 'idle'
    return
  }

  cartographyStatus.value = 'pending'
  cartographyError.value = null
  try {
    const response = await $fetch<SitumCartographyResponse>(`/api/workspaces/${workspaceId}/situm/cartography`)
    if (selectedWorkspaceId.value !== workspaceId) return
    cartography.value = response
    cartographyStatus.value = 'success'
  } catch (error) {
    if (selectedWorkspaceId.value !== workspaceId) return
    cartography.value = null
    cartographyError.value = error
    cartographyStatus.value = 'error'
  }
}

watch(selectedWorkspaceId, () => { void refreshCartography() }, { immediate: true })
watch(() => route.query.view, value => { viewMode.value = value === '3d' ? '3d' : '2d' })

const cartographyLoading = computed(() => isWorkspaceRequestLoading(workspaceLoaded.value, selectedWorkspaceId.value, cartographyStatus.value))
const activeBuilding = computed(() => cartography.value?.buildings.find(building => building.id === activeBuildingId.value) ?? null)
const buildingFloors = computed(() => (cartography.value?.floors ?? []).filter(floor => floor.buildingId === activeBuildingId.value).sort((a, b) => b.level - a.level))
const activeFloor = computed(() => buildingFloors.value.find(floor => floor.id === activeFloorId.value) ?? buildingFloors.value[0] ?? null)
const buildingPois = computed(() => (cartography.value?.pois ?? []).filter(poi => poi.buildingId === activeBuildingId.value))
const selectedPoiFloorName = computed(() => cartography.value?.floors.find(floor => floor.id === selectedPoi.value?.floorId)?.name || activeFloor.value?.name || 'Floor')
const modelSlot = computed<IndoorWalkModelSlot | null>(() => {
  if (activeFloor.value?.level === 0) return 'lt1'
  if (activeFloor.value?.level === 1) return 'lt2'
  return null
})
const modelUrl = computed(() => selectedWorkspaceId.value && modelSlot.value
  ? `/api/workspaces/${selectedWorkspaceId.value}/situm/3d-model/${modelSlot.value}`
  : '')

const nativeMapHref = computed(() => buildNativeMapHref(
  config.public.mobile,
  selectedWorkspaceId.value,
  activeBuildingId.value
))

function resolveMapContext() {
  if (!cartography.value?.buildings.length) {
    activeBuildingId.value = null
    activeFloorId.value = null
    return
  }
  const requestedBuildingId = positiveQueryId(route.query.buildingId)
  const building = cartography.value.buildings.find(candidate => candidate.id === requestedBuildingId)
    ?? cartography.value.buildings.find(candidate => candidate.id === activeBuildingId.value)
    ?? cartography.value.buildings[0]!
  activeBuildingId.value = building.id

  const floors = cartography.value.floors.filter(floor => floor.buildingId === building.id).sort((a, b) => b.level - a.level)
  const requestedFloorId = positiveQueryId(route.query.floorId)
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
  destinations.value = []
  selectedDestination.value = null
  walkReady.value = false
  walkError.value = ''
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
  selectedPoi.value = null
  destinations.value = []
  selectedDestination.value = null
  walkReady.value = false
  walkError.value = ''
  syncFloorQuery(floorId)
}

function setViewMode(mode: ExploreViewMode) {
  if (viewMode.value === mode) return
  actionMessage.value = ''
  selectedPoi.value = null
  selectedDestination.value = null
  destinations.value = []
  walkReady.value = false
  walkError.value = ''
  const query = { ...route.query }
  if (mode === '3d') query.view = '3d'
  else delete query.view
  void router.replace({ query })
}

function selectPoi(poi: SitumCartographyPoi) {
  if (activeFloorId.value !== poi.floorId) selectFloor(poi.floorId)
  selectedPoi.value = poi
  searchDock.value?.dismiss()
}

function clearPoi() {
  selectedPoi.value = null
}

function closePoi() {
  selectedPoi.value = null
  searchDock.value?.clearQuery()
}

function dismissMapOverlays() {
  searchDock.value?.dismiss()
}

function changePoi() {
  clearPoi()
  searchDock.value?.focusSearch()
}

function onWalkReady(loadedDestinations: IndoorWalkDestination[]) {
  destinations.value = loadedDestinations
  walkReady.value = true
  walkError.value = ''
}

function onWalkError(message: string) {
  destinations.value = []
  selectedDestination.value = null
  walkReady.value = false
  walkError.value = message
}

function selectDestination(destination: IndoorWalkDestination) {
  selectedDestination.value = destination
  walkSearchDock.value?.dismiss()
}

function clearDestination() {
  selectedDestination.value = null
}

function closeDestination() {
  selectedDestination.value = null
  walkSearchDock.value?.clearQuery()
}

function changeDestination() {
  clearDestination()
  walkSearchDock.value?.focusSearch()
}

function goToDestination() {
  actionMessage.value = ''
  if (!selectedDestination.value || !walkCanvas.value?.goToDestination(selectedDestination.value)) {
    actionMessage.value = 'The selected room is not available in the active 3D floor.'
  }
}

function resetView() {
  if (viewMode.value === '3d') walkCanvas.value?.resetView()
  else mapCanvas.value?.resetView()
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

definePageMeta({ middleware: 'auth', layout: 'app', title: 'Explore', fullWidth: true })
</script>

<template>
  <div v-if="!workspaceLoaded" class="map-workspace relative -m-4 h-[calc(100vh-4rem)] min-h-0 overflow-hidden border border-default bg-default sm:-m-6 lg:-m-8" aria-label="Loading Explore" aria-busy="true">
    <USkeleton class="h-full w-full rounded-none" />
  </div>

  <div v-else ref="workspaceElement" class="map-workspace relative -m-4 flex h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden border border-default sm:-m-6 lg:-m-8" :class="{ 'is-3d': viewMode === '3d' }">
    <div v-if="actionMessage" class="absolute left-1/2 top-3 z-40 w-[min(92%,34rem)] -translate-x-1/2">
      <UAlert color="warning" variant="subtle" :description="actionMessage" />
    </div>

    <div class="relative min-h-0 min-w-0 flex-1">
      <USkeleton v-if="cartographyLoading" class="h-full w-full rounded-none" aria-label="Loading Explore cartography" aria-busy="true" />
      <div v-else-if="!selectedWorkspaceId" class="absolute inset-0 flex items-center justify-center bg-default px-6">
        <UAlert color="neutral" variant="subtle" title="No workspace selected" description="Create or select a workspace before opening Explore." class="max-w-md" />
      </div>
      <div v-else-if="cartographyError" class="absolute inset-0 flex items-center justify-center bg-default px-6">
        <UAlert color="error" variant="subtle" title="Explore unavailable" description="The selected workspace cartography could not be loaded." class="max-w-md" />
      </div>
      <div v-else-if="String(cartographyStatus) === 'success' && !activeBuilding" class="absolute inset-0 flex items-center justify-center bg-default px-6">
        <UAlert color="neutral" variant="subtle" title="No building data" description="The selected workspace did not return a Situm building." class="max-w-md" />
      </div>
      <div v-else-if="activeBuilding && !activeFloor" class="absolute inset-0 flex items-center justify-center bg-default px-6">
        <UAlert color="neutral" variant="subtle" title="Floor plan unavailable" description="This building has no floor that can be explored." class="max-w-md" />
      </div>

      <template v-else-if="activeBuilding && activeFloor">
        <template v-if="viewMode === '2d'">
          <MapIndoorMapCanvas
            ref="mapCanvas"
            :building="activeBuilding"
            :floor="activeFloor"
            :pois="buildingPois"
            :selected-poi="selectedPoi"
            @poi-select="selectPoi"
            @map-press="dismissMapOverlays"
          />
          <MapSearchDock
            ref="searchDock"
            :building-name="activeBuilding.name"
            :floors="buildingFloors"
            :active-floor-id="activeFloor.id"
            :pois="buildingPois"
            :selected-poi="selectedPoi"
            @floor-select="selectFloor"
            @poi-select="selectPoi"
            @clear-destination="clearPoi"
          />
          <MapControlStack :fullscreen="isFullscreen" @reset="resetView" @fullscreen-toggle="toggleFullscreen" />
          <MapDestinationCard
            v-if="selectedPoi"
            :poi="selectedPoi"
            :floor-name="selectedPoiFloorName"
            :native-href="nativeMapHref"
            @close="closePoi"
            @change="changePoi"
          />
        </template>

        <template v-else>
          <div v-if="!modelSlot" class="absolute inset-0 flex items-center justify-center bg-neutral-950 px-6">
            <UAlert color="error" variant="subtle" title="3D model unavailable" description="This floor has no configured Digital Twin 3D model." class="max-w-md" />
          </div>
          <template v-else>
            <LazyMapIndoorWalkCanvas
              :key="`${activeFloor.id}:${modelSlot}`"
              ref="walkCanvas"
              :floor-id="activeFloor.id"
              :floor-level="activeFloor.level"
              :floor-name="activeFloor.name"
              :model-slot="modelSlot"
              :model-url="modelUrl"
              @ready="onWalkReady"
              @error="onWalkError"
            />
            <MapWalkSearchDock
              v-if="walkReady"
              ref="walkSearchDock"
              :building-name="activeBuilding.name"
              :floors="buildingFloors"
              :active-floor-id="activeFloor.id"
              :destinations="destinations"
              :selected-destination="selectedDestination"
              @floor-select="selectFloor"
              @destination-select="selectDestination"
              @clear-destination="clearDestination"
            />
            <MapControlStack v-if="walkReady" :fullscreen="isFullscreen" @reset="resetView" @fullscreen-toggle="toggleFullscreen" />
            <MapWalkDestinationCard
              v-if="walkReady && selectedDestination"
              :destination="selectedDestination"
              :floor-name="activeFloor.name"
              @go="goToDestination"
              @close="closeDestination"
              @change="changeDestination"
            />
            <div v-if="walkError" class="sr-only" role="alert">{{ walkError }}</div>
          </template>
        </template>

        <button type="button" class="view-mode-switch" @click="setViewMode(viewMode === '2d' ? '3d' : '2d')">
          <UIcon :name="viewMode === '2d' ? 'i-lucide-box' : 'i-lucide-map'" />
          <span>{{ viewMode === '2d' ? 'Digital Twin 3D' : '2D Map' }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped src="./map.css"></style>
