<script setup lang="ts">
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  Clock,
  Color,
  DirectionalLight,
  MathUtils,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Object3D
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { IndoorWalkDestination } from '#shared/indoor-walk'
import { extractIndoorWalkDestinations } from '~/utils/indoor-walk-destinations'
import { disposeIndoorWalkObject, disposeIndoorWalkRenderer, updateIndoorWalkDiagnostics } from '~/utils/indoor-walk-renderer'
import { indoorWalkViews, type IndoorWalkModelSlot } from '~/utils/indoor-walk-view'

const EYE_HEIGHT = 1.62
const MOVE_SPEED = 2.35
const LOOK_SENSITIVITY = 0.0042

const props = defineProps<{
  floorId: number
  floorLevel: number
  floorName: string
  modelSlot: IndoorWalkModelSlot
  modelUrl: string
}>()

const emit = defineEmits<{
  ready: [destinations: IndoorWalkDestination[]]
  error: [message: string]
}>()

const host = ref<HTMLElement | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const dragging = ref(false)
const touchKeys = reactive(new Set<string>())

let renderer: WebGLRenderer | null = null
let scene: Scene | null = null
let camera: PerspectiveCamera | null = null
let resizeObserver: ResizeObserver | null = null
let animationFrame = 0
let modelRoot: Object3D | null = null
let modelBounds = new Box3()
let disposed = false
const spawnPosition = new Vector3()
let spawnYaw = 0
let spawnPitch = 0
let yaw = 0
let pitch = 0
let lastPointerX = 0
let lastPointerY = 0
const pressedKeys = new Set<string>()
const clock = new Clock()
let travel: { from: Vector3; to: Vector3; startedAt: number; duration: number } | null = null

function disposeRenderer() {
  disposeIndoorWalkRenderer(renderer)
  renderer = null
}

function updateCanvasDiagnostics() {
  if (!renderer || !camera) return
  updateIndoorWalkDiagnostics({
    renderer,
    camera,
    yaw,
    floorId: props.floorId,
    floorLevel: props.floorLevel,
    modelSlot: props.modelSlot,
    modelBounds,
    modelReady: Boolean(modelRoot)
  })
}

function applyCameraRotation() {
  if (!camera) return
  camera.rotation.order = 'YXZ'
  camera.rotation.y = yaw
  camera.rotation.x = pitch
}

function clampCameraPosition() {
  if (!camera || modelBounds.isEmpty()) return
  const inset = 0.18
  camera.position.x = MathUtils.clamp(camera.position.x, modelBounds.min.x + inset, modelBounds.max.x - inset)
  camera.position.z = MathUtils.clamp(camera.position.z, modelBounds.min.z + inset, modelBounds.max.z - inset)
  camera.position.y = EYE_HEIGHT
}

function normalizedBoundsPoint(x: number, z: number) {
  return new Vector3(
    MathUtils.lerp(modelBounds.min.x, modelBounds.max.x, x),
    EYE_HEIGHT,
    MathUtils.lerp(modelBounds.min.z, modelBounds.max.z, z)
  )
}

function setSpawn() {
  if (!camera) return
  const view = indoorWalkViews[props.modelSlot]
  const base = normalizedBoundsPoint(view.spawn.x, view.spawn.z)
  const target = normalizedBoundsPoint(view.lookAt.x, view.lookAt.z)
  camera.position.copy(base)
  camera.lookAt(target)
  camera.rotation.order = 'YXZ'
  yaw = camera.rotation.y
  pitch = camera.rotation.x
  clampCameraPosition()
  spawnPosition.copy(camera.position)
  spawnYaw = yaw
  spawnPitch = pitch
}

function resize() {
  if (!host.value || !renderer || !camera) return
  const { clientWidth, clientHeight } = host.value
  if (!clientWidth || !clientHeight) return
  renderer.setSize(clientWidth, clientHeight, false)
  camera.aspect = clientWidth / clientHeight
  camera.updateProjectionMatrix()
}

function activeKey(key: string) {
  return pressedKeys.has(key) || touchKeys.has(key)
}

function updateMovement(delta: number) {
  if (!camera || travel) return
  let forwardAmount = 0
  let rightAmount = 0
  if (activeKey('w') || activeKey('arrowup')) forwardAmount += 1
  if (activeKey('s') || activeKey('arrowdown')) forwardAmount -= 1
  if (activeKey('d') || activeKey('arrowright')) rightAmount += 1
  if (activeKey('a') || activeKey('arrowleft')) rightAmount -= 1
  if (!forwardAmount && !rightAmount) return
  const forward = new Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
  const right = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
  const movement = forward.multiplyScalar(forwardAmount).add(right.multiplyScalar(rightAmount))
  if (movement.lengthSq() > 1) movement.normalize()
  camera.position.addScaledVector(movement, MOVE_SPEED * delta)
  clampCameraPosition()
}

function updateTravel(now: number) {
  if (!camera || !travel) return
  const progress = MathUtils.clamp((now - travel.startedAt) / travel.duration, 0, 1)
  const eased = 1 - Math.pow(1 - progress, 3)
  camera.position.lerpVectors(travel.from, travel.to, eased)
  clampCameraPosition()
  if (progress >= 1) travel = null
}

function renderFrame(now: number) {
  animationFrame = requestAnimationFrame(renderFrame)
  const delta = Math.min(clock.getDelta(), 0.05)
  updateTravel(now)
  updateMovement(delta)
  updateCanvasDiagnostics()
  if (renderer && scene && camera) renderer.render(scene, camera)
}

function resetView() {
  if (!camera) return
  travel = null
  camera.position.copy(spawnPosition)
  yaw = spawnYaw
  pitch = spawnPitch
  applyCameraRotation()
  updateCanvasDiagnostics()
}

function goToDestination(destination: IndoorWalkDestination) {
  if (!camera || destination.floorId !== props.floorId) return false
  travel = {
    from: camera.position.clone(),
    to: new Vector3(destination.position.x, EYE_HEIGHT, destination.position.z),
    startedAt: performance.now(),
    duration: 900
  }
  return true
}

function onKeyDown(event: KeyboardEvent) {
  const target = event.target
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return
  const key = event.key.toLowerCase()
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
    pressedKeys.add(key)
    event.preventDefault()
  }
}

function onKeyUp(event: KeyboardEvent) {
  pressedKeys.delete(event.key.toLowerCase())
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0 || !host.value) return
  dragging.value = true
  lastPointerX = event.clientX
  lastPointerY = event.clientY
  host.value.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value || !camera) return
  yaw -= (event.clientX - lastPointerX) * LOOK_SENSITIVITY
  pitch -= (event.clientY - lastPointerY) * LOOK_SENSITIVITY
  pitch = MathUtils.clamp(pitch, -1.22, 1.22)
  lastPointerX = event.clientX
  lastPointerY = event.clientY
  applyCameraRotation()
}

function onPointerUp(event: PointerEvent) {
  dragging.value = false
  host.value?.releasePointerCapture(event.pointerId)
}

function setTouchKey(key: string, active: boolean) {
  if (active) touchKeys.add(key)
  else touchKeys.delete(key)
}

async function initialise() {
  if (!host.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    scene = new Scene()
    scene.background = new Color('#101722')
    camera = new PerspectiveCamera(68, 1, 0.05, 180)
    renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.domElement.className = 'walk-webgl-canvas'
    renderer.domElement.setAttribute('aria-label', `3D walkthrough of ${props.floorName}`)
    renderer.domElement.dataset.renderer = 'webgl'
    host.value.prepend(renderer.domElement)

    scene.add(new AmbientLight(0xffffff, 2.15))
    const keyLight = new DirectionalLight(0xffffff, 3.7)
    keyLight.position.set(5, 9, 7)
    scene.add(keyLight)
    const fillLight = new DirectionalLight(0x9fc6ff, 1.35)
    fillLight.position.set(-8, 4, -5)
    scene.add(fillLight)

    const gltf = await new GLTFLoader().loadAsync(props.modelUrl)
    if (disposed) {
      disposeIndoorWalkObject(gltf.scene)
      return
    }
    modelRoot = gltf.scene
    scene.add(modelRoot)
    modelBounds = new Box3().setFromObject(modelRoot)
    if (modelBounds.isEmpty()) throw new Error('The 3D model contains no renderable geometry.')
    const destinations = extractIndoorWalkDestinations(modelRoot, props.floorId, EYE_HEIGHT)
    if (!destinations.length) throw new Error('The 3D model contains no discoverable rooms.')
    setSpawn()
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host.value)
    resize()
    clock.start()
    renderFrame(performance.now())
    loading.value = false
    updateCanvasDiagnostics()
    emit('ready', destinations)
  } catch (error) {
    if (disposed) return
    loading.value = false
    const message = error instanceof Error ? error.message : '3D walkthrough failed to initialise.'
    errorMessage.value = message
    if (modelRoot) {
      disposeIndoorWalkObject(modelRoot)
      modelRoot = null
    }
    disposeRenderer()
    emit('error', message)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown, { passive: false })
  window.addEventListener('keyup', onKeyUp)
  void initialise()
})

onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  pressedKeys.clear()
  touchKeys.clear()
  if (modelRoot) disposeIndoorWalkObject(modelRoot)
  disposeRenderer()
  modelRoot = null
  scene = null
  camera = null
})

defineExpose({ resetView, goToDestination })
</script>

<template>
  <div
    ref="host"
    class="indoor-walk-canvas"
    :class="{ 'is-dragging': dragging }"
    role="application"
    tabindex="0"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <div v-if="loading" class="walk-status-card">Loading 3D digital twin…</div>
    <div v-else-if="errorMessage" class="walk-error-card" role="alert">
      <strong>3D walkthrough unavailable</strong>
      <span>{{ errorMessage }}</span>
    </div>
    <div v-if="!loading && !errorMessage" class="walk-hint">Drag to look · WASD / arrows to walk</div>

    <div v-if="!loading && !errorMessage" class="walk-touch-controls" aria-label="Walk controls">
      <button type="button" aria-label="Walk forward" @pointerdown.stop="setTouchKey('w', true)" @pointerup.stop="setTouchKey('w', false)" @pointercancel.stop="setTouchKey('w', false)">↑</button>
      <div>
        <button type="button" aria-label="Step left" @pointerdown.stop="setTouchKey('a', true)" @pointerup.stop="setTouchKey('a', false)" @pointercancel.stop="setTouchKey('a', false)">←</button>
        <button type="button" aria-label="Walk backward" @pointerdown.stop="setTouchKey('s', true)" @pointerup.stop="setTouchKey('s', false)" @pointercancel.stop="setTouchKey('s', false)">↓</button>
        <button type="button" aria-label="Step right" @pointerdown.stop="setTouchKey('d', true)" @pointerup.stop="setTouchKey('d', false)" @pointercancel.stop="setTouchKey('d', false)">→</button>
      </div>
    </div>
  </div>
</template>

<style src="./IndoorWalkCanvas.css"></style>
