export interface IndoorWalkDestination {
  id: string
  name: string
  category: string
  floorId: number
  position: { x: number; y: number; z: number }
}
