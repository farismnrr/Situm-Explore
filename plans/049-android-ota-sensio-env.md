# Plan 049 — Android OTA via Sensio Env + S3

Status: active
Owner: repository implementation under user authorization
Scope: public Android OTA delivery boundary, landing-page APK download, Sensio-style email OTP registration, Sensio Env-backed shared SMTP/S3 configuration, Android release tooling/versioning
Depends on: current integrated `main`; independent of pending Plan 048 landing-page work

## Goal

Move Situm Explore Android self-update delivery off the legacy public MinIO URL and onto the production Situm origin while keeping S3 private and sourcing S3 credentials from Sensio Env.

Production API origin: `https://situm.devoutsys.com`.
Android semantic version line starts at `v0.1.0`. Because package `com.situm.explore` previously shipped through Android `versionCode 3`, the first `v0.1.0` build must use `versionCode 4`; Android version codes stay monotonic even when the human semantic version line is reset.

## Evidence / current blockers

- Existing mobile code implements fail-open update discovery, APK download, and Android installer handoff.
- Release tooling now generates versioned APK/checksum/manifest artifacts against the Situm production OTA routes.
- Sensio Env internal configuration can provide protected global shared SMTP and S3 values to an authorized service token without exposing them to client bundles.
- The shared S3 bucket is not anonymously readable for APK objects; publishing must not weaken its public-access policy.
- As revalidated on 2026-09-14, `situm.devoutsys.com` now has matching TLS, serves Situm Explore, and reports healthy liveness. The deployed application is still older than this branch, however: the new OTA routes return HTTP 404 until this source and migration are deployed.
- The current agent runtime does not have a Sensio Env service token, so live SMTP/S3 acceptance cannot be claimed from local source verification alone.

## Product/security contract

- No S3 credential enters the APK, browser bundle, manifest, logs, or Git.
- Situm server obtains S3 runtime values only through Sensio Env's protected internal snapshot using an externally injected service token or token file.
- S3 remains private.
- Public OTA manifest is served from Situm's production origin.
- APK download endpoint returns a short-lived signed S3 redirect; it does not expose permanent S3 credentials.
- Update discovery remains fail-open; OTA failure never blocks app login/use.
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

- [ ] Default Android update manifest URL to `https://situm.devoutsys.com/api/mobile/android/latest`.
- [ ] Reset user-facing mobile semantic baseline to `0.1.0` while keeping Android versionCode monotonic.
- [ ] Update release artifact generation so manifest download URLs use the production Situm OTA endpoint rather than legacy MinIO.
- [ ] Add a publisher that uploads release artifacts to private S3 using Sensio Env internal configuration; no secret values are printed or persisted.
- [ ] Update mobile distribution documentation.
- [ ] Run focused mobile lint/typecheck and release-script checks.

## Phase 3 — v0.1.0 release attempt

- [ ] Build arm64 production APK with `EXPO_PUBLIC_APP_VERSION=0.1.0`, `EXPO_PUBLIC_ANDROID_VERSION_CODE=4`, `EXPO_PUBLIC_ENVIRONMENT=production`, and `EXPO_PUBLIC_API_BASE_URL=https://situm.devoutsys.com`.
- [ ] Verify checksum, arm64-only native libraries, embedded production URL, and generated manifest.
- [ ] Upload immutable release objects and aliases to private S3 through Sensio Env-backed publisher.
- [ ] Publish stable manifest last.
- [ ] Verify stored S3 metadata/checksum without exposing credentials.
- [ ] Verify production manifest/download through `https://situm.devoutsys.com` when TLS/vhost is correct; otherwise record the exact external blocker rather than claiming release acceptance.

## Definition of Done

- [ ] OTA no longer depends on the legacy MinIO public URL.
- [ ] S3 credentials come from Sensio Env and remain server/operator-only.
- [ ] S3 bucket remains private.
- [ ] Android `v0.1.0` / `versionCode 4` release artifacts are reproducible.
- [ ] Production OTA endpoint is verifiably reachable with valid TLS and serves the published release, or the branch truthfully records the external TLS/vhost blocker.
- [ ] No temporary test artifacts or secrets are committed.
- [ ] No PR/merge occurs without explicit user authorization.
