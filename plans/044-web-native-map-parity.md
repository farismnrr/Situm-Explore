# Plan 044 — Web / Native Map UI Parity

Status: implementation complete; focused validation passing; authenticated browser visual acceptance pending

## Goal
Replace the web Map's embedded Viewer presentation with an app-owned indoor map surface that matches the native Explore visual language while preserving truthful web capability boundaries.

## Scope
- Render real workspace Situm floorplan imagery and Cartesian POIs directly in the Nuxt client.
- Match native browse UI: floating search/context card, floor chips, compact POI markers/labels, destination card, reset/fullscreen controls, and responsive map-first composition.
- Support pan, wheel/pinch zoom, deterministic POI selection, map-tap search dismissal, and query-driven building/floor context.
- Keep sensor-backed indoor positioning and turn-by-turn guidance native-only; web must not fabricate blue-dot, ETA, rerouting, or route guidance state.
- Keep authenticated workspace-scoped cartography as the data source; do not expose Read & Write credentials or introduce a second backend.
- Retire the phone-size Viewer capability gate for Map because the app-owned renderer is responsive; retain native handoff as an explicit action for positioning/navigation.

## Validation
During implementation use focused web lint/typecheck/build checks. At explicit closure run the web Engineering Guard + maintainability once, per repository governance.

## Integration
Implement on `plan/044-web-native-map-parity`. Push is allowed by repository workflow. PR creation/merge remain user-gated.
