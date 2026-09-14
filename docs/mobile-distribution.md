# Situm Explore Mobile distribution

This document defines the Android release, OTA, naming, publishing, and verification contract for Situm Explore Mobile.

## Installed application identity

- App name: `Situm Explore`
- Android package: `com.situm.explore`
- Expo slug: `situm-explore`
- Primary app icon: `mobile/assets/icon.png`
- Android adaptive foreground icon: `mobile/assets/adaptive-icon.png`
- Splash artwork: `mobile/assets/splash-icon.png`
- Splash background: `#111827`

`mobile/app.config.ts` is the source of truth for these values. Release builds run Expo prebuild before Gradle so the native Android project stays synchronized.

## Version policy

The current production Android release is `0.1.0` / `versionCode 4`. The next release is `0.1.1` / `versionCode 5`, with the required upgrade path `0.1.0 (4) -> 0.1.1 (5)`.

Android has a separate monotonic `versionCode`. Historical Situm Explore Android release evidence reached `versionCode 3`; `0.1.0` shipped at `versionCode 4`, and `0.1.1` increments it to `5`.

Release inputs:

```text
EXPO_PUBLIC_APP_VERSION=0.1.1
EXPO_PUBLIC_ANDROID_VERSION_CODE=5
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_API_BASE_URL=https://situm.devoutsys.com
```

Never reuse an Android version code for a different published build. Future releases increment `EXPO_PUBLIC_ANDROID_VERSION_CODE` on every Android release regardless of the semantic version change.

`EXPO_PUBLIC_ANDROID_UPDATE_MANIFEST_URL` is an optional HTTPS override for staging/lab validation. Production defaults to:

```text
https://situm.devoutsys.com/api/mobile/android/latest
```

## OTA architecture

Situm Explore uses APK self-update rather than Expo/EAS JS OTA.

```text
Android app
  -> GET https://situm.devoutsys.com/api/mobile/android/latest
  -> Situm Explore backend
  -> Sensio Env internal snapshot
  -> private S3 release objects

Android app
  -> GET https://situm.devoutsys.com/api/mobile/android/releases/<semver>/apk
  -> Situm Explore backend
  -> short-lived signed S3 redirect
  -> private APK object
```

The backend obtains S3 runtime configuration from Sensio Env. S3 access keys, the Sensio Env service token, and signing material must never enter the APK, browser bundle, public manifest, logs, or Git.

Sensio Env runtime defaults for this repository are:

```text
SENSIO_ENV_BASE_URL=http://100.99.88.53:3002
SENSIO_ENV_WORKSPACE_ID=berjaya-inovasi-global
SENSIO_ENV_PROJECT_ID=shared
NUXT_MOBILE_RELEASE_S3_PREFIX=situm-explore/android
NUXT_MOBILE_RELEASE_PUBLIC_BASE_URL=https://situm.devoutsys.com
```

Provide the protected service token through `SENSIO_ENV_CONFIG_TOKEN` or, preferably in production, `SENSIO_ENV_CONFIG_TOKEN_FILE`.

The global shared Sensio Env project owns the S3 bucket/region/access configuration. The S3 bucket remains private; Android clients do not receive permanent S3 credentials and the release process does not modify bucket public-access policy.

## Canonical Android artifact names

For `v0.1.1`:

```text
situm-explore-v0.1.1-android-arm64.apk
situm-explore-v0.1.1-android-arm64.apk.sha256
situm-explore-v0.1.1-android-arm64.json
```

Mutable aliases used only by the active feed are:

```text
situm-explore-latest-android-arm64.apk
situm-explore-latest-android-arm64.apk.sha256
situm-explore-latest-android.json
```

Versioned objects are immutable. Git SHAs remain release metadata and are not part of customer-facing APK filenames.

## Toolchain environment

The workspace uses a shared cross-project Android toolchain located outside tracked repositories at `/home/farismnrr/Services/android-toolchain/` (also symlinked at `/home/farismnrr/Documents/Projects/.toolchains/android/`).

Source the toolchain environment before running Android commands:

```bash
source /home/farismnrr/Services/android-toolchain/env.sh
```

This exports `JAVA_HOME` (JDK 21), `ANDROID_HOME`, `ANDROID_SDK_ROOT` (Android 36, NDK `27.1.12297006`), and prepends JDK, platform-tools (`adb`), and cmdline-tools to `PATH`. The build scripts also automatically detect the shared toolchain path as a fallback if environment variables are unset.

## Build the Android release

From `mobile/`:

```bash
EXPO_PUBLIC_APP_VERSION=0.1.1 \
EXPO_PUBLIC_ANDROID_VERSION_CODE=5 \
EXPO_PUBLIC_ENVIRONMENT=production \
EXPO_PUBLIC_API_BASE_URL=https://situm.devoutsys.com \
npm run build:android:release
```

The script validates the release inputs, runs Expo Android prebuild, builds `arm64-v8a` only, and writes:

```text
mobile/dist/situm-explore-v0.1.1-android-arm64.apk
mobile/dist/situm-explore-v0.1.1-android-arm64.apk.sha256
mobile/dist/situm-explore-v0.1.1-android-arm64.json
mobile/dist/situm-explore-latest-android.json
```

The generated manifest points at the immutable version route on the production Situm origin:

```text
https://situm.devoutsys.com/api/mobile/android/releases/0.1.1/apk
```

`mobile/dist/` is ignored by Git.

## Publish to private S3

Publishing is deliberately two-step.

First stage immutable versioned objects only:

```bash
SENSIO_ENV_CONFIG_TOKEN_FILE=/secure/path/to/sensio_env_config_token \
EXPO_PUBLIC_APP_VERSION=0.1.1 \
EXPO_PUBLIC_ANDROID_VERSION_CODE=5 \
npm run mobile:android:publish
```

This uploads/verifies only the immutable APK, checksum, and versioned manifest. Existing immutable objects may be reused only when their recorded checksum/size matches exactly; the publisher refuses to replace different content under the same versioned key.

After production TLS, routing, API behavior, and the staged release are verified, activate the release:

```bash
SENSIO_ENV_CONFIG_TOKEN_FILE=/secure/path/to/sensio_env_config_token \
EXPO_PUBLIC_APP_VERSION=0.1.1 \
EXPO_PUBLIC_ANDROID_VERSION_CODE=5 \
npm run mobile:android:publish -- --activate
```

Activation updates the mutable APK/checksum aliases and publishes `situm-explore-latest-android.json` **last**. This ordering prevents clients from discovering a release before its APK exists.

Do not use `--activate` while the production origin has invalid TLS, wrong virtual-host routing, or an unhealthy OTA endpoint.

## Required verification

Before staging any release:

```bash
cd mobile
npm run lint
npm run typecheck
EXPO_PUBLIC_APP_VERSION=0.1.1 \
EXPO_PUBLIC_ANDROID_VERSION_CODE=5 \
EXPO_PUBLIC_ENVIRONMENT=production \
EXPO_PUBLIC_API_BASE_URL=https://situm.devoutsys.com \
npm run build:android:release

sha256sum dist/situm-explore-v0.1.1-android-arm64.apk
unzip -l dist/situm-explore-v0.1.1-android-arm64.apk \
  | grep 'lib/.*\.so' \
  | sed -n 's#.*lib/\([^/]*\)/.*#\1#p' \
  | sort -u
```

The release APK must contain only `arm64-v8a` native libraries. Confirm that no localhost/development backend is embedded and that the application version/versionCode are the intended production values.

After staging, verify the private S3 objects with authenticated metadata/checksum reads. Do not make the bucket public just to perform validation.

Before activation, these production requests must work with normal TLS verification:

```text
GET https://situm.devoutsys.com/api/mobile/android/latest
GET https://situm.devoutsys.com/api/mobile/android/releases/0.1.1/apk
```

The manifest response must contain `version: 0.1.1`, `versionCode: 5`, the locally verified SHA-256, and the Situm production download route. The APK route should redirect to a short-lived S3 URL and the downloaded bytes must match the manifest checksum.

## Runtime update behavior

The installed Android app checks the manifest on foreground activation and again after successful login. It compares native Android `versionCode` with the feed and shows the update modal only when the feed is newer.

Update discovery is fail-open: an unavailable/malformed feed or failure to open the APK download must never block login or normal app use.

The app does not download APK bytes itself and does not invoke the Android package installer directly. The update action opens the immutable production APK route in the device browser; the backend redirects to a short-lived private-S3 URL with `Content-Disposition: attachment`, so Android/browser download handling owns the transfer. After the download finishes, the user opens the APK from Downloads to install it. Situm Explore therefore does not request `REQUEST_INSTALL_PACKAGES` for this flow.

## Migration note for older builds

Older installed builds that were compiled with the legacy MinIO manifest URL continue checking that embedded legacy URL. The new `v0.1.0` build and later use the production Situm OTA endpoint. Migrating an already-installed legacy build therefore requires either a final bridge publication on its old feed or a direct/manual installation of `v0.1.0`. Do not pretend that changing the source URL retroactively changes previously installed APKs.

## Signing and secret handling

Android signing credentials, Sensio Env service credentials, S3 write credentials, keystores, store credentials, certificates, and private provisioning material are external operator inputs. They must not be committed, copied into public runtime config, printed in logs, or bundled into APK/web assets.

The website and APK may contain only intentionally public configuration such as HTTPS API hosts, app schemes, store URLs, and OTA endpoints.
