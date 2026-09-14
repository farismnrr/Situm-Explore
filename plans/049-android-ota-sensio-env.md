# Plan 049 — Android OTA via Sensio Env + S3

Status: active
Owner: repository implementation under user authorization
Scope: public Android OTA delivery boundary, landing-page APK download, Sensio-style email OTP registration, Sensio Env-backed shared SMTP/S3 configuration, Android release tooling/versioning
Depends on: current integrated `main`; independent of pending Plan 048 landing-page work

## Goal

Move Situm Explore Android self-update delivery off the legacy public MinIO URL and onto the production Situm origin while keeping S3 private and sourcing S3 credentials from Sensio Env.

Production API origin: `https://situm.devoutsys.com`.
Current production Android release: `0.1.0` / `versionCode 4`.
Next release: `0.1.1` / `versionCode 5`.
Required OTA path: `0.1.0 (4) -> 0.1.1 (5)`.
Package `com.situm.explore` previously shipped through `versionCode 3`, so production `0.1.0` correctly started at `versionCode 4`. Android version codes remain monotonic.

## Evidence / current blockers

- Existing mobile code implements fail-open update discovery, APK download, and Android installer handoff.
- Release tooling now generates versioned APK/checksum/manifest artifacts against the Situm production OTA routes.
- Sensio Env internal configuration can provide protected global shared SMTP and S3 values to an authorized service token without exposing them to client bundles.
- The shared S3 bucket is not anonymously readable for APK objects; publishing must not weaken its public-access policy.
- Previously collected evidence established matching production TLS, Situm Explore routing, and a healthy liveness endpoint. The production host is now observed running image tag `sha-ec9f99fb41da`; its runtime has `DATABASE_SCHEMA=public` and a configured Sensio Env service token. Preserve its current environment/schema when deploying the new source commit.
- Earlier live route checks are historical evidence only. The required `/`, `/login`, `/register`, health, landing download, manifest, and APK checks must be performed after deploying this release commit.

## Product/security contract

- No S3 credential enters the APK, browser bundle, manifest, logs, or Git.
- Situm server obtains S3 runtime values only through Sensio Env's protected internal snapshot using an externally injected service token or token file.
- S3 remains private.
- Public OTA manifest is served from Situm's production origin.
- APK download endpoint returns a short-lived signed S3 redirect; it does not expose permanent S3 credentials.
- Update discovery remains fail-open; OTA failure never blocks app login/use.
- Immutable versioned objects use create-only writes; a conflicting existing object stops publication without overwrite.
- Published release order is immutable/versioned objects first, stable manifest last.

## Phase 1 — Web runtime boundary (`web` codebase)

- [x] Add private Sensio Env runtime configuration for shared SMTP/S3 values.
- [x] Add bounded Sensio Env snapshot loader with no secret logging and small in-memory caching.
- [x] Add S3 release client using shared S3 configuration.
- [x] Add anonymous Android latest-manifest endpoint backed by private S3.
- [x] Add anonymous versioned APK download endpoint that validates the requested release and redirects to a short-lived signed S3 URL.
- [x] Add a stable anonymous `/api/mobile/android/download` endpoint and expose it from the public landing page.
- [x] Add Sensio-style email OTP registration with expiring hashed codes, resend/attempt limits, Sensio Env SMTP delivery, and DB migration.
- [x] Keep route failures sanitized and secrets server-only.
- [x] Run focused web lint/typecheck/build and local SSR route/UI checks.

## Phase 2 — Mobile/version contract (`mobile` codebase)

- [x] Default Android update manifest URL to `https://situm.devoutsys.com/api/mobile/android/latest`.
- [x] Advance Android release metadata from production `0.1.0` / code `4` to `0.1.1` / code `5`.
- [x] Update release artifact generation so manifest download URLs use the production Situm OTA endpoint rather than legacy MinIO.
- [x] Add a publisher that uploads release artifacts to private S3 using Sensio Env internal configuration; no secret values are printed or persisted.
- [x] Make immutable S3 writes conditional and fail closed on conflicting content.
- [x] Update mobile distribution documentation.
- [ ] Run focused mobile lint/typecheck and release-script checks.

## Phase 3 — Production deployment and v0.1.1 release

- [ ] Commit and push the landing-page hero change and Android `0.1.1` / versionCode `5` release source.
- [ ] Publish/deploy the exact immutable web/backend image from that commit, preserving production `DATABASE_SCHEMA` and environment files.
- [ ] Apply additive migration `0011_fine_tony_stark.sql` using the production schema already configured on the host.
- [ ] Verify production `/`, `/login`, `/register`, `/api/health/liveness`, hero actions, and anonymous Android download route.
- [ ] Build a fresh arm64 production APK with `EXPO_PUBLIC_APP_VERSION=0.1.1`, `EXPO_PUBLIC_ANDROID_VERSION_CODE=5`, `EXPO_PUBLIC_ENVIRONMENT=production`, and `EXPO_PUBLIC_API_BASE_URL=https://situm.devoutsys.com`.
- [ ] Verify package, versionName, versionCode, ABI, production API/OTA configuration, APK size, SHA-256, and generated manifest.
- [ ] Stage immutable versioned objects in private S3 without activation; stop if any existing immutable object differs.
- [ ] Verify staged checksum, size, metadata, bucket privacy, and unchanged `0.1.0` objects.
- [ ] Activate only after immutable staging and production feed/download verification; publish the stable manifest last.
- [ ] Download through the public Situm backend route and verify its SHA-256 equals the local build.
- [ ] Confirm device baseline `com.situm.explore` / `0.1.0` / code `4` and complete the actual in-app download/installer flow to `0.1.1` / code `5` without fatal/TLS/SSL/DNS errors.
- [ ] If a safe fail-open device check exists, verify OTA/network failure does not block app launch without disturbing production endpoints.

## Definition of Done

- [ ] OTA no longer depends on the legacy MinIO public URL.
- [ ] S3 credentials come from Sensio Env and remain server/operator-only.
- [ ] S3 bucket remains private.
- [ ] Production deployment uses the exact immutable image from the pushed release commit and preserves its existing database schema.
- [ ] Production pages and Android routes are reachable with valid TLS.
- [ ] Android `0.1.1` / `versionCode 5` is a fresh arm64 APK whose SHA-256 matches private S3 and the public backend download.
- [ ] The current production manifest advertises `0.1.1` / versionCode `5` and the correct immutable backend URL.
- [ ] The physical app completes a real `0.1.0` / `4` to `0.1.1` / `5` update, or the final report explicitly limits its claim to feed verification.
- [ ] No temporary test artifacts or secrets are committed.
- [ ] No PR or merge occurs.
