# Current State

_Last reviewed: 2026-09-14_

## Current execution state

Plan 048 — Public Landing Page is integrated into `main` through PR #55 at merge commit `d4bee607663ab13b49e367945c0e031c61950cf4`. The stale prototype-era public page is replaced by the current capability-truthful landing page, including the conditional Android download CTA.

Plan 049 — Android OTA via Sensio Env + S3 source is integrated into `main` through PR #56 at merge commit `4b28819fbdf490db1248ca4f74edd3aa56ce800f`. Production release execution completed on 2026-09-14: web/backend image `sha-82a2e354e5dc` is live, migration `0011_fine_tony_stark.sql` applied successfully on production schema `public`, private-S3 immutable `0.1.1` objects were staged then activated, and the public OTA feed now advertises Android `0.1.1` / versionCode `5` with APK SHA-256 `5aa468491bc941c0c1b5f1e68c4192c807c930c87a0234109647ba3a11eb98ce`. Public health, landing/login/register, stable download, and versioned APK routes passed post-deploy verification.

Physical-device acceptance exposed a client bug in the already-shipped updater: tapping `Download update` could appear to do nothing because the app owned APK download/installer handoff and swallowed failures. The remediation follows the proven Sensio Notes pattern instead: the app opens the immutable release URL in the device browser and Android/browser download handling owns the transfer; users install the downloaded APK from Downloads. Direct APK cache/download code, installer intents, `expo-device`, `expo-intent-launcher`, the direct `expo-file-system` dependency, and `REQUEST_INSTALL_PACKAGES` are no longer part of this flow. Physical POS acceptance passed on 2026-09-14 with a test-only `0.1.0` / versionCode `4` build: the update modal appeared without login, Chrome opened the versioned `0.1.1` route, the APK downloaded successfully, and the device-side SHA-256 matched production `5aa468491bc941c0c1b5f1e68c4192c807c930c87a0234109647ba3a11eb98ce`. Production Android `0.1.2` / versionCode `6` is now active with the browser-managed updater included. The backend source also adds `Content-Disposition: attachment` to signed APK redirects, but that server-side enhancement is not yet deployed because GHCR publication is blocked by package permissions; the existing production redirect remains functional and was already proven to open/download correctly in Chrome.

The shared cross-project Android toolchain documentation still references `/home/farismnrr/Services/android-toolchain/`, but the verified working release environment uses repository JDK `/home/farismnrr/Documents/Projects/situm-explore/.tools/jdk-21` plus Android SDK `/home/farismnrr/Android/Sdk` with SDK 36 / build-tools 36.0.0 / NDK `27.1.12297006` / CMake 3.30.5. The earlier MCP build blocker was caused by non-interactive shells lacking `JAVA_HOME`/`ANDROID_HOME`/`ANDROID_SDK_ROOT`, allowing the release script to select the fallback shared SDK; explicit known-good toolchain env resolves that discrepancy.

Closure governance for the OTA remediation is green: web full guard and maintainability pass; mobile full guard and maintainability pass; agent workspace validation and diff checks pass. The web maintainability baseline was reconciled to exact pre-existing `origin/main` debt (`app/pages/index.vue=1567`, `server/utils=15`) without changing global limits. Mobile dependency audit carries a temporary exact exception through 2026-09-30 for the two current `image-size` high-severity advisories in the Metro build-tool chain because no patched npm release is available; new high findings, critical findings, package expansion, advisory-ID changes, or expiry still fail closed.

Android release `0.1.2` / versionCode `6` is active in production. Release source commit `91e2f479392b0fc4f552686566910cdc7e5f656a` on `release/android-0.1.2` produced final APK SHA-256 `14e1f840806257714600075ea2ac0351c8b376ddd8992f8a047a57e1aa1db04b`; package `com.situm.explore`, versionCode `6`, arm64-only ABI, production API origin, APK Signature Scheme v2, and signing certificate continuity with installed production `0.1.1` were verified. Immutable `0.1.2` S3 objects were staged first, then mutable aliases were activated with the manifest last. Post-activation verification proved the public feed advertises `0.1.2` / `6`, both stable and versioned download routes return bytes with the exact final SHA, and the physical POS runs `0.1.2` / `6` with no update modal when feed/device versions match. Because shipped `0.1.1` still contained the old updater, the primary POS was bridged manually with `adb install -r`; devices still on `0.1.1` require one manual bridge to `0.1.2`, while future `0.1.3+` updates can use the browser-managed flow included in `0.1.2`.

## Latest integrated work

### Plan 047 — Native Explore Digital Twin 3D Parity

Plan 047 is **complete/integrated through PR #46** at merge commit `21fd074532af6db93db9996fc9acdf175d541ea2`.

Current native Explore contract:

- 2D remains the default and owns live positioning, blue dot, app-owned routing, ETA, arrival/off-route state, and turn-by-turn guidance;
- Digital Twin 3D is explicit opt-in and lazy;
- native 3D uses Expo GL plus mobile-owned Three `0.162.0` and authenticated workspace/building-scoped GLB retrieval;
- web/native share only runtime-neutral model-slot/view and semantic-room contracts;
- native 3D owns room search/Go/reset/floor selection/touch look-walk and lifecycle/resource cleanup;
- native 3D never fabricates blue-dot projection, route geometry, ETA, arrival/off-route, turn-by-turn guidance, or vertical transitions;
- missing/unavailable 3D remains an explicit error with a manual `2D Map` action; there is no silent fallback.

Physical Android feasibility rendered the real authenticated LT1/LT2 models. The user accepted the product E2E flow; the later mode-switch placement fix was source/layout validated without falsely claiming a second physical retest of only that final layout change.

Closure evidence: `.agents/evidence/plan-047-closure-2026-09-11.md`.

### Situm Path research preservation

Sanitized Path investigation artifacts were preserved through **PR #47** at merge commit `653d80cb7116256ab63065b15073fd483fa7fcad`.

Human-readable research now lives under `docs/research/`; the guarded post-provisioning uploader lives at `scripts/situm/upload-paths.sh`. The current evidence for building `19954` remains **BLOCKED BY SITUM BACKEND** because the building Path aggregate is missing and no supported create/bootstrap endpoint was found. This research is evidence, not a product capability contract.

### Web Digital Twin workspace/building isolation

The previously uncommitted web isolation/favicon/title work was reconciled on top of Plan 047 and integrated through **PR #48** at merge commit `4de87b602ea595d873c0c5235a3e807753349eef`.

Current web Digital Twin contract:

- browser Explore remains 2D-primary with verified same-floor static route rendering;
- Digital Twin 3D is explicit opt-in;
- GLB identity and storage are scoped by application workspace + Situm building + floor/model slot;
- switching workspace/building cannot silently reuse another context's model;
- there is no flat/global GLB fallback;
- missing model, WebGL failure, and semantic-room failure remain explicit 3D errors;
- favicon/static assets are included in the production container context and tab titles use the Situm Explore product title.

The web branch passed `web full` Engineering Guard, production build, lint, typecheck, dependency audit with 0 findings, maintainability, and agent-workspace validation before integration.

## Earlier integrated milestones

- Plan 046 — Web Explore 2D Routing Foundation: integrated through PR #44 (`9aad66f964f01b87815893a50e86fbf95236b815`). Browser 2D uses real Situm POIs and wayfinding paths for app-owned same-floor static routing; tagged graphs and cross-floor browser routing remain explicit unsupported cases until semantics are proven.
- Plan 045 — Web Explore 2D Primary + Digital Twin 3D Orientation Hardening: integrated through PR #43 (`7782e7d`). Established the current 2D-primary / explicit-3D web direction and deterministic shared floor-view semantics.
- Plan 044 — Web / Native Map UI Parity: historical predecessor integrated through PR #42 (`420f399`). Its 3D-only web direction was superseded by Plan 045.
- Plan 041 — App-Owned Indoor Map + Navigation UI: integrated through PR #39 (`99318a6`). Native 2D owns the visible floorplan/POI/blue-dot/route experience while Situm remains cartography/path/positioning authority.
- Plan 042 — Repository Engineering Governance and Plan 043 — map/asset-pipeline polish are complete/integrated historical work, not active plans.

## Current product/runtime authority

Human-facing current product truth lives in:

- `README.md`;
- `ARCHITECTURE.md`;
- `DESIGN.md`;
- `design/IMPLEMENTATION.md`;
- `design/data-source-matrix.md`;
- `docs/README.md` and the relevant operator/developer docs under `docs/`.

Agent-facing execution/governance truth lives in:

- `AGENTS.md`;
- this file;
- `.agents/memory/decisions.md`;
- `.agents/protocols/`;
- an explicitly active future plan when one exists.

Historical `.agents/evidence/`, `.agents/sessions/`, reviews, old execution briefs, and completed `plans/*.md` files remain immutable evidence unless a factual metadata correction is required. They do not override current architecture/state.

## Known truthful limitations / external gates

- Google OAuth wiring exists but real provider runtime acceptance remains external/user-owned.
- iOS/macOS build/device/store delivery remains gated by the required Apple environment/signing setup.
- Mobile npm audit still reports aggregate findings for the known `image-size` advisories even though the relevant parser behaviors are locally remediated through the repository's documented `patch-package`; scanner residuals must remain visible until upstream resolution.
- Situm Wayfinding Path persistence for building `19954` remains blocked by the missing upstream Path aggregate; see `docs/research/situm-path-investigation.md`.
- Browser cross-floor routing, generic tagged-path routing semantics, and 3D route projection are not current product claims.

## Current execution authority

For future work read, in order:

1. `AGENTS.md`;
2. this file;
3. `.agents/memory/decisions.md` when durable decisions matter;
4. `.agents/protocols/git-workflow.md`;
5. the relevant current human product docs;
6. an explicitly created active plan.
