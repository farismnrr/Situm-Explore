# Plan 046 runtime acceptance — 2026-09-11

## Gate result

**PASS for the Plan 046 Leader Review Gate.** Product implementation and focused production-preview acceptance are complete. This is not Plan 046 closure or integration authorization.

The final product continues to use the app-owned 2D `IndoorMapCanvas` and app-owned Three.js `IndoorWalkCanvas`. Situm Viewer was used only as the temporary Phase 0 route oracle and is not mounted by `/app/map`. No 3D route geometry was implemented.

## Branch/base

- branch: `plan/046-web-explore-2d-routing-foundation`
- exact base: `7782e7d4429868a7d3becd05fc0f9114f98225f1`
- implementation HEAD before this evidence commit: `e80d1aefa038b099733a2f921996c6528ca0c117`
- Plan 045 / PR #43 dependency confirmed on `origin/main`

## Phase 0 oracle

Selected real venue:

- building `19870` — Rukan Artha Gading Niaga
- floor `69907` — Base, level 0
- 5 real POIs
- 1 Situm path object
- 22 nodes
- 29 links
- origin distribution: 29 × `both`
- accessibility: 29 × `true`
- tags: none

Selected same-floor pair:

- A: `1274449` — PT Perkasa Pilar Utama — `(65.88475066860696, 69.42530693939027)`
- B: `1274451` — BCA Cab Artha Gading Niaga — `(100.12890526847639, 170.90430743293402)`

Fresh Situm reference screenshots:

- `.agents/evidence/plan-046-oracle-a-to-b-2026-09-11.png`
- `.agents/evidence/plan-046-oracle-b-to-a-2026-09-11.png`

The installed `@situm/sdk-js` contract is 0.25.0. `getPaths(params?: PathSearch)` accepts a typed `buildingId`, path nodes are `id/floorId/x/y`, links are `source/target/origin/tags/accessible`, and `origin` is `both | source | target`. The selected proof graph uses only `both`, so no one-way interpretation is exercised by the mandatory oracle. It is fully accessible and untagged, so no material tag/profile/accessibility ambiguity applies to this proof.

A runtime contract correction remains important: Situm's building-scoped path request for this real venue returned `404 entity_not_found`, while the established unscoped paths request returned the valid graph above. The server/browser path read therefore remains on the proven unscoped contract; the route core restricts endpoint integration to eligible same-floor graph edges.

## Route core

`app/utils/indoor-route.ts` owns the renderer-independent route calculation.

Each endpoint is projected onto every eligible same-floor path segment, clamped to the segment, and attached at the nearest valid projection. The chosen edge is virtually split for that endpoint without mutating the Situm DTO. Directional virtual edges follow the normalized link direction. Consecutive duplicate geometry is removed.

Traversal is deterministic Dijkstra over physical Cartesian segment length. There is no arbitrary floor-transition penalty and no straight-line fallback. Cross-floor requests remain explicit unsupported failures in Plan 046 because transition weighting/profile semantics are not sufficiently evidenced.

The real graph white-box proof produced graph-node sequence:

- A→B: `13 → 5 → 2 → 8`
- B→A: `8 → 2 → 5 → 13`

The reverse is exact because every link in this selected graph is bidirectional.

Normalized contract:

```ts
type IndoorRoutePoint = {
  floorId: number
  x: number
  y: number
  nodeId?: number
  kind: 'endpoint' | 'snap' | 'graph'
}

type IndoorRoute = {
  fromPoiId: number
  toPoiId: number
  points: IndoorRoutePoint[]
}
```

The route is owned above both renderers by `app/pages/app/map.vue` through `useExploreIndoorRoute`. The 2D renderer consumes it. The 3D renderer does not recompute or render it.

## Production-preview A→B / B→A

Acceptance ran against a production build from an exact clean archive of committed Plan 046 HEAD. This avoided incorporating the primary worktree's unrelated user-owned database/schema edits into runtime evidence. It used the existing disposable Plan 046 PostgreSQL data and short-lived session material in process memory only. No credential or session value was printed or persisted.

Custom screenshots:

- A→B: `.agents/evidence/plan-046-custom-a-to-b-2026-09-11.png`
- B→A: `.agents/evidence/plan-046-custom-b-to-a-2026-09-11.png`

The custom A→B route follows the same configured corridor topology visible in the fresh Situm oracle: endpoint connector from A to the lower path edge, travel up the lower vertical leg, across the central corridor, up the western vertical leg, across the upper corridor, then the short connector to B. It does not cross intervening walls or invent a direct endpoint chord. The reverse custom route traverses the same corridor chain in the opposite order, matching the reverse Situm reference topology. The custom SVG geometry is exactly reversed between B→A and A→B, consistent with the selected graph's all-`both` directionality.

No manual point offsets or screenshot-specific geometry patches were used. The rendered route comes directly from endpoint edge projections plus the graph solver.

Observed SVG coordinates for A→B:

```text
231.345,397.714
241.283,398.013
245.387,261.473
93.991,260.085
95.247,218.880
91.442,61.807
351.565,62.108
351.589,41.385
```

B→A was the exact reverse sequence.

## Interaction/alignment acceptance

The floor raster and SVG route remain in the same `.floor-surface` transform.

Observed production-browser transforms:

- initial: `translate(0px, 0px) scale(1)`
- after pan: `translate(97.44px, 56.04px) scale(1)`
- after zoom: `translate(97.44px, 56.04px) scale(1.12)`
- after reset: `translate(0px, 0px) scale(1)`

This confirms the route is not maintained by separate pan/zoom math.

Behavior checks:

- Clear removed the route overlay.
- Replacing Destination cleared stale geometry before a new route.
- Same Start/Destination produced `Choose different start and destination places.`
- A forced empty path response produced `This building has no configured Situm wayfinding paths.` and zero route overlays.
- No synthetic direct fallback appeared.
- A→B active route survived three `2D → 3D → 2D` cycles unchanged.
- There were zero GLB requests before explicit 3D opt-in.
- Each explicit 3D entry made one GLB request and mounted exactly one WebGL canvas.
- No 2D route overlay existed while 3D was mounted.
- The redundant `3D Walk · <floor>` badge/live dot was absent.
- The actionable `2D Map` button remained present and usable.
- Existing explicit 3D error semantics were observed when the model asset path was intentionally unavailable in an earlier validation environment; no silent 2D fallback occurred.

The selected oracle building has only one floor. Therefore a multi-floor browser floor-switch-and-return runtime route-state check cannot be demonstrated on this exact oracle venue. Source ownership is nevertheless explicit: route state clears on workspace/building changes and is not tied to floor changes. Cross-floor route calculation itself remains outside Plan 046 acceptance and fails explicitly.

## Security / architecture

- custom Map renderer receives no raw Situm credential;
- cartography/path data remain authenticated and workspace-owned through Nitro;
- Read & Write remains server-only;
- no generic Situm proxy was added;
- no secret values were written to screenshots/evidence;
- no browser positioning, blue dot, ETA, rerouting, arrival, turn-by-turn guidance, or synthetic route result was added;
- no Situm Viewer product surface was restored;
- no 3D route was fabricated.

## Focused validation

Final branch-source validation was run from a clean `git archive HEAD` snapshot with the repository's installed dependencies, specifically so unrelated dirty database/schema files in the primary working tree could not contaminate the product evidence:

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- production preview + authenticated browser route acceptance: PASS

The build emitted only the existing non-fatal Nuxt chunk/plugin timing warnings.

Before the handoff commit, all temporary browser/white-box helpers under `.tmp-tests/` are removed. No persistent unit test or validation harness is retained.

## Remaining limitations

- Plan 046 proves same-floor routing only.
- The selected real proof graph has no one-way links and no tags, so the implemented directional/tag-neutral behavior is contract-backed but one-way/tagged venue parity is not claimed as runtime acceptance.
- Building-scoped `getPaths({ buildingId })` is typed by SDK 0.25.0 but is not usable for the selected real venue; the verified unscoped read remains in production.
- The selected oracle venue has one floor, so same-route floor-switch-and-return cannot be physically exercised there.
- 3D route projection is intentionally absent and belongs only to future Plan 047 after separate authorization.

Plan 046 is now stopped at the Leader Review Gate. No PR, merge, branch deletion, or Plan 047 work is authorized by this evidence.
