import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import * as Application from 'expo-application'
import * as SplashScreen from 'expo-splash-screen'
import { ActivityIndicator, Animated, AppState, Easing, Image, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { Circle, Path, Svg } from 'react-native-svg'
import { ApiError } from './src/api/errors'
import { AuthSession } from './src/auth/session'
import { WorkspaceContext } from './src/workspaces/context'
import { NativeMapScreen } from './src/map/NativeMapScreen'
import { RealtimeScreen } from './src/realtime/RealtimeScreen'
import { nativeDestinationFromLink, parseNativeDeepLink, type NativeDeepLink } from './src/navigation/deep-link'
import { colors, radii } from './src/ui/theme'
import { layoutForWidth, navigationDestinations, shouldRenderTopbarBrand } from './src/ui/layout'
import { ForegroundPositioningSession } from './src/positioning/session'
import { fetchAndroidReleaseManifest, isAndroidUpdateAvailable, isSafeAndroidUpdateUrl, type AndroidReleaseManifest } from './src/update/androidUpdate'
import { loginKeyboardAvoidingBehavior, shouldUseCompactLoginLayout } from './src/loginKeyboardStrategy'

void SplashScreen.preventAutoHideAsync().catch(() => undefined)

type Tab = 'explore' | 'realtime' | 'recent' | 'settings'

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>
}

function AppContent() {
  const auth = useMemo(() => new AuthSession(), [])
  const workspaces = useMemo(() => new WorkspaceContext(auth), [auth])
  const [ready, setReady] = useState(false); const [authenticated, setAuthenticated] = useState(false)
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('explore'); const [lifecycle, setLifecycle] = useState(AppState.currentState); const [pendingLink, setPendingLink] = useState<NativeDeepLink | null>(null)
  const [launchVisible, setLaunchVisible] = useState(true)
  const [availableUpdate, setAvailableUpdate] = useState<AndroidReleaseManifest | null>(null)
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const checkForUpdate = useCallback(async () => {
    if (Platform.OS !== 'android' || __DEV__) return
    try {
      const release = await fetchAndroidReleaseManifest()
      if (isAndroidUpdateAvailable(Application.nativeBuildVersion, release)) {
        setAvailableUpdate(release)
        setUpdateDismissed(false)
      }
    } catch {
      // Update discovery must never block access when the public release endpoint is unavailable.
    }
  }, [])
  useEffect(() => { auth.restore().then(ok => { setAuthenticated(ok); setReady(true) }).catch(() => setReady(true)); const app = AppState.addEventListener('change', setLifecycle); void Linking.getInitialURL().then(url => { const link = parseNativeDeepLink(url); if (link) { setPendingLink(link); setActiveTab(nativeDestinationFromLink(link)) } }).catch(() => undefined); const linkSubscription = Linking.addEventListener('url', ({ url }) => { const link = parseNativeDeepLink(url); if (link) { setPendingLink(link); setActiveTab(nativeDestinationFromLink(link)) } }); return () => { app.remove(); linkSubscription.remove() } }, [auth])
  useEffect(() => { if (lifecycle === 'active') void checkForUpdate() }, [checkForUpdate, lifecycle])
  const onLogin = () => { setBusy(true); setError(''); auth.login(email, password).then(() => { setAuthenticated(true); void checkForUpdate() }).catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Sign in could not be completed.')).finally(() => setBusy(false)) }
  const content = !ready
    ? <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.action} /></SafeAreaView>
    : authenticated
      ? <AuthenticatedShell auth={auth} workspaces={workspaces} activeTab={activeTab} setActiveTab={setActiveTab} lifecycle={lifecycle} pendingLink={pendingLink} clearPendingLink={() => setPendingLink(null)} onLogout={() => auth.logout().then(() => { setPendingLink(null); setAuthenticated(false) })} />
      : <Login email={email} password={password} busy={busy} error={error} setEmail={setEmail} setPassword={setPassword} onSubmit={onLogin} />
  return <View style={styles.appRoot}>{content}<AndroidUpdateModal release={availableUpdate} dismissed={updateDismissed} onLater={() => setUpdateDismissed(true)} />{launchVisible ? <AnimatedLaunchSplash appReady={ready} onFinish={() => setLaunchVisible(false)} /> : null}</View>
}

function AnimatedLaunchSplash({ appReady, onFinish }: { appReady: boolean, onFinish: () => void }) {
  const [nativeReleased, setNativeReleased] = useState(false)
  const [animationDone, setAnimationDone] = useState(false)
  const didReleaseNative = useRef(false)
  const didFinish = useRef(false)
  const logoScale = useRef(new Animated.Value(1)).current
  const haloScale = useRef(new Animated.Value(0.72)).current
  const haloOpacity = useRef(new Animated.Value(0)).current
  const wordmarkOpacity = useRef(new Animated.Value(0)).current
  const wordmarkTranslate = useRef(new Animated.Value(8)).current
  const overlayOpacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (didReleaseNative.current) return
    didReleaseNative.current = true
    requestAnimationFrame(() => {
      SplashScreen.hide()
      setNativeReleased(true)
    })
  }, [])

  useEffect(() => {
    if (!nativeReleased) return
    Animated.parallel([
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.06, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(haloOpacity, { toValue: 0.24, duration: 100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(haloScale, { toValue: 1.55, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(haloOpacity, { toValue: 0, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.timing(wordmarkOpacity, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(wordmarkTranslate, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
    ]).start(({ finished }) => { if (finished) setAnimationDone(true) })
  }, [haloOpacity, haloScale, logoScale, nativeReleased, wordmarkOpacity, wordmarkTranslate])

  useEffect(() => {
    if (!appReady || !animationDone || didFinish.current) return
    didFinish.current = true
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(logoScale, { toValue: 1.08, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onFinish() })
  }, [animationDone, appReady, logoScale, onFinish, overlayOpacity])

  return <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.launchSplash, { opacity: overlayOpacity }]}><StatusBar style="light" /><Animated.View pointerEvents="none" style={[styles.launchHalo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} /><Animated.View style={{ transform: [{ scale: logoScale }] }}><Image accessibilityIgnoresInvertColors source={require('./assets/splash-icon.png')} resizeMode="contain" style={styles.launchLogo} /></Animated.View><Animated.View style={[styles.launchWordmark, { opacity: wordmarkOpacity, transform: [{ translateY: wordmarkTranslate }] }]}><Text style={styles.launchTitle}>Situm Explore</Text><Text style={styles.launchSubtitle}>INDOOR WAYFINDING</Text></Animated.View></Animated.View>
}

function Login({ email, password, busy, error, setEmail, setPassword, onSubmit }: { email: string, password: string, busy: boolean, error: string, setEmail: (v: string) => void, setPassword: (v: string) => void, onSubmit: () => void }) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true))
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false))
    return () => { show.remove(); hide.remove() }
  }, [])
  const compact = shouldUseCompactLoginLayout(keyboardVisible)
  return <SafeAreaView style={styles.safe}><StatusBar style="dark" /><KeyboardAvoidingView style={styles.loginWrap} behavior={loginKeyboardAvoidingBehavior(Platform.OS)}><ScrollView contentContainerStyle={[styles.login, compact && styles.loginKeyboard]} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled"><View style={[styles.loginMark, compact && styles.loginMarkKeyboard]}><BrandIcon /></View><Text style={styles.eyebrow}>SITUM EXPLORE</Text><Text style={[styles.loginTitle, compact && styles.loginTitleKeyboard]}>Sign in to Explore</Text>{compact ? null : <Text style={styles.loginBody}>Use your existing Situm Explore account. Your session is stored only in the device secure store.</Text>}<Text style={styles.fieldLabel}>Email</Text><TextInput accessibilityLabel="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.muted} returnKeyType="next" style={styles.input} value={email} onChangeText={setEmail} /><Text style={styles.fieldLabel}>Password</Text><View style={styles.passwordField}><TextInput accessibilityLabel="Password" autoComplete="password" placeholder="Your password" placeholderTextColor={colors.muted} secureTextEntry={!passwordVisible} style={[styles.input, styles.passwordInput]} value={password} onChangeText={setPassword} onSubmitEditing={onSubmit} returnKeyType="done" /><TouchableOpacity accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'} accessibilityState={{ selected: passwordVisible }} hitSlop={10} style={styles.passwordToggle} onPress={() => setPasswordVisible(value => !value)}><EyeIcon hidden={passwordVisible} /></TouchableOpacity></View>{error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}<TouchableOpacity accessibilityRole="button" accessibilityLabel="Sign in" accessibilityState={{ disabled: busy }} disabled={busy} style={[styles.primaryButton, busy && styles.disabled]} onPress={onSubmit}><Text style={styles.primaryText}>{busy ? 'Signing in…' : 'Sign in'}</Text></TouchableOpacity></ScrollView></KeyboardAvoidingView></SafeAreaView>
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  const c = { fill: 'none', stroke: colors.secondary, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return <Svg width={20} height={20} viewBox="0 0 24 24" accessibilityLabel={hidden ? 'Password visible' : 'Password hidden'}><Path {...c} d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><Circle {...c} cx="12" cy="12" r="2.5" />{hidden ? <Path {...c} d="m4 4 16 16" /> : null}</Svg>
}

function AndroidUpdateModal({ release, dismissed, onLater }: { release: AndroidReleaseManifest | null, dismissed: boolean, onLater: () => void }) {
  const [openingDownload, setOpeningDownload] = useState(false)
  const [downloadOpened, setDownloadOpened] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  useEffect(() => {
    setOpeningDownload(false)
    setDownloadOpened(false)
    setDownloadError('')
  }, [release?.versionCode])
  if (!release) return null
  const installedVersion = Application.nativeApplicationVersion || 'current version'
  const openDownload = async () => {
    if (openingDownload || !isSafeAndroidUpdateUrl(release.downloadUrl)) return
    setOpeningDownload(true)
    setDownloadError('')
    try {
      await Linking.openURL(release.downloadUrl)
      setDownloadOpened(true)
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'The APK download could not be opened. Please try again.')
    } finally {
      setOpeningDownload(false)
    }
  }
  return <Modal animationType="fade" transparent visible={!dismissed} onRequestClose={openingDownload ? undefined : onLater}><View style={styles.updateBackdrop}><View accessibilityViewIsModal style={styles.updateCard}><View style={styles.updateIcon}><Text style={styles.updateIconText}>↑</Text></View><Text style={styles.updateEyebrow}>APP UPDATE</Text><Text style={styles.updateTitle}>A newer Situm Explore is ready</Text><Text style={styles.updateBody}>Version {release.version} is available. You have {installedVersion}. The APK will download through your browser. After it finishes, open the APK from Downloads to install the update.</Text>{downloadOpened ? <Text accessibilityLiveRegion="polite" style={styles.updateProgress}>Download opened in your browser. Install the downloaded APK when it finishes.</Text> : null}{downloadError ? <Text accessibilityRole="alert" style={styles.updateError}>{downloadError}</Text> : null}<TouchableOpacity accessibilityRole="button" accessibilityLabel={downloadError ? 'Try update download again' : 'Download update'} accessibilityState={{ disabled: openingDownload }} disabled={openingDownload} style={[styles.primaryButton, openingDownload && styles.disabled]} onPress={() => void openDownload()}><Text style={styles.primaryText}>{openingDownload ? 'Opening download…' : downloadOpened ? 'Open download again' : downloadError ? 'Try again' : 'Download update'}</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: openingDownload }} disabled={openingDownload} style={[styles.updateLaterButton, openingDownload && styles.disabled]} onPress={onLater}><Text style={styles.updateLaterText}>Later</Text></TouchableOpacity></View></View></Modal>
}

function AuthenticatedShell({ auth, workspaces, activeTab, setActiveTab, lifecycle, pendingLink, clearPendingLink, onLogout }: { auth: AuthSession, workspaces: WorkspaceContext, activeTab: Tab, setActiveTab: (tab: Tab) => void, lifecycle: string, pendingLink: NativeDeepLink | null, clearPendingLink: () => void, onLogout: () => void }) {
  const { width, height } = useWindowDimensions(); const layout = layoutForWidth(width); const compactLandscape = layout.isRail && height <= 800; const shellPadding = compactLandscape ? 14 : layout.contentPadding; const [workspaceError, setWorkspaceError] = useState(''); const [loading, setLoading] = useState(workspaces.state === 'idle'); const [exploreFullscreen, setExploreFullscreen] = useState(false); const [navigationFocus, setNavigationFocus] = useState(false)
  const positioning = useMemo(() => new ForegroundPositioningSession(), [])
  useSyncExternalStore(workspaces.subscribe, workspaces.getSnapshot, workspaces.getSnapshot)
  useEffect(() => () => positioning.dispose(), [positioning])
  useEffect(() => { positioning.setLifecycle(lifecycle); positioning.setWorkspace(workspaces.selectedWorkspaceId) }, [lifecycle, positioning, workspaces.selectedWorkspaceId])
  useEffect(() => { if (workspaces.state === 'idle') workspaces.load().then(() => workspaces.loadConfiguration()).catch((e: unknown) => setWorkspaceError(e instanceof ApiError ? e.message : 'Workspaces are unavailable.')).finally(() => setLoading(false)) }, [workspaces])
  useEffect(() => { if (!pendingLink || workspaces.state !== 'ready') return; try { workspaces.applyDeepLink(pendingLink) } catch (e) { setWorkspaceError(e instanceof ApiError ? e.message : 'That app link is not available to this account.') } finally { clearPendingLink() } }, [clearPendingLink, pendingLink, workspaces, workspaces.state])
  const selected = workspaces.selectedWorkspace; const title = `${activeTab.charAt(0).toUpperCase()}${activeTab.slice(1)}`
  const select = (id: string) => { try { workspaces.select(id); void workspaces.loadConfiguration().catch(() => undefined) } catch (e) { setWorkspaceError(e instanceof ApiError ? e.message : 'Workspace could not be selected.') } }
  const accountLetter = (auth.user?.email || 'U').charAt(0).toUpperCase()
  useEffect(() => { if (activeTab !== 'explore') { setExploreFullscreen(false); setNavigationFocus(false) } }, [activeTab])
  const mapFocus = exploreFullscreen || navigationFocus
  const screen = loading ? <ActivityIndicator color={colors.action} /> : workspaces.state === 'error' ? <StateCard title="Workspaces unavailable" body={workspaceError || 'Check your connection and try again.'} action={() => void workspaces.load()} /> : workspaces.state === 'empty' ? <StateCard title="No workspaces yet" body="Create your first workspace in Situm Explore web to continue." /> : <>{workspaceError ? <StateCard title="Workspace notice" body={workspaceError} /> : null}{activeTab === 'explore' ? <NativeMapScreen key={workspaces.selectedWorkspaceId || 'no-workspace'} workspaces={workspaces} lifecycle={lifecycle} positioning={positioning} layout={layout.mode} fullscreen={exploreFullscreen} onFullscreenChange={setExploreFullscreen} onNavigationFocusChange={setNavigationFocus} /> : activeTab === 'realtime' ? <RealtimeScreen key={workspaces.selectedWorkspaceId || 'no-workspace'} workspaces={workspaces} lifecycle={lifecycle} positioning={positioning} layout={layout.mode} /> : activeTab === 'recent' ? <RecentScreen /> : <SettingsScreen auth={auth} workspaces={workspaces} onSelect={select} onLogout={() => { positioning.stop('logout'); onLogout() }} />}</>

  return <SafeAreaView style={[styles.safe, mapFocus && styles.exploreFullscreen]}><StatusBar hidden={mapFocus} style="dark" /><View style={styles.shell}>{layout.isRail ? <View style={[styles.rail, compactLandscape && styles.railCompact, mapFocus && styles.hidden, { width: layout.railWidth }]}><Brand compact={!layout.isWide} /><NavItems compact={!layout.isWide} activeTab={activeTab} setActiveTab={setActiveTab} /><View style={styles.railAccount}><Text style={styles.accountInitial}>{accountLetter}</Text>{layout.isWide ? <View><Text style={styles.accountName}>{auth.user?.email || 'Account'}</Text><Text style={styles.accountMuted}>Signed in</Text></View> : null}</View></View> : null}<View style={styles.main}><View style={[styles.topbar, compactLandscape && styles.topbarCompact, mapFocus && styles.hidden, { paddingHorizontal: shellPadding }]}>{shouldRenderTopbarBrand(layout.isRail) ? <Brand compact /> : null}<Text numberOfLines={1} style={styles.crumb}>{selected?.name || 'Workspace'} <Text style={styles.crumbStrong}>/ {title}</Text></Text><View style={styles.flex} />{layout.isWide && workspaces.configuration?.configured ? <Pill text="Workspace ready" tone="success" /> : null}{lifecycle !== 'active' ? <Text style={styles.lifecycle}>Paused</Text> : null}</View><View style={[styles.content, mapFocus ? styles.contentFullscreen : { padding: shellPadding, paddingBottom: layout.isPhone ? 92 : shellPadding, maxWidth: layout.isVeryWide ? undefined : 1480 }]}>{screen}</View>{!layout.isRail ? <View style={[styles.bottom, mapFocus && styles.hidden]}><NavItems bottom activeTab={activeTab} setActiveTab={setActiveTab} /></View> : null}</View></View></SafeAreaView>
}

function RecentScreen() { return <ScrollView contentContainerStyle={styles.destination}><Text style={styles.eyebrow}>ACTIVITY</Text><Text style={styles.pageTitle}>Recent</Text><Text style={styles.subtitle}>A quiet place for your latest Explore activity.</Text><View style={styles.emptyCard}><Text style={styles.emptyIcon}>↺</Text><Text style={styles.cardTitle}>No recent activity</Text><Text style={styles.body}>Recent activity is not available from the current product data contract. Your workspace and location data remain unchanged.</Text></View></ScrollView> }
function SettingsScreen({ auth, workspaces, onSelect, onLogout }: { auth: AuthSession, workspaces: WorkspaceContext, onSelect: (id: string) => void, onLogout: () => void }) { return <ScrollView contentContainerStyle={styles.destination}><Text style={styles.eyebrow}>ACCOUNT</Text><Text style={styles.pageTitle}>Settings</Text><Text style={styles.subtitle}>Manage your workspace context and session.</Text><View style={styles.card}><Text style={styles.cardTitle}>Workspace</Text><Text style={styles.body}>The selected workspace controls the cartography, positioning authority and reported positions you can access.</Text><View style={styles.choiceWrap}>{workspaces.workspaces.map(workspace => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: workspace.id === workspaces.selectedWorkspaceId }} key={workspace.id} onPress={() => onSelect(workspace.id)} style={[styles.choice, workspace.id === workspaces.selectedWorkspaceId && styles.choiceActive]}><Text style={[styles.choiceText, workspace.id === workspaces.selectedWorkspaceId && styles.choiceTextActive]}>{workspace.name}</Text></TouchableOpacity>)}</View></View><View style={styles.card}><SettingRow label="Signed-in account" value={auth.user?.email || 'Account unavailable'} /><SettingRow label="Location access" value="Requested only when you start indoor positioning" /><SettingRow label="Background location" value="Not requested" /></View><TouchableOpacity accessibilityRole="button" style={styles.dangerButton} onPress={onLogout}><Text style={styles.dangerText}>Sign out</Text></TouchableOpacity></ScrollView> }
function SettingRow({ label, value }: { label: string, value: string }) { return <View style={styles.settingRow}><Text style={styles.settingLabel}>{label}</Text><Text style={styles.settingValue}>{value}</Text></View> }
function StateCard({ title, body, action }: { title: string, body: string, action?: () => void }) { return <View style={styles.card}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.body}>{body}</Text>{action ? <TouchableOpacity style={styles.primaryButton} onPress={action}><Text style={styles.primaryText}>Try again</Text></TouchableOpacity> : null}</View> }
function Pill({ text, tone = 'neutral' }: { text: string, tone?: 'neutral' | 'success' }) { return <View style={[styles.pill, tone === 'success' && styles.pillSuccess]}><View style={[styles.pillDot, tone === 'success' && styles.pillDotSuccess]} /><Text style={styles.pillText}>{text}</Text></View> }
function Brand({ compact = false }: { compact?: boolean }) { return <View style={styles.brand}><View style={styles.brandMark}><BrandIcon /></View>{compact ? null : <Text style={styles.brandText}>Situm Explore</Text>}</View> }
function BrandIcon() { return <Svg width={18} height={18} viewBox="0 0 24 24" accessibilityLabel="Situm Explore"><Path d="M21 3 3 10.5l7.5 3L14 21 21 3Z" fill="#fff" /></Svg> }
type IconName = Tab
function Icon({ name, size = 18 }: { name: IconName, size?: number }) { const c = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }; if (name === 'explore') return <Svg width={size} height={size} viewBox="0 0 24 24"><Path {...c} d="M12 2a10 10 0 1 0 10 10M16 8l-4 8-4-4 8-4Z" /></Svg>; if (name === 'realtime') return <Svg width={size} height={size} viewBox="0 0 24 24"><Path {...c} d="M4.9 19.1a10 10 0 0 1 0-14.2M7.8 16.2a6 6 0 0 1 0-8.4M16.2 7.8a6 6 0 0 1 0 8.4M19.1 4.9a10 10 0 0 1 0 14.2" /><Circle {...c} cx="12" cy="12" r="2" /></Svg>; if (name === 'recent') return <Svg width={size} height={size} viewBox="0 0 24 24"><Path {...c} d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2" /></Svg>; return <Svg width={size} height={size} viewBox="0 0 24 24"><Circle {...c} cx="12" cy="12" r="3" /><Path {...c} d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.95 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3v-4h.08A1.7 1.7 0 0 0 4.6 8.95a1.7 1.7 0 0 0-.34-1.88L4.2 7.01l2.83-2.83.06.06A1.7 1.7 0 0 0 8.97 4.6 1.7 1.7 0 0 0 10 3.04V3h4v.08a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.96 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></Svg> }
function NavItems({ activeTab, setActiveTab, compact = false, bottom = false }: { activeTab: Tab, setActiveTab: (tab: Tab) => void, compact?: boolean, bottom?: boolean }) { return <View style={[styles.nav, bottom && styles.navBottom]}>{navigationDestinations.map(label => { const tab = label.toLowerCase() as Tab; return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: activeTab === tab }} key={tab} style={[styles.navItem, bottom && styles.navItemBottom, activeTab === tab && styles.navActive]} onPress={() => setActiveTab(tab)}><Icon name={tab} /><Text style={[styles.navText, compact && styles.navTextCompact, activeTab === tab && styles.navTextActive]}>{compact ? '' : label}</Text></TouchableOpacity> })}</View> }

const styles = StyleSheet.create({ appRoot: { flex: 1 }, launchSplash: { alignItems: 'center', backgroundColor: '#111827', bottom: 0, justifyContent: 'center', left: 0, position: 'absolute', right: 0, top: 0, zIndex: 999 }, launchHalo: { backgroundColor: '#246BFD', borderRadius: 96, height: 192, position: 'absolute', width: 192 }, launchLogo: { height: 200, width: 200 }, launchWordmark: { alignItems: 'center', marginTop: -34 }, launchTitle: { color: '#ffffff', fontSize: 22, fontWeight: '800', letterSpacing: -0.4 }, launchSubtitle: { color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 2.1, marginTop: 6 }, safe: { flex: 1, backgroundColor: colors.background }, exploreFullscreen: { backgroundColor: '#dfe5e9', flex: 1 }, hidden: { display: 'none' }, contentFullscreen: { maxWidth: undefined, padding: 0 }, shell: { flex: 1, flexDirection: 'row' }, rail: { backgroundColor: colors.surface, borderRightColor: colors.border, borderRightWidth: 1, padding: 16 }, railCompact: { paddingHorizontal: 10, paddingVertical: 12 }, main: { flex: 1 }, topbar: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.96)', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 14, minHeight: 64 }, topbarCompact: { minHeight: 52 }, content: { alignSelf: 'center', width: '100%', flex: 1 }, brand: { alignItems: 'center', flexDirection: 'row', gap: 9 }, brandMark: { alignItems: 'center', backgroundColor: colors.action, borderRadius: 10, height: 36, justifyContent: 'center', width: 36 }, brandText: { color: colors.ink, fontSize: 14, fontWeight: '700' }, crumb: { color: colors.muted, flexShrink: 1, fontSize: 13 }, crumbStrong: { color: colors.ink, fontWeight: '700' }, flex: { flex: 1 }, lifecycle: { color: colors.tertiary, fontSize: 11, fontWeight: '700' }, nav: { gap: 4, marginTop: 28 }, navBottom: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 0 }, navItem: { alignItems: 'center', borderRadius: radii.control, flexDirection: 'row', gap: 10, minHeight: 44, paddingHorizontal: 10 }, navItemBottom: { flex: 1, flexDirection: 'column', gap: 3, minHeight: 52, paddingHorizontal: 3 }, navActive: { backgroundColor: '#eef0f2' }, navText: { color: colors.tertiary, fontSize: 12, fontWeight: '600' }, navTextActive: { color: colors.action }, navTextCompact: { fontSize: 0 }, railAccount: { alignItems: 'center', flexDirection: 'row', gap: 9, marginTop: 'auto', paddingTop: 20 }, accountInitial: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 18, color: colors.action, fontSize: 14, fontWeight: '800', height: 36, paddingTop: 8, textAlign: 'center', width: 36 }, accountName: { color: colors.ink, fontSize: 11, maxWidth: 150 }, accountMuted: { color: colors.muted, fontSize: 10, marginTop: 2 }, bottom: { backgroundColor: 'rgba(255,255,255,0.96)', borderColor: colors.border, borderRadius: 14, borderWidth: 1, bottom: 10, left: 10, padding: 5, position: 'absolute', right: 10 }, eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }, pageTitle: { color: colors.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, marginTop: 5 }, subtitle: { color: colors.tertiary, fontSize: 13, lineHeight: 20, marginTop: 6 }, destination: { paddingBottom: 30 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.panel, borderWidth: 1, marginTop: 14, padding: 18 }, cardTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 4 }, body: { color: colors.secondary, fontSize: 14, lineHeight: 21, marginTop: 9 }, emptyCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.panel, borderWidth: 1, marginTop: 22, padding: 30 }, emptyIcon: { color: colors.muted, fontSize: 28, marginBottom: 8 }, settingRow: { borderTopColor: colors.border, borderTopWidth: 1, paddingVertical: 13 }, settingLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' }, settingValue: { color: colors.ink, fontSize: 14, lineHeight: 20, marginTop: 4 }, choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }, choice: { borderColor: colors.strongBorder, borderRadius: radii.control, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9 }, choiceActive: { backgroundColor: colors.action, borderColor: colors.action }, choiceText: { color: colors.secondary, fontSize: 12 }, choiceTextActive: { color: '#fff', fontWeight: '700' }, primaryButton: { alignItems: 'center', backgroundColor: colors.action, borderRadius: radii.control, justifyContent: 'center', minHeight: 46, marginTop: 16, paddingHorizontal: 15 }, primaryText: { color: '#fff', fontSize: 13, fontWeight: '700' }, secondaryButton: { alignItems: 'center', borderColor: colors.strongBorder, borderRadius: radii.control, borderWidth: 1, justifyContent: 'center', minHeight: 46, marginTop: 16 }, secondaryText: { color: colors.action, fontSize: 13, fontWeight: '700' }, dangerButton: { alignItems: 'center', backgroundColor: '#fff1f2', borderColor: '#fecdd3', borderRadius: radii.control, borderWidth: 1, justifyContent: 'center', minHeight: 46, marginTop: 16 }, dangerText: { color: '#b91c1c', fontSize: 13, fontWeight: '800' }, pill: { alignItems: 'center', backgroundColor: colors.soft, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 6 }, pillSuccess: { backgroundColor: colors.accentSoft, borderColor: '#c6e6d3' }, pillDot: { backgroundColor: colors.muted, borderRadius: 4, height: 7, width: 7 }, pillDotSuccess: { backgroundColor: colors.accent }, pillText: { color: colors.secondary, fontSize: 10, fontWeight: '700' }, loginWrap: { flex: 1 }, login: { alignSelf: 'center', flexGrow: 1, justifyContent: 'center', maxWidth: 560, padding: 24, width: '100%' }, loginKeyboard: { justifyContent: 'flex-start', paddingBottom: 24, paddingTop: 16 }, loginMark: { alignItems: 'center', backgroundColor: colors.action, borderRadius: 10, height: 42, justifyContent: 'center', marginBottom: 24, width: 42 }, loginMarkKeyboard: { height: 36, marginBottom: 12, width: 36 }, loginTitle: { color: colors.ink, fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 8 }, loginTitleKeyboard: { fontSize: 26, letterSpacing: -0.6, marginTop: 5 }, loginBody: { color: colors.secondary, fontSize: 15, lineHeight: 23, marginTop: 12 }, fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 18 }, input: { backgroundColor: colors.surface, borderColor: colors.strongBorder, borderRadius: radii.control, borderWidth: 1, color: colors.ink, fontSize: 15, marginTop: 7, minHeight: 48, paddingHorizontal: 13 }, passwordField: { position: 'relative' }, passwordInput: { paddingRight: 52 }, passwordToggle: { alignItems: 'center', bottom: 0, justifyContent: 'center', position: 'absolute', right: 3, top: 7, width: 44 }, error: { color: colors.danger, fontSize: 13, marginTop: 10 }, disabled: { opacity: 0.6 }, updateBackdrop: { alignItems: 'center', backgroundColor: 'rgba(17,24,39,0.56)', flex: 1, justifyContent: 'center', padding: 24 }, updateCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.panel, borderWidth: 1, maxWidth: 440, padding: 22, width: '100%' }, updateIcon: { alignItems: 'center', backgroundColor: colors.soft, borderRadius: 18, height: 36, justifyContent: 'center', marginBottom: 16, width: 36 }, updateIconText: { color: colors.action, fontSize: 20, fontWeight: '800' }, updateEyebrow: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }, updateTitle: { color: colors.ink, fontSize: 23, fontWeight: '800', letterSpacing: -0.5, marginTop: 6 }, updateBody: { color: colors.secondary, fontSize: 14, lineHeight: 21, marginTop: 10 }, updateProgress: { color: colors.action, fontSize: 13, fontWeight: '700', marginTop: 12 }, updateError: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 12 }, updateLaterButton: { alignItems: 'center', justifyContent: 'center', minHeight: 42, marginTop: 6 }, updateLaterText: { color: colors.secondary, fontSize: 13, fontWeight: '700' } })
