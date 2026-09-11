# Decisions

This file contains **currently active durable decisions**. Completed execution history belongs in plans/session evidence, not as competing active instructions.

## Repository-native agent context

- Root `AGENTS.md` stays concise and routes persistent context into `.agents/`.
- `.agents/state.md` owns current focus, blockers, branch, and next action; it may explicitly state that no implementation plan is active.
- Session logs and completed plans are historical evidence and may become stale.
- Never persist credentials, API keys, passwords, tokens, session cookies, encryption-key values, or unnecessary sensitive payloads.

Status: active.

## Closure-only engineering governance (2026-09-02)

- Situm Explore adopts a Sensio-style component governance model with two explicit codebases: `web` and `mobile`.
- Engineering Guard and maintainability are closure-oriented/manual gates, not routine implementation-loop commands. During implementation/trial-error, use focused direct checks and do not require every quality surface to pass.
- Product implementation and closure are codebase-serial: only one of `web` or `mobile` is actively implemented/verified at a time; cross-codebase contracts may be traced end to end, but edits and governance execution stay serial. For multi-codebase work, default to `web -> mobile` unless the active plan records a concrete reason otherwise.
- At explicit closure, finish changed codebases serially; run the appropriate Engineering Guard mode and then the maintainability ratchet exactly once per changed codebase before requested integration/branch closure.
- `mobile full` must not perform an Android native release build. Android packaging belongs only to explicit `mobile release`, with the existing arm64/public-HTTPS release boundary.
- Do not wire Engineering Guard or maintainability into pre-commit, pre-push, package scripts, Make targets, CI, or hidden/background hooks without a future explicit user policy change.
- Agent governance belongs in `.agents/scripts/`; existing root/mobile product operational scripts keep their current ownership.

Source: user-stated on 2026-09-02, modeled after the Sensio workspace governance lifecycle.
Status: active durable repository policy.

## Repository testing policy (2026-09-02)

- Persistent unit tests are not allowed in the repository. Existing repo-authored unit/regression test suites and their package scripts were intentionally removed.
- Do not add, restore, or commit unit-test files, fixtures, snapshots, coverage harnesses, or test frameworks. Renaming a unit regression check does not make it acceptable as a persistent artifact.
- E2E, white-box, and black-box checks may be created when needed for a task, but only temporarily. Prefer `/tmp` or the ignored `.tmp-tests/` directory and delete every temporary test artifact before staging, commit, push, PR handoff, or closeout.
- Durable validation should use lint, typecheck, build, migration/static inspection, production/runtime/browser/device acceptance, bounded logs/screenshots, and other evidence appropriate to the change.
- Historical test results in plans/evidence remain truthful historical evidence only and do not authorize restoring those suites.

Source: user-stated on 2026-09-02.
Status: active durable repository policy.

## Situm two-key credential boundary

- The current workspace credential model has exactly two user-managed Situm keys: **Only Read** and **Read & Write**.
- Only Read is verified as `READ_ONLY`, encrypted at rest, used by server read paths, and may be issued through authenticated owner-scoped endpoints to native positioning or a separately verified direct Viewer caller. The app-owned browser Map itself consumes server-mediated cartography and does not receive the raw key.
- Read & Write is verified as `READ_WRITE`, encrypted at rest, and remains server-only; it must never be returned to browser/mobile clients or embedded in client artifacts.
- Either key may be configured independently. A replacement must match the workspace Situm organization and an omitted credential is preserved.
- Native positioning continues to request a credential from Nitro and receives Only Read; the dedicated Positioning-key storage/configuration model is superseded.
- Remote native Realtime reads remain server-mediated.

Status: active durable security/runtime boundary; supersedes the prior three-key Viewer + Positioning model.

## Viewer authentication decision

- Viewer uses the workspace Only Read API key, owner-scoped and verified `READ_ONLY` + organization match server-side before being intentionally issued to the authenticated browser for Situm's documented direct-api-key Viewer flow.
- Read & Write remains server-only.
- The prior JWT/postMessage flow is historical evidence, not the current model.
- No temporary credential or generated JWT may be persisted in repository files, logs, traces, session evidence, or browser storage.

Status: active security boundary; Viewer authentication is integrated.

## Temporary Situm smoke-key acceptance policy (2026-08-14)

- The user explicitly superseded the earlier immediate-revocation reminder: temporary read-only and read-write smoke keys remain intentionally active until all Plan 025 acceptance is passing.
- They may be reused only for bounded local acceptance, must remain hidden, and must never be persisted in repository files, session evidence, logs, traces, browser storage, or Git history.
- Do not remind the user to revoke them while remediation/retest remains incomplete. After final Plan 025 PASS, remind the user to revoke/delete both keys.

Status: historical acceptance policy. Plan 025 is complete; do not reuse any temporary smoke credential in future work without fresh explicit authorization, and never persist its value.

## Full-stack Nuxt backend/web architecture

- The existing Nuxt 4 application with Nitro server routes remains the single web application and application backend for Situm Explore.
- Plans 028–035 established a React Native companion **client**, not a second backend/service or separate application authority.
- Use Nuxt UI, `nuxt-auth-utils`, PostgreSQL/Drizzle in the application-owned `situm_explore` schema, and the existing ClickHouse analytics integration for the web/backend runtime.
- Keep `app/`, `server/`, and genuinely shared `shared/` boundaries Nuxt-native; share contracts with mobile only when they are genuinely runtime-neutral.
- KISS is the default tie-breaker. Do not add generic repositories/services, DI, global stores, event buses, caches, workers, or a second backend without concrete need.

Status: active.

## Web vs native Situm boundary

- The Nuxt web product remains the operations/admin/exploration/analytics client; Nitro remains the single application backend.
- Plans 028–035 established a separate React Native companion client rather than turning the Nuxt application into a hybrid/mobile wrapper.
- Device indoor positioning, sensor/permission handling, handset blue-dot positioning, mobile navigation/rerouting, and the product's mobile Realtime experience belong to the native companion roadmap.
- Web Explore uses an app-owned responsive 2D-primary map across desktop, tablet, and phone-sized browser layouts, with Digital Twin 3D as an explicit opt-in; native handoff remains the action for sensor-backed positioning/navigation rather than a small-screen gate.
- Web Realtime intentionally hands off to native on desktop/tablet/phone. This is a product policy, not a claim that Situm web APIs are technically incapable of realtime reads.
- Situm-domain UI without a truthful owner is removed or left unresolved rather than faked.

Status: active product boundary. Plans 028–035 are closed/integrated; no native roadmap plan is currently active.

### App-owned 2D-primary web Explore + explicit Digital Twin 3D (2026-09-10)

- Plan 045 supersedes Plan 044's 3D-only product direction: the primary `/app/map` experience is the app-owned 2D floorplan renderer over authenticated workspace cartography.
- Digital Twin 3D is explicit opt-in, lazy-mounts the Three.js/WebGL walkthrough, and preserves active building/floor context when switching modes. Default 2D must not initialize WebGL or request a GLB.
- The 3D initial/reset camera uses one deterministic canonical floor-view contract shared by LT1 and LT2. Semantic destinations remain search/travel targets and never define model orientation.
- Floor-scoped GLB assets remain authenticated workspace resources and the renderer receives no Situm credential. An explicitly requested 3D failure remains an explicit 3D error; the app does not silently fall back to 2D.
- 2D POIs and 3D semantic-room destinations are separate authorities; selection is not silently carried across modes through fuzzy name matching.
- Sensor-backed blue-dot positioning, heading/accuracy, ETA, rerouting, arrival, and turn-by-turn guidance remain native-owned unless a future browser runtime source is proven.

Source: explicit user direction and Plan 045 on 2026-09-10.
Status: active; supersedes the Plan 044 3D-only web Explore direction while preserving native ownership of sensor-backed positioning/navigation.

## Native companion technology and credential direction (Plans 028–035)

- Target stack: React Native + Expo development builds + `@situm/react-native`, subject to Plan 028 freezing the exact supported dependency/platform matrix from current evidence.
- Expo Go is not the runtime target for Situm native code; native development builds are required by the current official integration model.
- Mobile reuses the same application users/workspaces and Nitro authorization boundary; no second backend or mobile-only identity database.
- The workspace Read & Write Situm credential remains server-only and must never be embedded, returned, or persisted in the mobile app.
- Plan 028 must choose the least-privilege mobile Situm auth contract from evidence: prefer a proven short-lived token if the current React Native wrapper exposes it; otherwise use a dedicated Positioning-permission workspace credential, encrypted server-side and handled with approved OS secure storage when persistence is required.
- Read-only Realtime authority should remain server-mediated unless the native product requirement and current SDK contract prove a narrower safe direct path.
- Deep links may carry only non-secret navigation context. Application sessions, Situm credentials and tokens must never be placed in URLs/QR codes.

Status: active durable native technology/security direction. The roadmap execution is closed through Plan 035/PR #32.

### Plan 028 Phase 1 native build matrix (2026-08-17)

- Freeze Expo 57.0.13, React Native 0.86.2, React 19.2.3, `@situm/react-native` 3.19.2, and `react-native-webview` 13.16.1 for the evidence track.
- Freeze Android min/compile/target SDK 24/36/36, JDK 21.0.10, Kotlin 2.1.20, and Gradle wrapper 9.3.1. Android compilation under Expo SDK 57 / React Native 0.86 New Architecture is proven by a disposable `assembleDebug`; this is not a claim of full wrapper New Architecture compatibility.
- The Situm package's Android Gradle module supplies its own Situm Maven repository sufficiently for the clean proof; do not add an app-owned config plugin or patch unless later evidence requires it.
- Use a standalone future `mobile/` package rather than npm workspaces. Plan 029 owns production project creation.
- Effective iOS app baseline is 16.4 with Xcode 26.4+; wrapper iOS dependency is SitumSDK 3.41.0 through CocoaPods. Linux source/package evidence is available, but iOS compile/runtime remain macOS/device-gated.

Status: historical Plan 028 evidence; the frozen compatibility selections remain the current baseline unless future proof explicitly supersedes them.

### Plan 028 Phase 2 wrapper capability boundary (2026-08-17)

- The installed 3.19.2 wrapper source proves `SitumProvider`, WebView-backed `MapView`, building/floor/POI reads and selection, positioning/status/error callbacks, navigation, permission user-helper, generic `requestRealTimeUpdates`, and Share Live Location method surfaces.
- Generic realtime returns `RealTimeData.locations` with `Location` fields such as position/building/floor and accuracy; it does not provide a public MapView remote-marker/focus API. Native Realtime must use a truthful list/detail fallback unless a separate proven overlay path is found.
- Building selection has no public imperative selector; downstream code must own MapView lifecycle/remount and stale-state clearing. Background location is not requested by default; Android foreground service and iOS authorization differences require later device proof.
- The 3.19.2 npm tarball omits the `lib/` files referenced by its package `types`/`module` fields. Android/Metro source integration works, but Plan 029 must recheck TypeScript package resolution before selecting a non-speculative workaround.

Status: historical Plan 028 capability evidence; later Plans 029–035 supplied the implemented/runtime decisions recorded below.

### Plan 028 Phase 3 Situm mobile auth boundary (2026-08-17)

- Native v1 uses a dedicated workspace Situm Positioning API key, encrypted at rest server-side and issued only after the authenticated app session proves workspace ownership. It is separate from the server-only Read & Write primary and browser Read-only Viewer key.
- Read-only Realtime and broad GET operations remain server-mediated; the Positioning key is not widened for them.
- JWT support in the wrapper is source-proven but unselected because no complete issuer/claims/lifetime/refresh/revocation contract is proven for Situm Explore. Revisit only with current evidence.

Status: historical Plan 028 auth evidence; its dedicated Positioning-key decision is superseded by the current two-key Only Read + Read & Write boundary. Server-mediated Realtime remains active.

### Plan 028 Phase 4 application session boundary (2026-08-17)

- Native uses the same `nuxt-auth-utils` sealed PostgreSQL-user session through an `x-nuxt-session` header. Plan 029 must add a mobile login response that issues this opaque sealed value; it is not a second identity or JWT system.
- Freeze a 7-day mobile session maximum age, OS secure storage later selected by Phase 5, explicit server logout, and no credential/token values in URLs or logs. Cookie-only React Native persistence is not proven.
- Existing `requireUserSession` ownership checks remain authoritative for every native request; client-provided user/workspace identity is never trusted.

Status: historical Plan 028 session evidence; the later Plan 029 implementation is the active runtime contract.

### Plan 028 Phase 5 secure storage and distribution (2026-08-17)

- Use `expo-secure-store` `~15.0.x` (registry version inspected: 15.0.8) for the sealed application session and any future Situm Positioning material. Treat both as bearer-equivalent authentication secrets; never place them in URLs, deep links, QR codes, logs, analytics, crash metadata, AsyncStorage or plaintext persistence.
- Freeze Android/iOS identity as `com.situm.explore`; custom schemes are `situm-explore-dev://`, `situm-explore-staging://`, and `situm-explore://`. Deep-link context is limited to untrusted `workspace`, `building`, and `feature` hints for `/map` or `/realtime`, followed by authenticated re-authorization.
- Own local Expo development builds and Gradle Android debug/direct-internal artifacts. iOS compilation/device/archive and all signing/store delivery are macOS/Apple-account gates. Do not select EAS without new evidence; keep all signing material external/ignored.

Status: historical Plan 028 distribution evidence; later PR #32 added the current direct Android APK distribution path. HTTPS association/store delivery remain external gates.

### Plan 029 Expo 57 dependency authority (2026-08-17)

- Superseding decision: the Plan 029 Expo 57 mobile app uses `expo-secure-store` `~57.0.1` as the only approved persistent storage boundary for bearer-equivalent session/Situm material, `expo-status-bar` `~57.0.1`, and TypeScript `~6.0.3`. This is based on the actual Expo 57 package compatibility evidence and validation performed in the real `mobile/` package.
- The earlier Plan 028 `expo-secure-store` `~15.0.x` decision remains historical evidence for that spike and must not be treated as the current Plan 029 dependency authority.

Status: durable Plan 029 dependency decision; no production credential persistence outside SecureStore.

### Plan 028 Phase 6 readiness gate (2026-08-17)

- Plan 028 is complete as an evidence spike. Plan 029 implementation is active: the published wrapper TypeScript `lib/` omission was rechecked in the real package and handled through its documented source entry with a narrow mobile TypeScript path; the mobile session response now uses the same sealed h3 value over `x-nuxt-session`, seven-day expiry, and a server-side user session-version revocation check. Device/iOS/release gates remain explicit.
- The approved native reference remains authoritative for presentation; capability evidence overrides any depicted interaction. Remote-position map focus is unproven and gets a list/detail fallback. Background location is not default, Realtime identity/status semantics remain backend-truth-bound, and no fake capability is permitted.

Status: historical Plan 028 closeout; Plans 029–035 are now closed/integrated.

## Plans 021–025 identity/workspace model

- Real application users are persisted in PostgreSQL.
- Email/password registration/login is acceptance-critical.
- Google OAuth is prepared through schema/provider/config plumbing; real OAuth runtime acceptance is deferred to the user.
- One application user may own many private workspaces.
- A workspace has exactly one application owner in this roadmap; no invite/member/team hierarchy is introduced.
- Different application users may independently configure workspaces that refer to the same external Situm account/organization.
- Situm organization identity is external metadata, not application tenancy.

Status: active runtime architecture.

## Plan 026 production containerization

- The Makefile is canonical for routine Docker, Buildx, release, and staging operations; raw Docker/Buildx/Compose commands are diagnosis-only.
- Local laptop builds/pushes publish GHCR multi-platform images for `linux/amd64` and `linux/arm64`; a 64-bit Orange Pi consumes `linux/arm64`; no CI is used.
- Builds use the approved filtered local context helper; routine root-dot context is prohibited. Compose is pull-only and contains neither `build:` nor `context:`.
- Runtime secrets are external only and `.env` is never baked into images. PostgreSQL, ClickHouse, and observability remain external/reused.
- Staging updates run `pull -> recreate -> health -> smoke`; immutable SHA tags/digests provide rollback. `staging-migrate` is explicit and never runs at startup.

Status: active durable runtime decision.

## Situm credential integration

The previous two-global-env-key model is **historical** and replaced by the current dual-credential architecture.

- Situm configuration is owned by an authenticated workspace and persisted server-side;
- stored long-lived workspace credentials use authenticated encryption at rest;
- browser code must not receive the stored long-lived workspace Read & Write API key;
- workspace configuration supports independently optional Situm Only Read and Read & Write credentials;
- account/organization ID is derived server-side from a verified credential and later replacements must match it;
- Only Read owns authenticated client/read authority, including Viewer and native positioning; Read & Write remains server-only;
- verified upstream permission remains authoritative;
- unsupported/intermediate permission states are handled conservatively;
- workspace/account/building context is workspace-scoped, never process-global.

Viewer authentication changes remain evidence-gated against current official Situm contracts and the installed SDK. The direct Only Read Viewer API-key flow remains authoritative unless newer evidence proves a safer compatible replacement; never expose the Read & Write credential to browser/mobile clients.

Status: active durable runtime decision; current two-key integration supersedes the earlier three-key model.

## Evidence-backed Situm integration

- **No evidence, no implementation.**
- Verify exact endpoint/SDK method, installed-version compatibility, browser/server ownership, web/native ownership, auth/permission, request inputs, consumed fields/events, and relevant failure/empty/runtime semantics.
- Missing material evidence stays `UNRESOLVED`/absent.
- Direct authenticated Nitro REST remains valid when the installed SDK lacks a suitable wrapper and the official endpoint is verified.
- The single `SitumViewer.vue` instance remains the Viewer lifecycle owner; expose only small typed commands, never raw Viewer access or a generic invoke escape hatch.

Status: active.

## ClickHouse analytics boundary

- Reuse the user's existing local ClickHouse instance; do not provision another ClickHouse server or Docker/Compose stack.
- PostgreSQL/Drizzle remains relational application storage; ClickHouse remains analytics storage.
- Browser code never connects directly to ClickHouse or receives ClickHouse credentials.
- Analytics reads are workspace-isolated.
- Legacy unscoped analytics rows must not be assigned arbitrarily to a user/workspace. Preserve them non-destructively unless attribution is proven or the user supplies a retention/migration policy.

Status: active.

## Observability and safe errors

- Reuse the user's existing observability stack and supported protocols; do not provision duplicate observability infrastructure by assumption.
- Propagate request correlation/trace context from browser through Nitro and meaningful downstream boundaries.
- Do not put secrets or sensitive payloads into headers, baggage, logs, spans, or client errors.
- Client responses expose sanitized product errors; detailed critical/internal diagnostics remain server-side in observability.

Status: active durable runtime decision.

## Static directions boundary

- Static routes use real known Situm POIs/endpoints and numeric POI IDs already proven by the completed directions work.
- Viewer owns route calculation/rendering.
- No `startNavigation`, browser `My location`, indoor positioning, live rerouting, or synthetic route distance/duration/steps/geometry/ETA.
- Unresolved route lifecycle/result contracts remain absent until exact evidence exists.

Status: active product boundary.

## Git workflow default

- One plan = one dedicated `plan/<number>-<slug>` branch in the normal repository working directory.
- Never implement a plan directly on `main`.
- Each completed phase updates plan/relevant `.agents`, validates, commits, and pushes.
- PR creation/integration is user-gated.
- Normal dependent plans start only after the preceding dependency is integrated into updated `main`.
- Stacked execution requires explicit user authorization recorded in current state.
- Do not force-push or destructively rewrite shared history as normal workflow.

Status: active.

## Completed roadmap transition

Plans 017–035 are closed/integrated or administratively closed historical execution. There is currently no active implementation plan.

The following are historical context only:

- `.agents/memory/roadmap-021-025.md`;
- `plans/021-025-prerequisites.md`;
- `design/ROADMAP-021-025-OVERRIDES.md`.

The Plans 028–034 roadmap plus Plan 035 are historical native-roadmap authority. New work must start from updated `main` under a newly created explicit plan.

Status: active durable closeout/authority rule.

## Auth abuse protection (Plan 027)

- Rate limiting for `/api/auth/login` and `/api/auth/register` uses a KISS in-memory, per-process, fixed-window limiter (`server/utils/rate-limit.ts`), not Redis/a shared store. This is deliberate: the repository runs as a single Nitro process (see Plan 026 production containerization target); a distributed store would be infrastructure the current architecture does not justify. Revisit only if the runtime becomes genuinely multi-instance.
- Registration checks for an existing account before running the expensive scrypt password hash, to avoid unauthenticated CPU/memory amplification. Login already avoided hashing for unknown emails and was left as-is; only rate limiting was added there. Generic invalid-credentials responses are unchanged.
- **Trusted-proxy stance (Plan 027 review remediation):** the limiter derives client identity from the server-observed socket address only (`getRequestIP(event, { xForwardedFor: false })`), never from client-supplied `X-Forwarded-For`. Evidence: `deploy/staging.compose.yml` publishes the Nitro container directly on the host port (`"${STAGING_PORT:-3005}:3000"`) with no reverse proxy in the deployment, so nothing sanitizes that header before it reaches the app — trusting it would let any caller rotate the header to bypass throttling entirely (live-verified: 12 rotated-header login attempts still hit 429 after 10). Revisit only if a trusted reverse proxy is introduced in front of Nitro with a proven, documented forwarding contract; do not flip this back to trusting `X-Forwarded-For` without that evidence.
- The limiter map self-prunes expired buckets on every `rateLimit()` call (no background timers) so memory stays bounded as more unique client identities are seen.

Status: active durable runtime decision.

## Browser security headers (Plan 027)

- Safe, universal response headers (X-Content-Type-Options, Referrer-Policy, X-Frame-Options: DENY, conservative Permissions-Policy) are applied via `server/middleware/security-headers.ts` and are live-verified.
- A Content-Security-Policy was deliberately NOT added when the embedded Situm Viewer was the primary web Map because its exact script/frame/connect origins were not proven by a live network trace. Plan 044 removed the Viewer from the primary `/app/map` path, reducing that map-specific risk, but the retained SDK/Viewer utility still has no proven allowlist. Revisit CSP as a separate security change with current runtime/network evidence rather than guessing origins.

Status: active durable security decision; CSP is an open, intentionally documented limitation, not solved.

## Plan 029 native remediation

- Direct mobile h3 sealing must use the explicit `nuxt-session` session name and the native transport remains `x-nuxt-session`; session-version checks fail closed for missing or invalid values.
- Workspace restoration persists only the selected workspace ID through `expo-secure-store`; workspace credentials remain transient and are never persisted by the context.
- The native shell uses horizontal phone navigation, compact tablet/POS and wide rails, SVG brand/Lucide-style icons, and Foreground/Background lifecycle labels that do not imply network connectivity.

Status: active durable runtime/security decision.

## Plan 030 native Map/positioning/navigation (2026-08-17)

- Native MapView is owned by the authenticated workspace context and must remount when workspace/building changes. Historical Plan 030 used a dedicated Positioning credential; current runtime instead receives the owner-authorized Only Read credential from Nitro. Read & Write remains mobile-inaccessible.
- The installed `@situm/react-native` 3.19.2 surface is consumed through a narrow local TypeScript declaration boundary because the published package omits its referenced `lib/` files; Metro/Android use the installed package source/native module. This workaround mirrors only the proven MapView, positioning, user-helper, floor/POI, and navigation surface and is not evidence of iOS runtime support.
- Positioning uses Situm User Helper plus Remote Configuration and starts only from the explicit foreground Map action. No background location or Realtime/Share Live Location is enabled in Plan 030.
- Real-device positioning, blue-dot, floor transition, POI, and navigation claims require physical supported-device evidence. Plan 030 implementation is approved without claiming those outcomes; after the 2026-08-17 roadmap split, the unpassed device checks are explicitly transferred to Plan 034's consolidated hard final E2E gate.

Status: active durable native product/security boundary.

## Plan 033 native UI/UX reference reconciliation (2026-08-18)

- A deep post-Plan-032 review found that the React Native client preserves the approved Situm Explore visual family and navigation vocabulary but still has structural gaps against `design/reference/situm-explore-native-responsive-prototype.html`: phone reachability/scroll ownership, Map and Realtime inner responsiveness, Explore search/location hierarchy, final Settings/Recent presentation, wide/POS content utilization, and accessibility.
- The user explicitly chose one bounded implementation plan before terminal E2E to reconcile all native UI/UX as closely as possible to the canonical reference while continuing to use the real backend, real workspace/cartography data, and proven installed SDK behavior.
- Plan 033 must preserve Plans 028–032 auth/workspace/credential/Map/positioning/navigation/Realtime/deep-link/distribution ownership; it is not a redesign or a second backend/product system.
- Reference hierarchy and responsive composition are binding visual intent, but capability/data/security truth wins. In particular, no generic remote Realtime markers/focus, online/idle/offline/freshness semantics, fake Recent activity, sample POIs, fake permission success, background-location enablement, or invented route metrics may be added for visual parity.
- The approved responsive intent remains phone bottom navigation, tablet/POS compact rail, wide expanded rail, and feature-level adaptive composition. One shared React Native layout-mode contract should drive shell and feature screens rather than scaling a single stacked phone layout.
- Historical authority against creating an event/audit backend solely to populate Recent remains active. If no trustworthy existing recent-history source is available, Plan 033 must ship a polished truthful empty/unavailable Recent surface instead of fabricated history.
- Plan 033 may integrate after reviewer-approved implementation plus truthful non-device/emulator visual validation. It does not consume any physical/full-cross-client acceptance; those remain Plan 034.

Status: active durable native presentation contract; Plan 033 execution itself is historical/complete.

## Consolidated native full-E2E gate (2026-08-17)

- Plans 030 and 031 were reviewed/integrated after their implementation/build/test/runtime contracts were approved because the required physical-device environment was unavailable; their device-dependent acceptance remains explicitly unpassed.
- Plan 032 owns web/native handoff, deep-link/install/distribution implementation plus truthful non-device validation and is integrated via PR #28; its real cross-client acceptance remains unpassed.
- Plan 033 owns final native presentation reconciliation plus truthful non-device/emulator visual validation. It may integrate after reviewer approval without consuming the final full-E2E gate.
- Every device-dependent carry-over from Plans 030–031, every cross-client E2E flow introduced by Plan 032, and real-device confirmation of the reconciled Plan 033 presentation must be enumerated for Plan 034; deferral never converts missing evidence into acceptance.
- Plan 034 is the terminal non-deferrable gate. It must run the accumulated supported-Android physical Map/positioning/navigation, Realtime/native lifecycle, web-to-native/deep-link/distribution, and real-device native presentation E2E before roadmap closeout/merge.
- Android Studio emulator evidence may supplement launch/UI/WebView/non-sensor regression, but it cannot prove real indoor positioning, BLE/Wi-Fi/sensor behavior, blue-dot/floor transitions, or equivalent physical-device semantics.

Status: historical roadmap acceptance decision. The explicit Plan 034 closure override superseded the non-deferrable sequencing rule while preserving unpassed evidence.

## Plan 031 Realtime execution baseline (2026-08-17)

- Realtime Positions is operational device-position monitoring; Situm Share Live Location is a separate session-based feature and must not be conflated with it.
- The current owner-scoped Nitro Realtime route is the preferred remote-monitoring boundary and exposes only position/device identity, source time, building/floor, accuracy, coordinates, and optional device ID.
- No friendly person identity, online/idle/offline presence, trajectory, generic remote marker, or remote focus semantics exist unless Phase 0 proves them from exact current evidence.
- Remote monitoring remains server-mediated unless a narrower/equivalent safe native path is proven. Native positioning may use the workspace Only Read credential, while Read & Write remains server-only.

Status: historical Plan 031 baseline; its server-mediated/no-invented-semantics boundary remains active.

## Plan 031 implementation boundary (2026-08-17)

- Native Realtime uses the authenticated `/api/workspaces/:workspaceId/situm/realtime` route and a typed minimal mobile model. It polls immediately and every 10 seconds only while the destination is foreground-active; in-flight requests abort on unmount, workspace change, background, or refresh replacement.
- The screen is a useful list/detail composition without a map. It shows device/position identity, building/floor IDs, accuracy, coordinates, and source time only; unsupported local freshness thresholds/status indicators were removed during review. It never claims online/idle/offline presence.
- Phase 0 source inspection found native generic realtime and Share Live Location APIs in `@situm/react-native` 3.19.2, but not equivalent application/workspace authorization or Positioning-key permission evidence. They remain unused; remote markers/focus and Share Live Location are absent.
- Background positioning and own-device Realtime publishing are not required by the frozen v1 scope and remain outside Plan 031.

Status: active durable Realtime implementation boundary; Plan 031 execution itself is historical/complete.

## Security dependency remediation boundary (2026-08-18)

- Preserve the frozen Expo 57 / React Native 0.86 / Situm 3.19.2 compatibility boundary during security maintenance.
- Remediate `xcode`'s UUID path with the minimum compatible released `uuid@11.1.1` npm override; do not add a direct app dependency.
- When an upstream advisory has no patched `image-size` release, a small maintainer-aligned parser patch may be carried with `patch-package` only when its exact behavior, clean-install reproducibility, and regression evidence are recorded. npm/GitHub scanner residuals must remain visible and must not be dismissed or hidden.

Status: active security-maintenance decision; revisit when `image-size` publishes an advisory-patched release.

## Native roadmap closeout and Android distribution (2026-08-18)

- Plans 028–035 are closed/integrated or administratively closed with truthful evidence; there is no active native implementation plan.
- PR #32 integrated the final Realtime/foreground-positioning remediation plus Android release/distribution polish at merge commit `840c0f9`; the Plan 035 branch was deleted.
- Android release artifacts use `situm-explore-v<semver>-android-arm64.apk`; the public stable alias is `situm-explore-latest-android-arm64.apk`. Release builds require an explicit non-local HTTPS `EXPO_PUBLIC_API_BASE_URL`.
- The public MinIO APK is anonymous-read/download; application login is not required to fetch the APK. Staging exposes a logged-out download CTA.
- Plan 035 physically verified real POS Situm indoor fixes and own-device server-mediated Realtime. This supersedes the earlier provider blocker only for that bounded path and does not retroactively mark every unrelated Plan 034 acceptance criterion PASS.

Status: active durable closeout/distribution decision.

## Plan 035 foreground positioning ownership (2026-08-18)

- `@situm/react-native` positioning callbacks and running state are process-global; the authenticated shell owns one `ForegroundPositioningSession`, while Explore is only a consumer/presentation surface.
- The session starts only after explicit Locate me, uses the dedicated workspace POSITIONING credential, persists across Explore/Realtime tab changes, and stops on explicit stop, workspace switch, logout, background, native error/stopped, or teardown. It does not auto-restart after background or process restart.
- Server-mediated Realtime remains unchanged and maps coordinate-bearing `features`; `devicesInfo` is never converted into a fabricated position.

Status: active durable positioning/Realtime lifecycle architecture; Plan 035 execution itself is historical/complete and integrated via PR #32.
