import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import type { SitumCartographyFloor, SitumCartographyPoi } from '../../../shared/situm-cartography'
import { colors, radii } from '../ui/theme'
import { resolveFloorDisplay } from './state'

export function NativeMapBrowseOverlay({
  activeFloorId,
  buildingId,
  buildingName,
  canNavigate,
  currentFloorLabel,
  floorMenuOpen,
  floors,
  isPhone,
  positionState,
  searchOpen,
  searchQuery,
  selectedPoi,
  showDestinationSheet,
  visibleSearchResults,
  onClearDestination,
  onEnterDigitalTwin,
  onFloorMenuToggle,
  onFloorSelect,
  onFullscreen,
  onQueryChange,
  onRecenter,
  onSearchFocus,
  onSelectPoi,
  onStartGuidance,
  onStartPositioning,
}: {
  activeFloorId: number
  buildingId: number
  buildingName: string
  canNavigate: boolean
  currentFloorLabel: string
  floorMenuOpen: boolean
  floors: SitumCartographyFloor[]
  isPhone: boolean
  positionState: string
  searchOpen: boolean
  searchQuery: string
  selectedPoi: SitumCartographyPoi | null
  showDestinationSheet: boolean
  visibleSearchResults: SitumCartographyPoi[]
  onClearDestination: () => void
  onEnterDigitalTwin: () => void
  onFloorMenuToggle: () => void
  onFloorSelect: (floorId: number) => void
  onFullscreen: () => void
  onQueryChange: (value: string) => void
  onRecenter: () => void
  onSearchFocus: () => void
  onSelectPoi: (poi: SitumCartographyPoi) => void
  onStartGuidance: () => void
  onStartPositioning: () => void
}) {
  return <>
    <SearchDock
      activeFloorId={activeFloorId}
      buildingId={buildingId}
      buildingName={buildingName}
      currentFloorLabel={currentFloorLabel}
      floorMenuOpen={floorMenuOpen}
      floors={floors}
      isPhone={isPhone}
      searchOpen={searchOpen}
      searchQuery={searchQuery}
      visibleSearchResults={visibleSearchResults}
      onClearDestination={onClearDestination}
      onFloorMenuToggle={onFloorMenuToggle}
      onFloorSelect={onFloorSelect}
      onQueryChange={onQueryChange}
      onSearchFocus={onSearchFocus}
      onSelectPoi={onSelectPoi}
    />
    <BrowseControls
      isPhone={isPhone}
      positionState={positionState}
      onEnterDigitalTwin={onEnterDigitalTwin}
      onFullscreen={onFullscreen}
      onRecenter={onRecenter}
      onStartPositioning={onStartPositioning}
    />
    {showDestinationSheet && selectedPoi ? <DestinationSheet
      buildingId={buildingId}
      canNavigate={canNavigate}
      floors={floors}
      isPhone={isPhone}
      positionState={positionState}
      selectedPoi={selectedPoi}
      onClearDestination={onClearDestination}
      onSearchFocus={onSearchFocus}
      onStartGuidance={onStartGuidance}
      onStartPositioning={onStartPositioning}
    /> : null}
  </>
}

function SearchDock({ activeFloorId, buildingId, buildingName, currentFloorLabel, floorMenuOpen, floors, isPhone, searchOpen, searchQuery, visibleSearchResults, onClearDestination, onFloorMenuToggle, onFloorSelect, onQueryChange, onSearchFocus, onSelectPoi }: {
  activeFloorId: number
  buildingId: number
  buildingName: string
  currentFloorLabel: string
  floorMenuOpen: boolean
  floors: SitumCartographyFloor[]
  isPhone: boolean
  searchOpen: boolean
  searchQuery: string
  visibleSearchResults: SitumCartographyPoi[]
  onClearDestination: () => void
  onFloorMenuToggle: () => void
  onFloorSelect: (floorId: number) => void
  onQueryChange: (value: string) => void
  onSearchFocus: () => void
  onSelectPoi: (poi: SitumCartographyPoi) => void
}) {
  return <View style={[styles.searchDock, isPhone ? styles.searchDockPhone : styles.searchDockLarge]}>
    <View style={styles.searchCard}>
      <View style={styles.searchRow}>
        <View style={styles.searchIconWrap}><Text style={styles.searchIcon}>⌕</Text></View>
        <TextInput
          accessibilityLabel="Search places"
          autoCorrect={false}
          placeholder="Where do you want to go?"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={styles.searchInput}
          value={searchQuery}
          onFocus={onSearchFocus}
          onChangeText={onQueryChange}
          onSubmitEditing={() => { if (visibleSearchResults[0]) onSelectPoi(visibleSearchResults[0]) }}
        />
        {searchQuery ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear destination search" hitSlop={8} onPress={onClearDestination} style={styles.searchClear}><Text style={styles.searchClearText}>×</Text></TouchableOpacity> : null}
      </View>
      <View style={styles.contextRow}>
        <View style={styles.contextBuilding}><Text numberOfLines={1} style={styles.contextBuildingText}>{buildingName}</Text></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Choose floor, current ${currentFloorLabel}`} onPress={onFloorMenuToggle} style={styles.floorTrigger}>
          <Text style={styles.floorTriggerIcon}>▱</Text>
          <Text numberOfLines={1} style={styles.floorTriggerText}>{currentFloorLabel}</Text>
          <Text style={styles.floorTriggerChevron}>{floorMenuOpen ? '⌃' : '⌄'}</Text>
        </TouchableOpacity>
      </View>
      {floorMenuOpen ? <ScrollView accessibilityLabel="Floor choices" contentContainerStyle={styles.floorChoices} horizontal showsHorizontalScrollIndicator={false}>
        {floors.map(floor => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Floor ${floor.name}`} accessibilityState={{ selected: floor.id === activeFloorId }} key={floor.id} onPress={() => onFloorSelect(floor.id)} style={[styles.floorChip, floor.id === activeFloorId && styles.floorChipActive]}>
          <Text style={[styles.floorChipText, floor.id === activeFloorId && styles.floorChipTextActive]}>{floor.name || `Level ${floor.level}`}</Text>
        </TouchableOpacity>)}
      </ScrollView> : null}
      {searchOpen ? <ScrollView accessibilityLabel="Place search results" keyboardShouldPersistTaps="handled" style={styles.searchResults}>
        {visibleSearchResults.length ? visibleSearchResults.map(result => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Select place ${result.name}`} key={result.id} onPress={() => onSelectPoi(result)} style={styles.searchResult}>
          <View style={styles.resultPin}><Text style={styles.resultPinText}>•</Text></View>
          <View style={styles.resultCopy}>
            <Text numberOfLines={1} style={styles.resultTitle}>{result.name}</Text>
            <Text numberOfLines={1} style={styles.resultMeta}>{result.categoryName || 'Place'}{resolveFloorDisplay(floors, result.floorId, result.buildingId) ? ` · ${resolveFloorDisplay(floors, result.floorId, result.buildingId)}` : ''}</Text>
          </View>
          <Text style={styles.resultArrow}>›</Text>
        </TouchableOpacity>) : <View style={styles.searchEmpty}><Text style={styles.searchEmptyText}>No matching places in this building.</Text></View>}
      </ScrollView> : null}
    </View>
  </View>
}

function BrowseControls({ isPhone, positionState, onEnterDigitalTwin, onFullscreen, onRecenter, onStartPositioning }: { isPhone: boolean, positionState: string, onEnterDigitalTwin: () => void, onFullscreen: () => void, onRecenter: () => void, onStartPositioning: () => void }) {
  return <View style={styles.mapControls}>
    <MapControlButton label="Enter fullscreen map" visibleLabel={isPhone ? undefined : 'Full screen'} symbol="⛶" onPress={onFullscreen} />
    {positionState === 'fresh'
      ? <MapControlButton label="Recenter on my location" visibleLabel={isPhone ? undefined : 'Recenter'} symbol="⌖" tone="primary" onPress={onRecenter} />
      : <MapControlButton label="Find my location" visibleLabel={isPhone ? undefined : (positionState === 'starting' ? 'Locating…' : 'Locate me')} symbol="⌖" disabled={positionState === 'starting'} onPress={onStartPositioning} />}
    <MapControlButton label="Open Digital Twin 3D" visibleLabel={isPhone ? undefined : 'Digital Twin 3D'} symbol="◇" onPress={onEnterDigitalTwin} />
  </View>
}

function DestinationSheet({ buildingId, canNavigate, floors, isPhone, positionState, selectedPoi, onClearDestination, onSearchFocus, onStartGuidance, onStartPositioning }: { buildingId: number, canNavigate: boolean, floors: SitumCartographyFloor[], isPhone: boolean, positionState: string, selectedPoi: SitumCartographyPoi, onClearDestination: () => void, onSearchFocus: () => void, onStartGuidance: () => void, onStartPositioning: () => void }) {
  const floorDisplay = resolveFloorDisplay(floors, selectedPoi.floorId, buildingId)
  return <View style={[styles.poiSheet, isPhone ? styles.poiSheetPhone : styles.poiSheetLarge]}>
    <View style={styles.sheetHandle} />
    <View style={styles.destinationHeader}>
      <View style={styles.destinationIcon}><Text style={styles.destinationIconText}>●</Text></View>
      <View style={styles.destinationCopy}>
        <Text style={styles.sheetEyebrow}>DESTINATION</Text>
        <Text numberOfLines={1} style={styles.sheetTitle}>{selectedPoi.name}</Text>
        <Text numberOfLines={1} style={styles.sheetMeta}>{selectedPoi.categoryName || 'Place'}{floorDisplay ? ` · ${floorDisplay}` : ''}</Text>
      </View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear destination" onPress={onClearDestination} style={styles.destinationClose}><Text style={styles.destinationCloseText}>×</Text></TouchableOpacity>
    </View>
    <View style={styles.sheetActions}>
      {canNavigate
        ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Start navigation" onPress={onStartGuidance} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Start</Text></TouchableOpacity>
        : <TouchableOpacity accessibilityRole="button" accessibilityLabel="Locate me for directions" disabled={positionState === 'starting'} onPress={onStartPositioning} style={[styles.primaryButton, positionState === 'starting' && styles.disabled]}><Text style={styles.primaryButtonText}>{positionState === 'starting' ? 'Locating…' : 'Locate me'}</Text></TouchableOpacity>}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Search another place" onPress={onSearchFocus} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Change</Text></TouchableOpacity>
    </View>
    <Text style={styles.sheetHint}>{canNavigate ? 'Route geometry is calculated from the venue path graph and drawn by this app.' : 'A fresh indoor position is required before route calculation can start.'}</Text>
  </View>
}

function MapControlButton({ label, visibleLabel, symbol, tone = 'neutral', disabled = false, onPress }: { label: string, visibleLabel?: string, symbol: string, tone?: 'neutral' | 'primary', disabled?: boolean, onPress: () => void }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.mapControlButton, tone === 'primary' && styles.mapControlButtonPrimary, disabled && styles.disabled]}><Text style={[styles.mapControlSymbol, tone === 'primary' && styles.mapControlSymbolPrimary]}>{symbol}</Text>{visibleLabel ? <Text style={[styles.mapControlLabel, tone === 'primary' && styles.mapControlLabelPrimary]}>{visibleLabel}</Text> : null}</TouchableOpacity>
}

const styles = StyleSheet.create({
  searchDock: { position: 'absolute', top: 14, zIndex: 5 },
  searchDockPhone: { left: 12, right: 12 },
  searchDockLarge: { left: 16, width: 460 },
  searchCard: { backgroundColor: 'rgba(255,255,255,0.98)', borderColor: 'rgba(255,255,255,0.86)', borderRadius: 18, borderWidth: 1, elevation: 8, overflow: 'hidden', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.12, shadowRadius: 16 },
  searchRow: { alignItems: 'center', flexDirection: 'row', minHeight: 54, paddingHorizontal: 12 },
  searchIconWrap: { alignItems: 'center', height: 34, justifyContent: 'center', width: 34 }, searchIcon: { color: colors.action, fontSize: 26, lineHeight: 28 },
  searchInput: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '600', minHeight: 50, paddingHorizontal: 6, paddingVertical: 0 }, searchClear: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 }, searchClearText: { color: colors.tertiary, fontSize: 24, lineHeight: 26 },
  contextRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 8, minHeight: 38, paddingHorizontal: 12, paddingVertical: 6 }, contextBuilding: { flex: 1 }, contextBuildingText: { color: colors.tertiary, fontSize: 11, fontWeight: '700' },
  floorTrigger: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 9, flexDirection: 'row', gap: 5, maxWidth: 180, minHeight: 30, paddingHorizontal: 9 }, floorTriggerIcon: { color: colors.action, fontSize: 14 }, floorTriggerText: { color: colors.secondary, flexShrink: 1, fontSize: 11, fontWeight: '700' }, floorTriggerChevron: { color: colors.muted, fontSize: 12 },
  floorChoices: { gap: 7, paddingBottom: 10, paddingHorizontal: 12, paddingTop: 4 }, floorChip: { borderColor: colors.strongBorder, borderRadius: radii.pill, borderWidth: 1, minHeight: 30, paddingHorizontal: 11, paddingVertical: 6 }, floorChipActive: { backgroundColor: colors.action, borderColor: colors.action }, floorChipText: { color: colors.secondary, fontSize: 11, fontWeight: '700' }, floorChipTextActive: { color: '#fff' },
  searchResults: { borderTopColor: colors.border, borderTopWidth: 1, maxHeight: 258 }, searchResult: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 10, minHeight: 58, paddingHorizontal: 12, paddingVertical: 8 }, resultPin: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 16, height: 32, justifyContent: 'center', width: 32 }, resultPinText: { color: colors.action, fontSize: 22, lineHeight: 24 }, resultCopy: { flex: 1 }, resultTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' }, resultMeta: { color: colors.muted, fontSize: 11, marginTop: 3 }, resultArrow: { color: colors.muted, fontSize: 24 }, searchEmpty: { padding: 16 }, searchEmptyText: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  mapControls: { bottom: 18, gap: 8, left: 16, position: 'absolute' }, mapControlButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.97)', borderColor: colors.border, borderRadius: 13, borderWidth: 1, elevation: 5, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 44, minWidth: 44, paddingHorizontal: 11, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8 }, mapControlButtonPrimary: { backgroundColor: colors.action, borderColor: colors.action }, mapControlSymbol: { color: colors.action, fontSize: 20, fontWeight: '800' }, mapControlSymbolPrimary: { color: '#fff' }, mapControlLabel: { color: colors.secondary, fontSize: 11, fontWeight: '800' }, mapControlLabelPrimary: { color: '#fff' },
  poiSheet: { backgroundColor: 'rgba(255,255,255,0.98)', borderColor: 'rgba(255,255,255,0.9)', borderRadius: 18, borderWidth: 1, bottom: 16, elevation: 9, padding: 15, position: 'absolute', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.15, shadowRadius: 16 }, poiSheetPhone: { left: 12, right: 12 }, poiSheetLarge: { left: 126, width: 410 }, sheetHandle: { alignSelf: 'center', backgroundColor: colors.strongBorder, borderRadius: 3, height: 4, marginBottom: 10, width: 36 },
  destinationHeader: { alignItems: 'center', flexDirection: 'row', gap: 11 }, destinationIcon: { alignItems: 'center', backgroundColor: '#eaf1ff', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 }, destinationIconText: { color: colors.action, fontSize: 16 }, destinationCopy: { flex: 1 }, destinationClose: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 }, destinationCloseText: { color: colors.tertiary, fontSize: 24 }, sheetEyebrow: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 }, sheetTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 2 }, sheetMeta: { color: colors.tertiary, fontSize: 11, marginTop: 3 }, sheetActions: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 12 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.action, borderRadius: 11, flex: 1, justifyContent: 'center', minHeight: 42, paddingHorizontal: 14 }, primaryButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' }, secondaryButton: { alignItems: 'center', borderColor: colors.strongBorder, borderRadius: 11, borderWidth: 1, justifyContent: 'center', minHeight: 42, paddingHorizontal: 14 }, secondaryButtonText: { color: colors.secondary, fontSize: 12, fontWeight: '700' }, sheetHint: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 9 }, disabled: { opacity: 0.55 },
})
