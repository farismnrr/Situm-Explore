export interface PrototypeFloor {
  id: string
  name: string
  poiCount: number
  geofenceCount: number
  mapStatus: 'Ready' | 'Partial'
  floorplan: 'Georeferenced' | 'Unavailable'
}

export interface PrototypeBuilding {
  id: string
  name: string
  organization: string
  status: 'Ready' | 'Partial'
  floors: readonly PrototypeFloor[]
  poiCount: number
  resources: {
    vectorMap: 'Available' | 'Unavailable'
    mapStyle: string
    rasterTiles: 'Available' | 'Unavailable'
  }
}

export interface PrototypePoi {
  id: string
  name: string
  category: 'Services' | 'Rooms' | 'Workspace' | 'Access'
  buildingId: string
  floorId: string
  floor: string
  description: string
  externalId: string
  favorite: boolean
}

export interface PrototypeGeofence {
  id: string
  name: string
  buildingId: string
  floorId: string
  floor: string
  type: 'Workspace' | 'Room'
  averageStay: string
  status: 'Active' | 'Inactive'
}

export interface PrototypePath {
  id: string
  name: string
  buildingId: string
  accessible: boolean
}

export const cartographyBuildings: readonly PrototypeBuilding[] = [
  {
    id: 'building-main-demo',
    name: 'Main Building',
    organization: 'PT Berjaya Inovasi Global',
    status: 'Ready',
    floors: [
      { id: 'floor-main-1', name: 'Floor 1', poiCount: 17, geofenceCount: 2, mapStatus: 'Ready', floorplan: 'Georeferenced' },
      { id: 'floor-main-2', name: 'Floor 2', poiCount: 9, geofenceCount: 1, mapStatus: 'Ready', floorplan: 'Georeferenced' }
    ],
    poiCount: 26,
    resources: { vectorMap: 'Available', mapStyle: 'Default profile', rasterTiles: 'Available' }
  },
  {
    id: 'building-warehouse-demo',
    name: 'Warehouse Demo',
    organization: 'Senar Demo',
    status: 'Ready',
    floors: [
      { id: 'floor-warehouse-0', name: 'Ground floor', poiCount: 7, geofenceCount: 1, mapStatus: 'Ready', floorplan: 'Georeferenced' },
      { id: 'floor-warehouse-1', name: 'Mezzanine', poiCount: 4, geofenceCount: 0, mapStatus: 'Ready', floorplan: 'Georeferenced' }
    ],
    poiCount: 11,
    resources: { vectorMap: 'Available', mapStyle: 'Default profile', rasterTiles: 'Available' }
  },
  {
    id: 'building-training-demo',
    name: 'Training Venue',
    organization: 'Senar Demo',
    status: 'Partial',
    floors: [{ id: 'floor-training-0', name: 'Event floor', poiCount: 5, geofenceCount: 2, mapStatus: 'Partial', floorplan: 'Unavailable' }],
    poiCount: 5,
    resources: { vectorMap: 'Available', mapStyle: 'Default profile', rasterTiles: 'Unavailable' }
  }
]

export const cartographyPois: readonly PrototypePoi[] = [
  { id: 'poi-reception', name: 'Reception', category: 'Services', buildingId: 'building-main-demo', floorId: 'floor-main-1', floor: 'Floor 1', description: 'Visitor services and front desk', externalId: 'poi-reception', favorite: true },
  { id: 'poi-meeting-room-a', name: 'Meeting Room A', category: 'Rooms', buildingId: 'building-main-demo', floorId: 'floor-main-1', floor: 'Floor 1', description: 'Small meeting room near the workspace corridor', externalId: 'room-a', favorite: false },
  { id: 'poi-training-area', name: 'Training Area', category: 'Workspace', buildingId: 'building-main-demo', floorId: 'floor-main-2', floor: 'Floor 2', description: 'Flexible training and collaboration space', externalId: 'training-area', favorite: false },
  { id: 'poi-lift-lobby', name: 'Lift Lobby', category: 'Access', buildingId: 'building-main-demo', floorId: 'floor-main-1', floor: 'Floor 1', description: 'Lift access between building floors', externalId: 'lift-01', favorite: false },
  { id: 'poi-pantry', name: 'Pantry', category: 'Services', buildingId: 'building-main-demo', floorId: 'floor-main-2', floor: 'Floor 2', description: 'Shared refreshment area', externalId: 'pantry-02', favorite: true }
]

export const cartographyGeofences: readonly PrototypeGeofence[] = [
  { id: 'geofence-main-workspace', name: 'Main Workspace', buildingId: 'building-main-demo', floorId: 'floor-main-1', floor: 'Floor 1', type: 'Workspace', averageStay: '18m', status: 'Active' },
  { id: 'geofence-meeting-room', name: 'Meeting Room Zone', buildingId: 'building-main-demo', floorId: 'floor-main-1', floor: 'Floor 1', type: 'Room', averageStay: '26m', status: 'Active' },
  { id: 'geofence-training-area', name: 'Training Area', buildingId: 'building-main-demo', floorId: 'floor-main-2', floor: 'Floor 2', type: 'Workspace', averageStay: '34m', status: 'Active' }
]

export const cartographyPaths: readonly PrototypePath[] = [
  { id: 'path-main-network', name: 'Main Building path network', buildingId: 'building-main-demo', accessible: true }
]
