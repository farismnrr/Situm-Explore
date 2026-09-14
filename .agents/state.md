# Current State

_Last reviewed: 2026-09-14_

## Current execution state

Plan 049 — Android OTA via Sensio Env + S3 is active on `plan/049-android-ota-sensio-env`, branched from fetched `origin/main` at `9a569c5c8ca816904cca6699cdb1f27b47d17d9a`.

The user authorized Android OTA remediation/release work using the existing Sensio Env global shared S3 configuration and production API origin `https://situm.devoutsys.com`. The new human release line begins at `v0.1.0`; Android `versionCode` remains monotonic and therefore starts this line at `4` because historical shipped evidence reached `versionCode 3`.

The user subsequently expanded the active work to cover the public landing-page APK download path, Sensio-style email OTP registration, shared Sensio Env runtime configuration, and the Android OTA contract. Source now contains a stable public Android download endpoint, email OTP registration backed by hashed/expiring verification codes and Sensio Env SMTP configuration, plus the existing private-S3 OTA boundary.

The original production TLS/vhost blocker is resolved as observed on 2026-09-14: `https://situm.devoutsys.com` now presents a matching Let's Encrypt certificate, serves Situm Explore, and its liveness endpoint returns 200. Production is nevertheless still running an older application build: the new `/api/mobile/android/latest` and `/api/mobile/android/download` routes currently return 404. Runtime acceptance therefore requires deploying the current backend/web build, applying migration `0011_fine_tony_stark.sql`, and supplying the server-side Sensio Env read credential before OTP SMTP and private-S3 OTA can be verified live.

The shared cross-project Android toolchain was established at `/home/farismnrr/Services/android-toolchain/` (JDK 21, Android SDK 36, NDK 27.1.12297006), integrated across Sensio and Situm Explore, and verified via a successful Android release build producing `situm-explore-v0.1.0-android-arm64.apk` without JDK/NDK/license blockers. The artifact remains `arm64-v8a` only with the recorded release checksum, while production S3 activation/publishing has not been performed from this session.

The latest integrated product baseline before this documentation refresh is `main` at PR #48 merge commit `4de87b602ea595d873c0c5235a3e807753349eef`.

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
