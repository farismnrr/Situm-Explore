export type IndoorWalkModelSlot = 'lt1' | 'lt2'

export interface IndoorWalkViewDescriptor {
  /** Canonical floorplan high-Y/top maps to negative runtime GLB Z. */
  canonicalTopAxis: '-z'
  /** Normalized position across model bounds: 0=min, 1=max. */
  spawn: { x: number; z: number }
  /** Normalized point the initial camera faces. */
  lookAt: { x: number; z: number }
}

export const INDOOR_WALK_EYE_HEIGHT = 1.62

const canonicalFloorView: IndoorWalkViewDescriptor = {
  canonicalTopAxis: '-z',
  spawn: { x: 0.5, z: 0.78 },
  lookAt: { x: 0.94, z: 0.78 },
}

/** Both supported floor models share the same deterministic orientation contract. */
export const indoorWalkViews: Record<IndoorWalkModelSlot, IndoorWalkViewDescriptor> = {
  lt1: canonicalFloorView,
  lt2: canonicalFloorView,
}

export function indoorWalkModelSlotForFloorLevel(level: number): IndoorWalkModelSlot | null {
  if (level === 0) return 'lt1'
  if (level === 1) return 'lt2'
  return null
}
