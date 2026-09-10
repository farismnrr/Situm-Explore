<script setup lang="ts">
import type { IndoorWalkDestination } from '#shared/indoor-walk'
import type { SitumCartographyResponse } from '#shared/situm-cartography'
import { isWorkspaceRequestLoading } from '~/utils/async-state'

const route = useRoute()
const router = useRouter()
const workspaceElement = ref<HTMLElement | null>(null)
const walkCanvas = ref<{ resetView: () => void; goToDestination: (destination: IndoorWalkDestination) => boolean } | null>(null)
const searchDock = ref<{ dismiss: () => void; focusSearch: () => void; clearQuery: () => void } | null>(null)
const actionMessage = ref('')
const isFullscreen = ref(false)
const activeBuildingId = ref<number | null>(null)
const activeFloorId = ref<number | null>(null)
const destinations = ref<IndoorWalkDestination[]>([])
const selectedDestination = ref<IndoorWalkDestination | null>(null)
const walkReady = ref(false)
const walkError = ref('')

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

const cartographyLoading = computed(() => isWorkspaceRequestLoading(workspaceLoaded.value, selectedWorkspaceId.value, cartographyStatus.value))
const activeBuilding = computed(() => cartography.value?.buildings.find(building => building.id === activeBuildingId.value) ?? null)
const buildingFloors = computed(() => (cartography.value?.floors ?? []).filter(floor => floor.buildingId === activeBuildingId.value).sort((a, b) => b.level - a.level))
const activeFloor = computed(() => buildingFloors.value.find(floor => floor.id === activeFloorId.value) ?? buildingFloors.value[0] ?? null)
const modelSlot = computed(() => {
  if (activeFloor.value?.level === 0) return 'lt1'
  if (activeFloor.value?.level === 1) return 'lt2'
  return null
})
const modelUrl = computed(() => selectedWorkspaceId.value && modelSlot.value
  ? `/api/workspaces/${selectedWorkspaceId.value}/situm/3d-model/${modelSlot.value}`
  : '')

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
}

watch([cartography, () => route.query.buildingId, () => route.query.floorId], resolveMapContext, { immediate: true })
watch(selectedWorkspaceId, () => {
  activeBuildingId.value = null
  activeFloorId.value = null
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
  destinations.value = []
  selectedDestination.value = null
  walkReady.value = false
  walkError.value = ''
  syncFloorQuery(floorId)
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
  searchDock.value?.dismiss()
}

function clearDestination() {
  selectedDestination.value = null
}

function closeDestination() {
  selectedDestination.value = null
  searchDock.value?.clearQuery()
}

function changeDestination() {
  clearDestination()
  searchDock.value?.focusSearch()
}

function goToDestination() {
  actionMessage.value = ''
  if (!selectedDestination.value || !walkCanvas.value?.goToDestination(selectedDestination.value)) {
    actionMessage.value = 'The selected room is not available in the active 3D floor.'
  }
}

function resetView() {
  walkCanvas.value?.resetView()
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

  <div v-else ref="workspaceElement" class="map-workspace relative -m-4 flex h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden border border-default sm:-m-6 lg:-m-8">
    <div v-if="actionMessage" class="absolute left-1/2 top-3 z-40 w-[min(92%,34rem)] -translate-x-1/2">
      <UAlert color="warning" variant="subtle" :description="actionMessage" />
    </div>

    <div class="relative min-h-0 min-w-0 flex-1">
      <USkeleton v-if="cartographyLoading" class="h-full w-full rounded-none" aria-label="Loading Explore cartography" aria-busy="true" />
      <div v-else-if="!selectedWorkspaceId" class="absolute inset-0 flex items-center justify-center bg-neutral-950 px-6">
        <UAlert color="neutral" variant="subtle" title="No workspace selected" description="Create or select a workspace before opening Explore." class="max-w-md" />
      </div>
      <div v-else-if="cartographyError" class="absolute inset-0 flex items-center justify-center bg-neutral-950 px-6">
        <UAlert color="error" variant="subtle" title="Explore unavailable" description="The selected workspace cartography could not be loaded." class="max-w-md" />
      </div>
      <div v-else-if="String(cartographyStatus) === 'success' && !activeBuilding" class="absolute inset-0 flex items-center justify-center bg-neutral-950 px-6">
        <UAlert color="neutral" variant="subtle" title="No building data" description="The selected workspace did not return a Situm building." class="max-w-md" />
      </div>
      <div v-else-if="activeBuilding && !activeFloor" class="absolute inset-0 flex items-center justify-center bg-neutral-950 px-6">
        <UAlert color="error" variant="subtle" title="3D floor unavailable" description="This building has no floor that can be opened in the 3D walkthrough." class="max-w-md" />
      </div>
      <div v-else-if="activeBuilding && activeFloor && !modelSlot" class="absolute inset-0 flex items-center justify-center bg-neutral-950 px-6">
        <UAlert color="error" variant="subtle" title="3D model unavailable" description="This floor has no configured digital-twin model. Explore does not fall back to a 2D floorplan." class="max-w-md" />
      </div>

      <template v-else-if="activeBuilding && activeFloor && modelSlot">
        <MapIndoorWalkCanvas
          :key="activeFloor.id"
          ref="walkCanvas"
          :floor-id="activeFloor.id"
          :floor-name="activeFloor.name"
          :model-url="modelUrl"
          @ready="onWalkReady"
          @error="onWalkError"
        />
        <MapSearchDock
          v-if="walkReady"
          ref="searchDock"
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
        <MapDestinationCard
          v-if="walkReady && selectedDestination"
          :destination="selectedDestination"
          :floor-name="activeFloor.name"
          @go="goToDestination"
          @close="closeDestination"
          @change="changeDestination"
        />
        <div v-if="walkError" class="sr-only" role="alert">{{ walkError }}</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.map-workspace { border-radius: 1rem; background: #101722; }
.map-workspace:fullscreen { width: 100vw; height: 100vh; margin: 0 !important; border: 0; border-radius: 0; }
@media (max-width: 640px) {
  .map-workspace { border-radius: 0; }
}
</style>
