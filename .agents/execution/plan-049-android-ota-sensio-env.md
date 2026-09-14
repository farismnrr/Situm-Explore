# Execution Brief — Plan 049 Android OTA via Sensio Env + S3

Branch: `plan/049-android-ota-sensio-env`
Base: fetched `origin/main` at `9a569c5c8ca816904cca6699cdb1f27b47d17d9a`

## Authority

The user authorized Android OTA remediation/release, using the existing Sensio Env S3 configuration and production API/domain `https://situm.devoutsys.com`. Corrected release authority: the current production Android release is `0.1.0` / versionCode `4`; the next release is `0.1.1` / versionCode `5`, and the required in-app upgrade is `0.1.0 (4) -> 0.1.1 (5)`. The earlier assumption that `0.1.2` existed was incorrect. Previously collected production manifest, private S3 objects, Git history, and physical-device evidence remain authoritative; do not repeat Phase 0 unless an execution step requires a focused state check.

The user now explicitly authorized production deployment and OTA activation for `0.1.1`. Publish the exact immutable web/backend image built from the release source commit, using the existing production deployment process. Preserve the production `DATABASE_SCHEMA` exactly; do not copy the laptop-only `DATABASE_SCHEMA=situm_explore` setting into production. Do not weaken S3 privacy or TLS validation. Do not expose Sensio Env/S3 secrets.

Never reuse or rename the previous `0.1.0` APK; the `0.1.1` artifact must be freshly built.

## Execution order

Codebase-serial execution is mandatory, followed by release/deployment verification:

1. Complete focused web verification for the OTA/Sensio Env/S3 delivery boundary.
2. Complete mobile metadata/publisher changes and focused lint/typecheck.
3. Commit and push landing-hero removal plus `0.1.1` / code `5` source.
4. Publish runtime/migration images for the exact commit, migrate using the existing production schema, deploy, and verify production pages/routes.
5. Build a fresh production arm64 APK, verify it, stage private immutable S3 objects, then activate the stable manifest last.
6. Verify the public backend APK route and run the real physical in-app OTA upgrade from `0.1.0` / code `4`.

## Current production observation

The earlier TLS/vhost blocker was resolved in previously collected evidence. The production host is observed running image `sha-ec9f99fb41da`, with `DATABASE_SCHEMA=public` and its Sensio Env token configured. Preserve the runtime environment/schema during deployment. Never bypass TLS validation in the APK.

## Release identity

- current production release: `0.1.0` / Android `versionCode 4`
- next release: `0.1.1` / Android `versionCode 5`
- required OTA path: `0.1.0 (4) -> 0.1.1 (5)`
- Android package: `com.situm.explore`
- Android versionCode: `4` because historical shipped release evidence reached versionCode `3`
- environment: `production`
- API base: `https://situm.devoutsys.com`
- OTA manifest: `https://situm.devoutsys.com/api/mobile/android/latest`
- ABI: `arm64-v8a` only

## Sensio Env source

Use the protected internal snapshot contract. The current global shared scope is `berjaya-inovasi-global/shared`; the internal snapshot exposes the required S3 keys to a valid service token and keeps them out of Git/client artifacts.

Never print or persist `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, or the Sensio Env config token.
