import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, AppState, PanResponder, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import type { IndoorWalkDestination } from '../../../shared/indoor-walk'
import { indoorWalkModelSlotForFloorLevel } from '../../../shared/indoor-walk-view'
import type { SitumCartographyBuilding, SitumCartographyFloor } from '../../../shared/situm-cartography'
import { ApiError } from '../api/errors'
import { colors, radii } from '../ui/theme'
import type { WorkspaceContext } from '../workspaces/context'
import { createNativeDigitalTwinRuntime, type NativeDigitalTwinRuntime, type WalkDirection } from './nativeDigitalTwinRenderer'

type TwinAsset = { bytes: ArrayBuffer, generation: number }

type RuntimeRef = { current: NativeDigitalTwinRuntime | null }
type NativeDigitalTwinProps = {
  workspaceId: string
  building: SitumCartographyBuilding
  floor: SitumCartographyFloor
  floors: SitumCartographyFloor[]
  lifecycle: string
  workspaces: WorkspaceContext
  onFloorSelect: (floorId: number) => void
  onExit2D: () => void
}

function useTwinAsset({ workspaceId, buildingId, floorId, retryNonce, slot, workspaces, disposeRuntime, onReset }: {
  workspaceId: string
  buildingId: number
  floorId: number
  retryNonce: number
  slot: ReturnType<typeof indoorWalkModelSlotForFloorLevel>
  workspaces: WorkspaceContext
  disposeRuntime: (updateState?: boolean) => void
  onReset: () => void
}) {
  const [asset, setAsset] = useState<TwinAsset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const generation = useRef(0)
  const requestController = useRef<AbortController | null>(null)

  useEffect(() => {
    const nextGeneration = ++generation.current
    requestController.current?.abort()
    disposeRuntime()
    setAsset(null)
    onReset()
    setError('')
    if (!slot) {
      setLoading(false)
      setError('No 3D model has been configured for this workspace and floor yet.')
      return
    }
    const controller = new AbortController()
    requestController.current = controller
    setLoading(true)
    void workspaces.auth.api.getArrayBuffer(
      `/api/workspaces/${encodeURIComponent(workspaceId)}/situm/3d-model/${slot}?buildingId=${encodeURIComponent(String(buildingId))}`,
      { signal: controller.signal, timeoutMs: 30_000 },
    ).then(bytes => {
      if (generation.current === nextGeneration) setAsset({ bytes, generation: nextGeneration })
    }).catch(cause => {
      if (generation.current !== nextGeneration || controller.signal.aborted) return
      setLoading(false)
      setError(modelLoadError(cause))
    }).finally(() => {
      if (requestController.current === controller) requestController.current = null
    })
    return () => {
      controller.abort()
      if (requestController.current === controller) requestController.current = null
      disposeRuntime(false)
    }
  }, [buildingId, disposeRuntime, floorId, onReset, retryNonce, slot, workspaceId, workspaces.auth.api])

  return { asset, loading, error, setLoading, setError, generation, requestController }
}

function useRuntimeAppLifecycle(runtime: RuntimeRef, lifecycle: string) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && lifecycle === 'active') runtime.current?.resume()
      else runtime.current?.pause()
    })
    return () => subscription.remove()
  }, [lifecycle, runtime])

  useEffect(() => {
    if (lifecycle === 'active' && AppState.currentState === 'active') runtime.current?.resume()
    else runtime.current?.pause()
  }, [lifecycle, runtime])
}

function useLookResponder(runtime: RuntimeRef) {
  const dragOrigin = useRef({ x: 0, y: 0 })
  return useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      dragOrigin.current = { x: 0, y: 0 }
      runtime.current?.beginLook()
    },
    onPanResponderMove: (_event, gesture) => {
      const dx = gesture.dx - dragOrigin.current.x
      const dy = gesture.dy - dragOrigin.current.y
      dragOrigin.current = { x: gesture.dx, y: gesture.dy }
      runtime.current?.lookBy(dx, dy)
    },
    onPanResponderRelease: () => runtime.current?.endLook(),
    onPanResponderTerminate: () => runtime.current?.endLook(),
  }), [runtime])
}

export function NativeDigitalTwin({ workspaceId, building, floor, floors, lifecycle, workspaces, onFloorSelect, onExit2D }: NativeDigitalTwinProps) {
  const slot = indoorWalkModelSlotForFloorLevel(floor.level)
  const [destinations, setDestinations] = useState<IndoorWalkDestination[]>([])
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [floorMenuOpen, setFloorMenuOpen] = useState(false)
  const [selectedDestination, setSelectedDestination] = useState<IndoorWalkDestination | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)
  const [rendererReady, setRendererReady] = useState(false)
  const runtime = useRef<NativeDigitalTwinRuntime | null>(null)

  const disposeRuntime = useCallback((updateState = true) => {
    runtime.current?.dispose()
    runtime.current = null
    if (updateState) setRendererReady(false)
  }, [])

  const resetUi = useCallback(() => {
    setDestinations([])
    setSelectedDestination(null)
    setQuery('')
    setSearchFocused(false)
    setFloorMenuOpen(false)
  }, [])
  const { asset, loading, error, setLoading, setError, generation, requestController } = useTwinAsset({
    workspaceId,
    buildingId: building.id,
    floorId: floor.id,
    retryNonce,
    slot,
    workspaces,
    disposeRuntime,
    onReset: resetUi,
  })
  useRuntimeAppLifecycle(runtime, lifecycle)

  useEffect(() => () => {
    requestController.current?.abort()
    generation.current++
    disposeRuntime(false)
  }, [disposeRuntime])

  const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext) => {
    if (!asset || !slot) return
    const currentGeneration = asset.generation
    disposeRuntime()
    try {
      const nextRuntime = createNativeDigitalTwinRuntime({ gl, bytes: asset.bytes, slot, floorId: floor.id })
      runtime.current = nextRuntime
      void nextRuntime.ready.then(result => {
        if (generation.current !== currentGeneration || runtime.current !== nextRuntime) {
          nextRuntime.dispose()
          return
        }
        setDestinations(result.destinations)
        setRendererReady(true)
        setLoading(false)
        if (lifecycle === 'active' && AppState.currentState === 'active') nextRuntime.start()
      }).catch(cause => {
        if (generation.current !== currentGeneration || runtime.current !== nextRuntime) return
        runtime.current = null
        setLoading(false)
        setError(cause instanceof Error ? cause.message : 'The 3D walkthrough could not be started.')
      })
    } catch (cause) {
      setLoading(false)
      setError(cause instanceof Error ? cause.message : 'Digital Twin 3D cannot start on this device.')
    }
  }, [asset, disposeRuntime, floor.id, lifecycle, slot])

  const visibleDestinations = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return (normalized ? destinations.filter(destination => `${destination.name} ${destination.category}`.toLowerCase().includes(normalized)) : destinations).slice(0, 7)
  }, [destinations, query])

  const chooseDestination = useCallback((destination: IndoorWalkDestination) => {
    setSelectedDestination(destination)
    setQuery(destination.name)
    setSearchFocused(false)
    setFloorMenuOpen(false)
  }, [])

  const clearDestination = useCallback(() => {
    setSelectedDestination(null)
    setQuery('')
    setSearchFocused(true)
  }, [])

  const goToDestination = useCallback(() => {
    if (!selectedDestination || !runtime.current?.goToDestination(selectedDestination)) {
      setError('The selected room is not available in the active 3D floor.')
    }
  }, [selectedDestination])

  const panResponder = useLookResponder(runtime)

  const changeFloor = (floorId: number) => {
    setFloorMenuOpen(false)
    setSearchFocused(false)
    onFloorSelect(floorId)
  }

  return <View style={styles.root}>
    {asset && slot ? <GLView key={`${workspaceId}:${building.id}:${floor.id}:${slot}:${asset.generation}`} onContextCreate={onContextCreate} style={styles.gl} /> : <View style={styles.gl} />}
    {asset && slot && !error ? <View pointerEvents="box-only" style={styles.lookSurface} {...panResponder.panHandlers}><Text style={styles.lookHint}>Drag to look</Text></View> : null}
    <DigitalTwinOverlay
      assetLoaded={Boolean(asset)} building={building} error={error} floor={floor} floors={floors} floorMenuOpen={floorMenuOpen}
      loading={loading} query={query} rendererReady={rendererReady} searchFocused={searchFocused} selectedDestination={selectedDestination}
      visibleDestinations={visibleDestinations} onChooseDestination={chooseDestination} onClearDestination={clearDestination}
      onExit2D={onExit2D} onFloorChange={changeFloor} onGo={goToDestination}
      onMovement={(direction, active) => runtime.current?.setMovement(direction, active)}
      onQueryChange={value => { setQuery(value); setSearchFocused(true); if (selectedDestination?.name !== value) setSelectedDestination(null) }}
      onReset={() => runtime.current?.resetView()} onRetry={() => setRetryNonce(value => value + 1)}
      onSearchFocus={() => { setSearchFocused(true); setFloorMenuOpen(false) }}
      onToggleFloor={() => { setFloorMenuOpen(value => !value); setSearchFocused(false) }}
      onChangeDestination={() => setSearchFocused(true)}
    />
  </View>
}

function DigitalTwinOverlay({ assetLoaded, building, error, floor, floors, floorMenuOpen, loading, query, rendererReady, searchFocused, selectedDestination, visibleDestinations, onChooseDestination, onClearDestination, onExit2D, onFloorChange, onGo, onMovement, onQueryChange, onReset, onRetry, onSearchFocus, onToggleFloor, onChangeDestination }: {
  assetLoaded: boolean, building: SitumCartographyBuilding, error: string, floor: SitumCartographyFloor, floors: SitumCartographyFloor[], floorMenuOpen: boolean, loading: boolean, query: string, rendererReady: boolean, searchFocused: boolean, selectedDestination: IndoorWalkDestination | null, visibleDestinations: IndoorWalkDestination[], onChooseDestination: (destination: IndoorWalkDestination) => void, onClearDestination: () => void, onExit2D: () => void, onFloorChange: (floorId: number) => void, onGo: () => void, onMovement: (direction: WalkDirection, active: boolean) => void, onQueryChange: (value: string) => void, onReset: () => void, onRetry: () => void, onSearchFocus: () => void, onToggleFloor: () => void, onChangeDestination: () => void
}) {
  return <View pointerEvents="box-none" style={styles.overlay}>
    <DigitalTwinSearchDock building={building} floor={floor} floors={floors} floorMenuOpen={floorMenuOpen} query={query} rendererReady={rendererReady} searchFocused={searchFocused} visibleDestinations={visibleDestinations} onChooseDestination={onChooseDestination} onClearDestination={onClearDestination} onFloorChange={onFloorChange} onQueryChange={onQueryChange} onSearchFocus={onSearchFocus} onToggleFloor={onToggleFloor} />
    {loading ? <View style={styles.statusCard}><ActivityIndicator color="#ffffff" /><Text style={styles.statusText}>{assetLoaded ? 'Starting 3D walkthrough…' : 'Loading 3D digital twin…'}</Text></View> : null}
    {error ? <View style={styles.errorCard}><Text style={styles.errorTitle}>Digital Twin 3D isn't available</Text><Text style={styles.errorBody}>{error}</Text><View style={styles.errorActions}><TouchableOpacity accessibilityRole="button" onPress={onRetry} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={onExit2D} style={styles.errorBackButton}><Text style={styles.errorBackText}>2D Map</Text></TouchableOpacity></View></View> : null}
    {rendererReady && !error ? <><View style={styles.mapControls}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Reset 3D view" onPress={onReset} style={styles.controlButton}><Text style={styles.controlSymbol}>↺</Text><Text style={styles.controlLabel}>Reset</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="Return to 2D Map" onPress={onExit2D} style={styles.controlButton}><Text style={styles.controlSymbol}>▱</Text><Text style={styles.controlLabel}>2D Map</Text></TouchableOpacity></View><WalkControls onMovement={onMovement} /></> : null}
    {rendererReady && selectedDestination && !searchFocused ? <View style={styles.destinationCard}><View style={styles.destinationHeader}><View style={styles.destinationIcon}><Text style={styles.destinationIconText}>●</Text></View><View style={styles.destinationCopy}><Text style={styles.destinationEyebrow}>3D DESTINATION</Text><Text numberOfLines={1} style={styles.destinationTitle}>{selectedDestination.name}</Text><Text style={styles.destinationMeta}>{selectedDestination.category} · {floor.name}</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear 3D destination" onPress={onClearDestination} style={styles.destinationClose}><Text style={styles.destinationCloseText}>×</Text></TouchableOpacity></View><View style={styles.destinationActions}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Go to 3D room" onPress={onGo} style={styles.goButton}><Text style={styles.goText}>Go</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="Change 3D room" onPress={onChangeDestination} style={styles.changeButton}><Text style={styles.changeText}>Change</Text></TouchableOpacity></View></View> : null}
  </View>
}

function DigitalTwinSearchDock({ building, floor, floors, floorMenuOpen, query, rendererReady, searchFocused, visibleDestinations, onChooseDestination, onClearDestination, onFloorChange, onQueryChange, onSearchFocus, onToggleFloor }: {
  building: SitumCartographyBuilding, floor: SitumCartographyFloor, floors: SitumCartographyFloor[], floorMenuOpen: boolean, query: string, rendererReady: boolean, searchFocused: boolean, visibleDestinations: IndoorWalkDestination[], onChooseDestination: (destination: IndoorWalkDestination) => void, onClearDestination: () => void, onFloorChange: (floorId: number) => void, onQueryChange: (value: string) => void, onSearchFocus: () => void, onToggleFloor: () => void
}) {
  return <View style={styles.searchDock}><View style={styles.searchCard}>
    <View style={styles.searchRow}><Text style={styles.searchIcon}>⌕</Text><TextInput accessibilityLabel="Search 3D rooms" autoCorrect={false} editable={rendererReady} placeholder="Where do you want to go?" placeholderTextColor={colors.muted} returnKeyType="search" style={styles.searchInput} value={query} onFocus={onSearchFocus} onChangeText={onQueryChange} onSubmitEditing={() => { if (visibleDestinations[0]) onChooseDestination(visibleDestinations[0]) }} />{query ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear 3D room search" onPress={onClearDestination} style={styles.clearButton}><Text style={styles.clearText}>×</Text></TouchableOpacity> : null}</View>
    <View style={styles.contextRow}><Text numberOfLines={1} style={styles.buildingText}>{building.name}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Choose floor, current ${floor.name}`} onPress={onToggleFloor} style={styles.floorTrigger}><Text style={styles.floorIcon}>▱</Text><Text numberOfLines={1} style={styles.floorText}>{floor.name}</Text><Text style={styles.floorChevron}>{floorMenuOpen ? '⌃' : '⌄'}</Text></TouchableOpacity></View>
    {floorMenuOpen ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.floorChoices}>{floors.map(candidate => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: candidate.id === floor.id }} key={candidate.id} onPress={() => onFloorChange(candidate.id)} style={[styles.floorChip, candidate.id === floor.id && styles.floorChipActive]}><Text style={[styles.floorChipText, candidate.id === floor.id && styles.floorChipTextActive]}>{candidate.name || `Level ${candidate.level}`}</Text></TouchableOpacity>)}</ScrollView> : null}
    {searchFocused && rendererReady ? <ScrollView keyboardShouldPersistTaps="handled" style={styles.results}>{visibleDestinations.length ? visibleDestinations.map(destination => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Select 3D room ${destination.name}`} key={destination.id} onPress={() => onChooseDestination(destination)} style={styles.result}><View style={styles.resultDot}><Text style={styles.resultDotText}>•</Text></View><View style={styles.resultCopy}><Text numberOfLines={1} style={styles.resultTitle}>{destination.name}</Text><Text style={styles.resultMeta}>{destination.category} · {floor.name}</Text></View><Text style={styles.resultArrow}>›</Text></TouchableOpacity>) : <View style={styles.empty}><Text style={styles.emptyText}>No matching rooms in this 3D floor.</Text></View>}</ScrollView> : null}
  </View></View>
}

function WalkControls({ onMovement }: { onMovement: (direction: WalkDirection, active: boolean) => void }) {
  const control = (direction: WalkDirection, symbol: string, label: string) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPressIn={() => onMovement(direction, true)} onPressOut={() => onMovement(direction, false)} style={styles.walkButton}><Text style={styles.walkSymbol}>{symbol}</Text></TouchableOpacity>
  return <View style={styles.walkControls}><View style={styles.walkTop}>{control('forward', '↑', 'Walk forward')}</View><View style={styles.walkBottom}>{control('left', '←', 'Step left')}{control('back', '↓', 'Walk backward')}{control('right', '→', 'Step right')}</View></View>
}

function modelLoadError(cause: unknown) {
  if (cause instanceof ApiError && cause.status === 404) return 'No 3D model has been configured for this workspace and floor yet.'
  if (cause instanceof ApiError && cause.code === 'TIMEOUT') return 'The 3D model took too long to load. Please try again.'
  if (cause instanceof ApiError && cause.code === 'UNAUTHENTICATED') return 'Your session must be active before Digital Twin 3D can load.'
  return 'Digital Twin 3D could not be loaded right now. Please try again later.'
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#101722', flex: 1, overflow: 'hidden' },
  gl: { backgroundColor: '#101722', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  lookSurface: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  lookHint: { alignSelf: 'center', backgroundColor: 'rgba(15,23,42,0.68)', borderRadius: radii.pill, color: '#cbd5e1', fontSize: 10, marginTop: 108, paddingHorizontal: 10, paddingVertical: 5 },
  overlay: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  searchDock: { left: 12, maxWidth: 460, position: 'absolute', right: 12, top: 14, zIndex: 8 },
  searchCard: { backgroundColor: 'rgba(255,255,255,0.97)', borderColor: 'rgba(255,255,255,0.86)', borderRadius: 18, borderWidth: 1, elevation: 8, maxWidth: 460, overflow: 'hidden', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 16 },
  searchRow: { alignItems: 'center', flexDirection: 'row', minHeight: 54, paddingHorizontal: 12 },
  searchIcon: { color: '#246BFD', fontSize: 26, lineHeight: 28, textAlign: 'center', width: 34 },
  searchInput: { color: '#10233F', flex: 1, fontSize: 15, fontWeight: '600', minHeight: 50, paddingHorizontal: 6, paddingVertical: 0 },
  clearButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 }, clearText: { color: '#64748b', fontSize: 24 },
  contextRow: { alignItems: 'center', borderTopColor: '#e6e8ec', borderTopWidth: 1, flexDirection: 'row', gap: 8, minHeight: 40, paddingHorizontal: 12, paddingVertical: 5 },
  buildingText: { color: '#64748b', flex: 1, fontSize: 11, fontWeight: '700' },
  floorTrigger: { alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 9, flexDirection: 'row', gap: 5, minHeight: 30, paddingHorizontal: 9 }, floorIcon: { color: '#246BFD', fontSize: 14 }, floorText: { color: '#334155', fontSize: 11, fontWeight: '700' }, floorChevron: { color: '#94a3b8', fontSize: 12 },
  floorChoices: { gap: 7, paddingHorizontal: 12, paddingVertical: 9 }, floorChip: { borderColor: '#d8dce2', borderRadius: 999, borderWidth: 1, minHeight: 30, paddingHorizontal: 11, paddingVertical: 6 }, floorChipActive: { backgroundColor: '#246BFD', borderColor: '#246BFD' }, floorChipText: { color: '#334155', fontSize: 11, fontWeight: '700' }, floorChipTextActive: { color: '#fff' },
  results: { borderTopColor: '#e6e8ec', borderTopWidth: 1, maxHeight: 260 }, result: { alignItems: 'center', borderBottomColor: '#eef0f3', borderBottomWidth: 1, flexDirection: 'row', gap: 10, minHeight: 58, paddingHorizontal: 12, paddingVertical: 8 }, resultDot: { alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 }, resultDotText: { color: '#246BFD', fontSize: 22 }, resultCopy: { flex: 1 }, resultTitle: { color: '#10233F', fontSize: 13, fontWeight: '700' }, resultMeta: { color: '#7b8794', fontSize: 11, marginTop: 3 }, resultArrow: { color: '#94a3b8', fontSize: 24 }, empty: { padding: 16 }, emptyText: { color: '#7b8794', fontSize: 12, textAlign: 'center' },
  statusCard: { alignItems: 'center', alignSelf: 'center', backgroundColor: 'rgba(15,23,42,0.84)', borderRadius: 14, flexDirection: 'row', gap: 10, marginTop: 220, paddingHorizontal: 15, paddingVertical: 12 }, statusText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  errorCard: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.97)', borderColor: '#fecaca', borderRadius: 16, borderWidth: 1, marginHorizontal: 18, marginTop: 190, maxWidth: 430, padding: 18 }, errorTitle: { color: '#991b1b', fontSize: 17, fontWeight: '800' }, errorBody: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 6 }, errorActions: { flexDirection: 'row', gap: 8, marginTop: 14 }, retryButton: { backgroundColor: '#111827', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }, retryText: { color: '#fff', fontSize: 11, fontWeight: '800' }, errorBackButton: { borderColor: '#d8dce2', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 }, errorBackText: { color: '#334155', fontSize: 11, fontWeight: '800' },
  mapControls: { bottom: 18, flexDirection: 'row', gap: 8, left: 16, position: 'absolute' }, controlButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#e2e5e9', borderRadius: 13, borderWidth: 1, elevation: 5, flexDirection: 'row', gap: 7, minHeight: 44, paddingHorizontal: 12 }, controlSymbol: { color: '#246BFD', fontSize: 20, fontWeight: '800' }, controlLabel: { color: '#334155', fontSize: 11, fontWeight: '800' },
  walkControls: { bottom: 72, left: 16, position: 'absolute' }, walkTop: { alignItems: 'center', marginBottom: 5 }, walkBottom: { flexDirection: 'row', gap: 5 }, walkButton: { alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.78)', borderColor: 'rgba(255,255,255,0.18)', borderRadius: 10, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 }, walkSymbol: { color: '#fff', fontSize: 20, fontWeight: '800' },
  destinationCard: { alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 18, bottom: 16, elevation: 9, maxWidth: 420, minWidth: 320, padding: 15, position: 'absolute' }, destinationHeader: { alignItems: 'center', flexDirection: 'row', gap: 11 }, destinationIcon: { alignItems: 'center', backgroundColor: '#eaf1ff', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 }, destinationIconText: { color: '#246BFD', fontSize: 16 }, destinationCopy: { flex: 1 }, destinationEyebrow: { color: '#8b939e', fontSize: 9, fontWeight: '800', letterSpacing: 1.1 }, destinationTitle: { color: '#10233F', fontSize: 17, fontWeight: '800', marginTop: 2 }, destinationMeta: { color: '#64748b', fontSize: 11, marginTop: 3 }, destinationClose: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 }, destinationCloseText: { color: '#64748b', fontSize: 24 }, destinationActions: { flexDirection: 'row', gap: 8, marginTop: 12 }, goButton: { alignItems: 'center', backgroundColor: '#246BFD', borderRadius: 11, flex: 1, justifyContent: 'center', minHeight: 42 }, goText: { color: '#fff', fontSize: 12, fontWeight: '800' }, changeButton: { alignItems: 'center', borderColor: '#d8dce2', borderRadius: 11, borderWidth: 1, justifyContent: 'center', minHeight: 42, paddingHorizontal: 14 }, changeText: { color: '#334155', fontSize: 12, fontWeight: '700' },
})
