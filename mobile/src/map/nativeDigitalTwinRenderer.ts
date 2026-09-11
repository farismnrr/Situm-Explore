import type { ExpoWebGLRenderingContext } from 'expo-gl'
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  MathUtils,
  Mesh,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
  type Texture,
} from 'three'
import type { IndoorWalkDestination } from '../../../shared/indoor-walk'
import { indoorWalkRoomSemantic } from '../../../shared/indoor-walk-semantics'
import { INDOOR_WALK_EYE_HEIGHT, indoorWalkViews, type IndoorWalkModelSlot } from '../../../shared/indoor-walk-view'
import { createNativeThreeCompatibility } from './nativeThreeCompatibility'

export type WalkDirection = 'forward' | 'back' | 'left' | 'right'
export type NativeDigitalTwinReady = {
  destinations: IndoorWalkDestination[]
  meshes: number
  bounds: { min: [number, number, number], max: [number, number, number] }
  multisampleFallbacks: number
  actualContextType: string
}
export type NativeDigitalTwinRuntime = {
  ready: Promise<NativeDigitalTwinReady>
  start: () => void
  pause: () => void
  resume: () => void
  dispose: () => void
  resetView: () => void
  beginLook: () => void
  lookBy: (dx: number, dy: number) => void
  endLook: () => void
  setMovement: (direction: WalkDirection, active: boolean) => void
  goToDestination: (destination: IndoorWalkDestination) => boolean
}
const TARGET_FPS = 24
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS
const MOVE_SPEED = 2.35
const LOOK_SENSITIVITY = 0.0042
class DigitalTwinMotion {
  private readonly spawnPosition = new Vector3()
  private spawnYaw = 0
  private spawnPitch = 0
  private yaw = 0
  private pitch = 0
  private looking = false
  private readonly movement = { forward: false, back: false, left: false, right: false }
  private travel: { from: Vector3, to: Vector3, startedAt: number, duration: number } | null = null

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly bounds: Box3,
    private readonly slot: IndoorWalkModelSlot,
    private readonly floorId: number,
  ) {}

  private applyCameraRotation() {
    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.y = this.yaw
    this.camera.rotation.x = this.pitch
  }

  private clampCamera() {
    if (this.bounds.isEmpty()) return
    const inset = 0.18
    this.camera.position.x = MathUtils.clamp(this.camera.position.x, this.bounds.min.x + inset, this.bounds.max.x - inset)
    this.camera.position.z = MathUtils.clamp(this.camera.position.z, this.bounds.min.z + inset, this.bounds.max.z - inset)
    this.camera.position.y = INDOOR_WALK_EYE_HEIGHT
  }

  private normalizedBoundsPoint(x: number, z: number) {
    return new Vector3(
      MathUtils.lerp(this.bounds.min.x, this.bounds.max.x, x),
      INDOOR_WALK_EYE_HEIGHT,
      MathUtils.lerp(this.bounds.min.z, this.bounds.max.z, z),
    )
  }

  setSpawn() {
    const descriptor = indoorWalkViews[this.slot]
    const base = this.normalizedBoundsPoint(descriptor.spawn.x, descriptor.spawn.z)
    const target = this.normalizedBoundsPoint(descriptor.lookAt.x, descriptor.lookAt.z)
    this.camera.position.copy(base)
    this.camera.lookAt(target)
    this.camera.rotation.order = 'YXZ'
    this.yaw = this.camera.rotation.y
    this.pitch = this.camera.rotation.x
    this.clampCamera()
    this.spawnPosition.copy(this.camera.position)
    this.spawnYaw = this.yaw
    this.spawnPitch = this.pitch
  }

  extractDestinations(root: Object3D) {
    const result: IndoorWalkDestination[] = []
    const seen = new Set<string>()
    root.traverse(object => {
      const semantic = indoorWalkRoomSemantic(String(object.userData.source_object || ''))
      if (!semantic || seen.has(semantic.name)) return
      const objectBounds = new Box3().setFromObject(object)
      if (objectBounds.isEmpty()) return
      const center = objectBounds.getCenter(new Vector3())
      result.push({
        id: `${this.floorId}:${semantic.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: semantic.name,
        category: semantic.category,
        floorId: this.floorId,
        position: { x: center.x, y: INDOOR_WALK_EYE_HEIGHT, z: center.z },
      })
      seen.add(semantic.name)
    })
    return result.sort((a, b) => a.name.localeCompare(b.name))
  }

  update(now: number, seconds: number) {
    if (this.travel) {
      const progress = MathUtils.clamp((now - this.travel.startedAt) / this.travel.duration, 0, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      this.camera.position.lerpVectors(this.travel.from, this.travel.to, eased)
      this.clampCamera()
      if (progress >= 1) this.travel = null
      return
    }
    let forwardAmount = 0
    let rightAmount = 0
    if (this.movement.forward) forwardAmount += 1
    if (this.movement.back) forwardAmount -= 1
    if (this.movement.right) rightAmount += 1
    if (this.movement.left) rightAmount -= 1
    if (!forwardAmount && !rightAmount) return
    const forward = new Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))
    const right = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw))
    const delta = forward.multiplyScalar(forwardAmount).add(right.multiplyScalar(rightAmount))
    if (delta.lengthSq() > 1) delta.normalize()
    this.camera.position.addScaledVector(delta, MOVE_SPEED * seconds)
    this.clampCamera()
  }

  resetView() {
    this.travel = null
    this.camera.position.copy(this.spawnPosition)
    this.yaw = this.spawnYaw
    this.pitch = this.spawnPitch
    this.applyCameraRotation()
    this.clampCamera()
  }

  beginLook() { this.looking = true }
  endLook() { this.looking = false }
  setMovement(direction: WalkDirection, active: boolean) { this.movement[direction] = active }

  clear() {
    this.travel = null
    this.movement.forward = false
    this.movement.back = false
    this.movement.left = false
    this.movement.right = false
  }

  lookBy(dx: number, dy: number) {
    if (!this.looking) return
    this.yaw -= dx * LOOK_SENSITIVITY
    this.pitch = MathUtils.clamp(this.pitch - dy * LOOK_SENSITIVITY, -1.22, 1.22)
    this.applyCameraRotation()
  }

  goToDestination(destination: IndoorWalkDestination) {
    if (destination.floorId !== this.floorId) return false
    this.travel = {
      from: this.camera.position.clone(),
      to: new Vector3(destination.position.x, INDOOR_WALK_EYE_HEIGHT, destination.position.z),
      startedAt: Date.now(),
      duration: 900,
    }
    return true
  }
}

function createRendererScene(gl: ExpoWebGLRenderingContext, compatibility: ReturnType<typeof createNativeThreeCompatibility>) {
  const width = Math.max(1, gl.drawingBufferWidth || 1)
  const height = Math.max(1, gl.drawingBufferHeight || 1)
  const canvas = {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    style: {},
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    setAttribute: () => undefined,
    getContext: () => compatibility.context,
  } as unknown as HTMLCanvasElement
  const renderer = new WebGLRenderer({ canvas, context: compatibility.context, antialias: false, alpha: false, powerPreference: 'high-performance' })
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.setPixelRatio(1)
  renderer.setSize(width, height, false)

  const scene = new Scene()
  scene.background = new Color('#101722')
  scene.add(new AmbientLight(0xffffff, 2.15))
  const keyLight = new DirectionalLight(0xffffff, 3.7)
  keyLight.position.set(5, 9, 7)
  scene.add(keyLight)
  const fillLight = new DirectionalLight(0x9fc6ff, 1.35)
  fillLight.position.set(-8, 4, -5)
  scene.add(fillLight)

  const camera = new PerspectiveCamera(68, width / height, 0.05, 180)
  camera.rotation.order = 'YXZ'
  return { renderer, scene, camera, bounds: new Box3() }
}

export function createNativeDigitalTwinRuntime(input: {
  gl: ExpoWebGLRenderingContext
  bytes: ArrayBuffer
  slot: IndoorWalkModelSlot
  floorId: number
}): NativeDigitalTwinRuntime {
  const { gl, bytes, slot, floorId } = input
  const compatibility = createNativeThreeCompatibility(gl)
  const { renderer, scene, camera, bounds } = createRendererScene(gl, compatibility)
  const motion = new DigitalTwinMotion(camera, bounds, slot, floorId)
  let modelRoot: Object3D | null = null
  let disposed = false
  let paused = true
  let frameTimer: ReturnType<typeof setTimeout> | null = null
  let lastFrameAt = 0

  const renderFrame = () => {
    frameTimer = null
    if (disposed || paused) return
    const now = Date.now()
    const seconds = lastFrameAt ? Math.min(0.08, Math.max(0, now - lastFrameAt) / 1000) : FRAME_INTERVAL_MS / 1000
    motion.update(now, seconds)
    renderer.render(scene, camera)
    gl.endFrameEXP()
    lastFrameAt = now
    if (!disposed && !paused) {
      const elapsed = Date.now() - now
      frameTimer = setTimeout(renderFrame, Math.max(0, FRAME_INTERVAL_MS - elapsed))
    }
  }

  const start = () => {
    if (disposed || !paused) return
    paused = false
    lastFrameAt = 0
    frameTimer = setTimeout(renderFrame, 0)
  }

  const pause = () => {
    if (disposed || paused) return
    paused = true
    if (frameTimer) clearTimeout(frameTimer)
    frameTimer = null
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    paused = true
    if (frameTimer) clearTimeout(frameTimer)
    frameTimer = null
    motion.clear()
    if (modelRoot) {
      scene.remove(modelRoot)
      disposeObject(modelRoot)
      modelRoot = null
    }
    const renderLists = (renderer as WebGLRenderer & { renderLists?: { dispose?: () => void } }).renderLists
    renderLists?.dispose?.()
    renderer.dispose()
  }

  const ready = compatibility.parseGltf(bytes).then(gltf => {
    if (disposed) {
      disposeObject(gltf.scene)
      throw new Error('Digital Twin 3D was closed before the model finished loading.')
    }
    modelRoot = gltf.scene
    scene.add(modelRoot)
    bounds.setFromObject(modelRoot)
    if (bounds.isEmpty()) throw new Error('The 3D model contains no renderable geometry.')
    let meshes = 0
    modelRoot.traverse(object => { if (object instanceof Mesh) meshes++ })
    if (!meshes) throw new Error('The 3D model contains no renderable meshes.')
    const destinations = motion.extractDestinations(modelRoot)
    if (!destinations.length) throw new Error('The 3D model contains no discoverable rooms.')
    motion.setSpawn()
    renderer.render(scene, camera)
    gl.endFrameEXP()
    return {
      destinations,
      meshes,
      bounds: {
        min: [bounds.min.x, bounds.min.y, bounds.min.z] as [number, number, number],
        max: [bounds.max.x, bounds.max.y, bounds.max.z] as [number, number, number],
      },
      multisampleFallbacks: compatibility.multisampleFallbacks(),
      actualContextType: compatibility.actualContextType,
    }
  }).catch(error => {
    if (!disposed) dispose()
    throw error
  })

  return {
    ready,
    start,
    pause,
    resume: start,
    dispose,
    resetView: () => { if (!disposed && modelRoot) motion.resetView() },
    beginLook: () => { if (!disposed) motion.beginLook() },
    lookBy: (dx, dy) => { if (!disposed) motion.lookBy(dx, dy) },
    endLook: () => motion.endLook(),
    setMovement: (direction, active) => { if (!disposed) motion.setMovement(direction, active) },
    goToDestination: destination => !disposed && Boolean(modelRoot) && motion.goToDestination(destination),
  }
}

function disposeObject(root: Object3D) {
  const materials = new Set<Material>()
  const textures = new Set<Texture>()
  root.traverse(object => {
    if (!(object instanceof Mesh)) return
    object.geometry.dispose()
    const values = Array.isArray(object.material) ? object.material : [object.material]
    values.forEach(material => {
      materials.add(material)
      Object.values(material).forEach(value => {
        if (value && typeof value === 'object' && 'isTexture' in value) textures.add(value as Texture)
      })
    })
  })
  textures.forEach(texture => texture.dispose())
  materials.forEach(material => material.dispose())
}
