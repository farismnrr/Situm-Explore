import type { Location } from '@situm/react-native'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { ActivityIndicator, BackHandler, Keyboard, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import type { SitumCartographyPoi, SitumCartographyResponse } from '../../../shared/situm-cartography'
import type { SitumPathsResponse } from '../../../shared/situm-paths'
import { ApiError } from '../api/errors'
import type { ForegroundPositioningSession } from '../positioning/session'
import { layoutForWidth, type LayoutMode } from '../ui/layout'
import { colors, radii } from '../ui/theme'
import type { WorkspaceContext } from '../workspaces/context'
import { CustomIndoorMap, type CustomIndoorLocation } from './CustomIndoorMap'
import { NativeDigitalTwin } from './NativeDigitalTwin'
import { NativeMapBrowseOverlay } from './NativeMapBrowseOverlay'
import { calculateIndoorRoute, nearestRoutePointIndex, nextRouteInstruction, remainingRouteDistance, type IndoorRoute } from './customRoute'
import { filterPois, formatNavigationDistance, formatNavigationEta, locationFreshnessWindowMs } from './state'

type NavigationState = 'idle' | 'active' | 'outside-route' | 'arrived' | 'cancelled' | 'error'
type ExploreViewMode = '2d' | '3d'

function locationFromSitum(location: Location | null): CustomIndoorLocation | null {
  const cartesian = location?.position?.cartesianCoordinate
  const floorId = Number(location?.position?.floorIdentifier)
  if (!cartesian || !Number.isFinite(cartesian.x) || !Number.isFinite(cartesian.y) || !Number.isFinite(floorId)) return null
  return {
    floorId,
    x: cartesian.x,
    y: cartesian.y,
    accuracy: Number.isFinite(location?.accuracy) ? location?.accuracy : undefined,
    bearingDegrees: Number.isFinite(location?.bearing?.degreesClockwise) ? location?.bearing?.degreesClockwise : undefined,
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function distance(a: { x: number, y: number }, b: { x: number, y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function NativeMapScreen({ workspaces, lifecycle, positioning, layout, fullscreen = false, onFullscreenChange, onNavigationFocusChange }: { workspaces: WorkspaceContext, lifecycle: string, positioning: ForegroundPositioningSession, layout?: LayoutMode, fullscreen?: boolean, onFullscreenChange?: (fullscreen: boolean) => void, onNavigationFocusChange?: (active: boolean) => void }) {
  const [cartography, setCartography] = useState<SitumCartographyResponse | null>(null)
  const [paths, setPaths] = useState<SitumPathsResponse | null>(null)
  const [error, setError] = useState('')
  const [retryNonce, setRetryNonce] = useState(0)
  const workspaceId = workspaces.selectedWorkspaceId
  const pendingMapRequest = workspaces.mapRequest
  const [activeMapRequestId, setActiveMapRequestId] = useState<number | null>(() => pendingMapRequest?.requestId ?? null)
  const [initialBuildingId, setInitialBuildingId] = useState<number | null>(() => pendingMapRequest?.buildingId ?? null)
  const handledMapRequestId = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setCartography(null)
    setPaths(null)
    setError('')
    if (!workspaceId) return

    Promise.all([
      workspaces.auth.api.get<SitumCartographyResponse>(`/api/workspaces/${workspaceId}/situm/cartography`),
      workspaces.auth.api.get<SitumPathsResponse>(`/api/workspaces/${workspaceId}/situm/paths`),
    ]).then(([nextCartography, nextPaths]) => {
      if (!cancelled) {
        setCartography(nextCartography)
        setPaths(nextPaths)
      }
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof ApiError ? cause.message : 'Indoor map data is unavailable for this workspace.')
    })

    return () => { cancelled = true }
  }, [retryNonce, workspaceId, workspaces])

  useEffect(() => {
    if (!pendingMapRequest || handledMapRequestId.current === pendingMapRequest.requestId) return
    handledMapRequestId.current = pendingMapRequest.requestId
    setActiveMapRequestId(pendingMapRequest.requestId)
    setInitialBuildingId(pendingMapRequest.buildingId)
    workspaces.consumeMapRequest(pendingMapRequest.requestId)
  }, [pendingMapRequest, workspaces])

  if (!workspaceId) return <StateCard title="Select a workspace" body="Map loads only after an owned workspace is selected." />
  if (error) return <StateCard title="Map unavailable" body={error} action={() => setRetryNonce(value => value + 1)} />
  if (!cartography || !paths) return <View style={styles.loading}><ActivityIndicator color={colors.action} /><Text style={styles.muted}>Loading venue cartography…</Text></View>
  if (!cartography.buildings.length) return <StateCard title="No buildings available" body="This workspace has no building available for indoor exploration." />

  return (
    <NativeMapRuntime
      key={`${workspaceId}:${activeMapRequestId ?? 'default'}`}
      workspaceId={workspaceId}
      cartography={cartography}
      paths={paths}
      lifecycle={lifecycle}
      workspaces={workspaces}
      positioning={positioning}
      initialBuildingId={initialBuildingId}
      layout={layout}
      fullscreen={fullscreen}
      onFullscreenChange={onFullscreenChange}
      onNavigationFocusChange={onNavigationFocusChange}
    />
  )
}

function NativeMapRuntime({ workspaceId, cartography, paths, lifecycle, workspaces, positioning, initialBuildingId, layout: suppliedLayout, fullscreen, onFullscreenChange, onNavigationFocusChange }: { workspaceId: string, cartography: SitumCartographyResponse, paths: SitumPathsResponse, lifecycle: string, workspaces: WorkspaceContext, positioning: ForegroundPositioningSession, initialBuildingId: number | null, layout?: LayoutMode, fullscreen: boolean, onFullscreenChange?: (fullscreen: boolean) => void, onNavigationFocusChange?: (active: boolean) => void }) {
  const { width, height } = useWindowDimensions()
  const layout = suppliedLayout || layoutForWidth(width).mode
  const isPhone = layout === 'phone'
  const guidanceUi = useMemo(() => {
    const compact = height <= 760
    return {
      inset: clamp(width * 0.012, 10, 16),
      topWidth: isPhone ? Math.max(0, width - 24) : clamp(width * 0.42, 340, 560),
      bottomWidth: isPhone ? Math.max(0, width - 24) : clamp(width * 0.34, 300, 440),
      cardRadius: clamp(height * 0.018, 11, 15),
      cardPadX: clamp(width * 0.011, 10, 14),
      cardPadY: clamp(height * 0.012, 8, 11),
      turnSize: clamp(height * 0.061, 40, 48),
      turnFont: clamp(height * 0.035, 22, 28),
      eyebrowFont: clamp(height * 0.011, 8, 9),
      instructionFont: clamp(height * 0.021, 13, 17),
      instructionLine: clamp(height * 0.027, 17, 21),
      summaryFont: clamp(height * 0.020, 13, 16),
      destinationFont: clamp(height * 0.014, 9, 11),
      actionHeight: compact ? 40 : 44,
      recenterSize: compact ? 42 : 46,
      bottomGap: compact ? 10 : 12,
    }
  }, [height, isPhone, width])
  const initialBuilding = cartography.buildings.find(building => building.id === initialBuildingId) ?? cartography.buildings[0]!
  const [buildingId] = useState(initialBuilding.id)
  const building = cartography.buildings.find(candidate => candidate.id === buildingId) ?? initialBuilding
  const buildingFloors = useMemo(() => cartography.floors.filter(floor => floor.buildingId === buildingId).sort((a, b) => b.level - a.level), [buildingId, cartography.floors])
  const [activeFloorId, setActiveFloorId] = useState<number>(() => buildingFloors[0]?.id ?? -1)
  const activeFloor = buildingFloors.find(floor => floor.id === activeFloorId) ?? buildingFloors[0] ?? null
  const [viewMode, setViewMode] = useState<ExploreViewMode>('2d')
  const [selectedPoi, setSelectedPoi] = useState<SitumCartographyPoi | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [floorMenuOpen, setFloorMenuOpen] = useState(false)
  const [route, setRoute] = useState<IndoorRoute | null>(null)
  const [navigationState, setNavigationState] = useState<NavigationState>('idle')
  const [navigationMessage, setNavigationMessage] = useState('Choose a place to see directions.')
  const [recenterNonce, setRecenterNonce] = useState(0)
  const [positionStale, setPositionStale] = useState(false)
  const positioningSnapshot = useSyncExternalStore(positioning.subscribe, positioning.getSnapshot, positioning.getSnapshot)
  const indoorLocation = useMemo(() => locationFromSitum(positioningSnapshot.location), [positioningSnapshot.location])
  const positionState = positioningSnapshot.state === 'active' ? (positionStale ? 'stale' : 'fresh') : positioningSnapshot.state
  const canNavigate = Boolean(positionState === 'fresh' && indoorLocation && positioningSnapshot.workspaceId === workspaceId && positioningSnapshot.buildingId === buildingId)
  const isGuidanceActive = navigationState === 'active' || navigationState === 'outside-route'
  const visibleSearchResults = useMemo(() => filterPois(cartography.pois, buildingId, searchQuery).slice(0, 7), [buildingId, cartography.pois, searchQuery])
  const currentFloorLabel = activeFloor?.name || 'Floors'
  const remainingDistance = route && indoorLocation ? remainingRouteDistance(route, indoorLocation) : route?.distanceMeters ?? null
  const progressDistance = formatNavigationDistance(remainingDistance)
  const progressEta = formatNavigationEta(remainingDistance == null ? null : remainingDistance / 1.2)
  const instruction = route && indoorLocation ? nextRouteInstruction(route, indoorLocation, floorId => buildingFloors.find(floor => floor.id === floorId)?.name || `Floor ${floorId}`) : navigationMessage

  useEffect(() => {
    setPositionStale(false)
    if (!positioningSnapshot.receivedAt) return
    const remaining = Math.max(0, locationFreshnessWindowMs - (Date.now() - positioningSnapshot.receivedAt))
    const timer = setTimeout(() => setPositionStale(true), remaining)
    return () => clearTimeout(timer)
  }, [positioningSnapshot.receivedAt])

  useEffect(() => {
    if (positionState !== 'fresh' || !indoorLocation) return
    if (buildingFloors.some(floor => floor.id === indoorLocation.floorId) && isGuidanceActive) setActiveFloorId(indoorLocation.floorId)
    if (!route || !selectedPoi || !isGuidanceActive) return
    const destination = selectedPoi.location
    if (selectedPoi.floorId === indoorLocation.floorId && distance(indoorLocation, destination) <= 3) {
      setNavigationState('arrived')
      setNavigationMessage('Destination reached.')
      return
    }
    const nearest = nearestRoutePointIndex(route, indoorLocation)
    if (nearest.index >= 0 && nearest.distanceMeters > 10) {
      setNavigationState('outside-route')
      setNavigationMessage('Move back toward the highlighted route.')
    } else if (navigationState === 'outside-route') {
      setNavigationState('active')
      setNavigationMessage('Continue along the highlighted route.')
    }
  }, [buildingFloors, indoorLocation, isGuidanceActive, navigationState, positionState, route, selectedPoi])

  useEffect(() => {
    if (!fullscreen) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onFullscreenChange?.(false)
      return true
    })
    return () => subscription.remove()
  }, [fullscreen, onFullscreenChange])

  const dismissMapOverlays = useCallback(() => {
    Keyboard.dismiss()
    setSearchFocused(false)
    setFloorMenuOpen(false)
  }, [])

  const startPositioning = useCallback(() => {
    setNavigationMessage('Finding your indoor position…')
    void positioning.start(workspaceId, buildingId, () => workspaces.getPositioningCredential())
  }, [buildingId, positioning, workspaces, workspaceId])

  const stopPositioning = useCallback(() => {
    setRoute(null)
    setNavigationState('idle')
    setNavigationMessage('Choose a place to see directions.')
    positioning.stop('explicit')
  }, [positioning])

  const selectPoi = useCallback((nextPoi: SitumCartographyPoi) => {
    Keyboard.dismiss()
    setSelectedPoi(nextPoi)
    setSearchQuery(nextPoi.name)
    setSearchFocused(false)
    setFloorMenuOpen(false)
    setRoute(null)
    setNavigationState('idle')
    setNavigationMessage('Choose Directions to calculate a route.')
    setActiveFloorId(nextPoi.floorId)
  }, [])

  const clearDestination = useCallback(() => {
    setSelectedPoi(null)
    setSearchQuery('')
    setSearchFocused(false)
    setRoute(null)
    setNavigationState('idle')
    setNavigationMessage('Choose a place to see directions.')
  }, [])

  const startGuidance = useCallback(() => {
    if (!selectedPoi || !indoorLocation || !canNavigate) return
    Keyboard.dismiss()
    const nextRoute = calculateIndoorRoute(paths, indoorLocation, { floorId: selectedPoi.floorId, x: selectedPoi.location.x, y: selectedPoi.location.y })
    if (!nextRoute) {
      setRoute(null)
      setNavigationState('error')
      setNavigationMessage('No connected venue path was found to this destination.')
      return
    }
    setRoute(nextRoute)
    setNavigationState('active')
    setNavigationMessage('Continue along the highlighted route.')
    onNavigationFocusChange?.(true)
    setSearchFocused(false)
    setFloorMenuOpen(false)
    setActiveFloorId(indoorLocation.floorId)
    setRecenterNonce(value => value + 1)
  }, [canNavigate, indoorLocation, onNavigationFocusChange, paths, selectedPoi])

  const cancelNavigation = useCallback(() => {
    setRoute(null)
    setNavigationState('cancelled')
    setNavigationMessage('Directions stopped.')
    onNavigationFocusChange?.(false)
  }, [onNavigationFocusChange])

  const resetGuidanceOutcome = useCallback(() => {
    setNavigationState('idle')
    setNavigationMessage('Choose a place to see directions.')
    setRoute(null)
    onNavigationFocusChange?.(false)
  }, [onNavigationFocusChange])

  const recenter = useCallback(() => {
    if (indoorLocation && buildingFloors.some(floor => floor.id === indoorLocation.floorId)) setActiveFloorId(indoorLocation.floorId)
    setRecenterNonce(value => value + 1)
  }, [buildingFloors, indoorLocation])

  const enterDigitalTwin = useCallback(() => {
    if (isGuidanceActive) return
    Keyboard.dismiss()
    setSelectedPoi(null)
    setSearchQuery('')
    setSearchFocused(false)
    setFloorMenuOpen(false)
    setRoute(null)
    setNavigationState('idle')
    setNavigationMessage('Choose a place to see directions.')
    setViewMode('3d')
  }, [isGuidanceActive])

  const selectDigitalTwinFloor = useCallback((floorId: number) => {
    if (!buildingFloors.some(floor => floor.id === floorId)) return
    setActiveFloorId(floorId)
    setSelectedPoi(null)
    setRoute(null)
  }, [buildingFloors])

  if (!activeFloor) return <StateCard title="Floor plan unavailable" body="This building has no floor plan that can be rendered." />

  if (viewMode === '3d') {
    return <NativeDigitalTwin workspaceId={workspaceId} building={building} floor={activeFloor} floors={buildingFloors} lifecycle={lifecycle} workspaces={workspaces} onFloorSelect={selectDigitalTwinFloor} onExit2D={() => setViewMode('2d')} />
  }

  const showGuidanceHud = isGuidanceActive || navigationState === 'arrived' || navigationState === 'cancelled' || navigationState === 'error'
  const isBrowseMode = !showGuidanceHud
  const showDestinationSheet = selectedPoi && isBrowseMode && !searchFocused
  const searchOpen = isBrowseMode && searchFocused

  return (
    <View style={styles.screen}>
      <CustomIndoorMap
        building={building}
        currentLocation={indoorLocation}
        floor={activeFloor}
        followLocation={isGuidanceActive}
        onMapPress={dismissMapOverlays}
        onPoiPress={selectPoi}
        pois={cartography.pois.filter(poi => poi.buildingId === buildingId)}
        recenterNonce={recenterNonce}
        route={route}
        selectedPoi={selectedPoi}
      />

      {!fullscreen ? (
        <View pointerEvents="box-none" style={styles.overlay}>
          {isBrowseMode ? <NativeMapBrowseOverlay
            activeFloorId={activeFloor.id}
            buildingId={buildingId}
            buildingName={building.name}
            canNavigate={canNavigate}
            currentFloorLabel={currentFloorLabel}
            floorMenuOpen={floorMenuOpen}
            floors={buildingFloors}
            isPhone={isPhone}
            positionState={positionState}
            searchOpen={searchOpen}
            searchQuery={searchQuery}
            selectedPoi={selectedPoi}
            showDestinationSheet={Boolean(showDestinationSheet)}
            visibleSearchResults={visibleSearchResults}
            onClearDestination={clearDestination}
            onEnterDigitalTwin={enterDigitalTwin}
            onFloorMenuToggle={() => setFloorMenuOpen(value => !value)}
            onFloorSelect={floorId => { setActiveFloorId(floorId); setFloorMenuOpen(false) }}
            onFullscreen={() => onFullscreenChange?.(true)}
            onQueryChange={value => {
              setSearchQuery(value)
              setSearchFocused(true)
              if (selectedPoi && value !== selectedPoi.name) {
                setSelectedPoi(null)
                setRoute(null)
              }
            }}
            onRecenter={recenter}
            onSearchFocus={() => setSearchFocused(true)}
            onSelectPoi={selectPoi}
            onStartGuidance={startGuidance}
            onStartPositioning={startPositioning}
          /> : isGuidanceActive ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Recenter navigation" onPress={recenter} style={[styles.guidanceRecenter, { borderRadius: guidanceUi.recenterSize / 2, bottom: 16 + guidanceUi.actionHeight + guidanceUi.cardPadY * 2 + 12, height: guidanceUi.recenterSize, width: guidanceUi.recenterSize }]}>
              <Text style={[styles.guidanceRecenterText, { fontSize: guidanceUi.recenterSize * 0.46 }]}>⌖</Text>
            </TouchableOpacity>
          ) : null}

          {positionState !== 'stopped' && positionState !== 'fresh' ? (
            <View style={[styles.locationStatus, isPhone ? styles.locationStatusPhone : styles.locationStatusLarge]}>
              <ActivityIndicator color={positionState === 'error' ? colors.danger : colors.action} size="small" />
              <Text numberOfLines={2} style={styles.locationStatusText}>{positioningSnapshot.message || 'Finding your indoor position…'}</Text>
            </View>
          ) : null}

          {showGuidanceHud ? (
            <>
              <View style={[
                styles.guidanceTop,
                {
                  borderRadius: guidanceUi.cardRadius,
                  gap: guidanceUi.bottomGap,
                  left: guidanceUi.inset,
                  paddingHorizontal: guidanceUi.cardPadX,
                  paddingVertical: guidanceUi.cardPadY,
                  width: guidanceUi.topWidth,
                },
                navigationState === 'outside-route' && styles.guidanceWarning,
              ]}>
                <View style={[styles.guidanceTurnIcon, { borderRadius: guidanceUi.cardRadius - 2, height: guidanceUi.turnSize, width: guidanceUi.turnSize }]}><Text style={[styles.guidanceTurnText, { fontSize: guidanceUi.turnFont, lineHeight: guidanceUi.turnFont + 3 }]}>{guidanceSymbol(instruction, navigationState)}</Text></View>
                <View style={styles.guidanceTopCopy}>
                  <Text style={[styles.guidanceEyebrow, { fontSize: guidanceUi.eyebrowFont }]}>{navigationState === 'arrived' ? 'ARRIVED' : navigationState === 'outside-route' ? 'REROUTING' : navigationState === 'error' || navigationState === 'cancelled' ? 'ROUTE' : 'NEXT'}</Text>
                  <Text numberOfLines={2} style={[styles.guidanceInstruction, { fontSize: guidanceUi.instructionFont, lineHeight: guidanceUi.instructionLine }]}>{navigationState === 'error' || navigationState === 'cancelled' || navigationState === 'arrived' ? navigationMessage : instruction}</Text>
                </View>
              </View>
              <View style={[
                styles.guidanceBottom,
                {
                  borderRadius: guidanceUi.cardRadius,
                  gap: guidanceUi.bottomGap,
                  left: guidanceUi.inset,
                  paddingHorizontal: guidanceUi.cardPadX,
                  paddingVertical: guidanceUi.cardPadY,
                  width: guidanceUi.bottomWidth,
                },
              ]}>
                <View style={styles.guidanceBottomCopy}>
                  <Text numberOfLines={1} style={[styles.guidanceSummary, { fontSize: guidanceUi.summaryFont }]}>{navigationState === 'arrived' ? '0 min · 0 m' : `${progressEta || '—'} · ${progressDistance || '—'}`}</Text>
                  {selectedPoi ? <Text numberOfLines={1} style={[styles.guidanceDestination, { fontSize: guidanceUi.destinationFont }]}>{selectedPoi.name} · {activeFloor.name}</Text> : <Text numberOfLines={1} style={[styles.guidanceDestination, { fontSize: guidanceUi.destinationFont }]}>{activeFloor.name}</Text>}
                </View>
                {isGuidanceActive ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Stop guidance" onPress={cancelNavigation} style={[styles.stopButton, { minHeight: guidanceUi.actionHeight }]}><Text style={styles.stopText}>Stop</Text></TouchableOpacity> : <TouchableOpacity accessibilityRole="button" accessibilityLabel="Return to map browsing" onPress={resetGuidanceOutcome} style={[styles.doneButton, { minHeight: guidanceUi.actionHeight }]}><Text style={styles.doneText}>Done</Text></TouchableOpacity>}
              </View>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

function guidanceSymbol(instruction: string, state: NavigationState) {
  if (state === 'arrived') return '✓'
  if (state === 'outside-route') return '↻'
  if (instruction.toLowerCase().includes('floor')) return '⇅'
  if (instruction.toLowerCase().includes('left')) return '↰'
  if (instruction.toLowerCase().includes('right')) return '↱'
  return '↑'
}

function MapControlButton({ label, visibleLabel, symbol, tone = 'neutral', disabled = false, onPress }: { label: string, visibleLabel?: string, symbol: string, tone?: 'neutral' | 'primary', disabled?: boolean, onPress: () => void }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.mapControlButton, tone === 'primary' && styles.mapControlButtonPrimary, disabled && styles.disabled]}><Text style={[styles.mapControlSymbol, tone === 'primary' && styles.mapControlSymbolPrimary]}>{symbol}</Text>{visibleLabel ? <Text style={[styles.mapControlLabel, tone === 'primary' && styles.mapControlLabelPrimary]}>{visibleLabel}</Text> : null}</TouchableOpacity>
}

function StateCard({ title, body, action }: { title: string, body: string, action?: () => void }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.muted}>{body}</Text>{action ? <TouchableOpacity style={styles.primaryButton} onPress={action}><Text style={styles.primaryButtonText}>Try again</Text></TouchableOpacity> : null}</View>
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E8EDF1', flex: 1, overflow: 'hidden' },
  overlay: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  searchDock: { position: 'absolute', top: 14, zIndex: 5 },
  searchDockPhone: { left: 12, right: 12 },
  searchDockLarge: { left: 16, width: 460 },
  searchCard: { backgroundColor: 'rgba(255,255,255,0.98)', borderColor: 'rgba(255,255,255,0.86)', borderRadius: 18, borderWidth: 1, elevation: 8, overflow: 'hidden', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.12, shadowRadius: 16 },
  searchRow: { alignItems: 'center', flexDirection: 'row', minHeight: 54, paddingHorizontal: 12 },
  searchIconWrap: { alignItems: 'center', height: 34, justifyContent: 'center', width: 34 },
  searchIcon: { color: colors.action, fontSize: 26, lineHeight: 28 },
  searchInput: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '600', minHeight: 50, paddingHorizontal: 6, paddingVertical: 0 },
  searchClear: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  searchClearText: { color: colors.tertiary, fontSize: 24, lineHeight: 26 },
  contextRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 8, minHeight: 38, paddingHorizontal: 12, paddingVertical: 6 },
  contextBuilding: { flex: 1 },
  contextBuildingText: { color: colors.tertiary, fontSize: 11, fontWeight: '700' },
  floorTrigger: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 9, flexDirection: 'row', gap: 5, maxWidth: 180, minHeight: 30, paddingHorizontal: 9 },
  floorTriggerIcon: { color: colors.action, fontSize: 14 }, floorTriggerText: { color: colors.secondary, flexShrink: 1, fontSize: 11, fontWeight: '700' }, floorTriggerChevron: { color: colors.muted, fontSize: 12 },
  floorChoices: { gap: 7, paddingBottom: 10, paddingHorizontal: 12, paddingTop: 4 }, floorChip: { borderColor: colors.strongBorder, borderRadius: radii.pill, borderWidth: 1, minHeight: 30, paddingHorizontal: 11, paddingVertical: 6 }, floorChipActive: { backgroundColor: colors.action, borderColor: colors.action }, floorChipText: { color: colors.secondary, fontSize: 11, fontWeight: '700' }, floorChipTextActive: { color: '#fff' },
  searchResults: { borderTopColor: colors.border, borderTopWidth: 1, maxHeight: 258 }, searchResult: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 10, minHeight: 58, paddingHorizontal: 12, paddingVertical: 8 }, resultPin: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 16, height: 32, justifyContent: 'center', width: 32 }, resultPinText: { color: colors.action, fontSize: 22, lineHeight: 24 }, resultCopy: { flex: 1 }, resultTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' }, resultMeta: { color: colors.muted, fontSize: 11, marginTop: 3 }, resultArrow: { color: colors.muted, fontSize: 24 }, searchEmpty: { padding: 16 }, searchEmptyText: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  mapControls: { bottom: 18, gap: 8, left: 16, position: 'absolute' }, mapControlButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.97)', borderColor: colors.border, borderRadius: 13, borderWidth: 1, elevation: 5, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 44, minWidth: 44, paddingHorizontal: 11, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8 }, mapControlButtonPrimary: { backgroundColor: colors.action, borderColor: colors.action }, mapControlSymbol: { color: colors.action, fontSize: 20, fontWeight: '800' }, mapControlSymbolPrimary: { color: '#fff' }, mapControlLabel: { color: colors.secondary, fontSize: 11, fontWeight: '800' }, mapControlLabelPrimary: { color: '#fff' },
  locationStatus: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: colors.border, borderRadius: 12, borderWidth: 1, bottom: 18, flexDirection: 'row', gap: 9, paddingHorizontal: 12, paddingVertical: 9, position: 'absolute' }, locationStatusPhone: { left: 70, right: 12 }, locationStatusLarge: { left: 160, maxWidth: 360 }, locationStatusText: { color: colors.secondary, flexShrink: 1, fontSize: 11, lineHeight: 15 },
  poiSheet: { backgroundColor: 'rgba(255,255,255,0.98)', borderColor: 'rgba(255,255,255,0.9)', borderRadius: 18, borderWidth: 1, bottom: 16, elevation: 9, padding: 15, position: 'absolute', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.15, shadowRadius: 16 }, poiSheetPhone: { left: 12, right: 12 }, poiSheetLarge: { left: 126, width: 410 }, sheetHandle: { alignSelf: 'center', backgroundColor: colors.strongBorder, borderRadius: 3, height: 4, marginBottom: 10, width: 36 }, destinationHeader: { alignItems: 'center', flexDirection: 'row', gap: 11 }, destinationIcon: { alignItems: 'center', backgroundColor: '#eaf1ff', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 }, destinationIconText: { color: colors.action, fontSize: 16 }, destinationCopy: { flex: 1 }, destinationClose: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 }, destinationCloseText: { color: colors.tertiary, fontSize: 24 }, sheetEyebrow: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 }, sheetTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 2 }, sheetMeta: { color: colors.tertiary, fontSize: 11, marginTop: 3 }, sheetActions: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 12 }, primaryButton: { alignItems: 'center', backgroundColor: colors.action, borderRadius: 11, flex: 1, justifyContent: 'center', minHeight: 42, paddingHorizontal: 14 }, primaryButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' }, secondaryButton: { alignItems: 'center', borderColor: colors.strongBorder, borderRadius: 11, borderWidth: 1, justifyContent: 'center', minHeight: 42, paddingHorizontal: 14 }, secondaryButtonText: { color: colors.secondary, fontSize: 12, fontWeight: '700' }, sheetHint: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 9 }, disabled: { opacity: 0.55 },
  guidanceTop: { alignItems: 'center', backgroundColor: '#1769E0', elevation: 10, flexDirection: 'row', position: 'absolute', top: 12, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 14 }, guidanceWarning: { backgroundColor: '#B45309' }, guidanceTurnIcon: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center' }, guidanceTurnText: { color: '#fff', fontWeight: '700' }, guidanceTopCopy: { flex: 1 }, guidanceEyebrow: { color: 'rgba(255,255,255,0.72)', fontWeight: '900', letterSpacing: 1.1 }, guidanceInstruction: { color: '#fff', fontWeight: '800', marginTop: 1 }, guidanceDestination: { color: colors.tertiary, marginTop: 2 },
  guidanceBottom: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.98)', borderColor: 'rgba(15,23,42,0.08)', borderWidth: 1, bottom: 14, elevation: 10, flexDirection: 'row', position: 'absolute', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.13, shadowRadius: 13 }, guidanceBottomCopy: { flex: 1 }, guidanceSummary: { color: colors.action, fontWeight: '900' }, guidanceRecenter: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.98)', borderColor: colors.border, borderWidth: 1, elevation: 8, justifyContent: 'center', position: 'absolute', right: 14, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 9 }, guidanceRecenterText: { color: colors.action, fontWeight: '800' }, stopButton: { alignItems: 'center', backgroundColor: '#111827', borderRadius: 10, justifyContent: 'center', paddingHorizontal: 15 }, stopText: { color: '#fff', fontSize: 11, fontWeight: '800' }, doneButton: { alignItems: 'center', backgroundColor: colors.action, borderRadius: 10, justifyContent: 'center', paddingHorizontal: 15 }, doneText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  loading: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center' }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.panel, borderWidth: 1, margin: 16, padding: 18 }, cardTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' }, muted: { color: colors.tertiary, fontSize: 13, lineHeight: 20, marginTop: 5 },
})
