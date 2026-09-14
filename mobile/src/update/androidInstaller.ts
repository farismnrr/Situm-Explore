import * as Application from 'expo-application'
import * as Device from 'expo-device'
import * as FileSystem from 'expo-file-system/legacy'
import * as IntentLauncher from 'expo-intent-launcher'
import { Platform } from 'react-native'
import { isSafeAndroidUpdateUrl, type AndroidReleaseManifest } from './androidUpdate'

const FLAG_GRANT_READ_URI_PERMISSION = 1
const APK_MIME_TYPE = 'application/vnd.android.package-archive'

export type AndroidInstallStatus = {
  phase: 'downloading' | 'permission' | 'installing'
  progress?: number
}

type StatusListener = (status: AndroidInstallStatus) => void

async function ensureSideLoadingEnabled(onStatus: StatusListener) {
  if (await Device.isSideLoadingEnabledAsync()) return

  const applicationId = Application.applicationId?.trim()
  if (!applicationId) throw new Error('Android install permission could not be opened for this app.')

  onStatus({ phase: 'permission' })
  await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, {
    data: `package:${applicationId}`,
  })

  if (!await Device.isSideLoadingEnabledAsync()) {
    throw new Error('Allow Situm Explore to install unknown apps, then tap Try again.')
  }
}

export async function downloadAndInstallAndroidUpdate(release: AndroidReleaseManifest, onStatus: StatusListener) {
  if (Platform.OS !== 'android') throw new Error('Android updates are only available on Android devices.')
  if (!isSafeAndroidUpdateUrl(release.downloadUrl)) throw new Error('The Android update download URL is invalid.')
  if (!FileSystem.cacheDirectory) throw new Error('The device cache is unavailable for this update.')

  const target = `${FileSystem.cacheDirectory}situm-explore-v${release.version}-android-arm64.apk`
  await FileSystem.deleteAsync(target, { idempotent: true })

  onStatus({ phase: 'downloading', progress: 0 })
  const download = FileSystem.createDownloadResumable(
    release.downloadUrl,
    target,
    {},
    ({ totalBytesExpectedToWrite, totalBytesWritten }) => {
      const progress = totalBytesExpectedToWrite > 0
        ? Math.min(1, Math.max(0, totalBytesWritten / totalBytesExpectedToWrite))
        : undefined
      onStatus({ phase: 'downloading', progress })
    },
  )
  const result = await download.downloadAsync()
  if (!result?.uri || result.status < 200 || result.status >= 300) {
    throw new Error('The update APK could not be downloaded.')
  }

  await ensureSideLoadingEnabled(onStatus)

  onStatus({ phase: 'installing', progress: 1 })
  const contentUri = await FileSystem.getContentUriAsync(result.uri)
  await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
    data: contentUri,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
    type: APK_MIME_TYPE,
  })
}
