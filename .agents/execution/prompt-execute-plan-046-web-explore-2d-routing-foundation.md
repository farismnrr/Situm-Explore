# Execute Plan 046 — Web Explore 2D Routing Foundation

Repository root:
`/home/farismnrr/Documents/Projects/situm-explore`

Execution authority:
`.agents/execution/plan-046-web-explore-2d-routing-foundation.md`

Resource-gathering evidence:
`.agents/evidence/plan-046-resource-gathering-2026-09-11.md`

Expected branch:
`plan/046-web-explore-2d-routing-foundation`

## Mission

Execute Plan 046 end-to-end through its **leader review handoff**, but do not create a PR, merge, delete branches, or begin Plan 047 unless explicitly instructed later.

The product requirement is strict:

- keep the existing app-owned 2D Explore map;
- keep the existing app-owned Three.js Digital Twin 3D map;
- do not restore Situm Map Viewer as the product map;
- add useful static routing starting in custom 2D using real Situm POIs and real Situm wayfinding paths;
- make the normalized route reusable by the future 3D renderer;
- prove route correctness against Situm's own route for the same real POI pair;
- remove the redundant `3D Walk · <floor>` badge that collides with `2D Map`;
- do **not** implement 3D route rendering in this plan.

Do not reinterpret this as a UI-only task. The acceptance target is a real path that follows Situm's configured wayfinding graph and materially agrees with the Situm reference route.

## Read first

Before editing product code, read in this order:

1. `AGENTS.md`
2. `.agents/identity.md`
3. `.agents/state.md`
4. `.agents/README.md`
5. `.agents/protocols/chat-lifecycle.md`
6. `.agents/protocols/git-workflow.md`
7. `.agents/protocols/persistence.md`
8. `.agents/memory/decisions.md`
9. `ARCHITECTURE.md`
10. `plans/README.md`
11. `design/data-source-matrix.md`
12. `DESIGN.md`
13. `design/IMPLEMENTATION.md`
14. `plans/041-navigation-first-map-ui.md`
15. `plans/019a-situm-static-directions-foundation.md`
16. `plans/020-situm-static-directions.md`
17. `plans/045-web-explore-2d-digital-twin-orientation.md`
18. `.agents/evidence/plan-046-resource-gathering-2026-09-11.md`
19. `.agents/execution/plan-046-web-explore-2d-routing-foundation.md`

The execution brief is current task authority. Historical plans are evidence only.

## Git / dirty-worktree safety

The primary worktree contains unrelated user-owned Drizzle/PostgreSQL/schema modifications. Do not touch, stage, reset, clean, stash, discard, or absorb them.

Start by inspecting:

```bash
cd /home/farismnrr/Documents/Projects/situm-explore
git status --short --branch
git fetch origin
git branch --show-current
git log -1 --oneline origin/main
```

Plan 045 / PR #43 is already present on `main` according to planning-time Git evidence (`7782e7d`); revalidate the current remote truth.

Create or reuse:

```text
plan/046-web-explore-2d-routing-foundation
```

following `.agents/protocols/git-workflow.md`.

Do not create a linked worktree unless the user explicitly asks. Do not implement on `main`. Never force-push.

The Plan 046 `.agents` planning files may already be legitimate uncommitted files. Preserve them and include them in Plan 046 persistence/commits as appropriate.

## Critical technical warning

Do **not** copy `mobile/src/map/customRoute.ts` verbatim.

It is historical proof that app-owned graph routing over Situm paths works, but it currently:

- snaps POIs to nearest graph nodes;
- traverses all links symmetrically;
- applies an app-defined floor-transition penalty;
- contains navigation/ETA/instruction helpers outside this plan.

Plan 046's mandatory same-floor fidelity target is stronger:

- snap each endpoint to the nearest eligible same-floor **path edge**;
- virtually split/connect the edge without mutating source DTOs;
- honor verified one-way/two-way semantics from `PathLink.origin`;
- use real Cartesian link length for the default same-floor shortest path unless evidence proves another weight;
- return no-route truthfully instead of drawing a direct fallback.

## Phase 0 is mandatory before implementation

Do not skip directly to coding.

Revalidate installed/current Situm contracts and capture sanitized real venue facts. In particular:

- exact installed `@situm/sdk-js` version;
- `getPaths` building filter;
- `PathLink.origin` type and exact direction semantics;
- tags/accessibility distribution;
- whether any installed/current web directions event exposes actual computed route geometry;
- one real same-floor POI pair A/B;
- observable Situm reference route for A→B and B→A.

Planning-time evidence found the current Viewer `startDirections` returns `Promise<void>` and does not provide raw route geometry to our renderer. Do not depend on undocumented iframe/postMessage behavior.

If directionality/tag/profile semantics necessary for the reference route cannot be established, stop and report that blocker instead of guessing.

## Implementation target

The architecture should end up conceptually as:

```text
real Situm POI A + POI B
          |
          v
real workspace Situm paths
          |
          v
app/utils/indoor-route.ts
  - edge projection/snap
  - directional graph
  - shortest path
          |
          v
normalized IndoorRoute
          |
          v
app/pages/app/map.vue shared route state
          |
          v
IndoorMapCanvas 2D route overlay
```

Future Plan 047 will consume the same `IndoorRoute` for Three.js. Do not build a second 3D solver now.

## UI direction

Keep Explore map-first and lightweight.

A real selected/search-result POI should be usable as:

- Start;
- Destination.

Once both endpoints are valid, expose an explicit route action and clear/reset action.

Do not restore the old permanent Route sidebar unless current composition genuinely requires it.

Do not add browser My Location, ETA, route instructions, arrival/off-route, rerouting, or sensor-backed guidance.

## Route rendering direction

Render route geometry inside the existing `IndoorMapCanvas` using the same fitted floor surface and physical projection as POIs:

```text
screenX = x / buildingWidth * renderedMapWidth
screenY = (buildingLength - y) / buildingLength * renderedMapHeight
```

Route must:

- move/scale exactly with floorplan pan/zoom;
- sit above floorplan and below interactive POI controls;
- not intercept pointers;
- visually distinguish Start and Destination;
- render only active-floor geometry;
- never be manually offset to make one screenshot pass.

## Mandatory runtime comparison

Use production build + preview/staging, not Nuxt dev mode, as final runtime authority.

For the same real POI pair:

1. render custom A→B route;
2. compare it with Situm reference A→B;
3. render custom B→A route;
4. compare it with Situm reference B→A.

If they materially differ, investigate in this order:

1. endpoint-to-edge snapping;
2. link directionality;
3. tag/profile filtering;
4. path building scope;
5. graph construction;
6. weight model;
7. coordinate projection;
8. reference configuration.

Do not hand-patch geometry. Keep the plan blocked if parity remains unexplained.

## Minor 3D cleanup

Remove only the redundant `3D Walk · <floor>` badge/live dot. Preserve the `2D Map` control and all current walkthrough behavior.

## Validation policy

During implementation use focused checks only.

Before leader handoff, at minimum run truthfully:

```bash
git diff --check
npm run lint
npm run typecheck
npm run build
```

and the authenticated production-preview route acceptance.

Persistent unit tests are prohibited. Temporary E2E/white-box/black-box aids are allowed only as execution tools and must be removed before staging/closeout.

Do not run Engineering Guard/maintainability repeatedly during implementation. Closure governance happens only when explicitly requested.

## Persistence and commits

Follow `.agents/protocols/persistence.md` before each completed phase commit.

Keep the execution brief, state, decisions/knowledge where materially changed, session trace, and route evidence aligned with exact truth.

Each completed implementation phase should be committed and pushed to the plan branch according to repository governance.

Do not commit unrelated dirty database changes.

## Stop condition / handoff

After Plan 046 implementation and focused runtime verification, STOP and send the leader the exact review bundle required by `.agents/execution/plan-046-web-explore-2d-routing-foundation.md`.

Do not:

- create PR;
- merge;
- delete branch;
- begin 3D route rendering;
- claim closure without leader review.

If a mandatory route parity condition cannot be proven, return BLOCKED with concrete evidence instead of a fake PASS.
