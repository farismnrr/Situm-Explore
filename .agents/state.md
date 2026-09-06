# Current State

_Last reviewed: 2026-09-02_

## Work status

Plan 037 — Web Loading-State Hygiene is complete/integrated through PR #36 at merge commit `80dad1bf87300846fab2f7b914d5ec666acf06d6`. It centralizes unresolved `idle`/`pending` semantics, removes transient false empty/configuration copy, and gates Alarms/Map/Workspace states behind real resolution. Validation passed with 74/74 tests, lint, typecheck, build, and `git diff --check`.

Plan 038 — Two-Key Situm Credential Model is complete/integrated through PR #36 at merge commit `80dad1bf87300846fab2f7b914d5ec666acf06d6`. The runtime/configuration model exposes exactly **Only Read** plus **Read & Write**: Only Read powers authenticated browser Viewer, native positioning, and server read paths; Read & Write remains server-only for mutation/admin authority. Dedicated Positioning storage/UI/runtime contracts were removed and a forward migration drops the legacy column. Automated validation passed: 75/75 root tests, root lint/typecheck/build, mobile lint/typecheck/security/update tests, release APK build, and `git diff --check`. The user explicitly waived the remaining physical/raw-secret E2E gates on 2026-08-27 so the plan could close under time pressure; those checks remain documented as not executed rather than PASS.

Plan 038 is deployed to the local production-style Compose runtime on port 3005 using the final Plan 038 image built from closeout commit `bddd72889135429df9f6fac5880e15e1795badac`. Before migration, a mode-0600 PostgreSQL custom-format backup was created and recorded at `/tmp/situm-explore-plan038-pre-migration-20260827-134152.dump`; the path was missing at final closeout, likely because `/tmp` was cleaned, so backup retention is not claimed. Migration `0009_unusual_wrecking_crew` was applied successfully: the Read & Write column is nullable, the legacy encrypted Positioning column is gone, the existing workspace configuration row remains, and both Only Read and Read & Write slots remain configured without reading their secret values. The final GHCR `staging` image is immutable at digest `sha256:75739ca6d557fc9c5098879cc668284581ee77b61a1d9889df5376ad2b0b6f58`; the container was pulled and force-recreated from it, is healthy on Node `v22.22.0`, liveness/root return 200, unauthenticated workspace access returns 401, and the then-existing `make staging-smoke` target passed. That persistent smoke target was later removed under the 2026-09-02 testing policy; the historical result remains evidence only. No stored/raw Situm secret was accessed.

The Docker base-image warning is addressed: both build stages use Node `22.22.0-bookworm-slim`, and clean production image builds complete without the Nuxt engine mismatch warning. Authenticated browser acceptance isolated the Viewer issue to immediate watcher timing before the DOM ref existed; `SitumViewer` now retries in `onMounted`, with a regression assertion and targeted test passing. Final browser acceptance through `https://situm.farismunir.my.id` (the local port-3005 tunnel) verified the two-key Workspace UI and rendered Map Viewer. A release arm64 APK `v1.0.2`/versionCode `3` also built successfully, but `adb devices` reports no Android device; the user explicitly waived physical Only Read positioning E2E on 2026-08-27. Full evidence is in `.agents/evidence/plan-038-runtime-acceptance-2026-08-27.md`.

Latest **integrated** product work on `main` is Plan 041 through PR #39 at merge commit `99318a608af24f036e1744d9e7e929b859fbe15e` (`feat(mobile): ship app-owned indoor navigation`), following PR #38 at `845b437` for explicit Explore fullscreen. The previously separate Android 1.0.2 OTA history is now preserved on `main` in `.agents/evidence/android-release-1.0.2-2026-08-28.md` and `.agents/sessions/2026-08-28.md`; the old release branch is no longer needed as a history carrier.

Plan 041 — App-Owned Indoor Map + Navigation UI is complete/integrated through PR #39 at merge commit `99318a608af24f036e1744d9e7e929b859fbe15e`. React Native now owns the visible floorplan, POI, bluedot, heading/accuracy, route rendering, and app route graph while authenticated Situm cartography/path data remains the source of truth and the native Situm runtime remains headless positioning only. Physical POS acceptance covered real indoor fixes, POI selection, same/cross-floor routing, floor switching, fullscreen/back state preservation, recenter/stop, and bounded crash checks; the branded same-logo cold-launch animation and final arm64 release packaging/checksum also passed. Pixel-level map polish and movement-dependent arrival/off-route reproduction remain truthful optional follow-ups rather than claimed PASS. The 2026-09-02 repository testing policy removed all persistent unit/regression suites; durable validation now uses lint/typecheck/build plus appropriate runtime/browser/device evidence.

Plan 042 — Repository Engineering Governance is complete and integrated locally into `main`. The Sensio-style component Engineering Guard, environment/policy checks, agent-workspace validation, and maintainability ratchets exist for `web` and `mobile`, with closure-only semantics and no hidden implementation-time automation.

Plan 043 — Map Marker & Interaction Polish and the Blender/Situm asset pipeline are closure-complete and being integrated locally into `main`. The final state preserves compact map interactions plus reproducible 2D floorplan and floor-scoped GLB exporters. Local building photos and generated `.tools/` artifacts remain excluded from repository distribution.

Continue future work from a fresh dedicated plan branch based on updated `main`. Historical plans, sessions, evidence, and retired branches are context only unless explicitly re-opened.

## Last completed work

Plan 035 closed the Realtime/foreground-positioning lifecycle defect and Android release/distribution polish. Recorded evidence includes:

- shared shell-scoped foreground positioning ownership;
- Android runtime permission gate before Positioning credential use;
- physical POS sensor-backed positioning and own-device server-mediated Realtime PASS for the bounded Plan 035 scope;
- standardized arm64 Android release artifact generation;
- public MinIO Android distribution and logged-out web download;
- final validation captured in `.agents/evidence/plan-035-realtime-remediation-2026-08-18.md`.

Product/runtime details belong in `README.md`, `ARCHITECTURE.md`, `DESIGN.md`, `design/IMPLEMENTATION.md`, `design/data-source-matrix.md`, and `docs/mobile-distribution.md`. Do not duplicate those contracts here unless a temporary work item changes them.

## Historical limitations

Plan 034 was administratively closed without fabricating full acceptance. Plan 035 later proved the specific physical positioning/Realtime path it remediated, but unrelated Plan 034 items that were never exercised remain historical limitations rather than implicit PASS.

These historical limitations are **not an active backlog by default**. A future scoped plan must explicitly reopen any of them.

Other recorded external/deferred items include Google OAuth runtime acceptance, iOS/macOS device/build delivery, and store/association gates. Revalidate current conditions before treating any historical note as a new blocker.

## Security maintenance note

Historical dependency remediation evidence is in `.agents/evidence/security-dependency-remediation.md`. Do not infer current vulnerability status from that snapshot; run a fresh scan for new security work.

## Current execution authority

For future work read:

1. `AGENTS.md`;
2. this file;
3. `.agents/memory/decisions.md` when durable implementation decisions matter;
4. `.agents/protocols/git-workflow.md`;
5. current product docs relevant to the task;
6. an explicitly created active plan.
