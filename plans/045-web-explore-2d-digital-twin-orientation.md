# Plan 045 — Web Explore 2D Primary + Digital Twin 3D Orientation Hardening

Status: proposed / planning-complete; implementation not started
Owner: future executor agent under user authorization
Scope: web Explore only

## Goal

Make `/app/map` a map-first Explore experience with the app-owned 2D floorplan as the default view and an explicit **Digital Twin 3D** mode, while fixing the fatal Floor 1 presentation defect where the user perceives the floor as top/bottom reversed.

The implementation must be evidence-led. The current canonical LT1 GLB geometry has been proven not to contain a floor-specific mirror/flip, so the executor must not "fix" LT1 by arbitrarily mirroring or rotating its model. The runtime must instead use an explicit, deterministic view/orientation contract that is consistent across floors.

## User requirement

- Discover/Explore should open in 2D by default.
- A visible control should allow the user to enter a Digital Twin 3D walkthrough.
- Floor 1 must no longer appear top/bottom reversed relative to the canonical floorplan.
- Floor 2 is the currently accepted visual reference and must not regress.
- If 3D fails after the user explicitly enters 3D, surface a 3D error. Do not silently pretend the 3D experience succeeded and do not silently convert the failure into another mode.

## Diagnostic findings already established

These findings are current execution input, not hypotheses the executor should re-litigate without contrary evidence.

### 1. Canonical and live Situm floorplans are identical

The active building returned by authenticated staging cartography is:

- Building `19922`, `Berjaya Inovasi Global`.
- Situm F1: floor id `70343`, level `0`, name `F1`.
- Situm F2: floor id `70345`, level `1`, name `F2`.

The floor images downloaded from the live Situm `mapUrl` values are byte-identical to the locally generated canonical floorplan PNGs:

- live Situm F1 SHA-256 = local `floorplan-lt1.png` SHA-256 = `bbd822da6e178a334d8000260d58c542036f91c692f1b3c42c2f3feaf35ef05f`;
- live Situm F2 SHA-256 = local `floorplan-lt2.png` SHA-256 = `cbb93b379a6067c28d94d462b6b9b0a276eb516b270918e469a5515ea913a893`.

Therefore the reported Floor 1 inversion is not caused by Situm serving a different or pre-flipped floorplan image.

### 2. Floor-to-model slot selection is correct

Current web mapping in `app/pages/app/map.vue` selects:

- floor level `0` -> model slot `lt1`;
- floor level `1` -> model slot `lt2`.

The server mapping in `server/integrations/situm/indoor-3d-model.ts` selects:

- `lt1` -> `situm-explore-lt1.glb`;
- `lt2` -> `situm-explore-lt2.glb`.

The staging container mounts `.data/3d-models` read-only and the runtime hashes observed inside the active container match the host `.data/3d-models` files. There is no evidence that F1 receives the F2 asset or vice versa.

### 3. The runtime LT1 geometry is not a mirrored copy

The runtime files were inspected directly.

- LT1 and LT2 contain zero negative-determinant node transforms.
- There is no negative scale / reflection transform in the GLB scene graph.
- The runtime `.data/3d-models` GLBs differ in JSON metadata from the earlier `.tools/output/glb` artifacts, but their binary geometry chunks are byte-identical to those verified exports.
- The differing metadata records generation/edit context; it does not alter the mesh geometry.

Therefore do not attribute the bug to an agent having silently mirrored the LT1 mesh.

### 4. Blender source -> 3D review -> GLB uses the same axis conversion for both floors

`scripts/blender/generate_3d_layout.py::transform_point()` only applies display translation; it does not apply a floor-specific mirror or rotation.

`scripts/blender/export_situm_glb.py` normalizes each floor by floor-center translation and exports with Blender's standard glTF Y-up conversion. No floor-specific orientation transform is applied.

The effective horizontal coordinate contract for both floors is equivalent to:

- runtime GLB `X = source floor X - floor center X`;
- runtime GLB `Z = floor center Y - source floor Y`.

The sign is the same for F1 and F2. A source-floor point on the high-Y/top side maps to negative GLB Z on both floors; a source-floor point on the low-Y/bottom side maps to positive GLB Z on both floors.

This axis conversion is expected from Blender Z-up to glTF/Three.js Y-up and is not an F1-only flip.

### 5. CSS and Three.js model loading do not flip F1

`app/components/map/IndoorWalkCanvas.css` contains no canvas/model `scaleY(-1)`, negative scale, or floor-specific mirror transform.

`app/components/map/IndoorWalkCanvas.vue` loads `gltf.scene`, adds it directly to the Three.js scene, and computes bounds. It does not rotate or mirror the model per floor.

Therefore a corrective `model.scale.z = -1`, `model.rotation.y = Math.PI`, or equivalent is not justified by current evidence.

### 6. Initial camera heading is not a hidden 180-degree F1 flip

The initial spawn implementation in `IndoorWalkCanvas.vue::setSpawn()` is asymmetric:

- F1 has a semantic `Entrance` destination and takes the `entry` branch;
- F2 has no semantic Entrance and uses the fallback model-edge branch.

This is a real runtime design defect because camera spawn/orientation is inferred from room semantics instead of an explicit view contract.

However, direct reconstruction of current spawn coordinates shows the initial F1/F2 look directions differ only slightly, not by 180 degrees. The reconstructed positions were approximately:

- F1 camera: `(x=8.401, z=0.493, y=1.620)` looking toward the model center;
- F2 camera: `(x=8.450, z=0.000, y=1.620)` looking toward the model center.

Projection analysis therefore rules out a hidden 180-degree `setSpawn()` yaw as the literal cause of a geometric top/bottom inversion.

The asymmetry must still be removed because it makes F1 presentation depend on the `GLASS ENTRY` semantic bounding box and produces a materially different initial framing from F2.

### 7. Runtime-equivalent render exposes the F1 spawn weakness

A headless reconstruction using the actual runtime GLBs and an eye-level camera equivalent to the current Three.js setup showed:

- F2 produces a readable corridor/interior-facing initial composition;
- F1 starts from the semantic entry area and can be visually dominated/occluded by the entry geometry, resulting in a poor and misleading orientation cue.

This proves an F1-specific presentation defect in the current spawn contract even though the GLB itself is geometrically correct.

## Root-cause statement for implementation

The executor should treat this as a **runtime presentation/orientation-contract defect, not an LT1 mesh-flip defect**.

The system currently lacks an explicit canonical view contract connecting:

`canonical 2D floor orientation -> GLB X/Z -> 3D spawn position -> initial heading`.

Instead, `IndoorWalkCanvas::setSpawn()` infers camera placement from available semantic destinations. Because F1 has a semantic Entrance and F2 does not, the two floors take different initialization paths. This creates an F1-specific presentation that can make the correct model appear directionally wrong or reversed to the user.

The exact user-perceived phrase "top becomes bottom" should be validated visually after the deterministic view contract is implemented. If that perception remains after the known runtime asymmetry is removed, stop and collect new evidence before applying any asset transform.

## Explicit non-solutions / prohibited shortcuts

Do not implement any of these unless new, reproducible evidence disproves the findings above:

- `model.scale.z = -1`, `model.scale.x = -1`, or any negative-scale mirror;
- `model.rotation.y = Math.PI` or a magic 180-degree LT1-only rotation;
- editing the LT1 Blender source purely to make the current camera look right;
- flipping the F1 raster floorplan;
- swapping F1/F2 model slots;
- adding an automatic 2D fallback when a user explicitly selected 3D;
- claiming the visual bug fixed merely because WebGL loaded or the GLB returned HTTP 200.

## Implementation scope

### Phase A — establish a deterministic 3D view contract

1. Introduce one explicit floor-view/orientation representation for the browser-owned 3D renderer. Keep it simple and app-owned. It must define enough information for deterministic spawn and initial heading without using semantic-room bounding boxes as orientation authority.
2. Use one coordinate convention for all supported floors. The convention must document the relationship between canonical floorplan top/bottom and Three.js X/Z.
3. F1 and F2 may have different spawn positions if their physical entrances differ, but their heading semantics must be derived from the same contract rather than from `destinations.find(category === 'Entrance')`.
4. Keep semantic destinations for search/travel only. A room's geometry must not silently define model orientation.
5. `resetView()` must restore the deterministic floor pose, not recompute a semantic heuristic.
6. Preserve eye height `1.620 m` unless another existing accepted contract explicitly requires otherwise.

Preferred design direction: an explicit per-model/per-floor view descriptor close to the model-slot mapping, with values expressed in normalized GLB coordinates or deterministic normalized bounds. Avoid scattering F1 special cases through renderer event code.

### Phase B — restore app-owned 2D Explore as the default

1. Recover the pre-Plan-044 custom 2D renderer from history, especially the proven `IndoorMapCanvas.vue` implementation from the state before the 3D-only removal. Port it forward; do not revert Plan 044 wholesale.
2. Continue using current authenticated workspace cartography as the data source:
   - building dimensions;
   - `floor.mapUrl`;
   - Situm POI coordinates;
   - current building/floor selection.
3. Default `/app/map` to the 2D renderer.
4. Preserve map interactions that were already proven in the historical renderer: fit-to-floor, pan, zoom, POI markers/labels, floor switching, search selection, destination card, reset/fullscreen where applicable.
5. Do not resurrect the embedded Situm Viewer as the primary 2D surface unless a separate evidence-backed requirement explicitly asks for it. The preferred primary 2D surface remains app-owned.

### Phase C — add explicit Digital Twin 3D mode

1. Add an obvious, accessible **Digital Twin 3D** action to the Explore UI.
2. Use an explicit view-mode state such as `2d | 3d`.
3. Default mode is `2d` for normal navigation to `/app/map`.
4. A deep-link/query representation such as `?view=3d` is acceptable if implemented consistently and safely; no query must mean 2D.
5. Do not initialize WebGL or fetch the GLB until 3D is selected. 2D should not pay the 3D startup cost.
6. Switching modes must preserve the active workspace, building, and floor.
7. Preserve selected destination across renderers only when an explicit, deterministic POI <-> semantic-room mapping exists. Otherwise clear or translate state visibly rather than matching silently by fuzzy name.
8. In 3D, retain current mouse-look / keyboard / touch walkthrough capabilities unless they conflict with the deterministic spawn fix.
9. Provide a manual **2D Map** action while in 3D.

### Phase D — 3D failure semantics

When 3D was explicitly requested and one of the following fails:

- WebGL unavailable;
- GLB unavailable or invalid;
- semantic destinations unavailable when required by the UI;

show the truthful 3D error state. Do not silently switch back to 2D. A user-visible manual **Back to 2D** action is allowed and preferred.

2D being the product default is not a "fallback"; it is the primary Discover mode. The no-silent-fallback rule applies after the user explicitly enters Digital Twin 3D.

## Expected primary files

The executor should verify exact ownership before editing, but expected files include:

- `app/pages/app/map.vue` — view-mode state, floor/model mapping, renderer orchestration;
- `app/components/map/IndoorWalkCanvas.vue` — deterministic 3D spawn/reset and removal of semantic orientation inference;
- `app/components/map/IndoorWalkCanvas.css` — only if UI composition needs adjustment;
- restore/recreate `app/components/map/IndoorMapCanvas.vue` and its CSS from the last accepted app-owned 2D implementation;
- `app/components/map/MapSearchDock.vue` / `MapControlStack.vue` / `MapDestinationCard.vue` as required to support both modes cleanly;
- relevant shared types/utilities if a small explicit 3D view descriptor belongs there;
- `DESIGN.md`, `ARCHITECTURE.md`, `design/IMPLEMENTATION.md`, `design/data-source-matrix.md`, `docs/situm-3d-models.md` where the current 3D-only contract is now stale.

Do not copy unrelated historical code or restore deleted duplicate API routes.

## Test and acceptance requirements

Implementation is not accepted from unit-level assertions alone. Visual/runtime evidence is mandatory because the defect is presentation-critical.

### A. Static and asset invariants

Prove before browser acceptance:

- no negative-scale/mirror transform is introduced into F1 or F2;
- F1 still maps to `lt1`, F2 to `lt2`;
- model dimensions/bounds remain consistent with current verified assets;
- source-floor top/bottom coordinate mapping has the same sign for both floors;
- no new LT1-only magic 180-degree rotation exists.

### B. 2D acceptance

On authenticated staging/production-build preview:

- opening `/app/map` with no view override renders 2D, not WebGL;
- F1 floorplan is the authenticated Situm/canonical image and displays in its canonical orientation;
- F2 likewise displays correctly;
- pan/zoom/reset work;
- floor selection works;
- POI/search behavior uses real cartography data when present;
- no GLB network request occurs before selecting Digital Twin 3D.

### C. 3D orientation acceptance — F1 is the release blocker

Use identifiable geometry rather than subjective "looks okay" only.

For F1 establish these canonical anchors from the approved layout:

- workrooms occupy the high-Y/top side of the canonical floorplan;
- the walkway/circulation band occupies the low-Y/bottom side;
- Workroom 1 remains the workroom nearest the main entry;
- stair/entry positions remain on their approved sides.

Then verify the deterministic 3D view/reset behavior presents the floor consistently with those anchors and does not make the user interpret the top side as the bottom side.

Capture/report:

- active floor id/level;
- selected model slot;
- model bounds;
- camera position;
- camera forward/look vector or yaw;
- screenshot after initial 3D entry/reset.

Do not mark PASS merely because the camera can move.

### D. F2 regression acceptance

Repeat the same deterministic-pose evidence for F2. The currently accepted F2 visual orientation must not change unexpectedly.

### E. Mode-switch acceptance

Verify:

- 2D -> Digital Twin 3D preserves building and floor;
- 3D -> 2D preserves building and floor;
- repeated switching does not create duplicate WebGL canvases/listeners or stale camera state;
- fullscreen/reset controls operate on the active renderer;
- 3D errors do not silently switch modes;
- manual return to 2D works from an explicit 3D error state.

### F. Performance/lifecycle acceptance

- GLB and Three.js-heavy runtime are lazy from the user's perspective; no 3D asset request before 3D opt-in.
- renderer unmount tears down animation frame, listeners, WebGL renderer/resources, and transient state cleanly.
- switching floors in 3D cannot leave the previous floor geometry visible.

## Browser E2E policy

Use production build + preview/staging, not Nuxt dev mode.

Temporary Playwright/E2E scripts and screenshots are allowed for execution evidence but must be removed before closure according to repository governance. If the user wants to own the final visual E2E pass, the executor must stop after rebuild/automated smoke and say exactly what was and was not visually verified.

Do not produce a fake PASS. A failure to prove F1's canonical anchor orientation is a failure/blocked result.

## Repository safety

The current primary worktree contains unrelated user-owned PostgreSQL public-schema changes in Drizzle/schema files. They are outside this plan.

Executor requirements:

- do not clean, reset, checkout, stash, amend, or modify those unrelated files unless the user separately authorizes it;
- implementation must use the repository's normal one-plan/one-branch workflow and should be isolated from the dirty primary worktree;
- no implementation directly on `main`;
- no force push;
- PR/merge remain user-gated;
- do not run full Engineering Guard / maintainability repeatedly during trial-and-error; reserve closure gates for closure or explicit user request.

## Documentation changes required by this plan

Plan 044 remains historical evidence and must not be rewritten to pretend it never shipped 3D-only Explore.

The executor must update current architecture/product docs to state the new contract:

- browser Explore is 2D-primary;
- Digital Twin 3D is an explicit opt-in mode;
- web 3D remains app-owned Three.js/WebGL;
- sensor-backed positioning/navigation remains native-only unless separately changed;
- 3D errors are explicit and do not silently fall back;
- 3D view orientation is deterministic and not inferred from semantic room geometry.

## Definition of done

Plan 045 is complete only when all of the following are true:

1. `/app/map` defaults to the app-owned 2D map.
2. User can explicitly enter and leave Digital Twin 3D.
3. GLB/WebGL initialization does not occur before 3D opt-in.
4. F1 no longer exhibits the reported top/bottom reversed presentation under deterministic initial/reset view, proven using canonical layout anchors.
5. F2 remains visually and behaviorally correct.
6. No LT1 mirror/negative scale/magic corrective rotation was introduced without new evidence.
7. 3D failure remains explicit; no silent fallback.
8. Required lint/typecheck/build and scoped runtime acceptance pass truthfully.
9. Current architecture/design documentation reflects the new 2D-primary + 3D-opt-in contract.
10. Unrelated user-owned database changes remain untouched.

## Leader review gate

Before the executor commits or asks to integrate the implementation, return the following evidence for leader review:

- concise diff summary by file;
- exact implementation of the deterministic 3D spawn/orientation contract;
- F1 and F2 initial/reset camera pose evidence;
- F1 and F2 visual acceptance screenshots or equivalent browser evidence;
- network evidence that 2D default does not request GLB;
- test/build results;
- confirmation that no mirror/180-degree LT1 patch was added;
- confirmation that unrelated DB changes were not touched.

Do not merge until the user explicitly authorizes integration.
