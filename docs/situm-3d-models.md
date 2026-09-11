# Situm 3D model pipeline

Situm Explore keeps its editable indoor-layout source in Blender scripts and exports floor-scoped GLB assets for both Situm cartography workflows and the app-owned web Explore walkthrough.

## Why the export is per floor

The canonical Blender scene is optimized for design review: LT1 and LT2 are displayed next to each other rather than representing physical floor elevation. Situm associates each decorative 3D model with a selected floor, so runtime assets must not use the review arrangement directly.

`scripts/blender/export_situm_glb.py` converts the canonical scene into two independent floor assets:

- `situm-explore-lt1.glb`
- `situm-explore-lt2.glb`

Each GLB is centered on the corresponding normalized 20 x 5 floor footprint and excludes labels, navigation helpers, source references, and presentation-only objects. The current Blender scene explicitly marks physical meter calibration as pending, so final Situm scale must be accepted visually against the real floorplan. Stair geometry is included by default and can be excluded for placement experiments.

## Build

Blender 5.x is the supported authoring/runtime tool for these scripts.

The repository can use a repo-local Blender runtime under `.tools/` (ignored by Git). In fish, expose it for the current shell with:

```fish
source scripts/blender/env.fish
blender --version
```

From the repository root:

```sh
blender --background --python scripts/blender/generate_source_traced_layout.py
blender --background --python scripts/blender/generate_3d_layout.py
blender --background --python scripts/blender/export_situm_glb.py
```

Default intermediate/output paths:

```text
/tmp/situm-explore-layout-source-traced.blend
/tmp/situm-explore-layout.blend
/tmp/situm-explore-situm-glb/situm-explore-lt1.glb
/tmp/situm-explore-situm-glb/situm-explore-lt2.glb
```

To choose a different canonical source and output directory:

```sh
blender --background --python scripts/blender/export_situm_glb.py -- \
  --source /path/to/situm-explore-layout.blend \
  --output-dir /path/to/output
```

To omit stair geometry while testing Situm floor separation:

```sh
blender --background --python scripts/blender/export_situm_glb.py -- \
  --exclude-stairs
```

The exporter prints the output path, object count, and final byte size for each floor. A successful run must produce non-empty GLB files for both floors.

## Hosting

Situm's 3D Model editor consumes a reachable `.glb` URL. Runtime GLBs therefore belong in public artifact/object storage, not in the Git repository.

Use stable versioned object names when publishing. A suitable project convention is:

```text
situm-explore/cartography/3d/<version>/situm-explore-lt1.glb
situm-explore/cartography/3d/<version>/situm-explore-lt2.glb
```

Do not replace a versioned GLB in place after it has been accepted. Publish a new version so browser/CDN caches cannot silently mix revisions.

## Situm Dashboard placement

For each floor in Situm Dashboard:

1. Open the target floor in the Map Editor.
2. Add a new **3D Model** cartography element.
3. Paste the public URL for that floor's GLB.
4. Position the model using the floor center as its anchor.
5. Start with scale 1 as a reference, then calibrate it against the real Situm floorplan; do not assume the normalized Blender units are already physically exact.
6. Adjust orientation only as needed to match the raster/cartography north/orientation.
7. Adjust model height only if the Situm floor visualization requires a small vertical offset.
8. Verify walls, doors, stairs, POIs, routes, and floor switching in Map Viewer before treating the model as accepted.

The exact Situm editor translation/rotation values are deployment data and should be recorded only after visual acceptance against the real building cartography.

## Runtime boundary

The primary web `/app/map` experience is the app-owned 2D floorplan renderer. Digital Twin 3D is an explicit opt-in mode that consumes floor-scoped GLBs through an authenticated workspace route and uses a perspective eye-level camera. The 3D renderer is lazy-mounted, so default 2D does not initialize WebGL or request a GLB. Its initial/reset camera pose follows the same canonical floor-to-GLB orientation contract on LT1 and LT2 rather than deriving orientation from semantic rooms. A missing/unreadable GLB, unavailable WebGL runtime, or model without discoverable semantic-room objects remains an explicit 3D error after opt-in; the app does not silently switch back to 2D.

Generated GLBs remain excluded from Git. The current staging runtime mounts `.data/3d-models` read-only into the container and serves the selected floor asset through the authenticated Nitro workspace boundary. Assets are scoped by both application workspace and Situm building so switching workspace/building can never reuse another context's model implicitly:

```text
.data/3d-models/<workspace-id>/<building-id>/situm-explore-lt1.glb
.data/3d-models/<workspace-id>/<building-id>/situm-explore-lt2.glb
```

There is intentionally no flat/global asset fallback. If that scoped path is absent, Digital Twin 3D reports that it has not been configured for the active workspace/building. A durable production distribution should preserve the same `<workspace-id>/<building-id>/...` object-storage layout so the browser auth and isolation boundary remains unchanged.

Native Explore remains 2D-first for live positioning/navigation and now exposes an explicit Digital Twin 3D opt-in using the same authenticated workspace/building model boundary and shared canonical view semantics. Native 3D does not replace or fabricate the existing 2D blue-dot, route, ETA, arrival, off-route, or turn-by-turn behavior.

## Acceptance checklist

Before publishing a model revision:

- both GLBs are generated successfully and are non-empty;
- LT1 contains only LT1 geometry and LT2 only LT2 geometry;
- no review labels/navigation helper objects are visible;
- model scale is explicitly calibrated against the Situm floorplan without non-uniform distortion;
- model orientation matches floor cartography;
- model placement does not offset Situm POIs/routes from their physical rooms;
- floor switching does not show duplicated geometry from another floor;
- web Explore renders the intended GLB in WebGL at normal phone/tablet/desktop layouts, with eye-level camera movement and floor switching accepted.
