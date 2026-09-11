import { Box3, Vector3, type Object3D } from 'three'
import type { IndoorWalkDestination } from '#shared/indoor-walk'
import { indoorWalkRoomSemantic } from '#shared/indoor-walk-semantics'

export function extractIndoorWalkDestinations(root: Object3D, floorId: number, eyeHeight: number) {
  const result: IndoorWalkDestination[] = []
  const seen = new Set<string>()
  root.traverse((object) => {
    const source = String(object.userData.source_object || '').trim()
    const semantic = indoorWalkRoomSemantic(source)
    if (!semantic || seen.has(semantic.name)) return
    const bounds = new Box3().setFromObject(object)
    if (bounds.isEmpty()) return
    const center = bounds.getCenter(new Vector3())
    result.push({
      id: `${floorId}:${semantic.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: semantic.name,
      category: semantic.category,
      floorId,
      position: { x: center.x, y: eyeHeight, z: center.z }
    })
    seen.add(semantic.name)
  })
  return result.sort((a, b) => a.name.localeCompare(b.name))
}
