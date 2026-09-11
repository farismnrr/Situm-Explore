# Situm Path API Investigation

## Executive Summary

**BLOCKED BY SITUM BACKEND**

The official Situm Map Editor and the authenticated API both reach the documented
Wayfinding Paths update route, but building `19954` has no server-side `Path`
entity. The authenticated update request is rejected before the submitted graph
is accepted:

```text
PUT https://api.situm.com/api/v1/buildings/19954/paths
404 entity_not_found
The entity Path with value 19954 is not found
```

The browser save flow, current SDK, public OpenAPI, historical SDK tags, and
current map-editor bundle all converge on that same `PUT` route. No documented or
client-used `POST`, `createPath`, or path-initialization operation was found. A
client-side workaround would require an undocumented/unscoped mutation or a
change to unrelated building data, both outside the authorized scope. Situm must
provision the missing Path aggregate for this building or expose a supported
create/upsert operation.

Phase 2 legacy archaeology is complete. The 2020 public OpenAPI, old default
host, all published JavaScript SDK packages inspected, official mobile SDK
sources, and an archived maps bundle provide no historical bootstrap contract.
The one target-scoped PUT sent to the historical default host returned the same
missing-Path error. The result remains blocked by the Situm backend, not by an
untried documented legacy client flow.

No credential, token, API key, cookie, or secret header is stored in this report
or in the repository.

## Target

- Building ID: `19954`
- Floor ID: `70557`
- Allowed mutation scope: Wayfinding Path nodes/links for this building/floor only

## Authentication Flow

1. The official dashboard login succeeded in the browser session.
2. The target building and its cartography editor opened normally.
3. For direct API reproduction, the owner credential was used transiently against
   `POST /api/v1/auth/access_tokens`; the returned bearer token remained in
   process memory only.
4. The current map-editor bundle constructs the Situm SDK from either an
   `auth.jwt` or `auth.api_key` value supplied by the dashboard embed, together
   with a configured `auth.domain`. The raw embed key and all token values were
   deliberately redacted and not persisted.

The authenticated `POST` probe returned `405 Method Not Supported`, while the
authenticated `PUT` reached the Path entity lookup and returned `404`. This
distinguishes the missing entity from the unauthenticated `401` baseline and from
an authorization failure.

## Browser / Network Findings

The official browser flow was reproduced on `dashboard.situm.com`:

1. Open building `19954`.
2. Open Cartography → Map editor.
3. Open the Paths tool.
4. Activate Draw and create a temporary two-node, one-link graph on floor
   `70557`. The graph was not persisted.
5. Press Save.
6. The editor displayed `Error uploading paths: Error: The entity Path with
   value 19954 is not found`.
7. The browser console recorded the matching map-editor error:

   ```text
   Error upserting paths gf: The entity Path with value 19954 is not found
   at Of.parseRequestException (.../assets/hooks-DDpYD6zL.js:18:8156)
   at Of.request (.../assets/hooks-DDpYD6zL.js:18:7574)
   at async le (.../assets/hooks-DDpYD6zL.js:27:91547)
   ```

The current map-editor assets identify the save call chain as:

```text
Save
  -> putPaths
  -> E.cartography.patchPath(buildingId, pathForm)
  -> PUT /api/v1/buildings/{buildingId}/paths
```

The authenticated request body used for the minimal reproduction had this
editor-shaped structure (all values are target-building test data, not secrets):

```json
{
  "links": [
    {
      "accessible": true,
      "floor_id": 70557,
      "id": "1_2",
      "origin": "both",
      "source": 1,
      "tags": [],
      "target": 2,
      "type": "link"
    }
  ],
  "nodes": [
    {
      "floor_id": 70557,
      "id": 1,
      "lat": -6.150661046805553,
      "lng": 106.89667996148233,
      "type": "node",
      "x": 16.133938,
      "y": 3.292751,
      "metadata": {
        "attached_links": {
          "1_2": { "target_floor": null }
        }
      }
    },
    {
      "floor_id": 70557,
      "id": 2,
      "lat": -6.150680913020906,
      "lng": 106.89666706713763,
      "type": "node",
      "x": 16.065625,
      "y": 0.661639,
      "metadata": {
        "attached_links": {
          "1_2": { "target_floor": null }
        }
      }
    }
  ]
}
```

The browser automation surface exposed console/DOM and loaded asset evidence but
did not provide a network-event/HAR capture API. The request and response were
therefore independently reproduced with the authenticated HTTP client and
correlated to the exact SDK and frontend call sites. No unsanitized HAR was
created.

## Confirmed API Behavior

| Method | Endpoint | Status | Meaning |
|---|---|---:|---|
| `GET` | `/api/v1/buildings/19954` | `200` | Target building exists. |
| `GET` | `/api/v1/buildings/19954/floors` | `200` | Target floor exists and belongs to the building. |
| `GET` | `/api/v1/paths` | `200` `[]` | No path graphs are visible in the authenticated organization response. |
| `GET` | `/api/v1/paths?building_id=19954` | `200` `[]` | Query form does not create or expose a graph. |
| `GET` | `/api/v1/paths?buildingId=19954` | `200` `[]` | Camel-case query form has the same result. |
| `GET` | `/api/v1/buildings/19954/paths` | `404` `entity_not_found` | The building-scoped Path aggregate is absent. |
| `OPTIONS` | `/api/v1/buildings/19954/paths` | `204` | Route is registered. |
| `HEAD` | `/api/v1/buildings/19954/paths` | `404` | No Path entity is available for the lookup. |
| `POST` | `/api/v1/buildings/19954/paths` | `405` | Route explicitly supports `PUT, GET`; no scoped create method. |
| `PUT` | `/api/v1/buildings/19954/paths` | `404` `entity_not_found` | Official update route cannot update a missing Path entity. |
| `PATCH` | `/api/v1/buildings/19954/paths` | `404` `entity_not_found` | Does not create the missing entity. |
| `PATCH` | `/api/v1/paths/19954` | `404` route/static-resource style response | No supported path-by-ID creation/update route was found. |

The exact error body from the scoped `PUT` was:

```json
{
  "status": 404,
  "code": "entity_not_found",
  "message": "The entity Path with value 19954 is not found",
  "errors": []
}
```

The supplied investigation baseline also recorded the same scoped failure via
the authenticated dashboard host and the same missing-Path behavior for a
separate previously created building (`19922`). That makes an account/building
provisioning defect more likely than corruption unique to `19954`.

## Official Documentation Findings

- [Situm REST/OpenAPI documentation](https://developers.situm.com/pages/rest/openapi/)
  publishes the path operations and authentication schemes.
- [Situm Wayfinding Paths](https://situm.com/docs/wayfinding-paths/) describes a
  path as nodes and links; links may be bidirectional or one-way and may carry
  accessibility/tags semantics.
- [Situm Wayfinding](https://situm.com/docs/wayfinding/) describes path graphs as
  the basis for indoor route calculation.
- [Situm JS SDK CartographyApi](https://developers.situm.com/sdk_documentation/sdk-js/classes/_internal_.CartographyApi.html)
  documents `getPaths` and `patchPath`, but no `createPath` method.

The official public contract documents read operations and one building-scoped
update operation. It does not document a path creation operation.

## Raw OpenAPI Findings

The raw specification was downloaded from the Scalar page's public
`situm_public_api.yaml` asset and inspected directly.

Path operations:

- `GET /api/v1/paths` — `operationId: getPaths`, optional `building_id` query
  parameter, returns an array of `Path` objects.
- `GET /api/v1/buildings/{building_id}/paths` —
  `operationId: getBuildingPaths`, returns an array of `Path` objects.
- `PUT /api/v1/buildings/{building_id}/paths` —
  `operationId: updateBuildingPaths`, accepts `requestBody: PathForm` and
  documents a successful update response.
- There is no `POST` operation on the building-scoped paths resource and no
  public path-by-ID create operation.

The public `Path` schema contains:

- `nodes`: objects with `id`, `floor_id`, `x`, and `y`;
- `links`: objects with `source`, `target`, `origin` (`source`, `target`, or
  `both`), `tags`, and the specification's historical `accesible` spelling.

`PathForm` is the same nodes/links graph shape and has no documented `id`
property or required field list. The installed SDK and frontend use the corrected
`accessible` spelling in their client-side model.

The OpenAPI security section supports bearer JWT and API-key authentication with
permission levels that include read/write and cartography editing. The target
request was made with a valid owner bearer session; the failure was entity lookup,
not missing authentication.

## Current SDK Findings

The installed package is `@situm/sdk-js` `0.25.0`.

Relevant local files:

- `node_modules/@situm/sdk-js/dist/situm-sdk.d.ts:434-453`
- `node_modules/@situm/sdk-js/dist/situm-sdk.d.ts:682-690`
- `node_modules/@situm/sdk-js/dist/cjs/situm-sdk.js:858-878`

The client implementation is effectively:

```ts
getPaths(params = {}) {
  const url = params.buildingId
    ? `/api/v1/buildings/${params.buildingId}/paths`
    : "/api/v1/paths";
  return this.apiBase.get({ url });
}

patchPath(buildingId, pathForm) {
  return this.apiBase.put({
    body: pathForm,
    url: `/api/v1/buildings/${buildingId}/paths`,
  });
}
```

The SDK types define `Paths` as `{ nodes: PathNode[]; links: PathLink[] }`.
`PathNode` has `id`, `floorId`, `x`, `y`; `PathLink` has `source`, `target`,
`origin`, `tags`, and `accessible`. There is no `createPath` method and no
delete-path method.

## Historical SDK Findings

The public [situm-sdk-js repository](https://github.com/situmtech/situm-sdk-js)
was inspected across tags from `v0.1.0` through `v0.26.0`.

- Every checked version uses `GET /api/v1/paths` and
  `GET /api/v1/buildings/{buildingId}/paths`.
- Every checked version uses `PUT /api/v1/buildings/{buildingId}/paths` for
  `patchPath`.
- No checked tag contains `createPath`, `upsertPath`, `POST /paths`, or a path
  initialization endpoint.
- The first public release renamed the client method `updatePath` to
  `patchPath`; the HTTP route remained the same.
- Historical tests and `examples/4-building-crud.ts` exercise GET and PUT only.
  A test comment says “update/create a path”, but the implementation still calls
  the same PUT route and is not evidence of a server-side create contract.
- Historical mock `Path` responses contain only `nodes` and `links`; they do not
  expose a `Path.id` field.

This is a stable client/API shape rather than a recent SDK regression.

## Frontend Reverse Engineering

The current `https://maps.situm.com` entry page loaded these relevant assets:

- `assets/index-CtNHNGza.js`
- `assets/hooks-DDpYD6zL.js`

The relevant minified client code in `hooks-DDpYD6zL.js` contains:

```js
getPaths(e = {}) {
  let t = e.buildingId
    ? `/api/v1/buildings/${e.buildingId}/paths`
    : `/api/v1/paths`;
  return this.apiBase.get({ url: t });
}

patchPath(e, t) {
  return this.apiBase.put({
    body: t,
    url: `/api/v1/buildings/${e}/paths`
  });
}
```

The provider-level save function is:

```js
le = async (e, t) => {
  await E.cartography.patchPath(e, t);
};
// provider value: { ..., putPaths: le, ... }
```

The editor keeps path edits in `pathsEditor.changesHistory`. When a link is
materialized, it derives endpoint `metadata.attachedLinks` entries, including a
`targetFloor` value for cross-floor links. The editor therefore has rich working
state, but the save boundary is still the single SDK PUT call.

The loaded JavaScript source maps were requested but returned the SPA HTML
fallback rather than source-map JSON. No hidden create route was found in the
downloaded map-editor asset set. The visible error text is localized/generated
at the editor layer, while the console stack identifies the SDK request wrapper.

## Path Entity Model

The best-supported model is one logical Path graph aggregate per building:

- the scoped route is keyed by `building_id`;
- the OpenAPI `Path` response is a graph object, not an envelope with an exposed
  `id`;
- SDK fixtures contain no `Path.id`;
- the backend error calls the missing entity `Path` and uses the building value
  (`19954`) in the lookup message.

It is therefore reasonable to describe the resource as “the building's Path
aggregate”, but it is **not proven** that a public `Path.id` property equals the
building ID. The public schema does not expose that property. The evidence also
does not identify the lifecycle event that should provision the aggregate
(building creation, wayfinding enablement, or another server-side migration).

## Experiments

| Order | Experiment | Request/result | Interpretation |
|---:|---|---|---|
| 1 | Browser editor reproduction | Draw 2 nodes + 1 link; Save → scoped `PUT` error in UI and console | Official client fails at the update boundary. |
| 2 | Resource existence | `GET /buildings/19954`, `GET /buildings/19954/floors` → `200` | Building and floor are valid. |
| 3 | Scoped path read | `GET /buildings/19954/paths` → `404 entity_not_found` | Path aggregate is missing. |
| 4 | Organization path read | `GET /paths` → `200 []` | No existing graph is available to reuse. |
| 5 | Query variants | `/paths?building_id=19954` and `/paths?buildingId=19954` → `200 []` | Query variants do not initialize a graph. |
| 6 | Route metadata | `OPTIONS` scoped → `204`; `HEAD` scoped → `404` | Route exists; entity still absent. |
| 7 | Candidate create | Authenticated `POST` scoped → `405`, supported methods `[PUT,GET]` | No public scoped POST create route. |
| 8 | Official update | Authenticated `PUT` scoped with the minimal graph → `404 entity_not_found` | Failure occurs before graph validation/persistence. |
| 9 | Alternate method | Authenticated `PATCH` scoped → same `404 entity_not_found` | PATCH does not create the aggregate. |
| 10 | Path-by-ID guess | `PATCH /api/v1/paths/19954` → route/static-resource `404` | No supported path-by-ID route found. |
| 11 | Client/history review | Current and historical SDKs, OpenAPI, old default host, mobile sources, and archived map bundle expose no bootstrap operation | No reasonable documented/client-side initialization path remains. |

No deletion, building/floor/cartography replacement, other-building mutation,
or unrelated resource write was performed.

## Root Cause

The frontend labels the operation as an “upsert”, but the supported backend
operation behaves as an update against a pre-existing building Path aggregate.
For building `19954`, that aggregate is absent. The server returns
`entity_not_found` before accepting the submitted nodes and links. The client
cannot create the missing record because:

1. the documented resource has only GET and PUT;
2. the scoped POST candidate is explicitly rejected with 405;
3. the current and historical SDKs have no create/upsert method;
4. the map editor calls the same PUT route directly; and
5. an unscoped mutation would not prove it targets this building and is outside
   the authorized mutation boundary.

## Working Solution

There is no working persistence command at the current backend state. The
minimal expected request is recorded below for support reproduction and for use
after Situm provisions the missing entity:

```bash
curl --fail-with-body -sS \
  -X PUT \
  -H "Authorization: Bearer $SITUM_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @docs/research/situm-paths.example.json \
  https://api.situm.com/api/v1/buildings/19954/paths
```

Expected behavior after provisioning: HTTP 200, followed by a non-empty
`GET /api/v1/buildings/19954/paths` response and the graph appearing after the
Map Editor reload. Actual behavior now: HTTP 404 with the missing-Path JSON
shown above.

## Automation Script

[`scripts/situm/upload-paths.sh`](../../scripts/situm/upload-paths.sh) is a guarded, post-fix uploader
and verification script. It:

- requires `SITUM_TOKEN` from the environment;
- refuses any `BUILDING_ID` other than `19954`;
- accepts a JSON path file as its first argument;
- requires all supplied node/link floor IDs to be `70557` when present;
- fails on non-2xx PUT/GET responses; and
- fails verification if the scoped GET remains empty.

It is intentionally not described as a current working solution: against the
present backend it fails clearly with the same 404, which is the desired safe
behavior.

## Artifacts

- `docs/research/situm-path-investigation.md` — this sanitized investigation report.
- `docs/research/situm-paths.example.json` — minimal target-floor editor-shaped graph.
- `scripts/situm/upload-paths.sh` — guarded uploader/verification script for after
  backend provisioning.
- No HAR was persisted because the available browser automation surface did not
  expose network-event capture, and no success screenshot exists because the
  server rejected the save.

## Situm Support Ticket Text

> Please provision or repair the Wayfinding Path aggregate for building `19954`
> (floor `70557`) in our organization. The building and floor both exist and
> the authenticated Map Editor sends the documented request:
>
> `PUT /api/v1/buildings/19954/paths`
>
> with a valid nodes/links graph, but the API returns:
>
> `{ "status": 404, "code": "entity_not_found", "message": "The entity Path with value 19954 is not found", "errors": [] }`
>
> `GET /api/v1/buildings/19954/paths` returns the same missing-entity result.
> The public OpenAPI and `situm-sdk-js` expose GET plus this PUT update route but
> no create operation; the scoped POST candidate returns 405 with supported
> methods `[PUT, GET]`. Please initialize the building's Path record or provide
> the supported create/upsert endpoint, then confirm the expected request schema.

# Phase 2 — Legacy API Archaeology

## Historical Documentation Sources

The historical review started from the existing Phase 1 report and then checked
older primary Situm sources rather than relying on current behavior alone:

- [Situm REST/OpenAPI documentation](https://developers.situm.com/pages/rest/openapi/)
  (current documentation entry point).
- [Archived 2020 OpenAPI page](https://web.archive.org/web/20200812040331id_/https://developers.situm.com/pages/rest/openapi/).
- [Archived 2020 raw public specification](https://web.archive.org/web/20200812033842id_/https://developers.situm.com/documentation/openapi/situm_public_api.yaml).
- [Archived 2023 functional OpenAPI page](https://web.archive.org/web/20231202192615id_/https://developers.situm.com/pages/rest/openapi/functional.html).
- [Archived 2024 maps entry page](https://web.archive.org/web/20241009050635id_/https://maps.situm.com/).
- [Archived 2021 dashboard login page](https://web.archive.org/web/20210306223558id_/https://dashboard.situm.com/).
- [Situm JS SDK repository](https://github.com/situmtech/situm-sdk-js).
- Official [Cordova](https://github.com/situmtech/cordova),
  [React Native](https://github.com/situmtech/react-native),
  [Flutter](https://github.com/situmtech/flutter),
  [iOS wayfinding](https://github.com/situmtech/ios-swift-library-wayfinding),
  and [Swift Package Manager](https://github.com/situmtech/situm-sdk-spm)
  repositories.

Wayback availability was uneven. Exact editor and dashboard application
chunks were not always preserved; those gaps are called out below and were not
treated as negative evidence.

## Archived OpenAPI / Swagger Findings

The raw 2020 public specification is the strongest historical contract found.
It identifies OpenAPI `3.0.0`, API version `1.40.0`, and `dashboard.situm.es` as
the default server. Its Paths resource contains only:

| Historical operation | Operation ID | Finding |
|---|---|---|
| `GET /api/v1/paths` | `getPaths` | Organization-level read. |
| `GET /api/v1/buildings/{id}/paths` | `getBuildingPaths` | Building-scoped read. |
| `PUT /api/v1/buildings/{id}/paths` | `updateBuildingPaths` | Building-scoped graph update. |

There is no historical `POST` on the scoped resource, no `createPath`, no
`initializePath`, no path-by-ID creation route, and no separate graph/bootstrap
operation. The old `Path`/`PathForm` shape is still a graph of nodes and links;
it does not expose a public path identifier that could be used with a hidden
by-ID endpoint.

The current public specification retains the same three Path operations. The
current deprecated specification does not add a Path operation; its historical
API-key route is an authentication compatibility route, not Path
initialization. The meaningful contract diff is therefore:

| Contract area | 2020 public spec | Current public spec | Phase 2 conclusion |
|---|---|---|---|
| Organization Path read | Present | Present | Stable. |
| Building Path read | Present | Present | Stable. |
| Building Path write | Scoped `PUT` | Scoped `PUT` | Stable update boundary. |
| Path create/bootstrap | Absent | Absent | No evidence-backed public initializer. |
| Path-by-ID mutation | Absent | Absent | No supported fallback route. |
| Auth token/API-key flows | JWT and API-key flows documented | JWT and API-key security schemes documented | Auth evolution does not add Path creation. |

## Historical Endpoint Matrix

The following checks were limited to building `19954` and its Path resource.
Reads and preflight metadata were performed before the single historical-host
write. Results are summarized without credentials or raw token material:

| Host | Method | Target route | Result | Interpretation |
|---|---|---|---|---|
| `api.situm.com` | `GET` | `/api/v1/buildings/19954/paths` | `404 entity_not_found` | Current backend lacks the aggregate. |
| `dashboard.situm.com` | `GET` | `/api/v1/buildings/19954/paths` | `404 entity_not_found` | Dashboard host does not provide a separate legacy store. |
| `dashboard.situm.es` | `GET` | `/api/v1/buildings/19954/paths` | `404 entity_not_found` | Historical default host reaches the same missing aggregate. |
| `api.situm.es` | `GET` | `/api/v1/buildings/19954/paths` | DNS resolution failure | Host could not be tested; no route claim is made. |
| Resolvable hosts | `OPTIONS` | `/api/v1/buildings/19954/paths` | `204` | Route metadata is available; it does not provision data. |
| `dashboard.situm.es` | `PUT` | `/api/v1/buildings/19954/paths` | `404 entity_not_found` | Historical scoped update does not bootstrap the Path aggregate. |

The old `dashboard.situm.es` write used the same minimal target graph recorded
in the Phase 1 report. It did not modify any other building or resource. No
unscoped `POST /api/v1/paths` was attempted: neither the old/current specs nor
any inspected client establish that route as a target-building mutation, and
the Path schema has no evidence-backed field that would bind such a write to
building `19954`.

## Old SDK Findings

The npm registry exposed 46 published `@situm/sdk-js` versions from `0.6.1`
through `0.26.0`; public repository tags also reach earlier `0.x` history.
Every distributed package inspected contains the same relevant pair:

```text
getPaths({ buildingId? })
patchPath(buildingId, pathForm)
```

The first public history changes naming (`updatePath` to `patchPath`) but not
the HTTP contract. No inspected package contains any of the following:

```text
createPath, createPaths, addPath, initializePath, initPath,
upsertPath, savePath, savePaths, createGraph, initializeGraph,
createWayfinding, enableWayfinding, createCartography, migratePaths
```

The official mobile SDK sources inspected are positioning/wayfinding runtime
SDKs. Their source does not contain a cartography Path write route or a hidden
Path bootstrap call. This does not prove that no private Situm server-side
migration has ever existed; it does establish that no public SDK-assisted
initializer is available to try safely.

## Old Map Editor Findings

The 2024 archived maps entry bundle contains the same route construction as the
current editor:

```text
getPaths({ buildingId }) -> GET /api/v1/buildings/{buildingId}/paths
patchPath(buildingId, body) -> PUT /api/v1/buildings/{buildingId}/paths
```

The bundle has no separate create/upsert/initialize operation in the relevant
cartography code. The archive referenced editor-specific dynamic chunks, but
the exact `Editor` chunk returned 404 from that capture and later archive
queries were intermittently unavailable. That is an evidence limitation, not
a claim that every byte of every historical editor bundle was recovered. The
route pair is nevertheless independently confirmed by the 2020 spec, every
published JS SDK package inspected, and the current editor.

The archived 2021 dashboard page was only a login shell. Its webpack runtime
was available, while the referenced login/application chunks returned 404. It
therefore adds no contrary Path behavior evidence.

## Authentication History

The 2020 spec documents JWT and API-key authentication, including token routes
and examples using `X-API-EMAIL` / `X-API-KEY`. The current API's CORS response
also advertises `Authorization`, `X-API-EMAIL`, `X-API-KEY`, and `X-API-TOKEN`
as allowed request headers. That is a browser allow-list, not proof that every
header is accepted by every endpoint.

Authenticated current account metadata showed that this account has an
autogenerated cartography read/write Map Editor key and a separate read/write
key. Their raw values were never printed or persisted. Together with the
successful authenticated building/floor reads and the scoped PUT reaching the
Path lookup, this rules out a simple missing-permission explanation for the
target failure. The old API-key compatibility route in the deprecated spec
does not create or initialize Path data.

## Backward Compatibility Experiments

The target-scoped compatibility checks produced the following result:

1. Current API scoped GET: `404 entity_not_found`.
2. Current API scoped `OPTIONS`: `204`; scoped `HEAD`: `404`.
3. Historical dashboard host scoped GET: same `404 entity_not_found`.
4. Historical default host scoped GET: same `404 entity_not_found`.
5. Historical default host scoped PUT with the minimal graph: same
   `404 entity_not_found`.
6. Current scoped POST: `405` with supported methods `[PUT, GET]`.
7. Current scoped PUT and PATCH: same missing-Path `404`.

This is consistent with a shared backend entity lookup rather than a client
version mismatch. The old host does not reveal a bootstrap behavior that the
current host lost.

## Legacy Path Initialization Result

**No legacy bootstrap succeeded.** No public historical specification, SDK,
mobile client, archived map bundle, authentication flow, or evidence-backed
historical host route initializes the missing Path aggregate. The only
historical-host mutation authorized by the target scope was the scoped PUT, and
it failed with the same server-side missing-entity response.

The investigation deliberately did not try an undocumented unscoped mutation,
an account/API-key mutation, a building/floor mutation, or a write against any
other building. Those actions could not establish target-safe persistence and
would exceed the requested mutation boundary.

## Final Conclusion

Phase 2 confirms the Phase 1 conclusion: building `19954` has a missing Situm
Path aggregate, while the documented and historically stable client contract
only updates an aggregate that already exists. The failure is backend-side and
remains **BLOCKED BY SITUM BACKEND**.

The next valid action is for Situm to provision/repair the target Path record or
provide an officially supported create/upsert/bootstrap operation. Once that is
done, rerun [`scripts/situm/upload-paths.sh`](../../scripts/situm/upload-paths.sh), verify the scoped
GET, and reload the Map Editor. No credentials or tokens were persisted by this
phase.

# Phase 3 — Legacy Authentication & Temporary API Keys

## Available Situm API Key Roles

The authenticated Situm Dashboard's API-key editor exposed exactly these
permission labels:

- `Disabled`
- `Positioning`
- `Only read`
- `Cartography edition`
- `Read & Write`

The existing account metadata, inspected without copying secret values, showed:

| Existing key name | Dashboard permission |
|---|---|
| `Autogenerated - Map Viewer` | `Only read` |
| `Admin` | `Read & Write` |
| `Autogenerated - Map Editor` | `Cartography edition` |
| `Positioning` | `Positioning` |
| `Autogenerated - MyProfiles` | `Positioning` |

The rendered Dashboard list did not expose creation dates. No existing key was
edited, copied for testing, removed, or otherwise modified.

## Temporary Keys Created

The Dashboard creates a new key with a default permission and then permits
editing its description/role. Each test key was immediately renamed and assigned
the least-privilege role needed for the next experiment:

| Temporary key | Permission | Created | Deleted | Verified absent |
|---|---|---:|---:|---:|
| `ChatGPT Situm Path Test - Cartography` | `Cartography edition` | yes, 2026-09-11 dashboard session | yes | yes, UI reload and API metadata |
| `ChatGPT Situm Path Test - Read Write` | `Read & Write` | yes, 2026-09-11 dashboard session | yes | yes, UI reload and API metadata |

Only the names and roles are recorded. API-key values, JWTs, cookies, CSRF
secrets, and copied clipboard contents were kept transient and were not written
to files or report text.

## Legacy Authentication Reconstruction

The historical 2020 public OpenAPI documented two relevant patterns:

1. `POST /api/v1/auth/access_tokens` with Basic user/password authentication to
   obtain a JWT.
2. `POST /api/v1/auth/access_tokens_apikey` with Basic user/API-key
   authentication to obtain a JWT.

Its examples also show direct `X-API-EMAIL` plus `X-API-KEY` headers. The current
public/deprecated documentation additionally documents direct `X-API-KEY` and
the current `POST /api/v1/auth/access_tokens` API-key exchange. No historical
Path-specific authentication scheme or legacy create permission was documented.

The live target-safe checks confirmed all evidence-backed variants:

- Direct `X-API-KEY` authentication accepts the temporary keys for target
  building/floor reads and organization/scoped Path reads.
- `X-API-EMAIL` plus `X-API-KEY` also accepts the Cartography key for those
  reads.
- Current `POST /api/v1/auth/access_tokens` with either temporary key returns
  `201` and a JWT.
- Historical `POST /api/v1/auth/access_tokens_apikey` with Basic
  user/API-key authentication returns `201` and a JWT.
- The Cartography-derived JWT claims include sanitized
  `api_permission=cartography-read-write`; the Read & Write-derived claims
  include `api_permission=read-write`.
- Supplying an API-key value in `X-API-TOKEN` returns `401` on safe reads. No
  inspected historical source establishes that header as an API-key
  authentication flow.

## Authentication Matrix

The columns below are the harmless target endpoints requested by this phase.
`scoped 404` means the known missing-Path response, not an authentication
failure.

| Auth mechanism | `GET` building | `GET` floors | `GET /paths` | `GET` scoped paths |
|---|---:|---:|---:|---:|
| Valid owner Bearer JWT | `200` | `200` | `200 []` | `404 entity_not_found` |
| Temporary Cartography key via `X-API-KEY` | `200` | `200` | `200 []` | `404 entity_not_found` |
| Cartography key via `X-API-EMAIL` + `X-API-KEY` | `200` | `200` | `200 []` | `404 entity_not_found` |
| Cartography key exchanged at current `access_tokens` | `200` | `200` | `200 []` | `404 entity_not_found` |
| Cartography key exchanged at `access_tokens_apikey` | `200` | `200` | `200 []` | `404 entity_not_found` |
| Temporary Read & Write key via `X-API-KEY` | `200` | `200` | `200 []` | `404 entity_not_found` |
| Read & Write key exchanged at current `access_tokens` | `200` | `200` | `200 []` | `404 entity_not_found` |
| Read & Write key exchanged at `access_tokens_apikey` | `200` | `200` | `200 []` | `404 entity_not_found` |
| `X-API-TOKEN` populated with a key value | `401` | `401` | `401` | `401` |

Both temporary roles therefore authenticate successfully for the target and
reach the same missing Path entity. The difference appears only when attempting
the unscoped POST candidate below.

## POST /api/v1/paths Investigation

`OPTIONS /api/v1/paths` returned `204` anonymously and with Bearer/API-key
authentication. It returned no `Allow` or `WWW-Authenticate` value. Its CORS
allow-list includes `POST`, but also includes the broad set
`DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT`; this is preflight metadata, not
proof that POST is implemented.

The candidate body was target-bound and deliberately minimal:

```json
{
  "building_id": 19954,
  "nodes": [],
  "links": []
}
```

The exact unscoped resource path was used, but the explicit `building_id` kept
the attempted Path data tied to the authorized target. No request returned a
success or validation response that could have created data.

| Authentication | `POST /api/v1/paths` result | Interpretation |
|---|---:|---|
| Anonymous | `401 unauthorized` | Security middleware rejects the request before method dispatch. |
| Malformed Bearer | `401 unauthorized` | Same authentication-layer behavior. |
| Valid owner Bearer JWT | `405`, supported `[GET]` | Credential is accepted; resource exposes GET only. |
| Cartography key via `X-API-KEY` | `401 unauthorized` | Cartography permission is not accepted for this unscoped write attempt. |
| Cartography key via legacy headers | `401 unauthorized` | Legacy header combination does not unlock POST. |
| Cartography-derived JWT | `401 unauthorized` | Exchanged JWT retains Cartography permission and is rejected for this write. |
| Read & Write key via `X-API-KEY` | `405`, supported `[GET]` | Broader credential reaches the same GET-only route. |
| Read & Write-derived JWT | `405`, supported `[GET]` | Token exchange does not reveal a create route. |

For an additional scoped control, `POST /api/v1/buildings/19954/paths` with the
Read & Write key returned `405` with supported methods `[PUT,GET]`. The same key
sent the documented scoped `PUT` graph update and received the unchanged
`404 entity_not_found` missing-Path response. The Cartography key also received
that same scoped PUT 404. Neither mutation created or changed Path data.

## JWT/API-Key Permission Findings

The API-key authentication mechanisms are real and backward-compatible for
reads. Both documented key-to-JWT exchanges preserve a permission claim:

| Credential | Sanitized claim/result |
|---|---|
| Cartography key, direct | Reads accepted; target scoped PUT reaches missing Path lookup. |
| Cartography key, current exchange | `api_permission=cartography-read-write`; same Path behavior. |
| Cartography key, historical exchange | `api_permission=cartography-read-write`; same Path behavior. |
| Read & Write key, direct | Reads accepted; POST reaches GET-only method result. |
| Read & Write key, current exchange | `api_permission=read-write`; same POST result. |
| Read & Write key, historical exchange | `api_permission=read-write`; same POST result. |

The pre-existing `Autogenerated - Map Editor` key is already
`Cartography edition`; the temporary Cartography key behaved identically on all
target-safe Path reads and the scoped PUT. The missing Path entity is therefore
not repaired by supplying the Map Editor permission through a different key.

## Path Bootstrap Result

**B. BLOCKED — authentication differences do not expose a create/bootstrap path.**

No authenticated mechanism returned `2xx`, `400`, `415`, `422`, `409`, or another
schema/creation signal for a target-bound POST. The Cartography permission
produces `401` for the unscoped POST, while the broader Read & Write permission
produces `405 [GET]`; neither behavior creates a Path. The supported scoped write
continues to fail at the missing Path aggregate lookup.

## Temporary Credential Cleanup

Cleanup was completed before closing this phase:

1. Each temporary key was removed through the Dashboard's confirmation flow.
2. The API Keys page was reloaded.
3. Both temporary names were absent from the rendered list.
4. The pre-existing `Autogenerated - Map Editor` key was still present after
   reload.
5. A final read-only `GET /api/v1/auth/apikeys` returned `200` with exactly the
   five pre-existing keys and zero temporary-name matches.
6. The system clipboard was cleared after each transient key-use sequence, and
   no secret file was created.

No existing API key was deleted or modified. No building other than `19954`, no
floor other than `70557`, and no unrelated resource was mutated.

## Final Updated Conclusion

The earlier `POST /api/v1/paths -> 401` does **not** establish a hidden legacy
Path-create endpoint that requires API-key authentication. Controlled evidence
shows:

- anonymous or malformed credentials receive generic `401 unauthorized`;
- a valid owner Bearer receives `405` with the resource's actual supported
  method `[GET]`;
- a Cartography API key receives `401` on the unscoped write attempt because
  that permission is not accepted for this write boundary; and
- a legitimate Read & Write key, direct or exchanged, also receives `405
  [GET]`, proving that broader authentication does not reveal POST creation.

The best-supported explanation is generic authentication/permission middleware
behavior before method dispatch for credentials that cannot perform that
unscoped write, combined with a GET-only `/api/v1/paths` resource. It is not
evidence of a usable internal create API. The current and historical scoped PUT
still finds no Path aggregate for building `19954`.

Phase 3 therefore confirms the final state remains **BLOCKED BY SITUM BACKEND**.
Situm must provision the target Path aggregate or provide an official,
target-bindable create/upsert endpoint. No `situm-path-bootstrap.sh` was created
because no bootstrap route was found. The existing guarded uploader remains the
correct post-provisioning next step.
