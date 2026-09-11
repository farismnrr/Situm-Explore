# Situm wayfinding path semantics

_Last verified: 2026-09-11 during Plan 046._

## Installed web contract

`@situm/sdk-js@0.25.0` exposes:

- path nodes: `id`, `floorId`, `x`, `y`;
- path links: `source`, `target`, `origin`, `tags`, `accessible`;
- `origin` is typed as `'both' | 'source' | 'target'`;
- the installed type/runtime method accepts `cartography.getPaths({ buildingId })` and maps it to `/api/v1/buildings/:buildingId/paths`, but that is not sufficient runtime authority: the selected live Plan 046 venue returned `404 entity_not_found` for that scoped URL while the verified unscoped `/api/v1/paths` read returned its real path graph.

Situm's current wayfinding documentation states that links are bidirectional by default, may be configured one-way, may be marked accessible/not accessible, and may carry route-filtering tags. The `origin` value identifies the end from which a one-way link originates: `source` permits source→target, `target` permits target→source, and `both` permits both directions.

## Plan 046 runtime graph

The release-proof graph for building `19870` / floor `69907` contains 29 links and every link is `origin: both`, accessible, and untagged. Therefore the mandatory A↔B parity proof exercises verified two-way semantics without relying on an unobserved profile/tag filter.\n\nFor this venue, Plan 046 deliberately keeps the browser request on the existing authenticated unscoped paths endpoint. The renderer-independent route core selects only links whose source and target nodes are on the selected endpoints' floor, so unrelated path objects are not traversed. Do not promote the SDK's typed `buildingId` option into the product request unless a future live venue/runtime proof establishes that scoped endpoint.

## Routing boundary

Plan 046 computes a renderer-independent static route over real path edges. POI endpoints project to the nearest eligible same-floor edge and that edge is virtually split for traversal. Link cost is Cartesian segment length. Path-object identity participates in graph-node keys so separately returned path objects cannot accidentally collide through repeated node IDs. No direct-line fallback is allowed.

Non-empty path tags are a fail-closed boundary for the generic browser solver until their route-filter/profile semantics are proven for the intended venue. Do not silently traverse tagged links as ordinary links.

Route requests are generation-owned. Any endpoint replacement, Clear, workspace/building change, or newer route request invalidates older in-flight results before they may mutate active route state.

Cross-floor routing remains outside Plan 046 because transition cost/selection semantics have not been proven for the web route core. The Plan 046 solver therefore fails explicitly for endpoints on different floors rather than guessing a transition weighting.
