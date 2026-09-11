# Plan 046 Phase 0 blocker — 2026-09-11

## Result

**Historical blocker — superseded by the accepted resume and fresh oracle in `.agents/evidence/plan-046-phase0-oracle-2026-09-11.md`.**

The stop recorded below was legitimate at the time and occurred before product implementation.

## Repository/base

- branch: `plan/046-web-explore-2d-routing-foundation`
- exact base: `7782e7d4429868a7d3becd05fc0f9114f98225f1`
- dependency: Plan 045 / PR #43 confirmed on `origin/main`
- unrelated Drizzle/PostgreSQL/schema working-tree changes preserved untouched

## Installed Situm contract revalidation

Installed `@situm/sdk-js`: `0.25.0`.

Revalidated declarations:

- `cartography.getPaths(params?: PathSearch): Promise<Paths[]>`
- `PathSearch = { buildingId?: ID }`
- `PathNode = { id: number, floorId: number, x: number, y: number }`
- `PathLink = { source: number, target: number, origin: 'both' | 'source' | 'target', tags: string[], accessible: boolean }`
- Viewer `startDirections(...) = Promise<void>`
- installed declarations expose no computed route-geometry result event

Current official Situm wayfinding documentation rechecked on 2026-09-11 confirms:

- links are two-way/bidirectional by default;
- links may be configured one-way;
- link tags can be included/excluded from route computation;
- accessible flags are routing-relevant metadata.

## Missing mandatory route oracle

Historical Plan 019A/020 evidence proves Situm Viewer successfully rendered forward and reverse static routes and identifies a real pair used in acceptance (`Pintu Masuk` and `Ruang Kerja Lt 2`). That evidence does not preserve the actual route line geometry/topology. Temporary screenshots/browser artifacts were intentionally removed after those runs.

The current production-style staging runtime is healthy on port 3005 and the public tunnel redirects unauthenticated `/app/map` requests to `/login`. This execution context does not have a reusable authenticated browser session or a plaintext login credential available in repository/runtime files. Therefore a fresh Situm Viewer A→B and B→A route cannot currently be observed/captured for topology comparison.

## Why execution stops

Plan 046 explicitly requires Phase 0 to establish a real same-floor A/B POI pair plus observable Situm A→B and B→A reference routes before any product implementation. A historical statement that a route rendered is insufficient for the later mandatory topology comparison.

Accordingly:

- no product implementation was started;
- no `IndoorRoute` solver was added;
- no routing UI was added;
- no path API behavior was changed;
- no 2D route overlay was added;
- the 3D badge was not removed yet, because Phase 1 is after the blocked Phase 0;
- no PR/merge/Plan 047 work was performed.

## Unblock requirement

Provide an authenticated staging/browser session (or otherwise authorize a safe authenticated runtime path) so the executor can capture the same real POI pair's Situm reference route in both directions, including enough visual/topological evidence for custom-route comparison. Then resume Phase 0; do not skip it.
