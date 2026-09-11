# Plan 046 — Web Explore 2D Routing Foundation

Repository: `/home/farismnrr/Documents/Projects/situm-explore`
Status: execution active; Phases 0–1 complete, Phase 2 implementation underway
Expected branch: `plan/046-web-explore-2d-routing-foundation`
Codebase: web only
Dependency: Plan 045 / PR #43 already integrated into `main`
Observed planning base: `7782e7d` or newer `origin/main`
Primary planning evidence: `.agents/evidence/plan-046-resource-gathering-2026-09-11.md`
Successor boundary: future Plan 047 — Digital Twin 3D Route Projection

## Mission

Add real static POI-to-POI routing to the existing app-owned **2D Explore map** while preserving the current custom 2D and Three.js 3D map experiences.

Plan 046 must establish a reusable renderer-independent route core and prove one real same-floor route against Situm's own wayfinding result before any 3D route projection is attempted.

The product must continue to use:

- app-owned `IndoorMapCanvas` for 2D;
- app-owned Three.js `IndoorWalkCanvas` for Digital Twin 3D;
- real Situm workspace cartography;
- real Situm POIs;
- real Situm wayfinding path nodes/links.

Do **not** restore Situm Map Viewer as the primary `/app/map` renderer.

Also perform one independent minor revision: remove the redundant `3D Walk · <floor>` badge that collides with the actionable `2D Map` button.

---

## Read order before implementation

Read these in order:

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
14. `plans/041-navigation-first-map-ui.md` — historical reference only
15. `plans/019a-situm-static-directions-foundation.md` — historical reference only
16. `plans/020-situm-static-directions.md` — historical reference only
17. `plans/045-web-explore-2d-digital-twin-orientation.md` — immediate product predecessor
18. `.agents/evidence/plan-046-resource-gathering-2026-09-11.md`
19. this execution brief

Then inspect current source directly:

- `app/pages/app/map.vue`
- `app/pages/app/map.css`
- `app/components/map/IndoorMapCanvas.vue`
- `app/components/map/IndoorMapCanvas.css`
- `app/components/map/MapSearchDock.vue`
- `app/components/map/MapDestinationCard.vue`
- `app/components/map/IndoorWalkCanvas.vue`
- `app/components/map/IndoorWalkCanvas.css`
- `app/utils/indoor-walk-destinations.ts`
- `server/api/workspaces/[workspaceId]/situm/cartography.get.ts`
- `server/api/workspaces/[workspaceId]/situm/paths.get.ts`
- `shared/situm-cartography.ts`
- `shared/situm-paths.ts`
- `mobile/src/map/customRoute.ts` — historical implementation reference only
- installed `node_modules/@situm/sdk-js/dist/situm-sdk.d.ts`

Do not assume historical files still describe current runtime ownership.

---

## Non-negotiable product decisions

### Keep both current renderers

The intended browser product remains:

```text
/app/map
├── 2D: custom app-owned floorplan renderer
└── 3D: custom app-owned Three.js Digital Twin walkthrough
```

Do not replace either renderer with Situm Map Viewer.

### Situm remains spatial source of truth

Static routing must use:

- real Situm POI endpoint data;
- real Situm wayfinding path graph data;
- real floor/building Cartesian coordinate data.

Do not invent route fixtures or manually authored corridor lines.

### Web route calculation is app-owned

Current supported `@situm/sdk-js` Viewer `startDirections()` sends a route request into the embedded Viewer and returns no raw route geometry suitable for these custom renderers.

Plan 046 therefore computes the static route in app code **over Situm's real wayfinding graph**.

Use truthful wording. Do not claim that the raw route result came from the Situm Web SDK engine.

### Reuse is mandatory

The route core produced by this plan must be renderer-independent.

Plan 047 must be able to consume the exact same normalized `IndoorRoute` for Three.js projection without recomputing routing.

---

## Explicit non-goals

Plan 046 must not implement:

- 3D route line/ribbon/chevrons;
- Situm AR;
- GLB coordinate calibration;
- sensor-backed web location;
- browser blue dot;
- current-location routing;
- rerouting;
- ETA;
- walking-time estimates;
- arrival/off-route state;
- turn-by-turn instructions;
- voice guidance;
- route history/persistence;
- arbitrary tag-policy UI;
- accessibility-route UI without exact behavior evidence;
- cross-floor route acceptance without separate evidence;
- Situm Map Viewer as a product surface;
- undocumented iframe/postMessage scraping;
- a routing package/dependency unless clearly necessary;
- persistent unit tests;
- unrelated backend/database cleanup.

Do not expand scope merely because historical Plan 041 already contains navigation-specific helpers.

---

## Repository safety

During planning, the primary worktree had unrelated user-owned PostgreSQL/Drizzle/schema modifications.

Before editing:

```bash
git status --short --branch
git fetch origin
git branch --show-current
```

Rules:

- preserve all unrelated local changes;
- never `git reset --hard`;
- never `git clean -fd`;
- never silently stash/discard user work;
- do not include unrelated database files in Plan 046 commits;
- do not implement directly on `main`;
- create/reuse `plan/046-web-explore-2d-routing-foundation` according to `.agents/protocols/git-workflow.md`;
- do not create a linked worktree unless the user explicitly requests one;
- no force push;
- no PR or merge until explicitly authorized.

The Plan 046 planning/evidence files may already exist as legitimate uncommitted governance files. Preserve them when switching/creating the plan branch.

---

# Phase 0 — Revalidate contracts and establish the real route oracle

Do not change product behavior until this phase is complete.

## 0.1 Confirm dependency/base

Confirm `origin/main` contains Plan 045 / PR #43 and the current 2D-primary + explicit 3D behavior.

Record exact base commit in the Plan 046 execution/session evidence.

## 0.2 Revalidate current installed Situm contracts

Inspect installed `@situm/sdk-js` rather than relying on memory or old plans.

Confirm:

- installed package version;
- `cartography.getPaths` signature;
- `PathSearch` building filter support;
- exact `PathNode` fields;
- exact `PathLink` fields;
- exact `PathLink.origin` union;
- current Viewer `startDirections` return contract;
- whether installed version exposes any directions event that contains computed route geometry.

The planning evidence observed:

```text
installed @situm/sdk-js = 0.25.0
registry latest observed = 0.26.0
PathLink.origin = "both" | "source" | "target"
Viewer.startDirections(...) = Promise<void>
```

Treat those as evidence to recheck, not immutable assumptions.

Do not upgrade the SDK unless a concrete Plan 046 requirement is proven and reviewed.

## 0.3 Capture sanitized current venue graph facts

Using authenticated existing server routes, record non-secret evidence for the current target building:

```text
building id
floor ids/names
real POI count
path object count
node count
link count
origin distribution
accessible true/false distribution
tag distribution
cross-floor link count
```

Do not print/store credentials, auth headers, session secrets, raw API keys, or unnecessary personal data.

## 0.4 Select a same-floor real POI route oracle

Choose two real POIs A and B on the same floor for which Situm's own wayfinding route can be observed.

Record only the required spatial/product identifiers:

```text
POI A
- Situm numeric id
- name
- floor id
- x/y

POI B
- Situm numeric id
- name
- floor id
- x/y
```

Observe/reference both:

```text
A -> B
B -> A
```

Situm Viewer/wayfinding is an **acceptance oracle only**. Do not integrate it into `/app/map`.

## 0.5 Directionality evidence gate

Verify the exact semantics of `PathLink.origin` values before implementing traversal rules.

Required values:

```text
both
source
target
```

Use current official Situm docs, installed package source/types, and/or a controlled runtime comparison.

Do not infer semantic direction solely from naming if exact behavior is not established.

## 0.6 Tags/profile evidence gate

Inspect the actual graph's tags.

Situm documentation says tags may include/exclude route segments and may encode special restrictions. If the selected reference route depends on non-default tag filtering, establish that policy before claiming parity.

If material route-filter behavior remains unresolved, stop and report the blocker instead of implementing an apparently correct but semantically different solver.

### Phase 0 exit criteria

All must be true:

- Plan 045 dependency/base confirmed;
- installed path contract revalidated;
- sanitized real graph facts recorded;
- one real same-floor A/B pair selected;
- Situm reference A→B and B→A observable;
- directionality required for the reference route understood;
- no unresolved material tag/profile policy invalidates the comparison.

Persist Phase 0 evidence before the phase commit.

---

# Phase 1 — Minor 3D chrome cleanup

Remove the redundant top-right walkthrough status badge:

```text
3D Walk · <floor>
```

and its decorative live dot.

Expected files:

- `app/components/map/IndoorWalkCanvas.vue`
- `app/components/map/IndoorWalkCanvas.css`

Preserve:

- `2D Map` switch;
- 3D loading/error states;
- touch controls;
- walkthrough mouse/keyboard behavior;
- current hint if still useful;
- current z-order of actionable controls.

Remove dead badge/dot CSS including narrow-screen overrides.

Do not opportunistically redesign other 3D controls.

### Phase 1 exit criteria

On desktop and narrow browser layout:

- no `3D Walk · ...` badge remains;
- no live-dot decoration remains;
- `2D Map` is fully visible and clickable;
- 3D walkthrough behavior is otherwise unchanged.

---

# Phase 2 — Normalize path contract and build reusable route core

Create a small app-owned route utility; expected location:

```text
app/utils/indoor-route.ts
```

Do not place Dijkstra/projection logic inside Vue page/component code.

## 2.1 Normalize shared path direction type

If installed evidence confirms the union, prefer narrowing the current shared `origin: string` contract to the exact Situm values rather than passing arbitrary strings through the route core.

Any shared type change must be compatible with existing native callers.

Do not alter payload semantics beyond verified upstream behavior.

## 2.2 Route contract

Create a renderer-independent normalized route model.

Conceptual shape:

```ts
type IndoorRoutePoint = {
  floorId: number
  x: number
  y: number
  nodeId?: number
  kind?: 'endpoint' | 'snap' | 'graph'
}

type IndoorRoute = {
  fromPoiId: number
  toPoiId: number
  points: IndoorRoutePoint[]
}
```

Exact names are flexible, but requirements are not:

- no Vue/DOM/SVG/Three.js types in the route model;
- every route point carries floor identity;
- preserve real graph node IDs where applicable;
- endpoint/snap points may be virtual;
- result must be directly reusable in a later Three.js projection plan.

Do not put ETA/instruction/navigation state into this foundation model.

## 2.3 Build graph from real Situm paths

Use only actual nodes/links returned by `SitumPathsResponse`.

Must:

- preserve path/floor/node identity;
- safely reject links referencing missing nodes;
- honor proven one-way/two-way semantics;
- never fabricate missing connectivity;
- avoid mutating the upstream response.

For the mandatory same-floor shortest-route proof, edge cost should use physical Cartesian segment distance unless current verified Situm policy requires another weighting model.

Do not copy Plan 041's arbitrary `8 m` floor-transition penalty into Plan 046.

## 2.4 Snap POI endpoints to graph **edges**, not just nearest nodes

Plan 041's nearest-node method is not sufficient as the default fidelity target.

Implement endpoint projection onto eligible same-floor path links.

For each endpoint:

1. enumerate eligible links on the same floor;
2. obtain source/target node Cartesian coordinates;
3. project POI `(x,y)` onto each line segment;
4. clamp the projection parameter to `[0,1]`;
5. measure POI-to-projection distance;
6. choose the nearest valid eligible projection;
7. introduce a virtual snap node at that position;
8. virtually split/connect the relevant edge according to its verified directionality;
9. leave the original path DTO unchanged.

Conceptually:

```text
POI A
  |
  v
  A' ===== graph ===== B'
                     ^
                     |
                   POI B
```

The final geometry is:

```text
POI A -> A' -> ordered graph path -> B' -> POI B
```

If both endpoints project onto the same edge, handle that case directly and directionally rather than forcing unnecessary traversal through an endpoint node.

Normalize accidental consecutive duplicate points.

If no eligible snap edge exists, return a truthful no-route/failure state.

## 2.5 Shortest path traversal

Use a deterministic local shortest-path implementation (Dijkstra is sufficient for this bounded graph unless evidence warrants another algorithm).

No routing dependency is required by default.

Requirements:

- deterministic result for equal inputs;
- finite non-negative edge weights;
- directionality preserved;
- same-floor reference route is the acceptance target;
- no direct-line fallback on graph failure.

## 2.6 Cross-floor boundary

Keep `floorId` in the route model for future reuse.

Do not claim cross-floor correctness in Plan 046 unless Phase 0/implementation evidence establishes transition weighting and semantics strongly enough to add it without guessing.

Same-floor acceptance is sufficient to close Plan 046.

### Phase 2 exit criteria

For the selected real A/B pair, the route core returns a deterministic ordered route:

```text
A -> snap A -> real Situm graph -> snap B -> B
```

and returns an explicit failure for an intentionally unroutable/invalid input rather than fabricating geometry.

---

# Phase 3 — Building-scoped path loading and route orchestration state

## 3.1 Path loading

Current authenticated route:

```text
GET /api/workspaces/:workspaceId/situm/paths
```

Installed evidence indicates `cartography.getPaths({ buildingId })` is supported.

If confirmed, prefer adding validated optional building scoping:

```text
GET /api/workspaces/:workspaceId/situm/paths?buildingId=<numeric id>
```

Requirements:

- validate positive numeric building ID;
- preserve existing auth/workspace ownership;
- call the installed SDK's supported building filter;
- consider compatibility for existing callers that omit the query;
- do not expose credentials to the browser.

Do not add a second route endpoint if the existing paths route can own this cleanly.

## 3.2 Route state ownership

`app/pages/app/map.vue` should own the shared route selection/result state above both renderers.

Conceptual state:

```ts
routeStartPoiId
routeDestinationPoiId
activeRoute
routeRequestState
routeError
```

Rules:

- endpoint IDs always resolve to real current-building Situm POIs;
- start != destination;
- workspace change clears route state;
- building change clears route state;
- ordinary floor switching does not discard a valid building route;
- 2D -> 3D -> 2D preserves the route state;
- Plan 046 displays route geometry only in 2D;
- no fuzzy mapping between Situm POI state and 3D semantic-room destinations.

## 3.3 Map-first endpoint UX

Preserve the current lightweight map-first composition.

A real selected/search-result POI should be assignable as:

```text
Start
Destination
```

Once both valid endpoints exist, expose a clear static route action such as:

```text
Show route
```

and a clear/reset action.

A compact route summary may show only truthful endpoint names/floors, for example:

```text
Start: Pintu Masuk
Destination: Kitchen
[Show route] [Clear]
```

Do not restore a permanent historical Route sidebar unless the current composition genuinely requires it.

No browser `My location` origin.

Do not present ETA/distance/instructions in this plan.

## 3.4 Search/direct-map consistency

Selecting a POI by:

- direct 2D marker/label click;
- current POI search result;

must resolve to the same real `SitumCartographyPoi` endpoint state.

Do not create a separate routing-only POI catalog.

### Phase 3 exit criteria

A user can choose two real same-building Situm POIs through current Explore interactions and request a route that populates the shared normalized route state.

---

# Phase 4 — Render normalized route in current custom 2D map

Extend `IndoorMapCanvas`; do not add another map renderer.

Expected files:

- `app/components/map/IndoorMapCanvas.vue`
- `app/components/map/IndoorMapCanvas.css`
- optionally a small shared geometry helper if it prevents duplicate projection code.

## 4.1 Single coordinate contract

Use exactly the existing Situm Cartesian -> floor-surface mapping:

```text
screenX = x / buildingWidth * renderedMapWidth
screenY = (buildingLength - y) / buildingLength * renderedMapHeight
```

Prefer one reusable mapping helper so POIs and route points cannot diverge.

The route and floorplan must share the same fitted frame, pan and zoom transform.

## 4.2 Route layer

Render the active-floor route as a non-interactive app-owned overlay.

Requirements:

- above floorplan image;
- below interactive POI controls/labels;
- pointer-events disabled;
- clipped to the active map surface;
- transforms exactly with floorplan pan/zoom;
- visually distinct from raster artwork;
- no collision with search/destination/control chrome.

SVG/polyline/path is preferred if it cleanly participates in the current floor surface transform.

Do not manually shift points to make a screenshot look aligned.

## 4.3 Active floor segment

Render only route points/segments belonging to `floor.id`.

Even though Plan 046's release gate is same-floor, implement presentation in a floor-aware manner so the route model remains reusable.

## 4.4 Endpoint roles

Make start and destination visually distinguishable from ordinary POIs without making markers oversized.

Accessibility labels should communicate endpoint role.

Do not require color alone for semantic distinction.

### Phase 4 exit criteria

The same route stays registered to the exact same physical corridor while:

- zooming;
- panning;
- reset;
- selecting/deselecting other POIs;
- changing floor and returning.

---

# Phase 5 — Real authenticated runtime parity proof

Use production build + preview/staging. Do not use Nuxt dev mode as final acceptance authority.

Temporary Playwright/white-box scripts/screenshots are allowed only under current repository testing policy and must not remain tracked at closeout.

## 5.1 Primary A -> B route

Using the exact Phase 0 oracle pair:

1. load authenticated `/app/map`;
2. confirm default 2D current custom renderer;
3. set real POI A as Start;
4. set real POI B as Destination;
5. calculate/render the custom route;
6. capture route evidence;
7. compare route topology with Situm's reference route.

Required correctness observations:

- correct endpoint POIs;
- path request uses real workspace/venue data;
- route follows plausible configured corridor graph;
- no top/bottom coordinate inversion;
- no wall/corridor jump caused by projection mismatch;
- endpoint connectors attach to the expected path edges;
- custom topology materially agrees with Situm reference.

## 5.2 Reverse B -> A route

Repeat the exact process in reverse.

This is mandatory because it validates one-way/two-way handling.

If Situm A→B and B→A differ, custom behavior must preserve the meaningful difference rather than force symmetry.

## 5.3 Mismatch policy

If custom topology materially differs from the Situm reference, **do not manually patch route coordinates**.

Investigate in order:

1. endpoint edge projection/snap;
2. `origin` direction handling;
3. included/excluded tags/profile settings;
4. path response scoping;
5. graph construction/isolation;
6. edge weighting;
7. Cartesian-to-screen projection;
8. Situm reference configuration.

If parity remains unexplained, keep the plan blocked and return evidence to leader. Do not call it accepted because a line happens to render.

## 5.4 Failure/interaction checks

Verify:

- same-endpoint request rejected;
- missing path response does not create a route;
- unroutable endpoint pair gets truthful failure/no-route state;
- start can be replaced;
- destination can be replaced;
- route can be cleared;
- pan/zoom/reset preserve alignment;
- floor switch and return preserve route state;
- 2D -> 3D -> 2D preserves route state;
- 3D does **not** fabricate/display a route yet;
- redundant 3D badge is gone;
- `2D Map` button remains usable.

## 5.5 Lifecycle/performance regression checks

Verify:

- default 2D still performs no GLB request before explicit 3D entry;
- route state does not mount WebGL;
- repeated 2D/3D switching does not create duplicate WebGL canvases/listeners;
- 3D error semantics remain explicit;
- route loading/failure cannot leave a stale route for another workspace/building.

## 5.6 Security checks

Verify:

- no Situm credential is exposed to the custom Map renderer;
- Read & Write remains server-only;
- no secret values in logs/screenshots/evidence;
- paths/cartography stay authenticated and workspace-scoped;
- no generic proxy introduced.

### Phase 5 exit criteria

One real same-floor A→B route and its reverse are rendered in custom 2D and materially agree with Situm's reference behavior, or the plan remains honestly blocked with evidence.

---

# Phase 6 — Focused validation, persistence, leader handoff

## Implementation-time checks

During trial/error use only focused direct validation needed for the current change. Do not repeatedly run full governance wrappers.

## Required pre-handoff product checks

At minimum, truthfully run:

```bash
git diff --check
npm run lint
npm run typecheck
npm run build
```

plus the authenticated production-preview route acceptance from Phase 5.

Do not add/restore persistent unit tests.

Temporary E2E/white-box files must be removed before staging/commit/closeout.

## Persistence

Before each phase commit follow `.agents/protocols/persistence.md`.

At minimum update as current truth requires:

- this Plan 046 execution brief checkboxes/status;
- `.agents/state.md`;
- `.agents/memory/decisions.md` if route ownership becomes durable;
- `.agents/knowledge/` for reusable Situm path semantics if material;
- `.agents/sessions/2026-09-11.md` or current execution-date session;
- evidence files for real route/reference/runtime acceptance.

Do not modify historical plans to pretend they used the new architecture.

## Closure governance

Do not run Engineering Guard/maintainability during normal implementation iteration.

When the user explicitly asks for closure, follow current codebase-specific governance:

```bash
./.agents/scripts/engineering-guard.sh web full
python3 .agents/scripts/maintainability.py web
```

or the exact mode requested/currently required by governance.

Do not create a PR, merge, or delete branches unless explicitly authorized.

---

# Leader review gate

After implementation + focused verification, **STOP** and return the review bundle. Do not self-authorize PR/merge.

Required bundle:

1. exact branch and HEAD;
2. exact base commit;
3. concise diff summary by file;
4. selected real POI A/B names, IDs and floor;
5. sanitized path/node/link counts;
6. observed `origin`, tags, accessibility facts;
7. exact verified directionality semantics used;
8. explanation of endpoint-to-edge snap algorithm;
9. graph traversal/weighting explanation;
10. normalized `IndoorRoute` type/ownership;
11. A→B custom 2D route screenshot/evidence;
12. A→B Situm reference screenshot/observation;
13. B→A custom/reference result;
14. mismatch investigation if any;
15. pan/zoom/reset alignment evidence;
16. endpoint replace/clear/error/unroutable evidence;
17. 2D→3D→2D route-state preservation result;
18. confirmation that 3D route rendering was not fabricated;
19. confirmation redundant 3D badge/live dot were removed;
20. confirmation `2D Map` button remains intact;
21. confirmation default 2D still has no pre-opt-in GLB request;
22. `git diff --check`, lint, typecheck, build results;
23. confirmation temporary tests are removed;
24. confirmation unrelated user database changes were untouched;
25. exact remaining blockers/limitations.

Wait for leader/user direction after that review.

---

# Definition of done

Plan 046 is complete only if all are true:

- current custom 2D renderer remains primary;
- current custom Three.js 3D renderer remains intact;
- redundant 3D walk badge/live dot are removed;
- actionable `2D Map` switch remains intact;
- Start and Destination are real Situm POIs;
- routing graph comes from real Situm wayfinding Paths;
- current path/link direction semantics used by the selected route are evidence-backed;
- endpoint routing snaps to real path edges rather than nearest-node-only approximation;
- no arbitrary Plan 041 floor-transition penalty is reused for the same-floor proof;
- one real same-floor A→B route is rendered in custom 2D;
- reverse B→A is checked;
- custom route materially agrees with Situm's own reference route;
- route remains physically aligned under pan/zoom/reset;
- route can be replaced and cleared;
- invalid/unroutable cases never create synthetic direct geometry;
- route state is renderer-independent;
- route state survives 2D→3D→2D;
- 3D route rendering remains explicitly deferred;
- no browser location/navigation/ETA/rerouting capability is fabricated;
- no Situm credential boundary is widened;
- focused validation passes truthfully;
- leader review occurs before integration;
- unrelated user-owned DB changes remain untouched.

---

# Successor: Plan 047 — Digital Twin 3D Route Projection

Do not implement this section during Plan 046.

Plan 047 should consume the already-proven `IndoorRoute` and solve only 3D registration/presentation:

```text
Situm route point (floorId, x, y)
              |
              v
calibrated floor-specific transform
              |
              v
Three.js (x, z) + floor height
              |
              v
route ribbon / chevrons / transition marker
```

Required successor principles:

- no second route solver;
- no fuzzy semantic-room routing authority;
- explicit deterministic POI/path-to-GLB coordinate calibration;
- route must stay inside real corridors and respect floor transitions;
- 2D and 3D show the same selected route state.
