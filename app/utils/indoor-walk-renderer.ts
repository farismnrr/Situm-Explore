import { Vector3, WebGLRenderer, type Box3, type Object3D, type PerspectiveCamera } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { indoorWalkViews, type IndoorWalkModelSlot } from '~/utils/indoor-walk-view'

export async function loadIndoorWalkModel(modelUrl: string) {
  const response = await fetch(modelUrl, { credentials: 'same-origin' })
  if (response.status === 404) throw new Error('No 3D model has been configured for this workspace and floor yet.')
  if (!response.ok) throw new Error('Digital Twin 3D could not be loaded right now. Please try again later.')
  return new GLTFLoader().parseAsync(await response.arrayBuffer(), '')
}

export function createIndoorWalkRenderer() {
  try {
    return new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  } catch {
    throw new Error('Digital Twin 3D cannot start because WebGL is unavailable in this browser.')
  }
}

export function disposeIndoorWalkObject(root: Object3D) {
  root.traverse((object) => {
    const mesh = object as Object3D & {
      geometry?: { dispose: () => void }
      material?: { dispose: () => void } | Array<{ dispose: () => void }>
    }
    mesh.geometry?.dispose()
    if (Array.isArray(mesh.material)) mesh.material.forEach(material => material.dispose())
    else mesh.material?.dispose()
  })
}

export function disposeIndoorWalkRenderer(renderer: WebGLRenderer | null) {
  if (!renderer) return
  renderer.dispose()
  renderer.forceContextLoss()
  renderer.domElement.remove()
}

export function updateIndoorWalkDiagnostics(input: {
  renderer: WebGLRenderer
  camera: PerspectiveCamera
  yaw: number
  floorId: number
  floorLevel: number
  modelSlot: IndoorWalkModelSlot
  modelBounds: Box3
  modelReady: boolean
}) {
  const { renderer, camera, yaw, floorId, floorLevel, modelSlot, modelBounds, modelReady } = input
  const canvas = renderer.domElement
  const forward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize()
  canvas.dataset.cameraX = camera.position.x.toFixed(3)
  canvas.dataset.cameraY = camera.position.y.toFixed(3)
  canvas.dataset.cameraZ = camera.position.z.toFixed(3)
  canvas.dataset.cameraYaw = yaw.toFixed(6)
  canvas.dataset.lookX = forward.x.toFixed(6)
  canvas.dataset.lookY = forward.y.toFixed(6)
  canvas.dataset.lookZ = forward.z.toFixed(6)
  canvas.dataset.floorId = String(floorId)
  canvas.dataset.floorLevel = String(floorLevel)
  canvas.dataset.modelSlot = modelSlot
  canvas.dataset.modelMinX = modelBounds.min.x.toFixed(3)
  canvas.dataset.modelMinY = modelBounds.min.y.toFixed(3)
  canvas.dataset.modelMinZ = modelBounds.min.z.toFixed(3)
  canvas.dataset.modelMaxX = modelBounds.max.x.toFixed(3)
  canvas.dataset.modelMaxY = modelBounds.max.y.toFixed(3)
  canvas.dataset.modelMaxZ = modelBounds.max.z.toFixed(3)
  canvas.dataset.canonicalTopAxis = indoorWalkViews[modelSlot].canonicalTopAxis
  canvas.dataset.modelReady = modelReady ? 'true' : 'false'
}
