# Plan 046 Resource Gathering — Web Explore 2D Routing Foundation

Date: 2026-09-11
Status: planning evidence; implementation not started
Repository observed: `/home/farismnrr/Documents/Projects/situm-explore`
Observed repository HEAD during gathering: `7782e7d` (`Merge pull request #43 from farismnrr/plan/045-web-explore-2d-digital-twin-orientation`)

## Purpose

This evidence exists so the Plan 046 executor does not repeat basic discovery, restore the wrong historical architecture, or assume unsupported Situm web-route contracts.

The requested product direction is:

- keep the current app-owned 2D Explore map;
- keep the current app-owned Three.js Digital Twin 3D walkthrough;
- do not restore Situm Map Viewer as the main product map;
- restore useful POI-to-POI routing, starting with a correct 2D route foundation;
- make the routing result reusable by a later 3D route-projection plan;
- separately remove the redundant 3D mode badge that currently collides with the `2D Map` button.

Plan 046 must stop at a proven 2D route. 3D route rendering is successor work.

---

## Repository observations

### Current web Explore ownership

Current `/app/map` no longer uses `SitumViewer` as its primary renderer.

Observed current ownership:

- `app/pages/app/map.vue`
  - owns `2d | 3d` view-mode state;
  - loads authenticated workspace cartography;
  - renders app-owned 2D `MapIndoorMapCanvas` by default;
  - lazy-mounts app-owned Three.js `LazyMapIndoorWalkCanvas` for explicit 3D;
  - preserves building/floor context across view switching;
  - currently keeps 2D Situm POI state and 3D semantic-room destination state separate.
- `app/components/map/IndoorMapCanvas.vue`
  - app-owned raster floorplan + POI renderer;
  - maps real Situm Cartesian POI coordinates into the floor surface;
  - owns pan, pinch/zoom, reset, POI marker placement, and label collision handling.
- `app/components/map/IndoorWalkCanvas.vue`
  - app-owned Three.js/WebGL walkthrough;
  - owns camera movement and semantic-room travel.
- `app/utils/indoor-walk-destinations.ts`
  - 3D destinations are derived from trusted GLB semantic objects such as Workroom/Kitchen/Restroom/Entry;
  - these semantic destinations are not the same authority as Situm POIs.
- `app/components/situm/SitumViewer.vue`
  - remains in source as an isolated SDK utility;
  - exposes typed Viewer methods including `startDirections` and `cancelDirections`;
  - is not currently mounted by `/app/map`.

This means the current 3D `Go` interaction is camera travel, not routing.

### Current 2D coordinate formula

`IndoorMapCanvas.vue` already uses the same physical-space convention previously proven by Plan 041:

```text
screenX = x / buildingWidth * renderedMapWidth
screenY = (buildingLength - y) / buildingLength * renderedMapHeight
```

The active floor raster and POI overlay share the same fitted frame and pan/zoom transform.

Any 2D route overlay should reuse this exact coordinate contract rather than introduce another projection formula.

### Current 3D badge collision

Observed CSS:

`app/components/map/IndoorWalkCanvas.css`

- `.walk-mode-badge { top: 16px; right: 16px; z-index: 8; }`
- mobile override: `top: 112px; right: 12px`

`app/pages/app/map.css`

- `.view-mode-switch { top: 16px; right: 16px; z-index: 18; }`
- mobile override: `top: 116px; right: 12px`

Therefore the reported collision is deterministic source behavior, not a browser glitch. Removing the redundant `3D Walk · <floor>` badge and its live dot is the preferred minor fix; preserve the actionable `2D Map` switch.

---

## Existing Situm data paths in this repository

### Cartography

Existing authenticated workspace route:

```text
GET /api/workspaces/:workspaceId/situm/cartography
```

Current DTO includes real:

- buildings;
- building dimensions;
- floors;
- floor `mapUrl`;
- POIs;
- POI numeric IDs;
- POI floor IDs;
- POI Cartesian `location.x/y`.

### Wayfinding paths

Existing authenticated workspace route:

```text
GET /api/workspaces/:workspaceId/situm/paths
```

Current handler:

```ts
return { paths: await client.cartography.getPaths() }
```

Current shared contract in `shared/situm-paths.ts`:

```ts
export interface SitumPathNode {
  id: number
  floorId: number
  x: number
  y: number
}

export interface SitumPathLink {
  source: number
  target: number
  origin: string
  tags: string[]
  accessible: boolean
}

export interface SitumPath {
  nodes: SitumPathNode[]
  links: SitumPathLink[]
}
```

The installed `@situm/sdk-js` declaration is narrower and should be preferred when normalizing the project contract:

```text
PathLink.origin = "both" | "source" | "target"
```

The executor must verify exact direction semantics before implementing one-way traversal; names alone are not sufficient evidence.

The installed cartography API supports `getPaths(params?: PathSearch)` and `PathSearch` exposes an optional `buildingId`, so building-scoped path loading is likely available. Verify the exact installed call before changing the server route.

---

## Historical routing evidence inside the project

### Plans 019A / 020 — Situm Viewer static directions

Historical web work proved that real numeric Situm POI IDs can be supplied as route endpoints to the Viewer:

```text
viewer.startDirections({ navigationFrom, navigationTo, routeType? })
```

Manual production acceptance later recorded forward and reverse static route rendering and cancellation in the embedded Situm Viewer.

This proves that the configured venue has had real routable POIs/path data. It does not make the historical Viewer UI the desired current architecture.

### Plan 041 — app-owned route graph on native

Plan 041 already implemented an app-owned route solver over the same Situm `paths` data in:

```text
mobile/src/map/customRoute.ts
```

Useful proven concepts:

- build graph from real Situm nodes and links;
- calculate a deterministic ordered route;
- split route geometry by floor;
- refuse to invent connectivity when graph routing fails;
- app-owned rendering can stay registered to Situm Cartesian coordinates.

However Plan 041 must be treated as reference, not copied blindly.

Important differences in the current native solver:

1. It snaps endpoints to the nearest **graph node**.
2. It traverses every link symmetrically.
3. It adds an app-defined `8 m` floor-transition penalty.
4. It includes navigation-specific distance/instruction logic outside Plan 046 scope.

Those choices were acceptable for that bounded native plan but are not automatically equivalent to Situm's own static route behavior.

Plan 046 should pursue higher route fidelity before 3D reuse.

---

## Installed Web SDK evidence

Observed project dependency during gathering:

```text
@situm/sdk-js 0.25.0
```

Observed current registry version during gathering:

```text
0.26.0
```

Do not upgrade merely because a newer version exists.

### Viewer static directions

Installed `SitumViewer.vue` wraps:

```ts
viewer.startDirections({ navigationFrom, navigationTo, routeType })
viewer.cancelDirections()
```

Installed `@situm/sdk-js` types define:

```text
startDirections(...): Promise<void>
```

The current official JS Viewer reference also describes `startDirections` as a command sent to the Viewer and states that it does not return a route value.

Official reference:

- https://developers.situm.com/sdk_documentation/sdk-js/classes/Viewer.html

Conclusion:

**The supported Web Viewer action is not currently a raw-route geometry source for the custom 2D/Three.js renderers.**

### Current JS docs discrepancy worth rechecking

The current public JS SDK landing page (checked 2026-09-11) shows an example subscribing to a `ViewerEventType.DIRECTIONS_REQUESTED` event:

- https://developers.situm.com/sdk_documentation/sdk-js/index.html

The installed project `0.25.0` event declarations inspected during gathering did **not** expose `DIRECTIONS_REQUESTED`; they exposed POI/floor/building/map/navigation events but not a directions-result event.

The executor should recheck the exact latest/installed event payloads during Phase 0 if considering an SDK upgrade, but must not assume that a "directions requested" event contains computed route geometry. The current documented `startDirections()` return contract remains `Promise<void>`.

No implementation in Plan 046 should depend on an undocumented iframe/postMessage payload.

---

## Official Situm wayfinding findings

### Paths are the routing graph

Current Situm documentation describes wayfinding Paths as nodes and links representing passable paths, used by Situm to compute shortest routes from A to B.

It also documents that path links can carry:

- custom routing tags;
- one-way/two-way restrictions;
- accessible/not-accessible properties.

Source checked 2026-09-11:

- https://situm.com/docs/wayfinding-paths/

Implication:

A custom solver that ignores `origin`, material tags, or accessibility policy may differ from Situm even if geometry is otherwise correct.

### Raw route engine is documented for mobile-oriented SDKs

Situm's Routes documentation distinguishes:

1. routes calculated/displayed by Map Viewer;
2. raw routes calculated by the Situm SDK engine.

The raw-route documentation is presented for Android and says equivalent APIs exist for iOS/Cordova/React Native. It does not currently present a raw DirectionsManager for `@situm/sdk-js` web clients.

Sources checked 2026-09-11:

- https://situm.com/docs/sdk-routes/
- https://situm.com/docs/sdk-navigation/

The documented raw `Route` concept contains route geometry/segments useful for custom rendering in those SDK families. That supports the feasibility of route visualization, but does not create a supported web raw-route API.

### AR does not solve the web raw-route boundary

Situm AR is a Visual Mobile SDK capability using the smartphone camera and motion sensors to display 3D navigation arrows/POIs in the physical world.

Source checked 2026-09-11:

- https://situm.com/en/product/augmented-reality/

Therefore Situm AR is not a drop-in WebGL/Three.js Digital Twin route overlay for this browser app.

### Current visual SDKs can show 3D routes, but they are not the requested renderer

Situm's built-in wayfinding UI supports 2D/3D maps and navigation, including decorative 3D models, but the user explicitly wants to keep the current app-owned visual renderers rather than replace them with Situm's Map Viewer.

Source checked 2026-09-11:

- https://situm.com/docs/built-in-wayfinding-ui/

This is useful proof that 3D route visualization is a valid product concept, not authority to replace the current map.

---

## Route algorithm implication for Plan 046

The Plan 046 route solver should not simply choose the graph node nearest each POI and run Dijkstra from node to node.

For fidelity, endpoint integration should be modeled as projection/snap onto the nearest eligible same-floor **path link/edge**, then insert virtual endpoint graph positions without mutating the source graph.

Conceptual geometry:

```text
POI A
  |
  | endpoint connector
  v
  A' ===== Situm path graph ===== B'
                                ^
                                |
                              POI B
```

Expected final normalized route:

```text
POI A -> A' -> ordered graph points -> B' -> POI B
```

The implementation must:

- choose eligible edges on the POI floor;
- project the Cartesian point to each segment;
- clamp projection to the segment endpoints;
- choose the nearest valid projection;
- split/connect that edge virtually for routing;
- preserve directionality where proven;
- normalize consecutive duplicate points;
- return a typed/explicit no-route result rather than drawing a direct fake segment.

The exact shortest-path weighting should initially use physical Cartesian link length for the same-floor proof unless verified Situm policy requires otherwise.

Do not import Plan 041's arbitrary cross-floor penalty into the mandatory same-floor route foundation.

---

## Route validation strategy

The desired confidence gate is not "the algorithm returns points". It is visual comparison against Situm's own route for the same real POI pair.

Phase 0 should select a real same-floor POI pair known to route in Situm's Viewer/wayfinding.

Mandatory reference checks:

```text
A -> B
B -> A
```

Why both directions matter:

- exposes one-way/two-way path mistakes;
- exposes source/target interpretation mistakes;
- prevents accidental symmetric routing when Situm's graph is directional.

If custom and Situm routes differ materially, investigate in this order:

1. endpoint edge snapping;
2. `origin` direction semantics;
3. tag filtering/profile behavior;
4. graph isolation/path selection;
5. edge weighting;
6. 2D coordinate projection;
7. Situm reference configuration.

Never hand-edit/polyline-patch a route to make one screenshot look correct.

---

## Reusable architecture target

Plan 046 should create a renderer-independent route model owned above the 2D/3D renderers.

Conceptual contract:

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

Exact naming may change, but the boundary must stay independent of Vue DOM/SVG and Three.js.

Expected ownership:

```text
app/pages/app/map.vue
  -> route selection/orchestration state

app/utils/indoor-route.ts
  -> path graph, endpoint snapping, shortest-path result

app/components/map/IndoorMapCanvas.vue
  -> 2D presentation only

future 3D plan
  -> consume the same IndoorRoute
  -> calibrate Situm XY to GLB XZ
  -> render route ribbon/chevrons
```

Plan 047 must not create a second routing engine.

---

## Security and product truth boundaries

Preserve current authority:

- browser Map receives server-mediated cartography/path data, not a raw Situm credential;
- workspace Only Read remains server read authority and bounded direct-client authority only where explicitly approved;
- Read & Write stays server-only;
- no generic Situm proxy;
- no synthetic path if upstream paths are absent/unroutable;
- no browser `My location`, blue dot, rerouting, ETA, arrival, or sensor-backed turn-by-turn claims in Plan 046;
- no fuzzy POI-to-semantic-room matching.

The truthful web copy should describe the static route as calculated from the venue's Situm wayfinding paths, not claim that the Situm Web SDK returned a raw Route object.

---

## Dirty-worktree safety observed during gathering

The primary repository worktree contained unrelated user-owned modifications in Drizzle/schema files while resource gathering occurred.

Observed categories included:

- `drizzle.config.ts`;
- migration SQL/snapshots;
- `server/db/schema.ts`.

These changes are outside Plan 046.

The executor must inspect and preserve them. Never reset/clean/stash/discard or absorb them into Plan 046 without separate user authorization.

Repository governance says linked worktrees are not required and should not be created unless explicitly requested. Follow `.agents/protocols/git-workflow.md`; safely create/switch to the dedicated Plan 046 branch while preserving unrelated changes.

---

## Resource-gathering conclusion

Plan 046 is technically viable with the existing product architecture.

The highest-confidence sequence is:

```text
real Situm POIs
    +
real Situm paths
    |
    v
edge-snap + graph route core
    |
    v
normalized IndoorRoute
    |
    v
current custom 2D renderer
    |
    v
compare against Situm reference route
```

Only after this is proven should a successor plan calibrate Situm Cartesian XY into the GLB coordinate space and render the same route in Three.js.

No product implementation was performed as part of this resource gathering.
