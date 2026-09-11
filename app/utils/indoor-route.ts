import type { SitumCartographyPoi } from '#shared/situm-cartography'
import type { SitumPathLink, SitumPathNode, SitumPathsResponse } from '#shared/situm-paths'

export type IndoorRoutePointKind = 'endpoint' | 'snap' | 'graph'

export interface IndoorRoutePoint {
  floorId: number
  x: number
  y: number
  nodeId?: number
  kind: IndoorRoutePointKind
}

export interface IndoorRoute {
  fromPoiId: number
  toPoiId: number
  points: IndoorRoutePoint[]
}

export type IndoorRouteFailureReason = 'invalid-endpoints' | 'unsupported-floor-transition' | 'no-path-data' | 'no-snap-edge' | 'unroutable'

export type IndoorRouteResult =
  | { ok: true, route: IndoorRoute }
  | { ok: false, reason: IndoorRouteFailureReason }

type GraphPoint = IndoorRoutePoint & { key: string }
type GraphEdge = { to: string, weight: number }
type Snap = {
  point: GraphPoint
  source: SitumPathNode
  target: SitumPathNode
  link: SitumPathLink
  t: number
}

const EPSILON = 1e-7

function distance(a: Pick<IndoorRoutePoint, 'x' | 'y'>, b: Pick<IndoorRoutePoint, 'x' | 'y'>) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function directions(link: SitumPathLink) {
  if (link.origin === 'both') return { sourceToTarget: true, targetToSource: true }
  if (link.origin === 'source') return { sourceToTarget: true, targetToSource: false }
  return { sourceToTarget: false, targetToSource: true }
}

function projectToSegment(poi: SitumCartographyPoi, source: SitumPathNode, target: SitumPathNode) {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const lengthSquared = dx * dx + dy * dy
  const rawT = lengthSquared > 0
    ? ((poi.location.x - source.x) * dx + (poi.location.y - source.y) * dy) / lengthSquared
    : 0
  const t = Math.min(1, Math.max(0, rawT))
  return {
    t,
    x: source.x + dx * t,
    y: source.y + dy * t
  }
}

function chooseSnap(poi: SitumCartographyPoi, links: SitumPathLink[], nodes: Map<number, SitumPathNode>, key: string): Snap | null {
  let best: Snap | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const link of links) {
    const source = nodes.get(link.source)
    const target = nodes.get(link.target)
    if (!source || !target || source.floorId !== poi.floorId || target.floorId !== poi.floorId) continue
    const projected = projectToSegment(poi, source, target)
    const candidateDistance = Math.hypot(poi.location.x - projected.x, poi.location.y - projected.y)
    if (candidateDistance + EPSILON >= bestDistance) continue
    bestDistance = candidateDistance
    best = {
      point: { key, floorId: poi.floorId, x: projected.x, y: projected.y, kind: 'snap' },
      source,
      target,
      link,
      t: projected.t
    }
  }

  return best
}

function addEdge(adjacency: Map<string, GraphEdge[]>, from: string, to: string, weight: number) {
  if (!Number.isFinite(weight) || weight < 0) return
  const edges = adjacency.get(from) ?? []
  edges.push({ to, weight })
  adjacency.set(from, edges)
}

function addDirectedSegment(
  adjacency: Map<string, GraphEdge[]>,
  from: GraphPoint,
  to: GraphPoint,
  allowForward: boolean,
  allowReverse: boolean
) {
  const weight = distance(from, to)
  if (allowForward) addEdge(adjacency, from.key, to.key, weight)
  if (allowReverse) addEdge(adjacency, to.key, from.key, weight)
}

function orderedEdgePoints(source: GraphPoint, target: GraphPoint, snaps: Snap[]) {
  const points = [
    { point: source, t: 0 },
    ...snaps.map(snap => ({ point: snap.point, t: snap.t })),
    { point: target, t: 1 }
  ].sort((a, b) => a.t - b.t || a.point.key.localeCompare(b.point.key))

  return points.filter((entry, index) => index === 0 || Math.abs(entry.t - points[index - 1]!.t) > EPSILON || entry.point.key !== points[index - 1]!.point.key)
}

function dijkstra(points: Map<string, GraphPoint>, adjacency: Map<string, GraphEdge[]>, start: string, goal: string) {
  const distances = new Map<string, number>([[start, 0]])
  const previous = new Map<string, string>()
  const unvisited = new Set(points.keys())

  while (unvisited.size) {
    let current: string | null = null
    let currentDistance = Number.POSITIVE_INFINITY
    for (const key of unvisited) {
      const candidate = distances.get(key) ?? Number.POSITIVE_INFINITY
      if (candidate < currentDistance - EPSILON || (Math.abs(candidate - currentDistance) <= EPSILON && current !== null && key < current)) {
        current = key
        currentDistance = candidate
      }
    }
    if (current === null || !Number.isFinite(currentDistance)) break
    unvisited.delete(current)
    if (current === goal) break

    for (const edge of adjacency.get(current) ?? []) {
      if (!unvisited.has(edge.to)) continue
      const candidate = currentDistance + edge.weight
      const known = distances.get(edge.to) ?? Number.POSITIVE_INFINITY
      const knownPrevious = previous.get(edge.to)
      if (candidate < known - EPSILON || (Math.abs(candidate - known) <= EPSILON && current < (knownPrevious ?? '\uffff'))) {
        distances.set(edge.to, candidate)
        previous.set(edge.to, current)
      }
    }
  }

  if (!distances.has(goal)) return null
  const keys = [goal]
  while (keys[0] !== start) {
    const parent = previous.get(keys[0]!)
    if (!parent) return null
    keys.unshift(parent)
  }
  return keys
}

function normalizePoints(points: IndoorRoutePoint[]) {
  return points.filter((point, index) => {
    if (!index) return true
    const previous = points[index - 1]!
    return point.floorId !== previous.floorId || distance(point, previous) > EPSILON
  })
}

export function calculateIndoorRoute(
  paths: SitumPathsResponse,
  fromPoi: SitumCartographyPoi,
  toPoi: SitumCartographyPoi
): IndoorRouteResult {
  if (fromPoi.id === toPoi.id || fromPoi.buildingId !== toPoi.buildingId) return { ok: false, reason: 'invalid-endpoints' }
  if (fromPoi.floorId !== toPoi.floorId) return { ok: false, reason: 'unsupported-floor-transition' }
  if (!paths.paths.length) return { ok: false, reason: 'no-path-data' }

  const nodes = new Map<number, SitumPathNode>()
  const links: SitumPathLink[] = []
  for (const path of paths.paths) {
    for (const node of path.nodes) nodes.set(node.id, node)
    links.push(...path.links)
  }

  const validLinks = links.filter((link) => {
    const source = nodes.get(link.source)
    const target = nodes.get(link.target)
    return source?.floorId === fromPoi.floorId && target?.floorId === fromPoi.floorId
  })
  if (!validLinks.length) return { ok: false, reason: 'no-path-data' }

  const fromSnap = chooseSnap(fromPoi, validLinks, nodes, 'snap:from')
  const toSnap = chooseSnap(toPoi, validLinks, nodes, 'snap:to')
  if (!fromSnap || !toSnap) return { ok: false, reason: 'no-snap-edge' }

  const points = new Map<string, GraphPoint>()
  for (const node of nodes.values()) {
    points.set(`node:${node.id}`, { key: `node:${node.id}`, floorId: node.floorId, x: node.x, y: node.y, nodeId: node.id, kind: 'graph' })
  }
  points.set(fromSnap.point.key, fromSnap.point)
  points.set(toSnap.point.key, toSnap.point)

  const adjacency = new Map<string, GraphEdge[]>()
  const snapByLink = new Map<SitumPathLink, Snap[]>()
  for (const snap of [fromSnap, toSnap]) {
    const entries = snapByLink.get(snap.link) ?? []
    entries.push(snap)
    snapByLink.set(snap.link, entries)
  }

  for (const link of validLinks) {
    const sourceNode = nodes.get(link.source)!
    const targetNode = nodes.get(link.target)!
    const source = points.get(`node:${sourceNode.id}`)!
    const target = points.get(`node:${targetNode.id}`)!
    const direction = directions(link)
    const edgePoints = orderedEdgePoints(source, target, snapByLink.get(link) ?? [])
    for (let index = 0; index < edgePoints.length - 1; index += 1) {
      addDirectedSegment(adjacency, edgePoints[index]!.point, edgePoints[index + 1]!.point, direction.sourceToTarget, direction.targetToSource)
    }
  }

  const routeKeys = dijkstra(points, adjacency, fromSnap.point.key, toSnap.point.key)
  if (!routeKeys) return { ok: false, reason: 'unroutable' }

  const graphPoints = routeKeys.map(key => points.get(key)!).filter(Boolean)
  const routePoints = normalizePoints([
    { floorId: fromPoi.floorId, x: fromPoi.location.x, y: fromPoi.location.y, kind: 'endpoint' },
    ...graphPoints,
    { floorId: toPoi.floorId, x: toPoi.location.x, y: toPoi.location.y, kind: 'endpoint' }
  ])

  return {
    ok: true,
    route: {
      fromPoiId: fromPoi.id,
      toPoiId: toPoi.id,
      points: routePoints
    }
  }
}
