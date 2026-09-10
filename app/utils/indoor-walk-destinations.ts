import { Box3, Vector3, type Object3D } from 'three'
import type { IndoorWalkDestination } from '#shared/indoor-walk'

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
}

function semanticRoomName(source: string) {
  const match = source.match(/^3D\s*\|\s*F\d+\s*\|\s*(GLASS ENTRY|KITCHEN(?: \+ WALKWAY)?|RESTROOM ZONE|WORKROOM \d+)$/i)
  if (!match?.[1]) return null
  const name = match[1].replace(/\s+ZONE$/i, '').trim()
  if (/^glass entry$/i.test(name)) return 'Main Entry'
  if (/^kitchen \+ walkway$/i.test(name)) return 'Kitchen'
  return titleCase(name)
}

function destinationCategory(name: string) {
  if (/entry/i.test(name)) return 'Entrance'
  if (/kitchen/i.test(name)) return 'Kitchen'
  if (/restroom/i.test(name)) return 'Restroom'
  if (/workroom/i.test(name)) return 'Workroom'
  return 'Room'
}

export function extractIndoorWalkDestinations(root: Object3D, floorId: number, eyeHeight: number) {
  const result: IndoorWalkDestination[] = []
  const seen = new Set<string>()
  root.traverse((object) => {
    const source = String(object.userData.source_object || '').trim()
    const name = semanticRoomName(source)
    if (!name || seen.has(name)) return
    const bounds = new Box3().setFromObject(object)
    if (bounds.isEmpty()) return
    const center = bounds.getCenter(new Vector3())
    result.push({
      id: `${floorId}:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name,
      category: destinationCategory(name),
      floorId,
      position: { x: center.x, y: eyeHeight, z: center.z }
    })
    seen.add(name)
  })
  return result.sort((a, b) => a.name.localeCompare(b.name))
}
