# Plan 046 Phase 0 route oracle — 2026-09-11

## Result

**PASS — Phase 0 blocker resolved.**

A fresh authenticated Situm Viewer topology oracle was captured before product routing implementation proceeded. The Viewer was used only as a temporary validation surface; it was not integrated into `/app/map`.

## Repository/base

- branch: `plan/046-web-explore-2d-routing-foundation`
- exact base: `7782e7d4429868a7d3becd05fc0f9114f98225f1`
- dependency: Plan 045 / PR #43 confirmed on `origin/main`
- unrelated user-owned Drizzle/PostgreSQL/schema working-tree changes remained untouched

## Installed contract revalidation

Installed `@situm/sdk-js`: `0.25.0`.

Revalidated:

- `cartography.getPaths(params?: PathSearch): Promise<Paths[]>`
- `PathSearch` supports `buildingId`
- `PathNode = { id, floorId, x, y }`
- `PathLink = { source, target, origin: 'both' | 'source' | 'target', tags, accessible }`
- Viewer `startDirections(...): Promise<void>`
- no installed event exposes a raw computed route geometry result

## Venue graph selection

The first configured workspace/building inspected (building `19922`, Berjaya Inovasi Global) returned real POIs but zero path objects, so it was rejected as the Plan 046 oracle rather than inventing connectivity.

The second owner-scoped workspace supplied a usable real graph:

- building: `19870` — Rukan Artha Gading Niaga
- floor: `69907` — Base, level 0
- real POIs: 5
- path objects: 1
- nodes: 22
- links: 29
- `origin`: 29 × `both`
- accessibility: 29 × `true`
- tags: none

Because every link in the selected graph is bidirectional, accessible, and untagged, the mandatory same-floor parity proof has no unresolved tag/profile/accessibility filter policy.

## Selected real POI pair

A:

- id: `1274449`
- name: PT Perkasa Pilar Utama
- floor: `69907` / Base
- Cartesian: `(65.88475066860696, 69.42530693939027)`

B:

- id: `1274451`
- name: BCA Cab Artha Gading Niaga
- floor: `69907` / Base
- Cartesian: `(100.12890526847639, 170.90430743293402)`

## Authenticated Viewer oracle method

A temporary local-only Playwright validation harness:

1. created a short-lived application session in memory from the existing staging session protection configuration;
2. accessed the existing owner-scoped `viewer-auth` endpoint;
3. loaded the installed Situm SDK UMD build plus axios into an otherwise blank local validation page;
4. created a Situm Viewer for building `19870`;
5. invoked `startDirections` using the exact numeric POI IDs above;
6. captured A→B and B→A after the Viewer rendered the reference topology;
7. closed the browser.

No plaintext login, Situm key, session cookie, or other credential was persisted to source, evidence text, browser storage, or Git. No temporary validation source file was created in the repository.

## Reference evidence

- A→B screenshot: `.agents/evidence/plan-046-oracle-a-to-b-2026-09-11.png`
- B→A screenshot: `.agents/evidence/plan-046-oracle-b-to-a-2026-09-11.png`

The two screenshots are the authoritative topology oracle for the later custom-route comparison. A route merely rendering in the custom map will not be accepted; its corridor topology must materially agree with these references.

## Phase 0 exit

All Phase 0 criteria are now satisfied:

- Plan 045 dependency/base confirmed;
- installed path contract revalidated;
- sanitized real graph facts captured;
- a real same-floor A/B pair selected;
- fresh Situm A→B and B→A references captured;
- directionality for this graph is known (`both` on every link);
- no material tag/profile/accessibility ambiguity remains for the selected proof.

Product implementation may proceed in phase order.
