import { useEffect, useMemo, useRef, useState } from 'react'
import { Image, PanResponder, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import Svg, { Circle, G, Polygon, Polyline } from 'react-native-svg'
import type { SitumCartographyBuilding, SitumCartographyFloor, SitumCartographyPoi } from '../../../shared/situm-cartography'
import { fitMapFrame, projectCartesianToFrame, projectCartesianToMap } from './customMapGeometry'
import { routeSegmentsForFloor, type IndoorPosition, type IndoorRoute } from './customRoute'

export type CustomIndoorLocation = IndoorPosition & { accuracy?: number, bearingDegrees?: number }

type Props = {
  building: SitumCartographyBuilding
  floor: SitumCartographyFloor
  pois: SitumCartographyPoi[]
  selectedPoi: SitumCartographyPoi | null
  currentLocation: CustomIndoorLocation | null
  route: IndoorRoute | null
  recenterNonce: number
  followLocation?: boolean
  onPoiPress: (poi: SitumCartographyPoi) => void
  onMapPress?: () => void
}

type Viewport = { width: number, height: number }
type Offset = { x: number, y: number }
type ScreenRect = { x: number, y: number, width: number, height: number }
type PoiRenderPlacement = {
  poi: SitumCartographyPoi
  point: { x: number, y: number }
  label: string
  isSelected: boolean
  labelRect: ScreenRect | null
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const overlaps = (a: ScreenRect, b: ScreenRect, padding = 0) => !(
  a.x + a.width + padding <= b.x
  || b.x + b.width + padding <= a.x
  || a.y + a.height + padding <= b.y
  || b.y + b.height + padding <= a.y
)

function poiPriority(poi: SitumCartographyPoi) {
  const category = poi.categoryName.toLowerCase()
  if (category.includes('entrance') || category.includes('exit')) return 0
  if (category.includes('information')) return 1
  if (category.includes('toilet')) return 2
  if (category.includes('coffee') || category.includes('food')) return 3
  return 4
}

const touchDistance = (touches: readonly { pageX: number, pageY: number }[]) => {
  if (touches.length < 2) return 0
  return Math.hypot(touches[1]!.pageX - touches[0]!.pageX, touches[1]!.pageY - touches[0]!.pageY)
}

function headingTriangle(x: number, y: number, radius: number, degreesClockwise: number) {
  const angle = (degreesClockwise - 90) * Math.PI / 180
  const tip = { x: x + Math.cos(angle) * radius * 1.85, y: y + Math.sin(angle) * radius * 1.85 }
  const left = { x: x + Math.cos(angle + 2.35) * radius, y: y + Math.sin(angle + 2.35) * radius }
  const right = { x: x + Math.cos(angle - 2.35) * radius, y: y + Math.sin(angle - 2.35) * radius }
  return `${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`
}

export function CustomIndoorMap({ building, floor, pois, selectedPoi, currentLocation, route, recenterNonce, followLocation = false, onPoiPress, onMapPress }: Props) {
  const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0 })
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 })
  const [followSuspended, setFollowSuspended] = useState(false)
  const gesture = useRef({ x: 0, y: 0, scale: 1, distance: 0 })
  const tapStart = useRef<{ x: number, y: number } | null>(null)
  const dimensions = building.dimensions
  const frame = useMemo(() => fitMapFrame(dimensions, viewport), [dimensions, viewport])
  const floorPois = useMemo(() => pois.filter(poi => poi.floorId === floor.id).slice(0, 100), [floor.id, pois])
  const routeSegments = useMemo(() => routeSegmentsForFloor(route, floor.id), [floor.id, route])
  const strokeUnit = Math.max(dimensions.width, dimensions.length) / 190
  const fittedPixelsPerMapUnit = frame.width > 0 && dimensions.width > 0 ? frame.width / dimensions.width : 1
  const screenPixelsToMapUnits = (pixels: number) => pixels / Math.max(fittedPixelsPerMapUnit * scale, 0.001)
  const poiMarkerRadius = screenPixelsToMapUnits(4)
  const poiMarkerSelectedRadius = screenPixelsToMapUnits(5.5)
  const userCoreRadius = screenPixelsToMapUnits(5)
  const userRingRadius = screenPixelsToMapUnits(7.5)
  const headingRadius = screenPixelsToMapUnits(11)

  const poiPlacements = useMemo<PoiRenderPlacement[]>(() => {
    if (!frame.width || !frame.height) return []
    const renderedWidth = frame.width * scale
    const renderedHeight = frame.height * scale
    const edge = 8
    const markerRects = new Map<number, ScreenRect>(floorPois.map(poi => {
      const point = projectCartesianToMap(poi.location, dimensions)
      const x = point.x / dimensions.width * renderedWidth
      const y = point.y / dimensions.length * renderedHeight
      return [poi.id, { x: x - 9, y: y - 9, width: 18, height: 18 }]
    }))
    const occupiedLabels: ScreenRect[] = []
    const labelBudget = scale >= 2 ? 12 : scale >= 1.35 ? 7 : 4
    let normalLabels = 0
    const placements = new Map<number, PoiRenderPlacement>()
    const ordered = [...floorPois].sort((a, b) => {
      if (a.id === selectedPoi?.id) return -1
      if (b.id === selectedPoi?.id) return 1
      const priorityDelta = poiPriority(a) - poiPriority(b)
      return priorityDelta || a.name.localeCompare(b.name)
    })

    for (const poi of ordered) {
      const point = projectCartesianToMap(poi.location, dimensions)
      const pointPx = {
        x: point.x / dimensions.width * renderedWidth,
        y: point.y / dimensions.length * renderedHeight,
      }
      const isSelected = poi.id === selectedPoi?.id
      const label = poi.name.trim().slice(0, 22) || 'Place'
      const labelWidth = clamp(label.length * 5.6 + 14, 46, 126)
      const labelHeight = isSelected ? 22 : 18
      const markerRadius = isSelected ? 5.5 : 4
      const gap = 7
      const rawCandidates: ScreenRect[] = [
        { x: pointPx.x + markerRadius + gap, y: pointPx.y - labelHeight / 2, width: labelWidth, height: labelHeight },
        { x: pointPx.x - markerRadius - gap - labelWidth, y: pointPx.y - labelHeight / 2, width: labelWidth, height: labelHeight },
        { x: pointPx.x - labelWidth / 2, y: pointPx.y - markerRadius - gap - labelHeight, width: labelWidth, height: labelHeight },
        { x: pointPx.x - labelWidth / 2, y: pointPx.y + markerRadius + gap, width: labelWidth, height: labelHeight },
      ]
      const candidates = rawCandidates.map(rect => ({
        ...rect,
        x: clamp(rect.x, edge, Math.max(edge, renderedWidth - edge - labelWidth)),
        y: clamp(rect.y, edge, Math.max(edge, renderedHeight - edge - labelHeight)),
      }))

      const markerBlockers = [...markerRects.entries()].filter(([id]) => id !== poi.id).map(([, rect]) => rect)
      const fits = (candidate: ScreenRect) => markerBlockers.every(rect => !overlaps(candidate, rect, 3)) && occupiedLabels.every(rect => !overlaps(candidate, rect, 6))
      let labelRect: ScreenRect | null = null
      if (isSelected || normalLabels < labelBudget) labelRect = candidates.find(fits) ?? null
      if (isSelected && !labelRect) {
        labelRect = [...candidates].sort((a, b) => {
          const score = (candidate: ScreenRect) => markerBlockers.filter(rect => overlaps(candidate, rect, 2)).length + occupiedLabels.filter(rect => overlaps(candidate, rect, 4)).length
          return score(a) - score(b)
        })[0] ?? null
      }
      if (labelRect) {
        occupiedLabels.push(labelRect)
        if (!isSelected) normalLabels += 1
      }
      placements.set(poi.id, { poi, point, label, isSelected, labelRect })
    }

    return floorPois.map(poi => placements.get(poi.id)!).filter(Boolean)
  }, [dimensions, floorPois, frame.height, frame.width, scale, selectedPoi?.id])

  const focusLocation = (zoom: number, verticalAnchor: number) => {
    setScale(zoom)
    if (!currentLocation || currentLocation.floorId !== floor.id || !frame.width || !frame.height) {
      setOffset({ x: 0, y: 0 })
      return
    }
    const point = projectCartesianToFrame(currentLocation, dimensions, frame)
    const targetX = viewport.width / 2
    const targetY = viewport.height * verticalAnchor
    setOffset({
      x: targetX - frame.left - frame.width * (1 - zoom) / 2 - point.x * zoom,
      y: targetY - frame.top - frame.height * (1 - zoom) / 2 - point.y * zoom,
    })
  }

  const resetToLocation = () => {
    setFollowSuspended(false)
    focusLocation(followLocation ? 1.6 : 1, followLocation ? 0.68 : 0.5)
  }

  useEffect(() => { resetToLocation() }, [recenterNonce])
  useEffect(() => {
    setFollowSuspended(false)
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [building.id, floor.id])
  useEffect(() => {
    if (!followLocation || followSuspended || !currentLocation || currentLocation.floorId !== floor.id) return
    focusLocation(1.6, 0.68)
  }, [currentLocation?.x, currentLocation?.y, currentLocation?.floorId, followLocation, followSuspended, floor.id, frame.height, frame.width, viewport.height, viewport.width])

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (event, state) => event.nativeEvent.touches.length >= 2 || Math.abs(state.dx) > 3 || Math.abs(state.dy) > 3,
    onPanResponderGrant: event => {
      const touches = event.nativeEvent.touches
      if (followLocation) setFollowSuspended(true)
      gesture.current = { x: offset.x, y: offset.y, scale, distance: touchDistance(touches) }
    },
    onPanResponderMove: (event, state) => {
      const touches = event.nativeEvent.touches
      if (touches.length >= 2) {
        const distance = touchDistance(touches)
        if (gesture.current.distance > 0 && distance > 0) setScale(clamp(gesture.current.scale * distance / gesture.current.distance, 0.8, 4.5))
        return
      }
      setOffset({ x: gesture.current.x + state.dx, y: gesture.current.y + state.dy })
    },
  }), [offset.x, offset.y, scale])

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setViewport({ width, height })
  }

  const user = currentLocation?.floorId === floor.id ? projectCartesianToMap(currentLocation, dimensions) : null
  const bearing = currentLocation?.bearingDegrees == null ? null : currentLocation.bearingDegrees - building.rotation
  const renderedMapWidth = frame.width * scale
  const renderedMapHeight = frame.height * scale
  const surfaceLeft = frame.left + offset.x + frame.width * (1 - scale) / 2
  const surfaceTop = frame.top + offset.y + frame.height * (1 - scale) / 2

  type TouchPoint = { locationX?: number, locationY?: number }
  const touchCoordinates = (nativeEvent: { locationX?: number, locationY?: number }, touch?: TouchPoint) => {
    const x = nativeEvent.locationX ?? touch?.locationX
    const y = nativeEvent.locationY ?? touch?.locationY
    return Number.isFinite(x) && Number.isFinite(y) ? { x: x!, y: y! } : null
  }

  const onTouchStart = (event: { nativeEvent: { touches?: readonly TouchPoint[], locationX?: number, locationY?: number } }) => {
    tapStart.current = touchCoordinates(event.nativeEvent, event.nativeEvent.touches?.[0])
  }

  const onTouchEnd = (event: { nativeEvent: { changedTouches?: readonly TouchPoint[], locationX?: number, locationY?: number } }) => {
    const start = tapStart.current
    tapStart.current = null
    const end = touchCoordinates(event.nativeEvent, event.nativeEvent.changedTouches?.[0])
    if (!start || !end || Math.hypot(end.x - start.x, end.y - start.y) > 8) return

    const tappedPoi = poiPlacements.find(placement => {
      const pointX = surfaceLeft + placement.point.x / dimensions.width * renderedMapWidth
      const pointY = surfaceTop + placement.point.y / dimensions.length * renderedMapHeight
      const markerHit = Math.hypot(end.x - pointX, end.y - pointY) <= 16
      const labelRect = placement.labelRect
      const labelHit = labelRect
        ? end.x >= surfaceLeft + labelRect.x - 6
          && end.x <= surfaceLeft + labelRect.x + labelRect.width + 6
          && end.y >= surfaceTop + labelRect.y - 6
          && end.y <= surfaceTop + labelRect.y + labelRect.height + 6
        : false
      return markerHit || labelHit
    })?.poi
    if (tappedPoi) onPoiPress(tappedPoi)
    else onMapPress?.()
  }

  return (
    <View accessibilityLabel="Custom indoor map" onLayout={onLayout} onTouchEnd={onTouchEnd} onTouchStart={onTouchStart} style={styles.viewport} {...panResponder.panHandlers}>
      <View style={styles.backdropGrid} pointerEvents="none" />
      {frame.width > 0 && frame.height > 0 ? (
        <View
          style={[
            styles.mapSurface,
            { width: frame.width, height: frame.height, left: frame.left, top: frame.top, transform: [{ translateX: offset.x }, { translateY: offset.y }, { scale }] },
          ]}
        >
          {floor.mapUrl ? <Image accessibilityLabel={`Floor plan ${floor.name}`} source={{ uri: floor.mapUrl }} resizeMode="stretch" style={StyleSheet.absoluteFill} /> : <View style={styles.missingPlan}><Text style={styles.missingPlanText}>Floor plan unavailable</Text></View>}
          <Svg height="100%" pointerEvents="box-none" viewBox={`0 0 ${dimensions.width} ${dimensions.length}`} width="100%" style={StyleSheet.absoluteFill}>
            {routeSegments.map((segment, index) => (
              <Polyline
                key={`route-${index}`}
                fill="none"
                points={segment.map(point => {
                  const mapped = projectCartesianToMap(point, dimensions)
                  return `${mapped.x},${mapped.y}`
                }).join(' ')}
                stroke="#ffffff"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={strokeUnit * 4.4}
              />
            ))}
            {routeSegments.map((segment, index) => (
              <Polyline
                key={`route-core-${index}`}
                fill="none"
                points={segment.map(point => {
                  const mapped = projectCartesianToMap(point, dimensions)
                  return `${mapped.x},${mapped.y}`
                }).join(' ')}
                stroke="#246BFD"
                strokeDasharray={`${strokeUnit * 6} ${strokeUnit * 2}`}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={strokeUnit * 2.5}
              />
            ))}

            {poiPlacements.map(({ poi, point, isSelected }) => {
              const markerRadius = isSelected ? poiMarkerSelectedRadius : poiMarkerRadius
              return (
                <G key={poi.id}>
                  <Circle pointerEvents="none" cx={point.x} cy={point.y} fill="#ffffff" r={markerRadius + screenPixelsToMapUnits(isSelected ? 2 : 1.5)} />
                  <Circle pointerEvents="none" cx={point.x} cy={point.y} fill={isSelected ? '#10233F' : '#246BFD'} r={markerRadius} />
                </G>
              )
            })}


            {user ? (
              <G pointerEvents="none">
                {currentLocation?.accuracy && currentLocation.accuracy > 0 ? (() => {
                  const accuracyPixels = currentLocation.accuracy * fittedPixelsPerMapUnit * scale
                  const accuracyRadius = screenPixelsToMapUnits(clamp(accuracyPixels, 10, 28))
                  return <Circle cx={user.x} cy={user.y} fill="#246BFD" opacity={0.07} r={accuracyRadius} stroke="#246BFD" strokeOpacity={0.2} strokeWidth={screenPixelsToMapUnits(1)} />
                })() : null}
                {bearing != null ? <Polygon fill="#246BFD" opacity={0.18} points={headingTriangle(user.x, user.y, headingRadius, bearing)} /> : null}
                <Circle cx={user.x} cy={user.y} fill="#ffffff" r={userRingRadius} />
                <Circle cx={user.x} cy={user.y} fill="#246BFD" r={userCoreRadius} />
              </G>
            ) : null}
          </Svg>
        </View>
      ) : null}
      {frame.width > 0 && frame.height > 0 ? poiPlacements.map(({ poi, point, label, labelRect }) => {
        const pointX = surfaceLeft + point.x / dimensions.width * renderedMapWidth
        const pointY = surfaceTop + point.y / dimensions.length * renderedMapHeight
        const markerRect = { x: pointX - 18, y: pointY - 18, width: 36, height: 36 }
        const visibleLabelRect = labelRect ? { x: surfaceLeft + labelRect.x, y: surfaceTop + labelRect.y, width: labelRect.width, height: labelRect.height } : null
        const left = Math.min(markerRect.x, visibleLabelRect?.x ?? markerRect.x)
        const top = Math.min(markerRect.y, visibleLabelRect?.y ?? markerRect.y)
        const right = Math.max(markerRect.x + markerRect.width, visibleLabelRect ? visibleLabelRect.x + visibleLabelRect.width : markerRect.x + markerRect.width)
        const bottom = Math.max(markerRect.y + markerRect.height, visibleLabelRect ? visibleLabelRect.y + visibleLabelRect.height : markerRect.y + markerRect.height)
        return (
          <Pressable
            accessibilityLabel={`Open ${label}`}
            accessibilityRole="button"
            key={`hit-${poi.id}`}
            onPress={() => onPoiPress(poi)}
            style={[styles.poiHitTarget, { height: bottom - top, left, top, width: right - left }]}
          />
        )
      }) : null}
      {frame.width > 0 && frame.height > 0 ? poiPlacements.map(({ poi, label, isSelected, labelRect }) => labelRect ? (
        <View
          key={`label-${poi.id}`}
          pointerEvents="none"
          style={[
            styles.poiLabel,
            isSelected && styles.poiLabelSelected,
            {
              height: labelRect.height,
              left: surfaceLeft + labelRect.x,
              top: surfaceTop + labelRect.y,
              width: labelRect.width,
            },
          ]}
        >
          <Text numberOfLines={1} style={[styles.poiLabelText, isSelected && styles.poiLabelTextSelected]}>{label}</Text>
        </View>
      ) : null) : null}
      <View pointerEvents="none" style={styles.brandlessBadge}><Text style={styles.brandlessBadgeText}>{floor.name}</Text></View>
    </View>
  )
}

const styles = StyleSheet.create({
  viewport: { backgroundColor: '#E8EDF1', flex: 1, overflow: 'hidden' },
  backdropGrid: { backgroundColor: '#E8EDF1', bottom: 0, left: 0, opacity: 0.9, position: 'absolute', right: 0, top: 0 },
  mapSurface: { backgroundColor: '#F8FAFC', elevation: 4, overflow: 'hidden', position: 'absolute', shadowColor: '#10233F', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 8 },
  missingPlan: { alignItems: 'center', backgroundColor: '#F8FAFC', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0 },
  missingPlanText: { color: '#7B8794', fontSize: 12 },
  poiHitTarget: { backgroundColor: 'transparent', position: 'absolute' },
  poiLabel: { backgroundColor: 'rgba(255,255,255,0.88)', borderColor: 'rgba(16,35,63,0.10)', borderRadius: 4, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 4, position: 'absolute' },
  poiLabelSelected: { backgroundColor: 'rgba(16,35,63,0.96)', borderColor: 'rgba(16,35,63,0.96)' },
  poiLabelText: { color: '#10233F', fontSize: 9.5, fontWeight: '600' },
  poiLabelTextSelected: { color: '#ffffff', fontSize: 10.5, fontWeight: '700' },
  brandlessBadge: { backgroundColor: 'rgba(16,35,63,0.78)', borderRadius: 10, bottom: 12, paddingHorizontal: 10, paddingVertical: 6, position: 'absolute', right: 12 },
  brandlessBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
})
