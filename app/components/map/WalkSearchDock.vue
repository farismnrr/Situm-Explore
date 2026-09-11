<script setup lang="ts">
import type { IndoorWalkDestination } from '#shared/indoor-walk'
import type { SitumCartographyFloor } from '#shared/situm-cartography'

const props = defineProps<{
  buildingName: string
  floors: SitumCartographyFloor[]
  activeFloorId: number
  destinations: IndoorWalkDestination[]
  selectedDestination?: IndoorWalkDestination | null
}>()

const emit = defineEmits<{
  floorSelect: [floorId: number]
  destinationSelect: [destination: IndoorWalkDestination]
  clearDestination: []
}>()

const panelElement = ref<HTMLElement | null>(null)
const inputElement = ref<HTMLInputElement | null>(null)
const query = ref('')
const searchOpen = ref(false)
const floorOpen = ref(false)

const activeFloor = computed(() => props.floors.find(floor => floor.id === props.activeFloorId))
const visibleResults = computed(() => {
  const normalized = query.value.trim().toLowerCase()
  const matches = normalized
    ? props.destinations.filter((destination) => {
        const haystack = `${destination.name} ${destination.category}`.toLowerCase()
        return haystack.includes(normalized)
      })
    : props.destinations
  return matches.slice(0, 10)
})

watch(() => props.selectedDestination?.id, () => {
  if (props.selectedDestination) query.value = props.selectedDestination.name
})

function onInput(event: Event) {
  query.value = (event.target as HTMLInputElement).value
  searchOpen.value = true
  floorOpen.value = false
  if (props.selectedDestination && query.value !== props.selectedDestination.name) emit('clearDestination')
}

function selectDestination(destination: IndoorWalkDestination) {
  query.value = destination.name
  searchOpen.value = false
  floorOpen.value = false
  inputElement.value?.blur()
  emit('destinationSelect', destination)
}

function selectFloor(floorId: number) {
  floorOpen.value = false
  emit('floorSelect', floorId)
}

function clearSearch() {
  query.value = ''
  searchOpen.value = true
  if (props.selectedDestination) emit('clearDestination')
  nextTick(() => inputElement.value?.focus())
}

function dismiss() {
  searchOpen.value = false
  floorOpen.value = false
  inputElement.value?.blur()
}

function clearQuery() {
  query.value = ''
  dismiss()
}

function focusSearch() {
  searchOpen.value = true
  floorOpen.value = false
  nextTick(() => inputElement.value?.focus())
}

function onFocusOut(event: FocusEvent) {
  const nextTarget = event.relatedTarget
  if (nextTarget instanceof Node && panelElement.value?.contains(nextTarget)) return
  searchOpen.value = false
}

function submitFirstResult() {
  const first = visibleResults.value[0]
  if (first) selectDestination(first)
}

defineExpose({ dismiss, focusSearch, clearSearch, clearQuery })
</script>

<template>
  <div ref="panelElement" class="map-search-dock" @focusout="onFocusOut">
    <div class="search-card">
      <div class="search-row">
        <span class="search-icon" aria-hidden="true"><UIcon name="i-lucide-search" /></span>
        <input
          ref="inputElement"
          :value="query"
          type="search"
          autocomplete="off"
          spellcheck="false"
          placeholder="Where do you want to go?"
          aria-label="Search 3D rooms"
          @focus="searchOpen = true; floorOpen = false"
          @input="onInput"
          @keydown.enter.prevent="submitFirstResult"
          @keydown.esc="dismiss"
        >
        <button v-if="query" type="button" class="clear-search" aria-label="Clear destination search" @click="clearSearch">
          <UIcon name="i-lucide-x" />
        </button>
      </div>

      <div class="context-row">
        <span class="building-name" :title="buildingName">{{ buildingName }}</span>
        <button
          type="button"
          class="floor-trigger"
          :aria-expanded="floorOpen"
          aria-label="Choose floor"
          @click="floorOpen = !floorOpen; searchOpen = false"
        >
          <UIcon name="i-lucide-layers-3" />
          <span>{{ activeFloor?.name || 'Floors' }}</span>
          <UIcon :name="floorOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" />
        </button>
      </div>

      <div v-if="floorOpen" class="floor-choices" aria-label="Floor choices">
        <button
          v-for="floor in floors"
          :key="floor.id"
          type="button"
          class="floor-chip"
          :class="{ active: floor.id === activeFloorId }"
          :aria-pressed="floor.id === activeFloorId"
          @click="selectFloor(floor.id)"
        >{{ floor.name || `Level ${floor.level}` }}</button>
      </div>

      <div v-if="searchOpen" class="search-results" aria-label="3D room search results">
        <button
          v-for="result in visibleResults"
          :key="result.id"
          type="button"
          class="search-result"
          @mousedown.prevent
          @click="selectDestination(result)"
        >
          <span class="result-icon" aria-hidden="true"><UIcon name="i-lucide-door-open" /></span>
          <span class="result-copy">
            <strong>{{ result.name }}</strong>
            <span>{{ result.category }} · {{ activeFloor?.name || 'Current floor' }}</span>
          </span>
          <UIcon name="i-lucide-chevron-right" class="result-arrow" aria-hidden="true" />
        </button>
        <div v-if="!visibleResults.length" class="search-empty">No discoverable rooms in this 3D floor model.</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-search-dock {
  position: absolute;
  top: 14px;
  left: 16px;
  z-index: 20;
  width: min(460px, calc(100% - 32px));
}
.search-card {
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 86%);
  border-radius: 18px;
  background: rgb(255 255 255 / 97%);
  box-shadow: 0 10px 32px rgb(15 23 42 / 14%);
  backdrop-filter: blur(16px);
}
.search-row {
  display: flex;
  min-height: 54px;
  align-items: center;
  padding: 0 12px;
}
.search-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  flex: 0 0 auto;
  color: #246bfd;
  font-size: 20px;
}
.search-row input {
  min-width: 0;
  min-height: 50px;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #10233f;
  font: inherit;
  font-size: 15px;
  font-weight: 650;
}
.search-row input::placeholder { color: #7b8794; font-weight: 550; }
.search-row input::-webkit-search-cancel-button { display: none; }
.clear-search {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}
.clear-search:hover { background: #f1f5f9; color: #10233f; }
.context-row {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 8px;
  border-top: 1px solid #e6e8ec;
  padding: 6px 12px;
}
.building-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: #64748b;
  font-size: 11px;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.floor-trigger {
  display: flex;
  min-height: 30px;
  max-width: 190px;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border: 0;
  border-radius: 9px;
  background: #f1f5f9;
  color: #334155;
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;
}
.floor-trigger span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.floor-trigger :deep(svg:first-child) { color: #246bfd; }
.floor-choices {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  border-top: 1px solid #eef0f3;
  padding: 10px 12px;
  scrollbar-width: thin;
}
.floor-chip {
  min-height: 30px;
  flex: 0 0 auto;
  padding: 5px 11px;
  border: 1px solid #d8dce2;
  border-radius: 999px;
  background: white;
  color: #334155;
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;
}
.floor-chip.active { border-color: #246bfd; background: #246bfd; color: white; }
.search-results {
  max-height: 330px;
  overflow-y: auto;
  border-top: 1px solid #e6e8ec;
}
.search-result {
  display: flex;
  width: 100%;
  min-height: 58px;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 0;
  border-bottom: 1px solid #eef0f3;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.search-result:last-child { border-bottom: 0; }
.search-result:hover, .search-result:focus-visible { background: #f8fafc; }
.result-icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #eff6ff;
  color: #246bfd;
}
.result-copy { display: block; min-width: 0; flex: 1; }
.result-copy strong {
  display: block;
  overflow: hidden;
  color: #10233f;
  font-size: 13px;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-copy span {
  display: block;
  overflow: hidden;
  margin-top: 3px;
  color: #7b8794;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-arrow { flex: 0 0 auto; color: #94a3b8; }
.search-empty { padding: 18px 16px; color: #7b8794; font-size: 12px; text-align: center; }
@media (max-width: 640px) {
  .map-search-dock { top: 12px; left: 12px; width: calc(100% - 24px); }
  .search-card { border-radius: 16px; }
  .search-results { max-height: min(330px, 46vh); }
}
</style>
