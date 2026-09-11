# Situm Explore Implementation Contract

This document defines the current production implementation boundaries for Situm Explore.

## Stack

Web/backend:

- Nuxt 4 + Vue + Nuxt UI;
- Nitro server routes;
- `nuxt-auth-utils` session infrastructure;
- PostgreSQL + Drizzle for application relational state;
- ClickHouse for workspace-isolated analytics;
- app-owned Vue/SVG/DOM indoor Map rendering over workspace-scoped cartography;
- `@situm/sdk-js` only for any retained, separately verified Viewer utility;
- authenticated Nitro integrations for server-side Situm capabilities.

Native:

- React Native 0.86.2 + React 19.2.3;
- Expo 57.0.14;
- `@situm/react-native` 3.19.2;
- `expo-secure-store` for bearer-equivalent mobile session material;
- standalone package under `mobile/`.

Nitro remains the single application backend. Do not add a second auth database/backend, parallel UI framework, duplicate observability stack, or speculative infrastructure.

## Authentication and sessions

Application users are PostgreSQL-backed. Email/password registration, login, logout, session expiry, and protected-route enforcement are real product behavior.

Web uses the existing sealed session mechanism. Native uses the same application identity through the sealed session transported in `x-nuxt-session`; mobile persists session material only through SecureStore.

Client-provided user/workspace identity is never authorization proof. Do not add dev-login or auth-bypass paths.

Google OAuth wiring exists, but runtime provider acceptance must be treated separately from the verified email/password path.

## Workspaces

- one user may own multiple private workspaces;
- each workspace has one application owner in the current model;
- every workspace API verifies ownership server-side;
- workspace ID is context, not proof of authority;
- no invite/member/team tenancy is implemented.

## Workspace Situm credentials

Workspace Situm configuration is secret write input plus safe metadata/status output.

- Only Read credential: encrypted server-side; it powers native positioning and server-side read-only Situm operations, while the app-owned browser Map consumes server-mediated cartography without receiving the raw credential; bounded direct Viewer issuance remains allowed only for a concrete verified Viewer caller;
- Read & Write credential: encrypted server-side and server-only for Situm mutation/admin operations;
- either credential may be configured independently and replacing one preserves the other;
- account/organization ID: derived from a verified credential and stored as metadata; later replacements must match it.

Stored secret values are never returned by normal configuration reads and must not enter logs, traces, docs, public runtime config, or client errors.

## Browser Map

`app/pages/app/map.vue` composes the browser Explore workspace and owns shared static-route state, `app/components/map/IndoorMapCanvas.vue` owns the app-rendered 2D floorplan/route projection, and `app/components/map/IndoorWalkCanvas.vue` owns the Three.js/WebGL eye-level walkthrough. Real building/floor/POI context and wayfinding paths come through authenticated workspace Nitro reads, while workspace-and-building-scoped floor GLB assets are served by authenticated Nitro routes from configured HTTPS object storage or the staging read-only asset mount. The model request carries the active building ID and the renderer identity includes workspace/building/floor/model slot so stale models cannot cross context boundaries. The renderers do not receive a Situm API key.

The browser surface is 2D-primary. The default renderer consumes authenticated workspace cartography, real floor images, building dimensions, floors, and POIs and owns pan/zoom, search, selection, reset, and fullscreen. Same-floor static POI-to-POI routes are computed by a renderer-independent app route core over real Situm path nodes/links: endpoints project to eligible path edges, directionality is preserved, and the 2D renderer draws the resulting geometry under the same floor transform used by the raster. Tagged graphs fail explicitly until their route-filter behavior is proven, and cross-floor routing remains unsupported rather than guessed. Route requests are generation-owned so a late response cannot restore geometry after Clear, endpoint replacement, workspace/building changes, or a newer request. Digital Twin 3D is explicit opt-in and is lazy-mounted so default 2D does not initialize WebGL or request a GLB. In 3D, room discovery comes from canonical semantic room objects embedded in the active GLB, and interaction includes floor switching, mouse-look, keyboard/touch walking, deterministic camera travel, reset, and fullscreen. Initial/reset orientation comes from the explicit floor-view descriptor and never from semantic destination bounds. Shared route state may survive 2D/3D switching, but 3D route geometry is not rendered yet. Missing GLB, WebGL, or semantic-room capability after explicit 3D selection is a truthful 3D error; do not silently change modes. The browser must not synthesize sensor-backed location, ETA, rerouting, arrival, or turn-by-turn guidance.

Any retained `SitumViewer.vue` use is separate from the primary Map route and must preserve its narrow verified Only Read command/auth boundary. Viewer may be used as a temporary validation oracle for route-topology acceptance, but it is not the product route renderer. Read & Write must never be exposed to the browser.

## Native positioning and Map

The native app receives only the workspace Only Read credential after application-session and workspace-owner authorization. The APK contains no Situm key and never receives Read & Write.

`ForegroundPositioningSession` owns the process-global Situm positioning callbacks/running state. Explore and Realtime consume that shared foreground session instead of independently starting/stopping global callbacks.

Positioning starts only after explicit user action and runtime permission success. Stop/workspace switch/logout/background/native failure/teardown must clear protected location state according to the established lifecycle.

Map/cartography/POI/floor/navigation UI must consume real Situm state. Do not invent route metrics or product data.

Native Explore remains 2D-first. `NativeMapScreen` owns the explicit `2d | 3d` mode boundary: 2D keeps live positioning/navigation authority, while `NativeDigitalTwin` is lazy-mounted only after explicit opt-in and retrieves GLB bytes through the authenticated owner-scoped workspace/building model endpoint. Native 3D uses `expo-gl` plus mobile-owned Three `0.162.0`, shares only runtime-neutral model-slot/view and semantic-room contracts with web, and owns room search/Go/reset/floor selection/touch look-walk plus renderer lifecycle cleanup. It must not project or fabricate blue-dot state, 2D route geometry, ETA, arrival/off-route state, turn-by-turn guidance, or vertical navigation inside 3D. Missing/unavailable 3D stays an explicit error until the user manually returns to 2D.

## Native Realtime

Remote Realtime remains server-mediated through the authenticated workspace route. Native positioning may use the issued Only Read credential, while remote monitoring continues through Nitro rather than broadening client-side data ownership.

The client model is intentionally minimal: device/position identity, source time, building/floor, accuracy, coordinates, and supported IDs. Do not add presence, unsupported freshness classification, or fabricated remote-map semantics.

Realtime reliability diagnostics are intentionally bounded: poll outcomes and producer start are logged as sanitized state/count metadata, while native-fix diagnostics are throttled rather than emitted for every high-frequency location callback. Location coordinates, credentials, headers, and raw upstream payloads stay out of normal diagnostics.

## Workspace-scoped backend

Protected Situm behavior resolves:

```text
session user -> owned workspace -> workspace configuration/capability -> Situm integration
```

Do not use a process-global Situm account/client/building as authority.

## ClickHouse

ClickHouse is analytics-only and server-side. Reads/writes are workspace-isolated. Legacy pre-workspace rows remain unscoped historical data unless attribution is proven; never assign them arbitrarily.

Do not provision another ClickHouse server for this application.

## Observability and safe errors

Reuse the existing observability stack. Correlation/trace context may cross meaningful request boundaries, but credentials, cookies, passwords, tokens, sensitive bodies, and location streams must not be dumped into normal telemetry.

Normalize validation, unauthenticated, forbidden, not-found, conflict, upstream, and internal failures into safe product responses. Detailed diagnostics remain server-side.

## Web/native product boundary

Web owns administration, analytics, responsive app-owned 3D digital-twin exploration, and static web operations. Native owns sensor-backed indoor positioning, turn-by-turn Map/navigation, and the native Realtime experience.

Web Explore defaults to the app-owned 2D floorplan across desktop/tablet/phone-sized browser layouts. Digital Twin 3D explicitly mounts workspace/building-scoped floor GLB assets through Three.js/WebGL with an eye-level camera; missing GLB/WebGL/semantic-room data remains an error inside that requested mode rather than triggering a silent fallback. Model-derived semantic rooms are 3D destinations only and are not fuzzily matched to Situm POIs across modes. Native Explore likewise stays 2D-first and exposes its own explicit native-GL Digital Twin 3D walkthrough without taking over 2D positioning/navigation authority. Web Realtime continues to use the integrated native handoff policy.

## Android release

Current standalone Android release is arm64-only and uses the build/publish contract in `docs/mobile-distribution.md`. Release builds must embed an intended HTTPS API base URL and must not depend on Metro or localhost.

## Situm evidence gate

Before changing Situm behavior, verify exact installed/current capability, auth/permission, runtime owner, consumed inputs/fields/events, and failure semantics.

No evidence means unresolved/absent, never fake success.

## Validation

Web/backend baseline:

```text
git diff --check
npm run lint
npm run typecheck
npm run build
```

Mobile baseline:

```text
npm run lint
npm run typecheck
```

Persistent unit tests are prohibited by repository policy. Temporary E2E/white-box/black-box checks may be used during execution but must be deleted before commit/closeout.

Use production preview/runtime checks for behavior claims and physical Android evidence for sensor-backed positioning claims.
