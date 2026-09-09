# Plans

Plans are executable implementation checklists for Codex.

## Mandatory execution workflow

Before executing a future active plan, read:

1. `AGENTS.md`;
2. `.agents/README.md`;
3. `.agents/state.md`;
4. `.agents/memory/decisions.md`;
5. `.agents/memory/roadmap-021-025.md` when completed backend-roadmap context matters;
6. `.agents/protocols/git-workflow.md`;
7. `ARCHITECTURE.md`;
8. `plans/021-025-prerequisites.md` when historical prerequisite context matters;
9. `plans/028-034-native-mobile-roadmap.md` when historical native-roadmap context matters;
10. `design/data-source-matrix.md` when Situm/product scope matters;
11. explicitly active plan, when one exists;
12. `DESIGN.md` / `design/IMPLEMENTATION.md` for presentation changes.

Historical plans/sessions/branches are evidence only. Current state, durable decisions, architecture, and any explicitly active future plan are current authority.

## Git workflow

- one plan = one dedicated plan branch;
- never implement directly on `main`;
- no force-push/destructive rewrite as normal workflow;
- PR creation/review and merge are user-gated;
- normal dependent plans start after prerequisite work is integrated into updated `main`;
- stacked implementation requires explicit user authorization recorded in state.
- persistent unit tests are prohibited; temporary E2E/white-box/black-box checks must be deleted before commit/closeout.

## Completed roadmap

Plans 017–020, including Plan 019A, are complete/integrated by PR #12.

## Completed backend-refactor roadmap

```text
roadmap/021-025-backend-refactor              [complete/integrated]
-> Plan 021 — Identity & Auth Foundation       [complete/integrated]
-> Plan 022 — Private Workspaces + Situm       [complete/integrated]
-> Plan 023 — Observability + Safe Errors      [complete/integrated]
-> Plan 024 — Workspace Situm Backend          [complete/integrated]
-> Plan 025 — Workspace UX + Full Regression   [complete/integrated; Google OAuth deferred]
```

Roadmap overview: `plans/021-025-backend-refactor-roadmap.md`.
Prerequisites/blockers: `plans/021-025-prerequisites.md`.

## Completed Plans 026–027

- Plan 026 — Production Containerization: complete/integrated via PR #20.
- Plan 027 — Analytics Correctness & Security Hardening: complete/integrated via PR #21.

## Completed native companion roadmap

Plans 028–035 are closed/integrated. Plan 034 was administratively closed by explicit user decision with truthful documented limitations rather than a fabricated full-E2E PASS. Plan 035 then remediated the Realtime/foreground-positioning lifecycle, physically verified own-device positioning plus server-mediated Realtime on the POS, and was integrated together with Android release/distribution polish through PR #32 at merge commit `840c0f9`.

```text
roadmap/033-034-native-ui-reconciliation          [historical/closed]
-> Plan 028 — Native Capability, Auth & Distribution Spike [complete/integrated]
-> Plan 029 — Native App Foundation & Workspace Session [complete/integrated]
-> Plan 030 — Native Map, Positioning & Navigation [complete/integrated]
-> Plan 031 — Native Realtime Operations [complete/integrated]
-> Plan 032 — Web/Native Handoff & Distribution [complete/integrated]
-> Plan 033 — Native UI/UX Reference Reconciliation [complete/integrated]
-> Plan 034 — Full E2E Acceptance & Roadmap Closeout [closed; documented limitations retained]
-> Plan 035 — Realtime Remediation [complete/integrated via PR #32]
```

Roadmap history: `plans/028-034-native-mobile-roadmap.md`. Plan 036 — Realtime Reliability is **complete / integrated via PR #35** at merge commit `7a87afb`. Historical Plan 034 limitations remain evidence unless a future scoped plan explicitly reopens them.

## Completed recent work

- Plan 037 — Web Loading-State Hygiene: complete/integrated through PR #36 at merge commit `80dad1b`.
- Plan 038 — Two-Key Situm Credential Model: complete/integrated through PR #36 at merge commit `80dad1b` by explicit user waiver on 2026-08-27. Automated validation, GHCR immutable publication, staging recreate, authenticated Workspace/Map acceptance, and release APK build passed. Physical Android sensor-backed positioning and raw-secret browser form replay were not executed and are not claimed as PASS.
- Plan 039 — Workspace Situm Isolation: complete/integrated through PR #37 at merge commit `a9acda6`.
- Plan 040 — Explicit Explore Fullscreen: complete/integrated through PR #38 at merge commit `845b437`.
- Plan 041 — App-Owned Indoor Map + Navigation UI: complete/integrated through PR #39 at merge commit `99318a6`. React Native owns the visible floorplan/POI/bluedot/route renderer and route graph; authenticated Situm REST remains the cartography/path source and the native Situm runtime remains headless positioning only. Physical POS functional acceptance covered real indoor fixes, real POI selection, same/cross-floor routing, floor switching, fullscreen/back route preservation, Stop, bounded crash checks, final arm64 packaging/checksum, and the branded same-logo cold launch. Pixel-level screenshot polish and movement-dependent arrival/off-route reproduction remain explicitly unclaimed follow-ups.

- Plan 042 — Repository Engineering Governance: complete/integrated locally into `main`; component-scoped Engineering Guard and maintainability remain closure-only or explicit-user-request tools.
- Plan 043 — Map Marker & Interaction Polish: complete/integrated locally into `main`; includes the accepted mobile map polish and reproducible Blender-to-Situm 2D/3D asset pipeline. Local building photos and generated artifacts remain outside repository distribution.
- Plan 044 — Web / Native Map UI Parity: active on `plan/044-web-native-map-parity`; replaces the primary web Map Viewer presentation with an app-owned responsive floorplan/POI renderer while keeping sensor-backed positioning/navigation native-only.

## Transition direction

The historical pre-refactor baseline used env-defined app auth and process-global Situm account/Viewer/building context; it also produced analytics history before workspace ownership existed.

Plans 021–025 replaced those incrementally. Plans 026–027 completed production containerization plus analytics/security hardening. Plans 028–035 established and closed the native companion work while preserving Nitro as the single application backend.

Do not remove a working old path before its replacement is implemented and accepted.

## Capability evidence gate

For Situm behavior: **no evidence, no implementation**. Verify exact endpoint/SDK method, installed-version compatibility, auth/permission, inputs/fields/events, browser/server ownership, web/native ownership, and failure semantics. Missing material contracts stay unresolved/absent.

## Validation

Baseline code checks:

- `git diff --check`;
- `npm run lint`;
- `npm run typecheck`;
- `npm run build`.

Runtime/browser acceptance uses production build + `npm run preview`, not Nuxt dev mode.
