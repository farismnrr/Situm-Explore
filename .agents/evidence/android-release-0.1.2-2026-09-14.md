# Android release 0.1.2 — 2026-09-14

## Release identity

- Release branch: `release/android-0.1.2`
- Release source commit: `91e2f479392b0fc4f552686566910cdc7e5f656a`
- Package: `com.situm.explore`
- Version: `0.1.2`
- Android versionCode: `6`
- ABI: `arm64-v8a` only
- Target SDK: `36`
- Final APK: `mobile/dist/situm-explore-v0.1.2-android-arm64.apk`
- Final APK SHA-256: `14e1f840806257714600075ea2ac0351c8b376ddd8992f8a047a57e1aa1db04b`
- APK Signature Scheme v2: verified
- Signing certificate SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`
- Signing certificate continuity with installed production `0.1.1`: verified exact match

## Release validation

`mobile release` Engineering Guard passed using the verified release environment:

- repo-local JDK 21
- Android SDK `/home/farismnrr/Android/Sdk`
- Android platform 36
- build-tools 36.0.0
- NDK 27.1.12297006
- CMake 3.30.5

The final artifact was rebuilt from the committed release source and reproduced the same SHA-256 as preflight. APK inspection verified package/version/versionCode/ABI and no localhost or development backend URL was embedded.

## Publication order

1. Immutable private-S3 `0.1.2` APK/checksum/manifest objects were staged first.
2. Before feed activation, the public versioned GET route returned the exact final APK SHA while the stable feed still advertised `0.1.1` / versionCode `5`.
3. The primary physical POS was manually bridged from production `0.1.1` / versionCode `5` to the final `0.1.2` APK with `adb install -r`, because shipped `0.1.1` still contains the old updater handoff.
4. The user activated mutable APK/checksum aliases and published `situm-explore-latest-android.json` last.

## Post-activation acceptance

Live production feed:

- version: `0.1.2`
- versionCode: `6`
- download route: `https://situm.devoutsys.com/api/mobile/android/releases/0.1.2/apk`
- SHA-256: `14e1f840806257714600075ea2ac0351c8b376ddd8992f8a047a57e1aa1db04b`

Verification passed:

- stable public download SHA equals final APK SHA;
- versioned `0.1.2` public download SHA equals final APK SHA;
- physical POS reports `versionName=0.1.2`, `versionCode=6`, `primaryCpuAbi=arm64-v8a`;
- fresh app launch succeeds;
- no update modal appears when device and feed are both `0.1.2` / `6`.

## Upgrade-path note

The browser-managed updater is included in `0.1.2`. Devices still on shipped `0.1.1` require one manual bridge to `0.1.2` because `0.1.1` itself contains the old installer-handoff behavior. Future releases (`0.1.3+`) can exercise the browser-managed flow from an installed `0.1.2` baseline.

## Remaining server deployment item

The backend source includes `Content-Disposition: attachment` on signed APK redirects, but that server-side enhancement was not deployed as part of this Android release. Local GHCR push was denied by registry package permissions, and the repository image-publish workflow authenticated but failed at runtime-image publication for exact release source commit `91e2f479392b0fc4f552686566910cdc7e5f656a`.

This is not an Android release rollback condition: the existing production redirect was already proven during physical acceptance to open Chrome and download the correct APK. Keep the server-image publication as a separate deployment follow-up and do not claim the header enhancement is live until independently deployed and verified.
