# Plan 044 — Web / Native Map UI Parity

Status: 3D-only implementation complete; focused validation and authenticated Playwright acceptance passing; user visual E2E pending

## Goal
Replace the web Map's embedded Viewer presentation with an app-owned, eye-level 3D indoor walkthrough that matches the native Explore destination-discovery intent while preserving truthful web capability boundaries.

## Scope
- Render floor-scoped GLB digital-twin geometry directly in the Nuxt client with Three.js/WebGL and an eye-level perspective camera.
- Explore is 3D-only. There is no 2D floorplan/iframe fallback; missing GLB/WebGL/semantic-room data surfaces an explicit error.
- Match native discovery intent with floating destination search/context, floor switching, destination card, reset/fullscreen controls, and responsive walkthrough composition.
- Discoverable destinations come from canonical semantic room objects in the GLB when upstream Situm POIs are empty; do not fabricate POIs.
- Support mouse-look, WASD/arrow/touch walking controls, floor switching, and deterministic camera travel to a selected room.
- Keep sensor-backed indoor positioning and turn-by-turn guidance native-only; web must not fabricate blue-dot, ETA, rerouting, or route guidance state.
- Keep authenticated workspace-scoped cartography as the data source; do not expose Read & Write credentials or introduce a second backend.
- Retire the phone-size Viewer capability gate for Map because the app-owned renderer is responsive; retain native handoff as an explicit action for positioning/navigation.

## Validation
Focused ESLint and Nuxt typecheck pass. Production Docker build passes. Authenticated Playwright acceptance with the owner account proved F1 and F2 GLB responses are `200 model/gltf-binary`, WebGL canvas rendering is active, destination selection works, and `Go` changes camera coordinates while preserving 1.620 m eye height. Temporary browser scripts were removed and no Chrome/Chromium/Playwright process remained after testing. User visual E2E remains the final acceptance step. At explicit closure run the web Engineering Guard + maintainability once, per repository governance.

## Integration
Implement on `plan/044-web-native-map-parity`. Push is allowed by repository workflow. PR creation/merge remain user-gated.
