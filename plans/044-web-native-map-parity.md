# Plan 044 — Web / Native Map UI Parity

Status: complete/integrated through PR #42 at merge commit `420f399bf10979f389f36f686d056ce3e4b77012`

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
Focused ESLint and Nuxt typecheck pass. Production Docker build passes. Authenticated Playwright acceptance with the owner account proved F1 and F2 GLB responses are `200 model/gltf-binary`, WebGL canvas rendering is active, destination selection works, and `Go` changes camera coordinates while preserving 1.620 m eye height. Temporary browser scripts/screenshots were deleted and no Chrome/Chromium/Playwright process remained after testing. At explicit user-requested closure on 2026-09-10, clean-branch `Engineering Guard web full` passed policy, lint, typecheck, production build, and dependency audit with 0 vulnerabilities; `maintainability.py web` passed with 0 file/function/bypass debt growth. The first guard attempt correctly stopped at policy because `.tmp-tests` still existed; those task-owned temporary artifacts were inspected and removed before the successful final guard. User visual E2E is not claimed as executed and is no longer a closure blocker because the user explicitly requested closure before the next stage.

## Integration
Integrated into `main` through PR #42 at merge commit `420f399bf10979f389f36f686d056ce3e4b77012` after explicit user authorization on 2026-09-10. The plan branch is no longer the active execution branch.
