# Situm Path Phase 2 Research Notes

These notes are sanitized. They contain no password, bearer token, API key,
cookie, authenticated URL, or raw dashboard embed credential.

## Sources inspected

- Current Situm REST/OpenAPI pages and the raw public/deprecated YAML
  specifications.
- Wayback captures of the 2020 public OpenAPI page/spec, the 2023 functional
  OpenAPI page, the 2024 maps entry bundle, and the 2021 dashboard login page.
- Every published `@situm/sdk-js` package version exposed by the npm registry
  (`0.6.1` through `0.26.0`) plus public repository history/tags.
- Official public `cordova`, `react-native`, `flutter`, iOS wayfinding, and
  Swift Package Manager SDK source repositories.

## Stable historical result

The 2020 OpenAPI path resource already documented only:

- `GET /api/v1/paths`;
- `GET /api/v1/buildings/{id}/paths`; and
- `PUT /api/v1/buildings/{id}/paths`.

It did not document `POST`, `createPath`, `initializePath`, or a path-by-ID
creation route. The 2020 spec used `dashboard.situm.es` as its default server
and documented JWT/API-key authentication, so it is relevant to both the old
host and old authentication hypotheses.

All published JavaScript SDK packages inspected expose the same GET plus
building-scoped PUT shape. No package contains a path bootstrap or create
operation. The official mobile SDK source repositories inspected are runtime
positioning/wayfinding SDKs and contain no cartography Path write route.

## Frontend/archive limitations

The 2024 maps entry bundle contains the same `getPaths` and `patchPath` route
construction as the current editor. The archive did not return the referenced
editor-specific dynamic chunk, so its absence is recorded as an archive gap,
not as proof that the chunk had no additional code. The 2021 dashboard capture
returned the webpack runtime but its login/application chunks returned 404;
the login shell therefore provides no additional Path behavior evidence.

## Target-scoped host checks

Read/metadata checks were performed before the one historical-host PUT:

- `api.situm.com`, `dashboard.situm.com`, and `dashboard.situm.es` all
  responded to the target scoped GET with the same `404 entity_not_found`
  missing-Path result.
- `api.situm.es` did not resolve in the current network environment.
- `OPTIONS` reached the target route on the resolvable historical hosts.
- The target graph was sent once to the historical default host
  `dashboard.situm.es` using its documented scoped PUT route; it returned the
  same missing-Path 404 and did not bootstrap the aggregate.

No unscoped mutation, other-building mutation, building/floor mutation,
account/API-key mutation, deletion, or unrelated resource write was attempted.
