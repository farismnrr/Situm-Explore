import type { ExpoConfig } from 'expo/config'

const environment = process.env.EXPO_PUBLIC_ENVIRONMENT || 'dev'
const scheme = environment === 'production' ? 'situm-explore' : `situm-explore-${environment}`
const universalLinkHost = process.env.EXPO_PUBLIC_UNIVERSAL_LINK_HOST?.trim()
const version = process.env.EXPO_PUBLIC_APP_VERSION || '0.1.1'
const androidVersionCode = Number(process.env.EXPO_PUBLIC_ANDROID_VERSION_CODE || '5')
const iosBuildNumber = process.env.EXPO_PUBLIC_IOS_BUILD_NUMBER || '1'
if (!Number.isSafeInteger(androidVersionCode) || androidVersionCode < 1) throw new Error('EXPO_PUBLIC_ANDROID_VERSION_CODE must be a positive integer.')

const config = {
  name: 'Situm Explore',
  slug: 'situm-explore',
  version,
  orientation: 'default',
  scheme,
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  newArchEnabled: true,
  ios: { bundleIdentifier: 'com.situm.explore', supportsTablet: true, deploymentTarget: '16.4', buildNumber: iosBuildNumber, ...(universalLinkHost ? { associatedDomains: [`applinks:${universalLinkHost}`] } : {}) },
  android: { package: 'com.situm.explore', versionCode: androidVersionCode, softwareKeyboardLayoutMode: 'resize', permissions: ['REQUEST_INSTALL_PACKAGES'], adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#111827' }, ...(universalLinkHost ? { intentFilters: [{ action: 'VIEW', autoVerify: true, category: ['BROWSABLE', 'DEFAULT'], data: [{ scheme: 'https', host: universalLinkHost, pathPrefix: '/' }] }] } : {}) },
  plugins: [
    'expo-secure-store',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 200, resizeMode: 'contain', backgroundColor: '#111827' }],
    ['expo-build-properties', { android: { minSdkVersion: 24, compileSdkVersion: 36, targetSdkVersion: 36, kotlinVersion: '2.1.20', buildArchs: ['arm64-v8a'], usePrecompiledHeaders: true }, ios: { deploymentTarget: '16.4' } }],
    './plugins/withAndroidGradlePerformance.cjs',
  ],
  extra: { environment, apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || '', universalLinkHost: universalLinkHost || '' },
}

export default config as ExpoConfig
