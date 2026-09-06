"""Export the canonical Blender layout as floor-scoped GLB files for Situm.

The canonical 3D scene is intentionally arranged for human review, with LT1
and LT2 separated on the display Y axis. Situm 3D models are attached to one
floor at a time, so this exporter normalizes each floor back to a local,
metric coordinate frame and writes one GLB per floor.

Typical pipeline from the repository root (Blender 5.x):

    blender --background --python scripts/blender/generate_source_traced_layout.py
    blender --background --python scripts/blender/generate_3d_layout.py
    blender --background --python scripts/blender/export_situm_glb.py

Custom paths:

    blender --background --python scripts/blender/export_situm_glb.py -- \
      --source /tmp/situm-explore-layout.blend \
      --output-dir /tmp/situm-explore-situm-glb

The exported models are centered on each normalized 20 x 5 floor footprint so
the Situm editor can place the model using a predictable center anchor. Physical
scale still requires acceptance against the configured Situm floorplan. Review-only
labels, navigation helpers, source references, and presentation objects are
excluded. Stair geometry is included by default and can be omitted with
``--exclude-stairs`` if the Situm floor separation makes duplicated vertical
transition geometry undesirable.
"""

from __future__ import annotations

import os
import sys

import bpy
from mathutils import Matrix


DEFAULT_SOURCE = "/tmp/situm-explore-layout.blend"
DEFAULT_OUTPUT_DIR = "/tmp/situm-explore-situm-glb"
DEFAULT_FLOOR_WIDTH = 20.0
DEFAULT_FLOOR_LENGTH = 5.0
DEFAULT_FLOOR_ORIGINS = {
    # The canonical file uses DISPLAY_MODE=top_bottom_review. Both floors are
    # aligned to the LT1 X origin; LT1 is shifted upward on display Y.
    "FLOOR 1": (-21.5, 6.5),
    "FLOOR 2": (-21.5, 0.0),
}
FLOOR_FILENAMES = {
    "FLOOR 1": "situm-explore-lt1.glb",
    "FLOOR 2": "situm-explore-lt2.glb",
}
EXCLUDED_ROLES = {
    "floor_label",
    "vertical_transition_label",
    "vertical_transition",
}
STAIR_ROLE_PREFIXES = ("stair_",)


def cli_args() -> list[str]:
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def argument_value(args: list[str], name: str, default: str) -> str:
    if name not in args:
        return default
    index = args.index(name)
    if index + 1 >= len(args):
        raise SystemExit(f"{name} requires a value")
    return os.path.abspath(args[index + 1])


def floor_level(obj: bpy.types.Object) -> str | None:
    value = obj.get("floor_level")
    if value in DEFAULT_FLOOR_ORIGINS:
        return str(value)
    if obj.name.startswith("F1 |") or obj.name.startswith("3D | F1 |"):
        return "FLOOR 1"
    if obj.name.startswith("F2 |") or obj.name.startswith("3D | F2 |"):
        return "FLOOR 2"
    return None


def is_exportable(obj: bpy.types.Object, level: str, include_stairs: bool) -> bool:
    # Only geometry created by generate_3d_layout.py belongs in the runtime GLB.
    # The source 2D objects carry the same floor metadata but live in hidden
    # collections and must never leak into the export.
    if not obj.name.startswith("3D |"):
        return False
    if floor_level(obj) != level:
        return False
    if obj.type not in {"MESH", "CURVE"}:
        return False
    if obj.hide_render:
        return False
    role = str(obj.get("layout_role", ""))
    if role in EXCLUDED_ROLES:
        return False
    if not include_stairs and role.startswith(STAIR_ROLE_PREFIXES):
        return False
    return True


def evaluated_mesh_copy(obj: bpy.types.Object, depsgraph: bpy.types.Depsgraph) -> bpy.types.Mesh:
    evaluated = obj.evaluated_get(depsgraph)
    mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
    if mesh is None:
        raise RuntimeError(f"could not evaluate {obj.name!r} as a mesh")
    mesh.name = f"SITUM EXPORT | {obj.name} | Mesh"
    return mesh


def scene_floor_geometry(level: str) -> tuple[float, float, float, float]:
    scene = bpy.context.scene
    suffix = "1" if level == "FLOOR 1" else "2"
    fallback_x, fallback_y = DEFAULT_FLOOR_ORIGINS[level]
    origin_x = float(scene.get(f"three_d_floor_{suffix}_origin_x", fallback_x))
    origin_y = float(scene.get(f"three_d_floor_{suffix}_origin_y", fallback_y))
    width = float(scene.get("three_d_floor_width_normalized", DEFAULT_FLOOR_WIDTH))
    length = float(scene.get("three_d_floor_length_normalized", DEFAULT_FLOOR_LENGTH))
    return origin_x, origin_y, width, length


def make_export_collection(level: str, include_stairs: bool) -> tuple[bpy.types.Collection, list[bpy.types.Object]]:
    collection = bpy.data.collections.new(f"SITUM EXPORT | {level}")
    bpy.context.scene.collection.children.link(collection)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    origin_x, origin_y, floor_width, floor_length = scene_floor_geometry(level)
    center_x = origin_x + floor_width * 0.5
    center_y = origin_y + floor_length * 0.5
    normalize = Matrix.Translation((-center_x, -center_y, 0.0))
    exported: list[bpy.types.Object] = []

    for source_obj in list(bpy.data.objects):
        if not is_exportable(source_obj, level, include_stairs):
            continue
        mesh = evaluated_mesh_copy(source_obj, depsgraph)
        obj = bpy.data.objects.new(source_obj.name, mesh)
        collection.objects.link(obj)
        obj.matrix_world = normalize @ source_obj.matrix_world
        obj["situm_floor_level"] = level
        obj["situm_anchor"] = "floor_center"
        obj["source_object"] = source_obj.name
        exported.append(obj)

    if not exported:
        raise RuntimeError(f"no exportable geometry found for {level}")
    return collection, exported


def exporter_kwargs(filepath: str) -> dict[str, object]:
    """Build Blender-version-tolerant glTF exporter arguments."""
    supported = {prop.identifier for prop in bpy.ops.export_scene.gltf.get_rna_type().properties}
    desired: dict[str, object] = {
        "filepath": filepath,
        "export_format": "GLB",
        "use_selection": True,
        "export_yup": True,
        "export_apply": True,
        "export_materials": "EXPORT",
        "export_cameras": False,
        "export_lights": False,
        "export_extras": True,
    }
    return {key: value for key, value in desired.items() if key in supported}


def export_floor(level: str, output_dir: str, include_stairs: bool) -> tuple[str, int]:
    collection, objects = make_export_collection(level, include_stairs)
    try:
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        output = os.path.join(output_dir, FLOOR_FILENAMES[level])
        result = bpy.ops.export_scene.gltf(**exporter_kwargs(output))
        if "FINISHED" not in result:
            raise RuntimeError(f"glTF export did not finish for {level}: {result}")
        return output, len(objects)
    finally:
        bpy.ops.object.select_all(action="DESELECT")
        for obj in list(collection.objects):
            mesh = obj.data if obj.type == "MESH" else None
            bpy.data.objects.remove(obj, do_unlink=True)
            if mesh is not None and mesh.users == 0:
                bpy.data.meshes.remove(mesh)
        bpy.data.collections.remove(collection)


def main() -> None:
    args = cli_args()
    source = argument_value(args, "--source", DEFAULT_SOURCE)
    output_dir = argument_value(args, "--output-dir", DEFAULT_OUTPUT_DIR)
    include_stairs = "--exclude-stairs" not in args

    if not os.path.exists(source):
        raise SystemExit(f"source .blend not found: {source}")
    os.makedirs(output_dir, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=source)

    print("SITUM_GLB_SOURCE", source)
    print("SITUM_GLB_OUTPUT_DIR", output_dir)
    print("SITUM_GLB_ANCHOR", "floor_center")
    print("SITUM_GLB_SCALE_STATUS", bpy.context.scene.get("three_d_scale_status", "unknown"))
    print("SITUM_GLB_INCLUDE_STAIRS", include_stairs)
    for level in ("FLOOR 1", "FLOOR 2"):
        output, object_count = export_floor(level, output_dir, include_stairs)
        size = os.path.getsize(output)
        print("SITUM_GLB_EXPORTED", level, output, object_count, size)


if __name__ == "__main__":
    main()
