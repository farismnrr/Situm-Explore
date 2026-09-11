# Plan 045 implementation / orientation evidence — 2026-09-10

## Scope

This evidence was collected in `/home/farismnrr/Documents/Projects/situm-explore-plan045` from baseline `d899320` using the runtime GLBs and staging runtime configuration already present under the primary worktree. No tracked primary-worktree file was modified; its pre-existing PostgreSQL/Drizzle changes were left untouched.

## Deterministic 3D view contract

The renderer now uses one normalized-bounds descriptor for both `lt1` and `lt2`:

- canonical high-Y/top -> runtime `-Z`;
- canonical low-Y/bottom -> runtime `+Z`;
- spawn normalized `(x=0.50, z=0.78)` in the lower circulation band;
- look target normalized `(x=0.94, z=0.78)`, so initial forward is `+X`;
- eye height remains `1.620`.

Semantic Entrance/room objects are no longer consulted by `setSpawn()` or reset orientation. They remain destination/search geometry only.

## Runtime-equivalent GLB evidence

Headless Chromium rendered the actual LT1/LT2 GLBs with the same Three.js eye-level camera convention and the final descriptor. Temporary harness/screenshots were visually inspected and removed before closeout per repository policy.

### F1 / LT1

- model bounds: min `(-10.1000004, 0, -2.6000004)`, max `(10.1000000, 4.0882006, 2.5999999)`;
- camera: `(~0, 1.6200000, 1.4559998)`;
- forward: `(+1, 0, ~0)`;
- GLASS ENTRY center: `(8.9500000, -0.5250001)` in X/Z;
- WORKROOM 1 center: `(5.3250000, -0.5250001)`;
- WORKROOM 2 center: `(-0.3249998, -0.5250001)`;
- stair spans the left side around X `-4.35` to `-5.43`.

The final eye-level render was visually inspected. It places the F1 workroom/glass side on screen-left (canonical high-Y / runtime `-Z`) and the circulation/walkway side on screen-right (canonical low-Y / runtime `+Z`). The model coordinates independently confirm Workroom 1 is the workroom nearest the right-side main entry and the stair remains on the opposite negative-X side; no LT1-only transform is involved.

### F2 / LT2 non-regression reference

- model bounds: min `(-10.1000004, 0, -2.5999999)`, max `(10.1000000, 4.0889101, 2.6000000)`;
- camera: `(~0, 1.6200000, 1.4560000)`;
- forward: `(+1, 0, ~0)`.

The final eye-level render remains a readable corridor/interior presentation and uses the exact same normalized orientation contract as F1.

## Static invariants

Focused scans found no negative-scale/mirror transform and no `Math.PI`/180-degree LT1-only camera or model rotation. Floor mapping remains level 0 -> `lt1`, level 1 -> `lt2`.

## Authenticated production E2E — 2026-09-11

Authenticated browser acceptance was completed against a Docker production image built from the Plan 045 worktree. Because the active staging database still uses the historical `public.*` schema while this worktree expects `situm_explore.*`, the test did **not** migrate or mutate staging. Instead, a disposable PostgreSQL container was migrated with the Plan 045 schema and populated from read-only copies of the existing staging owner/workspace/Situm configuration rows. The Plan 045 production container used the same staging session/encryption runtime configuration and the verified runtime GLBs mounted read-only.

Observed browser results:

- default `/app/map` rendered exactly one app-owned 2D map canvas and zero WebGL canvases;
- default 2D generated **zero** `/situm/3d-model/*` requests;
- 2D floor switching F2 -> F1 -> F2 completed with zero GLB requests;
- explicit F1 **Digital Twin 3D** requested `.../3d-model/lt1` and received HTTP 200 `model/gltf-binary`;
- explicit F2 3D requested `.../3d-model/lt2` and received HTTP 200 `model/gltf-binary`;
- F1 diagnostics: floor id `70343`, level `0`, slot `lt1`, camera `(-0.000, 1.620, 1.456)`, yaw `-1.570796`, forward `(+1, 0, ~0)`, canonical top axis `-z`, model ready;
- F2 diagnostics: floor id `70345`, level `1`, slot `lt2`, camera `(-0.000, 1.620, 1.456)`, yaw `-1.570796`, forward `(+1, 0, ~0)`, canonical top axis `-z`, model ready;
- app-shell screenshots for both floors were visually inspected. F1 retained the canonical workroom/high-Y side versus circulation/low-Y side relationship, Workroom 1 remained nearest the main entry, and stair/entry did not swap sides. F2 remained visually correct;
- returning F2 3D -> 2D preserved building `19922` and floor `70345`;
- three repeated 2D -> 3D -> 2D cycles each showed exactly one WebGL canvas while 3D was mounted and zero after returning to 2D;
- forced GLB request failure remained at `view=3d`, displayed `3D walkthrough unavailable / Failed to fetch`, exposed the explicit **2D Map** action, rendered no 2D map behind the error, and did not silently fall back;
- the forced-failure test intentionally produced the browser `net::ERR_FAILED` console error. A separate unrelated 404 resource console message was also observed and was not tied to the 3D lifecycle acceptance.

The temporary Playwright scripts, cookie jar, screenshots, disposable PostgreSQL database/container, disposable Plan 045 app container, Docker network, and local E2E image were removed after inspection per repository policy.

## Gate result

Plan 045 authenticated production-browser acceptance is complete. The release-blocking F1 visual orientation acceptance and F2 non-regression reference were both actually inspected; no fabricated PASS result is recorded.

## Permanent staging schema migration / redeploy — 2026-09-11

The active staging PostgreSQL database was migrated from the historical `public.*` application tables to the repository-required `situm_explore.*` schema. Before migration, a mode-0600 custom-format PostgreSQL 17 backup was created at `.data/backups/staging-pre-situm-schema-migration-20260911-065102.dump` and validated with `pg_restore --list`.

The application container was stopped and the five application tables were moved in one transaction with `ALTER TABLE ... SET SCHEMA situm_explore`. Row counts were preserved exactly: users 1, workspaces 2, workspace Situm configs 2, provider identities 0, app settings 0. Three foreign keys remain present and zero application tables remain in `public`. Repository `npm run db:migrate` then completed successfully with 10 migration-history rows.

Staging was rebuilt from the normal Plan 045 source (no public-schema compatibility overlay) as `ghcr.io/farismnrr/situm-explore:plan045-local` and the Compose service was force-recreated. The resulting container is running/healthy, liveness returns 200, `/login` returns 200, unauthenticated `/app/map` returns the expected 302, and recent container logs contain no schema/query errors.

## Leader Review remediation — 2026-09-11

The user manually inspected the Plan 045 checkpoint and reported the visual result as acceptable. Leader review accepted the functional checkpoint based on that user inspection plus independent review of the implementation diff, runtime evidence, and orientation invariants. The leader did not independently repeat the user's manual browser visual inspection.

Two maintainability blockers were remediated without changing the accepted 3D orientation contract. Three.js diagnostics/resource-disposal helpers were extracted to `app/utils/indoor-walk-renderer.ts`; Explore query/native-link helpers moved to `app/utils/explore-map.ts`; and page-only styles moved to `app/pages/app/map.css`. The canonical descriptor remains unchanged: high-Y/top -> runtime `-Z`, spawn normalized `(0.50, 0.78)`, look target `(0.94, 0.78)`, eye height `1.620`, shared by LT1 and LT2. Final source sizes are `IndoorWalkCanvas.vue` 349 lines and `app/pages/app/map.vue` 346 lines.

Leader-remediation validation passed: `git diff --check`, focused ESLint, `npm run typecheck`, and `npm run build`. The production build emitted only the existing non-fatal large-chunk/plugin-timing warnings. `python3 .agents/scripts/maintainability.py web` passed with `scanned=140 file_debt=0 function_debt=0 directory_debt=2 bypass_debt=0`.

The pre-migration backup was also copied out of the disposable Plan 045 worktree into the primary project's durable `.data/backups/staging-pre-situm-schema-migration-20260911-065102.dump`. Source and durable copies are both mode `0600`, 12,853 bytes, with identical SHA-256 `a08a3a6c01a75d6ae755729e620e4d87cdfc5187774846533ff53804a6adc168`. PostgreSQL 17.10 `pg_restore --list` successfully parsed the durable custom-format archive. No additional database/schema mutation occurred during leader remediation.

## Explicit closure governance — 2026-09-11

At the user's explicit closure request, the web closure lifecycle was run once after remediation was complete. `./.agents/scripts/engineering-guard.sh web full` passed repository policy, full ESLint, Nuxt typecheck, production build, and `npm audit` with 0 vulnerabilities. The build emitted only non-fatal large-chunk/plugin-timing warnings.

`python3 .agents/scripts/maintainability.py web` then passed on the closure run with `scanned=140 file_debt=0 function_debt=0 directory_debt=2 bypass_debt=0`; the two directory-density entries are unchanged baseline debt. `.agents/scripts/validate.sh` passed agent-workspace governance validation and `git diff --check` passed. `.tmp-tests` was absent and process inspection showed no Chrome, Chromium, or Playwright process remaining.

Plan 045 is therefore closure-complete on its plan branch. This evidence file is part of the closure commit; the resulting commit and pushed branch head are verified after commit creation and reported in the closeout. PR creation and integration remain a separate user authorization gate.
