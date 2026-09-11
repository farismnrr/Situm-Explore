# Plan 046 Leader Review Remediation — 2026-09-11

## Result

**PASS — leader review findings remediated.**

This remediation was performed directly by the leader after reviewing the Plan 046 implementation at branch HEAD `1e959a5`. It does not authorize PR creation, merge, branch deletion, closure governance, or Plan 047 execution.

The previously accepted Plan 046 topology oracle remains applicable: the proof venue contains one path object, all 29 links are untagged and `origin: both`, and the remediation does not change the route topology for that accepted graph.

## Finding 1 — stale in-flight route response

### Problem

`useExploreIndoorRoute.calculateRoute()` originally protected late responses only against workspace/building changes. A request started for A→B could finish after the user cleared the route, replaced an endpoint, or started a newer request and restore obsolete geometry/state.

### Remediation

Route requests now use a monotonically increasing request generation. The accepted request identity includes:

- request generation;
- workspace ID;
- building ID;
- start POI ID;
- destination POI ID.

`clearRoute()`, endpoint assignment/replacement, workspace/building invalidation, invalid request attempts, and newer calculations invalidate older generations. A late response or error may mutate route state only when all captured identity fields still match.

### Focused proof

A temporary `.tmp-tests/` white-box harness exercised:

1. Show route → Clear before the path response resolves;
2. Show route → replace Destination before the response resolves;
3. first Show route request → second Show route request before the first resolves.

Observed result:

- Clear kept endpoints/route cleared after the old response resolved;
- endpoint replacement kept the new endpoint and did not restore old geometry;
- the older request could not publish state while the newer request remained loading;
- only the newest request could transition to `ready` and publish an active route.

The temporary harness was deleted immediately after execution and is not retained in Git.

## Finding 2 — unresolved Situm path-tag semantics

### Problem

The route core previously ignored `PathLink.tags`. The Plan 046 oracle is untagged, so its accepted parity proof was valid, but generic tagged venues could have silently produced a route whose filtering semantics differ from Situm.

### Remediation

The same-floor route core now fails closed with `unsupported-route-tags` when any eligible same-floor path edge contains a non-empty Situm tag list. The UI reports that the venue uses Situm route tags that static web routing does not support yet.

No route-tag meaning is guessed, no tagged edge is silently treated as ordinary, and no fallback geometry is produced.

This is intentionally conservative until a future evidence-backed plan proves the intended tag/profile semantics.

## Additional graph hardening — preserve path-object identity

Leader review also reconciled an execution-brief invariant that was not fully represented in the first implementation: graph keys now include the Situm path-object index as well as node/link identity.

This prevents independent path objects in the unscoped Situm response from accidentally colliding when node IDs repeat.

A temporary white-box case used two disconnected path objects with repeated node IDs on the same floor. The solver correctly returned no route instead of creating false connectivity.

## Current product documentation

Current architecture documentation was reconciled with the implemented Plan 046 capability:

- `ARCHITECTURE.md` now records authenticated Situm path consumption, app-owned same-floor static routing, tagged/cross-floor fail-closed boundaries, shared route state, and absent 3D route projection;
- `design/data-source-matrix.md` now records the web static-routing source/owner and unsupported tagged/cross-floor boundaries;
- `design/IMPLEMENTATION.md` now records the route core, generation-owned request lifecycle, 2D route projection, and Viewer-as-oracle-only boundary;
- `.agents/memory/decisions.md` and `.agents/knowledge/situm-wayfinding-routing.md` record the durable request-generation, tag, and path-identity rules.

Historical plans/evidence were not rewritten.

## Validation

Focused checks run after remediation:

- `git diff --check`: PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- temporary white-box remediation checks: PASS

A second clean-source validation was performed from a temporary `git archive HEAD` snapshot with only the remediation files overlaid, excluding the primary worktree's unrelated user-owned Drizzle/PostgreSQL/schema edits. Because a raw Git archive does not contain generated `.nuxt/eslint.config.mjs`, `npx nuxt prepare` was run first. The clean snapshot then passed:

- prepared Nuxt generated config: PASS
- `git diff --cached --check`: PASS
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS

Only the existing non-fatal Nuxt/Vite chunk-size and plugin-timing warnings were emitted.

## Existing runtime/oracle evidence retained

The accepted A→B/B→A runtime evidence remains `.agents/evidence/plan-046-runtime-acceptance-2026-09-11.md` and the four Plan 046 route screenshots. The accepted graph is one-path, all-untagged, and all-bidirectional; therefore the leader remediation does not change that route's graph topology or projection.

## Repository safety

The unrelated user-owned Drizzle/PostgreSQL/schema worktree modifications remain present and untouched. They were excluded from the clean-snapshot validation and must not be staged into the Plan 046 remediation commit.

## Leader disposition

The earlier P1 stale-response finding and P2 tag/documentation findings are resolved. Plan 046 now passes the Leader Review Gate and is ready for explicit closure governance when requested by the user.
