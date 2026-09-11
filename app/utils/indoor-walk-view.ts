export type IndoorWalkModelSlot = 'lt1' | 'lt2'

export interface IndoorWalkViewDescriptor {
  /** Canonical floorplan high-Y/top maps to negative runtime GLB Z. */
  canonicalTopAxis: '-z'
  /** Normalized position across the model bounds: 0=min, 1=max. */
  spawn: { x: number; z: number }
  /** Normalized point the initial camera faces. */
  lookAt: { x: number; z: number }
}

const canonicalFloorView: IndoorWalkViewDescriptor = {
  canonicalTopAxis: '-z',
  // Spawn in the canonical low-Y/lower circulation band (runtime +Z)
  // and look along +X. This keeps the upper/high-Y room side on the viewer's
  // left and the lower/low-Y walkway side on the right without letting any
  // room or entrance choose the heading.
  spawn: { x: 0.5, z: 0.78 },
  lookAt: { x: 0.94, z: 0.78 }
}

/**
 * Both floor models use the same Blender -> glTF axis convention and therefore
 * the same canonical view contract. Semantic rooms never define orientation.
 */
export const indoorWalkViews: Record<IndoorWalkModelSlot, IndoorWalkViewDescriptor> = {
  lt1: canonicalFloorView,
  lt2: canonicalFloorView
}
