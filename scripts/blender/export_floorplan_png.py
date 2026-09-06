"""Export isolated, light-mode floorplan PNGs from the canonical 2D scene.

The source-traced ``.blend`` is opened as-is and is never saved by this
script. Each export is rendered from an orthographic top-down camera whose
frame is calculated from the world-space bounds of the visible structural
objects for that floor. Room labels inside that structural footprint remain
visible, while presentation-only FONT titles outside it are hidden so they do
not anchor the Situm canvas.

During rendering the exporter temporarily hides every object that does not
belong to the requested floor. It also temporarily assigns copied emission
materials and a white world. This keeps the canonical dark-mode material
intent untouched while producing a clean, readable light-mode presentation.
The final PNG is trimmed to the outermost layout pixels with ImageMagick
(``magick`` or ``convert``), so the exported image does not retain a title or
white presentation margin outside the floor boundary.

Typical pipeline from the repository root (Blender 5.x)::

    blender --background --python scripts/blender/export_floorplan_png.py

Custom paths::

    blender --background --python scripts/blender/export_floorplan_png.py -- \
      --source /tmp/situm-explore-layout-source-traced.blend \
      --output-dir /home/farismnrr/Projects/situm-explore/.tools/output/floorplan-png
"""

from __future__ import annotations

import math
import os
import shutil
import subprocess
import sys

import bpy
from mathutils import Vector


DEFAULT_SOURCE = "/home/farismnrr/Projects/situm-explore/.tools/output/source-traced.blend"
DEFAULT_OUTPUT_DIR = "/home/farismnrr/Projects/situm-explore/.tools/output/floorplan-png"

# Keep the long edge comfortably above the requested ~3000 px target. The
# short edge is derived from the actual framed aspect ratio.
TARGET_LONG_EDGE_PX = 3200
MIN_FINAL_LONG_EDGE_PX = 3000

# The camera gets only a small temporary safety border. After rendering, the
# raster is cropped back to the outermost non-background layout pixels, so
# these values never become visible margin in the Situm PNG.
MARGIN_X_RATIO = 0.002
MARGIN_Y_RATIO = 0.006
MIN_MARGIN_X = 0.02
MIN_MARGIN_Y = 0.02

# Blender's white-world render can quantize an otherwise white pixel to 254.
# ImageMagick's small fuzz value keeps those pixels as background while
# retaining antialiased dark boundary pixels for the final crop.
CROP_BACKGROUND_FUZZ = "0.5%"

RENDERABLE_TYPES = {"MESH", "CURVE", "FONT"}

FLOOR_LEVELS = {
    "FLOOR 1": "lt1",
    "FLOOR 2": "lt2",
}

FILENAMES = {
    "FLOOR 1": "floorplan-lt1.png",
    "FLOOR 2": "floorplan-lt2.png",
}

# These values are fed to emission shaders and are intentionally selected for
# a white background. The palette preserves the source's semantic color
# families while making walls/labels dark and filled zones light enough to
# remain legible in a floorplan upload.
EXPORT_PALETTE = {
    "MAT | Accent": (0.78, 0.16, 0.025, 1.0),
    "MAT | Clean Door Portal": (0.84, 0.30, 0.035, 1.0),
    "MAT | Enclosed Workroom": (0.68, 0.84, 1.00, 1.0),
    "MAT | Glass Entry": (0.48, 0.84, 0.86, 1.0),
    "MAT | Glass Partition": (0.025, 0.30, 0.32, 1.0),
    "MAT | Kitchen Zone": (0.98, 0.72, 0.22, 1.0),
    "MAT | Label": (0.010, 0.018, 0.035, 1.0),
    "MAT | Muted Label": (0.18, 0.26, 0.36, 1.0),
    "MAT | Open Workroom": (0.68, 0.91, 0.78, 1.0),
    "MAT | Restroom Zone": (0.56, 0.89, 0.78, 1.0),
    "MAT | Solid Wall": (0.015, 0.025, 0.045, 1.0),
    "MAT | Stair Core": (0.36, 0.13, 0.67, 1.0),
    "MAT | Stair Detail": (0.20, 0.055, 0.36, 1.0),
}


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
    """Resolve explicit floor metadata first, then the source name prefix."""

    value = obj.get("floor_level")
    if value is not None:
        normalized = str(value).strip().upper()
        if normalized in FLOOR_LEVELS:
            return normalized

    if obj.name.startswith("F1 |"):
        return "FLOOR 1"
    if obj.name.startswith("F2 |"):
        return "FLOOR 2"
    return None


def render_collection_visible(obj: bpy.types.Object) -> bool:
    """Return whether at least one direct object collection is render-visible."""

    if obj.hide_render:
        return False
    if not obj.users_collection:
        return True
    return any(not collection.hide_render for collection in obj.users_collection)


def floor_objects(level: str) -> list[bpy.types.Object]:
    return [
        obj
        for obj in bpy.data.objects
        if obj.type in RENDERABLE_TYPES
        and render_collection_visible(obj)
        and floor_level(obj) == level
    ]


def object_world_bounds(
    obj: bpy.types.Object, depsgraph: bpy.types.Depsgraph
) -> tuple[float, float, float, float]:
    """Return (min_x, min_y, max_x, max_y) of evaluated object geometry."""

    points: list[Vector] = []
    evaluated = None
    mesh = None
    try:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh(
            preserve_all_data_layers=True,
            depsgraph=depsgraph,
        )
        if mesh is not None and len(mesh.vertices):
            points = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    except Exception:
        # The bound box is still a valid conservative fallback for an object
        # whose evaluated geometry cannot be converted to a temporary mesh.
        points = []
    finally:
        if evaluated is not None and mesh is not None:
            try:
                evaluated.to_mesh_clear()
            except RuntimeError:
                pass

    if not points:
        points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]

    if not points:
        location = obj.matrix_world.translation
        return location.x, location.y, location.x, location.y

    return (
        min(point.x for point in points),
        min(point.y for point in points),
        max(point.x for point in points),
        max(point.y for point in points),
    )


def layout_objects(level: str) -> list[bpy.types.Object]:
    """Return structural floor content, excluding presentation FONT labels."""

    return [obj for obj in floor_objects(level) if obj.type != "FONT"]


def union_bounds(
    objects: list[bpy.types.Object], depsgraph: bpy.types.Depsgraph
) -> tuple[float, float, float, float]:
    if not objects:
        raise RuntimeError("no structural floorplan content found")
    bounds = [(obj, object_world_bounds(obj, depsgraph)) for obj in objects]
    return (
        min(item[1][0] for item in bounds),
        min(item[1][1] for item in bounds),
        max(item[1][2] for item in bounds),
        max(item[1][3] for item in bounds),
    )


def bounds_inside(
    inner: tuple[float, float, float, float],
    outer: tuple[float, float, float, float],
    tolerance: float = 1e-6,
) -> bool:
    return (
        inner[0] >= outer[0] - tolerance
        and inner[1] >= outer[1] - tolerance
        and inner[2] <= outer[2] + tolerance
        and inner[3] <= outer[3] + tolerance
    )


def measured_frame(
    level: str, depsgraph: bpy.types.Depsgraph
) -> dict[str, object]:
    """Measure content and derive a safe camera frame and pixel aspect."""

    objects = floor_objects(level)
    if not objects:
        raise RuntimeError(f"no visible floorplan content found for {level}")

    structural_objects = layout_objects(level)
    content_left, content_bottom, content_right, content_top = union_bounds(
        structural_objects, depsgraph
    )
    content_width = content_right - content_left
    content_height = content_top - content_bottom

    margin_x = max(MIN_MARGIN_X, content_width * MARGIN_X_RATIO)
    margin_y = max(MIN_MARGIN_Y, content_height * MARGIN_Y_RATIO)
    frame_left = content_left - margin_x
    frame_bottom = content_bottom - margin_y
    frame_right = content_right + margin_x
    frame_top = content_top + margin_y
    frame_width = frame_right - frame_left
    frame_height = frame_top - frame_bottom

    if frame_width >= frame_height:
        resolution_x = TARGET_LONG_EDGE_PX
        resolution_y = max(
            1,
            math.ceil(TARGET_LONG_EDGE_PX * frame_height / frame_width),
        )
    else:
        resolution_y = TARGET_LONG_EDGE_PX
        resolution_x = max(
            1,
            math.ceil(TARGET_LONG_EDGE_PX * frame_width / frame_height),
        )

    # Blender's orthographic scale is the horizontal camera width. Rounding
    # the short edge can make the vertical span a tiny bit narrower than the
    # measured frame, so expand the horizontal scale when needed.
    actual_pixel_aspect = resolution_x / resolution_y
    camera_width = max(frame_width, frame_height * actual_pixel_aspect)

    font_count = sum(1 for obj in objects if obj.type == "FONT")
    print(
        "FLOORPLAN_CONTENT",
        level,
        f"objects={len(objects)}",
        f"fonts={font_count}",
        "bounds="
        + ",".join(
            f"{value:.3f}"
            for value in (content_left, content_bottom, content_right, content_top)
        ),
    )
    print(
        "FLOORPLAN_FRAME",
        level,
        f"camera_center={(frame_left + frame_right) / 2:.3f},"
        f"{(frame_bottom + frame_top) / 2:.3f}",
        f"view={frame_width:.3f}x{frame_height:.3f}",
        f"camera_width={camera_width:.3f}",
        f"resolution={resolution_x}x{resolution_y}",
    )

    return {
        "objects": objects,
        "layout_objects": structural_objects,
        "layout_bounds": (content_left, content_bottom, content_right, content_top),
        "left": frame_left,
        "bottom": frame_bottom,
        "right": frame_right,
        "top": frame_top,
        "width": frame_width,
        "height": frame_height,
        "camera_width": camera_width,
        "resolution_x": resolution_x,
        "resolution_y": resolution_y,
    }


def create_export_materials() -> dict[str, bpy.types.Material]:
    """Create temporary emission copies without modifying source materials."""

    export_materials: dict[str, bpy.types.Material] = {}
    for source_name, color in EXPORT_PALETTE.items():
        source_material = bpy.data.materials.get(source_name)
        if source_material is None:
            continue

        export_material = source_material.copy()
        export_material.name = f"EXPORT | {source_name}"
        if export_material.node_tree is None:
            export_material.use_nodes = True
        nodes = export_material.node_tree.nodes
        links = export_material.node_tree.links
        nodes.clear()

        output = nodes.new(type="ShaderNodeOutputMaterial")
        output.location = (260, 0)
        emission = nodes.new(type="ShaderNodeEmission")
        emission.location = (0, 0)
        emission.inputs["Color"].default_value = color
        emission.inputs["Strength"].default_value = 1.0
        links.new(emission.outputs["Emission"], output.inputs["Surface"])
        export_material.diffuse_color = color
        export_materials[source_name] = export_material

    missing = sorted(set(EXPORT_PALETTE) - set(export_materials))
    if missing:
        print("FLOORPLAN_PALETTE_MISSING", ",".join(missing))
    return export_materials


def apply_export_materials(
    export_materials: dict[str, bpy.types.Material],
) -> list[tuple[bpy.types.ID, list[bpy.types.Material | None]]]:
    """Replace material slots temporarily and return exact restore data."""

    backups: list[tuple[bpy.types.ID, list[bpy.types.Material | None]]] = []
    seen_data: set[int] = set()
    for obj in bpy.data.objects:
        if obj.type not in RENDERABLE_TYPES or not hasattr(obj.data, "materials"):
            continue
        data = obj.data
        data_key = data.as_pointer()
        if data_key in seen_data:
            continue
        seen_data.add(data_key)

        original_slots = list(data.materials)
        backups.append((data, original_slots))
        for index, source_material in enumerate(original_slots):
            if source_material is None:
                continue
            replacement = export_materials.get(source_material.name)
            if replacement is not None:
                data.materials[index] = replacement
    return backups


def restore_materials(
    backups: list[tuple[bpy.types.ID, list[bpy.types.Material | None]]],
) -> None:
    for data, original_slots in backups:
        for index, original_material in enumerate(original_slots):
            data.materials[index] = original_material


def isolate_floor(
    level: str,
    layout_bounds: tuple[float, float, float, float],
    depsgraph: bpy.types.Depsgraph,
) -> list[tuple[bpy.types.Object, bool]]:
    """Hide other floors and presentation text outside the layout boundary."""

    backups: list[tuple[bpy.types.Object, bool]] = []
    hidden_count = 0
    hidden_external_labels: list[str] = []
    for obj in bpy.data.objects:
        if obj.type not in RENDERABLE_TYPES:
            continue
        if floor_level(obj) == level:
            if obj.type == "FONT" and not bounds_inside(
                object_world_bounds(obj, depsgraph), layout_bounds
            ):
                backups.append((obj, obj.hide_render))
                if not obj.hide_render:
                    obj.hide_render = True
                    hidden_count += 1
                hidden_external_labels.append(obj.name)
            continue
        backups.append((obj, obj.hide_render))
        if not obj.hide_render:
            obj.hide_render = True
            hidden_count += 1
    print("FLOORPLAN_ISOLATION", level, f"hidden_renderables={hidden_count}")
    if hidden_external_labels:
        print(
            "FLOORPLAN_EXTERNAL_TEXT_HIDDEN",
            level,
            "names=" + ",".join(hidden_external_labels),
        )
    return backups


def restore_visibility(backups: list[tuple[bpy.types.Object, bool]]) -> None:
    for obj, original_hide_render in backups:
        obj.hide_render = original_hide_render


def create_export_world(scene: bpy.types.Scene) -> tuple[bpy.types.World | None, bpy.types.World]:
    """Use a temporary white world so the render background is truly light."""

    original_world = scene.world
    export_world = (
        original_world.copy()
        if original_world is not None
        else bpy.data.worlds.new("EXPORT | White World")
    )
    export_world.name = "EXPORT | White World"
    if export_world.node_tree is None:
        export_world.use_nodes = True
    nodes = export_world.node_tree.nodes
    links = export_world.node_tree.links
    nodes.clear()
    background = nodes.new(type="ShaderNodeBackground")
    background.location = (0, 0)
    background.inputs["Color"].default_value = (1.0, 1.0, 1.0, 1.0)
    background.inputs["Strength"].default_value = 1.0
    output = nodes.new(type="ShaderNodeOutputWorld")
    output.location = (260, 0)
    links.new(background.outputs["Background"], output.inputs["Surface"])
    scene.world = export_world
    return original_world, export_world


def remove_temporary_world(export_world: bpy.types.World) -> None:
    if export_world.users == 0:
        bpy.data.worlds.remove(export_world)


def configure_render(scene: bpy.types.Scene) -> None:
    scene.render.engine = "BLENDER_EEVEE"
    if hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = 16
    scene.render.resolution_percentage = 100
    scene.render.pixel_aspect_x = 1.0
    scene.render.pixel_aspect_y = 1.0
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.use_file_extension = True
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0


def crop_render_to_layout(path: str) -> tuple[int, int]:
    """Crop the rendered PNG to its outermost non-white layout pixels."""

    crop_tool = shutil.which("magick") or shutil.which("convert")
    if crop_tool is None:
        raise RuntimeError(
            "ImageMagick is required to crop the final floorplan PNG "
            "(magick or convert was not found)"
        )

    temporary_path = path + ".crop.png"
    if os.path.exists(temporary_path):
        os.remove(temporary_path)

    result = subprocess.run(
        [
            crop_tool,
            path,
            "-fuzz",
            CROP_BACKGROUND_FUZZ,
            "-trim",
            "+repage",
            temporary_path,
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(f"floorplan crop failed: {detail[-500:]}")
    if not os.path.exists(temporary_path):
        raise RuntimeError(f"cropped render was not written: {temporary_path}")

    try:
        os.replace(temporary_path, path)
        image = bpy.data.images.load(path, check_existing=False)
        try:
            width, height = image.size
        finally:
            bpy.data.images.remove(image)
        if max(width, height) < MIN_FINAL_LONG_EDGE_PX:
            raise RuntimeError(
                f"cropped render fell below the minimum long edge of "
                f"{MIN_FINAL_LONG_EDGE_PX}px: {width}x{height}"
            )
        print(
            "FLOORPLAN_CROP",
            path,
            f"fuzz={CROP_BACKGROUND_FUZZ}",
            f"resolution={width}x{height}",
        )
        return width, height
    finally:
        if os.path.exists(temporary_path):
            os.remove(temporary_path)


def render_floor(
    level: str,
    output_dir: str,
    depsgraph: bpy.types.Depsgraph,
) -> tuple[str, int, int, int]:
    scene = bpy.context.scene
    bpy.context.view_layer.update()
    frame = measured_frame(level, depsgraph)
    visibility_backups = isolate_floor(level, frame["layout_bounds"], depsgraph)
    bpy.context.view_layer.update()
    camera_data = None
    camera = None
    try:
        resolution_x = int(frame["resolution_x"])
        resolution_y = int(frame["resolution_y"])
        frame_left = float(frame["left"])
        frame_bottom = float(frame["bottom"])
        frame_right = float(frame["right"])
        frame_top = float(frame["top"])

        scene.render.resolution_x = resolution_x
        scene.render.resolution_y = resolution_y

        camera_data = bpy.data.cameras.new(f"EXPORT | {level} | Camera")
        camera_data.type = "ORTHO"
        camera_data.ortho_scale = float(frame["camera_width"])
        camera_data.clip_start = 0.1
        camera_data.clip_end = 1000.0
        camera = bpy.data.objects.new(f"EXPORT | {level} | Camera", camera_data)
        camera.location = (
            (frame_left + frame_right) * 0.5,
            (frame_bottom + frame_top) * 0.5,
            30.0,
        )
        # A zero-rotation Blender camera looks down its local -Z axis. This
        # preserves the canonical XY orientation without mirroring or rotating.
        camera.rotation_euler = (0.0, 0.0, 0.0)
        scene.collection.objects.link(camera)
        scene.camera = camera
        bpy.context.view_layer.update()

        output = os.path.join(output_dir, FILENAMES[level])
        os.makedirs(output_dir, exist_ok=True)
        scene.render.filepath = output
        result = bpy.ops.render.render(write_still=True)
        if "FINISHED" not in result:
            raise RuntimeError(f"render did not finish for {level}: {result}")
        if not os.path.exists(output):
            raise RuntimeError(f"render did not produce expected output: {output}")
        final_width, final_height = crop_render_to_layout(output)
        size = os.path.getsize(output)
        print("FLOORPLAN_EXPORTED", level, output, final_width, final_height, size)
        return output, final_width, final_height, size
    finally:
        restore_visibility(visibility_backups)
        if camera is not None:
            bpy.data.objects.remove(camera, do_unlink=True)
        if camera_data is not None:
            bpy.data.cameras.remove(camera_data)


def main() -> None:
    args = cli_args()
    source = argument_value(args, "--source", DEFAULT_SOURCE)
    output_dir = argument_value(args, "--output-dir", DEFAULT_OUTPUT_DIR)

    if not os.path.exists(source):
        raise SystemExit(f"source .blend not found: {source}")
    bpy.ops.wm.open_mainfile(filepath=source)

    scene = bpy.context.scene
    original_camera = scene.camera
    original_world, export_world = create_export_world(scene)
    export_materials = create_export_materials()
    material_backups = apply_export_materials(export_materials)
    configure_render(scene)

    print("FLOORPLAN_SOURCE", source)
    print("FLOORPLAN_OUTPUT_DIR", output_dir)
    try:
        depsgraph = bpy.context.evaluated_depsgraph_get()
        for level in ("FLOOR 1", "FLOOR 2"):
            render_floor(level, output_dir, depsgraph)
    finally:
        restore_materials(material_backups)
        scene.world = original_world
        scene.camera = original_camera
        remove_temporary_world(export_world)
        for material in export_materials.values():
            if material.users == 0:
                bpy.data.materials.remove(material)


if __name__ == "__main__":
    main()
