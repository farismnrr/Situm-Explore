<script setup lang="ts">
import type { SitumCartographyBuilding, SitumCartographyFloor, SitumCartographyPoi } from '#shared/situm-cartography'
import type { IndoorRoute, IndoorRoutePoint } from '~/utils/indoor-route'

type Rect = { x: number; y: number; width: number; height: number }
type Placement = {
  poi: SitumCartographyPoi
  x: number
  y: number
  label: string
  selected: boolean
  labelRect: Rect | null
}

const props = defineProps<{
  building: SitumCartographyBuilding
  floor: SitumCartographyFloor
  pois: SitumCartographyPoi[]
  selectedPoi?: SitumCartographyPoi | null
  route?: IndoorRoute | null
  routeStartPoiId?: number | null
  routeDestinationPoiId?: number | null
  resetNonce?: number
}>()

const emit = defineEmits<{
  poiSelect: [poi: SitumCartographyPoi]
  mapPress: []
}>()

const viewportElement = ref<HTMLElement | null>(null)
const viewport = reactive({ width: 0, height: 0 })
const scale = ref(1)
const offset = reactive({ x: 0, y: 0 })
const imageFailed = ref(false)
const pointers = new Map<number, { x: number; y: number }>()
let resizeObserver: ResizeObserver | null = null
let panStart = { x: 0, y: 0, offsetX: 0, offsetY: 0 }
let pinchStart = { distance: 0, scale: 1 }
let gestureDistance = 0

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const overlaps = (a: Rect, b: Rect, padding = 0) => !(
  a.x + a.width + padding <= b.x
  || b.x + b.width + padding <= a.x
  || a.y + a.height + padding <= b.y
  || b.y + b.height + padding <= a.y
)

const frame = computed(() => {
  const { width, length } = props.building.dimensions
  if (width <= 0 || length <= 0 || viewport.width <= 0 || viewport.height <= 0) return { width: 0, height: 0, left: 0, top: 0 }
  const fittedScale = Math.min(viewport.width / width, viewport.height / length)
  const frameWidth = width * fittedScale
  const frameHeight = length * fittedScale
  return {
    width: frameWidth,
    height: frameHeight,
    left: (viewport.width - frameWidth) / 2,
    top: (viewport.height - frameHeight) / 2
  }
})

const surface = computed(() => ({
  width: frame.value.width * scale.value,
  height: frame.value.height * scale.value,
  left: frame.value.left + offset.x + frame.value.width * (1 - scale.value) / 2,
  top: frame.value.top + offset.y + frame.value.height * (1 - scale.value) / 2
}))

const surfaceStyle = computed(() => ({
  width: `${frame.value.width}px`,
  height: `${frame.value.height}px`,
  left: `${frame.value.left}px`,
  top: `${frame.value.top}px`,
  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale.value})`
}))

const floorPois = computed(() => props.pois.filter(poi => poi.floorId === props.floor.id).slice(0, 100))

function floorSurfacePoint(point: Pick<IndoorRoutePoint, 'x' | 'y'>) {
  const { width, length } = props.building.dimensions
  return {
    x: (width > 0 ? point.x / width : 0) * frame.value.width,
    y: (length > 0 ? (length - point.y) / length : 0) * frame.value.height
  }
}

const routeSegments = computed(() => {
  const segments: IndoorRoutePoint[][] = []
  let current: IndoorRoutePoint[] = []
  for (const point of props.route?.points ?? []) {
    if (point.floorId !== props.floor.id) {
      if (current.length > 1) segments.push(current)
      current = []
      continue
    }
    current.push(point)
  }
  if (current.length > 1) segments.push(current)
  return segments.map(points => points.map(floorSurfacePoint).map(point => `${point.x},${point.y}`).join(' '))
})

function routeRole(poi: SitumCartographyPoi) {
  if (poi.id === props.routeStartPoiId) return 'Start'
  if (poi.id === props.routeDestinationPoiId) return 'Destination'
  return ''
}

function poiPriority(poi: SitumCartographyPoi) {
  const category = poi.categoryName.toLowerCase()
  if (category.includes('entrance') || category.includes('exit')) return 0
  if (category.includes('information')) return 1
  if (category.includes('toilet')) return 2
  if (category.includes('coffee') || category.includes('food') || category.includes('kitchen')) return 3
  return 4
}

function poiScreenPoint(poi: SitumCartographyPoi) {
  const { width, length } = props.building.dimensions
  return {
    x: surface.value.left + (width > 0 ? poi.location.x / width : 0) * surface.value.width,
    y: surface.value.top + (length > 0 ? (length - poi.location.y) / length : 0) * surface.value.height
  }
}

const placements = computed<Placement[]>(() => {
  if (!viewport.width || !viewport.height || !surface.value.width || !surface.value.height) return []

  const markerRects = new Map<number, Rect>(floorPois.value.map((poi) => {
    const point = poiScreenPoint(poi)
    return [poi.id, { x: point.x - 10, y: point.y - 10, width: 20, height: 20 }]
  }))
  const occupiedLabels: Rect[] = []
  const labelBudget = scale.value >= 2 ? 12 : scale.value >= 1.35 ? 7 : 4
  let normalLabels = 0
  const byId = new Map<number, Placement>()
  const ordered = [...floorPois.value].sort((a, b) => {
    if (a.id === props.selectedPoi?.id) return -1
    if (b.id === props.selectedPoi?.id) return 1
    return poiPriority(a) - poiPriority(b) || a.name.localeCompare(b.name)
  })

  for (const poi of ordered) {
    const point = poiScreenPoint(poi)
    const selected = poi.id === props.selectedPoi?.id
    const label = poi.name.trim().slice(0, 28) || 'Place'
    const labelWidth = clamp(label.length * (selected ? 6.7 : 6.1) + 18, 56, 160)
    const labelHeight = selected ? 26 : 22
    const gap = 9
    const edge = 8
    let labelRect: Rect | null = null

    if (point.x >= -24 && point.x <= viewport.width + 24 && point.y >= -24 && point.y <= viewport.height + 24 && (selected || normalLabels < labelBudget)) {
      const raw: Rect[] = [
        { x: point.x + gap, y: point.y - labelHeight / 2, width: labelWidth, height: labelHeight },
        { x: point.x - gap - labelWidth, y: point.y - labelHeight / 2, width: labelWidth, height: labelHeight },
        { x: point.x - labelWidth / 2, y: point.y - gap - labelHeight, width: labelWidth, height: labelHeight },
        { x: point.x - labelWidth / 2, y: point.y + gap, width: labelWidth, height: labelHeight }
      ]
      const candidates = raw.map(rect => ({
        ...rect,
        x: clamp(rect.x, edge, Math.max(edge, viewport.width - edge - rect.width)),
        y: clamp(rect.y, edge, Math.max(edge, viewport.height - edge - rect.height))
      }))
      const blockers = [...markerRects.entries()].filter(([id]) => id !== poi.id).map(([, rect]) => rect)
      const fits = (candidate: Rect) => blockers.every(rect => !overlaps(candidate, rect, 2)) && occupiedLabels.every(rect => !overlaps(candidate, rect, 5))
      labelRect = candidates.find(fits) ?? null
      if (selected && !labelRect) {
        labelRect = [...candidates].sort((a, b) => {
          const score = (candidate: Rect) => blockers.filter(rect => overlaps(candidate, rect, 1)).length + occupiedLabels.filter(rect => overlaps(candidate, rect, 3)).length
          return score(a) - score(b)
        })[0] ?? null
      }
    }

    if (labelRect) {
      occupiedLabels.push(labelRect)
      if (!selected) normalLabels += 1
    }
    byId.set(poi.id, { poi, x: point.x, y: point.y, label, selected, labelRect })
  }

  return floorPois.value.map(poi => byId.get(poi.id)).filter((placement): placement is Placement => Boolean(placement))
})

function pointerDistance() {
  const values = [...pointers.values()]
  if (values.length < 2) return 0
  return Math.hypot(values[1]!.x - values[0]!.x, values[1]!.y - values[0]!.y)
}

function resetView() {
  scale.value = 1
  offset.x = 0
  offset.y = 0
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  viewportElement.value?.setPointerCapture(event.pointerId)
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  gestureDistance = 0
  if (pointers.size === 1) {
    panStart = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y }
  } else if (pointers.size === 2) {
    pinchStart = { distance: pointerDistance(), scale: scale.value }
  }
}

function onPointerMove(event: PointerEvent) {
  if (!pointers.has(event.pointerId)) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (pointers.size >= 2) {
    const distance = pointerDistance()
    if (pinchStart.distance > 0 && distance > 0) scale.value = clamp(pinchStart.scale * distance / pinchStart.distance, 0.8, 4.5)
    gestureDistance = Math.max(gestureDistance, Math.abs(distance - pinchStart.distance))
    return
  }
  gestureDistance = Math.max(gestureDistance, Math.hypot(event.clientX - panStart.x, event.clientY - panStart.y))
  offset.x = panStart.offsetX + event.clientX - panStart.x
  offset.y = panStart.offsetY + event.clientY - panStart.y
}

function onPointerEnd(event: PointerEvent) {
  const wasTracked = pointers.delete(event.pointerId)
  if (!wasTracked) return
  if (viewportElement.value?.hasPointerCapture(event.pointerId)) viewportElement.value.releasePointerCapture(event.pointerId)
  if (!pointers.size) {
    if (gestureDistance < 6) emit('mapPress')
    return
  }
  const remaining = [...pointers.values()][0]!
  panStart = { x: remaining.x, y: remaining.y, offsetX: offset.x, offsetY: offset.y }
}

function onWheel(event: WheelEvent) {
  const factor = event.deltaY < 0 ? 1.12 : 0.9
  scale.value = clamp(scale.value * factor, 0.8, 4.5)
}

watch(() => [props.building.id, props.floor.id], () => {
  imageFailed.value = false
  resetView()
})
watch(() => props.resetNonce, resetView)

onMounted(() => {
  if (!viewportElement.value) return
  resizeObserver = new ResizeObserver(([entry]) => {
    if (!entry) return
    viewport.width = entry.contentRect.width
    viewport.height = entry.contentRect.height
  })
  resizeObserver.observe(viewportElement.value)
})
onBeforeUnmount(() => resizeObserver?.disconnect())

defineExpose({ resetView })
</script>

<template>
  <div
    ref="viewportElement"
    class="indoor-map-canvas"
    role="application"
    :aria-label="`Indoor map of ${building.name}, ${floor.name}`"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerEnd"
    @pointercancel="onPointerEnd"
    @wheel.prevent="onWheel"
  >
    <div class="map-grid" aria-hidden="true" />
    <div v-if="frame.width && frame.height" class="floor-surface" :style="surfaceStyle">
      <img v-if="floor.mapUrl && !imageFailed" :src="floor.mapUrl" :alt="`Floor plan ${floor.name}`" draggable="false" @error="imageFailed = true">
      <div v-else class="missing-plan">Floor plan unavailable</div>
      <svg v-if="routeSegments.length" class="route-overlay" :viewBox="`0 0 ${frame.width} ${frame.height}`" preserveAspectRatio="none" aria-hidden="true">
        <polyline v-for="(points, index) in routeSegments" :key="index" :points="points" />
      </svg>
    </div>

    <template v-for="placement in placements" :key="placement.poi.id">
      <button
        type="button"
        class="poi-target"
        :class="{ selected: placement.selected, start: routeRole(placement.poi) === 'Start', destination: routeRole(placement.poi) === 'Destination' }"
        :style="{ left: `${placement.x}px`, top: `${placement.y}px` }"
        :aria-label="routeRole(placement.poi) ? `${routeRole(placement.poi)}: ${placement.label}` : `Open ${placement.label}`"
        data-map-interactive
        @pointerdown.stop
        @click.stop="emit('poiSelect', placement.poi)"
      >
        <span class="poi-dot" aria-hidden="true" />
      </button>
      <button
        v-if="placement.labelRect"
        type="button"
        class="poi-label"
        :class="{ selected: placement.selected, start: routeRole(placement.poi) === 'Start', destination: routeRole(placement.poi) === 'Destination' }"
        :style="{
          left: `${placement.labelRect.x}px`,
          top: `${placement.labelRect.y}px`,
          width: `${placement.labelRect.width}px`,
          height: `${placement.labelRect.height}px`
        }"
        :aria-label="routeRole(placement.poi) ? `${routeRole(placement.poi)}: ${placement.label}` : `Open ${placement.label}`"
        data-map-interactive
        @pointerdown.stop
        @click.stop="emit('poiSelect', placement.poi)"
      >{{ placement.label }}</button>
    </template>

    <div class="floor-badge" aria-hidden="true">{{ floor.name }}</div>
  </div>
</template>

<style scoped src="./IndoorMapCanvas.css"></style>
