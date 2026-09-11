# Situm wayfinding path semantics

_Last verified: 2026-09-11 during Plan 046._

## Installed web contract

`@situm/sdk-js@0.25.0` exposes:

- path nodes: `id`, `floorId`, `x`, `y`;
- path links: `source`, `target`, `origin`, `tags`, `accessible`;
- `origin` is typed as `'both' | 'source' | 'target'`;
- `cartography.getPaths({ buildingId })` is supported.

Situm's current wayfinding documentation states that links are bidirectional by default, may be configured one-way, may be marked accessible/not accessible, and may carry route-filtering tags. The `origin` value identifies the end from which a one-way link originates: `source` permits source→target, `target` permits target→source, and `both` permits both directions.

## Plan 046 runtime graph

The release-proof graph for building `19870` / floor `69907` contains 29 links and every link is `origin: both`, accessible, and untagged. Therefore the mandatory A↔B parity proof exercises verified two-way semantics without relying on an unobserved profile/tag filter.

## Routing boundary

Plan 046 computes a renderer-independent static route over real path edges. POI endpoints project to the nearest eligible same-floor edge and that edge is virtually split for traversal. Link cost is Cartesian segment length. No direct-line fallback is allowed.

Cross-floor routing remains outside Plan 046 because transition cost/selection semantics have not been proven for the web route core. The Plan 046 solver therefore fails explicitly for endpoints on different floors rather than guessing a transition weighting.
