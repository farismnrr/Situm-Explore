"""Build the canonical 3D indoor-layout file from the approved 2D scene.

Run from the repository root with Blender 5.x:

    blender --background --python scripts/blender/generate_3d_layout.py
    blender --background --python scripts/blender/generate_3d_layout.py

The source .blend is opened as the starting point and the canonical output is
saved to /tmp/situm-explore-layout.blend. The approved 2D collections are
retained but hidden in the 3D file.
This script creates a visual 3D blockout only; it does not touch app/runtime
navigation data and does not render an image. The review output deliberately
keeps Floor 1 and Floor 2 one above the other along the display Y axis at the
same display elevation so both can be captured in one screenshot without
stacking their physical floors in Z.
"""

import math
import os
import sys

import bpy
from mathutils import Vector


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_SOURCE = "/tmp/situm-explore-layout-source-traced.blend"
DEFAULT_OUTPUT = "/tmp/situm-explore-layout.blend"

F1_ORIGIN_X = -21.5
F2_ORIGIN_X = 2.5
FLOOR_ALIGNMENT_SHIFT = F1_ORIGIN_X - F2_ORIGIN_X
TOP_BOTTOM_ORIGIN_X = F1_ORIGIN_X
F1_REVIEW_ORIGIN_Y = 6.5
F2_REVIEW_ORIGIN_Y = 0.0
DISPLAY_MODE = "top_bottom_review"
FLOOR_HEIGHT = 3.20
FLOOR_SLAB_THICKNESS = 0.12
FLOOR_PANEL_THICKNESS = 0.04
WALL_HEIGHT = 2.75
DOOR_HEIGHT = 2.15


def argument_value(name, default):
    if "--" not in sys.argv:
        return default
    args = sys.argv[sys.argv.index("--") + 1:]
    if name not in args:
        return default
    index = args.index(name)
    if index + 1 >= len(args):
        raise SystemExit(f"{name} requires a value")
    return os.path.abspath(args[index + 1])


SOURCE = argument_value("--source", DEFAULT_SOURCE)
OUTPUT = argument_value("--output", DEFAULT_OUTPUT)

if not os.path.exists(SOURCE):
    raise SystemExit(f"source .blend not found: {SOURCE}")

bpy.ops.wm.open_mainfile(filepath=SOURCE)


def collection(name):
    result = bpy.data.collections.get(name)
    if result is None:
        result = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(result)
    return result


floor_col = collection("03_LAYOUT_3D | FLOOR PANELS")
wall_col = collection("03_LAYOUT_3D | WALLS")
portal_col = collection("03_LAYOUT_3D | DOOR PORTALS")
stair_col = collection("03_LAYOUT_3D | STAIRS")
label_col = collection("03_LAYOUT_3D | LABELS")
nav_col = collection("03_LAYOUT_3D | NAVIGATION")
presentation_col = collection("03_LAYOUT_3D | PRESENTATION")


def component_collection(parent, component_type, component_id, from_floor=None, to_floor=None, source_name=None):
    """Return an independently editable component instance collection.

    Each placement gets its own collection and freshly-created mesh data. The
    builder functions stay reusable, while moving or editing one instance in
    Blender does not mutate any sibling component.
    """
    safe_id = component_id.replace("/", "-")
    name = "COMPONENT | " + component_type + " | " + safe_id
    result = bpy.data.collections.get(name)
    if result is None:
        result = bpy.data.collections.new(name)
    if result.name not in parent.children:
        parent.children.link(result)
    result["component_type"] = component_type
    result["component_id"] = component_id
    result["independent_instance"] = True
    result["reusable_builder"] = component_type.lower() + "_component"
    root_name = "COMPONENT ROOT | " + component_type + " | " + safe_id
    root = bpy.data.objects.get(root_name)
    if root is None:
        root = bpy.data.objects.new(root_name, None)
        result.objects.link(root)
    root.empty_display_type = "CUBE"
    root.empty_display_size = 0.32
    root["component_type"] = component_type
    root["component_id"] = component_id
    root["independent_instance"] = True
    root["move_children_as_unit"] = True
    result["root_object"] = root_name
    if from_floor is not None:
        result["from_floor"] = from_floor
    if to_floor is not None:
        result["to_floor"] = to_floor
    if source_name is not None:
        result["source_2d_object"] = source_name
    return result


def finalize_component(component_col):
    """Parent a component's freshly-built parts to its moveable root empty."""
    root = bpy.data.objects.get(component_col.get("root_object"))
    if root is None:
        return None
    for obj in list(component_col.objects):
        if obj is not root:
            obj.parent = root
    return root


portal_col["component_group"] = "independent door instances"
stair_col["component_group"] = "independent stair instances"


for source_collection_name in (
    "00_REFERENCE | PHOTO INDEX",
    "01_LAYOUT_2D | ZONES",
    "01_LAYOUT_2D | WALLS",
    "02_LAYOUT_2D | DOORS & STAIRS",
    "90_PRESENTATION | LABELS LEGEND",
):
    source_collection = bpy.data.collections.get(source_collection_name)
    if source_collection is not None:
        source_collection.hide_viewport = True
        source_collection.hide_render = True


def make_material(name, color, roughness=0.70):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled is not None:
        principled.inputs["Base Color"].default_value = (*color, 1.0)
        principled.inputs["Roughness"].default_value = roughness
    return material


def make_transparent_material(name, color, alpha=0.35, roughness=0.28):
    material = make_material(name, color, roughness)
    material.diffuse_color = (*color, alpha)
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled is not None:
        principled.inputs["Base Color"].default_value = (*color, 1.0)
        alpha_socket = principled.inputs.get("Alpha")
        if alpha_socket is not None:
            alpha_socket.default_value = alpha
        transmission_socket = principled.inputs.get("Transmission Weight")
        if transmission_socket is None:
            transmission_socket = principled.inputs.get("Transmission")
        if transmission_socket is not None:
            transmission_socket.default_value = 0.25
    try:
        material.surface_render_method = "DITHERED"
    except (AttributeError, TypeError):
        try:
            material.blend_method = "BLEND"
        except (AttributeError, TypeError):
            pass
    material["transparent_tinted_surface"] = True
    return material


MAT_FLOOR = make_material("3D | Structural Floor", (0.055, 0.075, 0.10), 0.82)
MAT_WALL = make_material("3D | Solid Wall", (0.72, 0.78, 0.84), 0.64)
MAT_GLASS = make_material("3D | Glass Partition", (0.12, 0.72, 0.74), 0.38)
MAT_PORTAL = make_material("3D | Door Portal", (0.22, 0.92, 0.83), 0.42)
MAT_INTERIOR_FRAME = make_material("3D | Interior Door White Frame", (0.88, 0.90, 0.90), 0.46)
MAT_ENTRY_DOOR = make_transparent_material("3D | Entry Door Tinted Glass", (0.04, 0.78, 0.82), 0.34, 0.24)
MAT_INTERIOR_DOOR_GLASS = make_transparent_material("3D | Interior Door Tinted Glass", (0.04, 0.78, 0.82), 0.34, 0.24)
MAT_STAIR = make_material("3D | Stair Detail", (0.64, 0.46, 0.90), 0.55)
MAT_TREAD = make_material("3D | Stair Tread", (0.78, 0.64, 0.98), 0.48)
MAT_HANDRAIL = make_material("3D | Stair Handrail", (0.16, 0.88, 0.78), 0.38)
MAT_GROUND = make_material("3D | Ground", (0.018, 0.025, 0.038), 0.90)
MAT_LABEL = make_material("3D | Label", (0.86, 0.94, 0.98), 0.56)


def floor_level(obj):
    value = obj.get("floor_level")
    if value in {"FLOOR 1", "FLOOR 2"}:
        return value
    if obj.name.startswith("F1 |"):
        return "FLOOR 1"
    if obj.name.startswith("F2 |"):
        return "FLOOR 2"
    return None


def floor_z(level):
    if DISPLAY_MODE in {"side_by_side", "top_bottom_review"}:
        return 0.0
    return 0.0 if level == "FLOOR 1" else FLOOR_HEIGHT


def source_origin_x(level):
    return F1_ORIGIN_X if level == "FLOOR 1" else F2_ORIGIN_X


def x_shift(level):
    if DISPLAY_MODE == "side_by_side":
        return 0.0
    if DISPLAY_MODE == "top_bottom_review":
        return TOP_BOTTOM_ORIGIN_X - source_origin_x(level)
    return 0.0 if level == "FLOOR 1" else FLOOR_ALIGNMENT_SHIFT


def floor_origin_x(level):
    if DISPLAY_MODE == "side_by_side":
        return F1_ORIGIN_X if level == "FLOOR 1" else F2_ORIGIN_X
    if DISPLAY_MODE == "top_bottom_review":
        return TOP_BOTTOM_ORIGIN_X
    return F1_ORIGIN_X


def floor_origin_y(level):
    if DISPLAY_MODE == "top_bottom_review":
        return F1_REVIEW_ORIGIN_Y if level == "FLOOR 1" else F2_REVIEW_ORIGIN_Y
    return 0.0


def y_shift(level):
    return floor_origin_y(level)


def transform_point(point, level):
    return point[0] + x_shift(level), point[1] + y_shift(level)


def unique_xy(obj):
    result = []
    if not hasattr(obj.data, "vertices"):
        return result
    for vertex in obj.data.vertices:
        point = (float(vertex.co.x), float(vertex.co.y))
        if not any(abs(point[0] - old[0]) < 1e-6 and abs(point[1] - old[1]) < 1e-6 for old in result):
            result.append(point)
    return result


def bounds_xy(obj, level):
    points = [transform_point(point, level) for point in unique_xy(obj)]
    if not points:
        return None
    return (
        min(point[0] for point in points),
        min(point[1] for point in points),
        max(point[0] for point in points),
        max(point[1] for point in points),
    )


def make_extruded_polygon(name, points, z0, z1, target_collection, material, role, level=None, source=None):
    clean_points = []
    for point in points:
        if not clean_points or abs(point[0] - clean_points[-1][0]) > 1e-6 or abs(point[1] - clean_points[-1][1]) > 1e-6:
            clean_points.append(point)
    if len(clean_points) > 1 and abs(clean_points[0][0] - clean_points[-1][0]) < 1e-6 and abs(clean_points[0][1] - clean_points[-1][1]) < 1e-6:
        clean_points.pop()
    if len(clean_points) < 3:
        return None

    count = len(clean_points)
    vertices = [(x, y, z0) for x, y in clean_points]
    vertices.extend((x, y, z1) for x, y in clean_points)
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    faces.extend(
        (index, (index + 1) % count, (index + 1) % count + count, index + count)
        for index in range(count)
    )
    mesh = bpy.data.meshes.new(name + " | Mesh")
    mesh.from_pydata(vertices, [], list(faces))
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    target_collection.objects.link(obj)
    obj.data.materials.append(material)
    obj["layout_role"] = role
    if level is not None:
        obj["floor_level"] = level
    if source is not None:
        obj["source_2d_object"] = source
    return obj


def make_box(name, x0, y0, x1, y1, z0, z1, target_collection, material, role, level=None, source=None):
    return make_extruded_polygon(
        name,
        [(x0, y0), (x1, y0), (x1, y1), (x0, y1)],
        z0,
        z1,
        target_collection,
        material,
        role,
        level,
        source,
    )


def make_segment_prism(name, p0, p1, width, z0, z1, target_collection, material, role, level=None, source=None):
    dx = p1[0] - p0[0]
    dy = p1[1] - p0[1]
    length = math.hypot(dx, dy)
    if length < 1e-6:
        return None
    nx = -dy / length * width * 0.5
    ny = dx / length * width * 0.5
    points = [
        (p0[0] + nx, p0[1] + ny),
        (p1[0] + nx, p1[1] + ny),
        (p1[0] - nx, p1[1] - ny),
        (p0[0] - nx, p0[1] - ny),
    ]
    return make_extruded_polygon(name, points, z0, z1, target_collection, material, role, level, source)


def make_vertical_panel(name, p0, p1, z0, z1, thickness, target_collection, material, role, level=None, source=None):
    """Create a thin vertical panel spanning a portal edge-to-edge."""
    dx = p1[0] - p0[0]
    dy = p1[1] - p0[1]
    length = math.hypot(dx, dy)
    if length < 1e-6 or z1 <= z0:
        return None
    nx = -dy / length * thickness * 0.5
    ny = dx / length * thickness * 0.5
    vertices = [
        (p0[0] + nx, p0[1] + ny, z0),
        (p1[0] + nx, p1[1] + ny, z0),
        (p1[0] - nx, p1[1] - ny, z0),
        (p0[0] - nx, p0[1] - ny, z0),
        (p0[0] + nx, p0[1] + ny, z1),
        (p1[0] + nx, p1[1] + ny, z1),
        (p1[0] - nx, p1[1] - ny, z1),
        (p0[0] - nx, p0[1] - ny, z1),
    ]
    faces = [
        (3, 2, 1, 0),
        (4, 5, 6, 7),
        (0, 1, 5, 4),
        (1, 2, 6, 5),
        (2, 3, 7, 6),
        (3, 0, 4, 7),
    ]
    mesh = bpy.data.meshes.new(name + " | Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    target_collection.objects.link(obj)
    obj.data.materials.append(material)
    obj["layout_role"] = role
    if level is not None:
        obj["floor_level"] = level
    if source is not None:
        obj["source_2d_object"] = source
    return obj


def make_moving_leaf_frame(name, p0, p1, z0, z1, rail_width, target_collection, material, level, source, leaf_index, door_state):
    """Create the perimeter frame that moves with one openable door leaf."""
    if z1 <= z0:
        return []
    half_width = rail_width * 0.5
    parts = []
    for marker, point in (("jamb A", p0), ("jamb B", p1)):
        part = make_box(
            name + " | " + marker,
            point[0] - half_width,
            point[1] - half_width,
            point[0] + half_width,
            point[1] + half_width,
            z0,
            z1,
            target_collection,
            material,
            "door_leaf_frame",
            level,
            source,
        )
        if part is not None:
            parts.append(part)
    bottom = make_segment_prism(
        name + " | bottom rail",
        p0,
        p1,
        rail_width,
        z0,
        min(z1, z0 + rail_width),
        target_collection,
        material,
        "door_leaf_frame",
        level,
        source,
    )
    if bottom is not None:
        parts.append(bottom)
    top = make_segment_prism(
        name + " | top rail",
        p0,
        p1,
        rail_width,
        max(z0, z1 - rail_width),
        z1,
        target_collection,
        material,
        "door_leaf_frame",
        level,
        source,
    )
    if top is not None:
        parts.append(top)
    for part in parts:
        part["opening_type"] = "door_leaf_frame"
        part["leaf_index"] = leaf_index
        part["door_state"] = door_state
        part["moves_with_door_leaf"] = True
    return parts


def door_swing_normal(unit, side):
    """Return the XY normal used to swing a leaf away from its portal line."""
    if abs(unit.x) >= abs(unit.y):
        return Vector((0.0, float(side)))
    return Vector((float(side), 0.0))


def curve_points(obj, level):
    points = []
    if not hasattr(obj.data, "splines"):
        return points
    for spline in obj.data.splines:
        for point in spline.points:
            points.append(transform_point((point.co.x, point.co.y), level))
    return points


def make_curve(name, points, target_collection, material, bevel, role, level=None, source=None):
    if len(points) < 2:
        return None
    curve = bpy.data.curves.new(name + " | Curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = bevel
    curve.bevel_resolution = 2
    curve.use_fill_caps = True
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for target, point in zip(spline.points, points):
        target.co = (point[0], point[1], point[2], 1.0)
    obj = bpy.data.objects.new(name, curve)
    target_collection.objects.link(obj)
    curve.materials.append(material)
    obj["layout_role"] = role
    if level is not None:
        obj["floor_level"] = level
    if source is not None:
        obj["source_2d_object"] = source
    return obj


def make_text(name, body, location, size, target_collection, material, rotation=(0.0, 0.0, 0.0), role="label", level=None, source=None):
    data = bpy.data.curves.new(name + " | Text", "FONT")
    data.body = body
    data.align_x = "CENTER"
    data.align_y = "CENTER"
    data.size = size
    data.extrude = 0.012
    data.bevel_depth = 0.002
    obj = bpy.data.objects.new(name, data)
    target_collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    data.materials.append(material)
    obj["layout_role"] = role
    if level is not None:
        obj["floor_level"] = level
    if source is not None:
        obj["source_2d_object"] = source
    return obj


def source_material(obj):
    if hasattr(obj.data, "materials") and len(obj.data.materials) > 0 and obj.data.materials[0] is not None:
        return obj.data.materials[0]
    return MAT_FLOOR


# A single slab per floor gives the 3D scene a continuous walkable base. The
# colored panels above it retain the approved 2D room/circulation semantics.
for level in ("FLOOR 1", "FLOOR 2"):
    z = floor_z(level)
    origin_x = floor_origin_x(level)
    origin_y = floor_origin_y(level)
    make_box(
        "3D | " + level + " structural slab",
        origin_x,
        origin_y,
        origin_x + 20.0,
        origin_y + 5.0,
        z,
        z + FLOOR_SLAB_THICKNESS,
        floor_col,
        MAT_FLOOR,
        "structural_floor_slab",
        level,
    )


zone_count = 0
stair_source_names = {"F1 | STAIR UP TO LT2", "F2 | STAIR DOWN TO LT1"}
for source_obj in bpy.data.objects:
    level = floor_level(source_obj)
    if level is None or source_obj.get("layout_role") not in {"zone", "clear_area", "vertical_stair"}:
        continue
    if source_obj.name in stair_source_names or source_obj.get("layout_role") == "vertical_stair":
        continue
    points = [transform_point(point, level) for point in unique_xy(source_obj)]
    panel = make_extruded_polygon(
        "3D | " + source_obj.name,
        points,
        floor_z(level) + FLOOR_SLAB_THICKNESS,
        floor_z(level) + FLOOR_SLAB_THICKNESS + FLOOR_PANEL_THICKNESS,
        floor_col,
        source_material(source_obj),
        "zone_panel",
        level,
        source_obj.name,
    )
    if panel is not None:
        zone_count += 1


wall_count = 0
for source_obj in bpy.data.objects:
    level = floor_level(source_obj)
    if level is None or source_obj.get("layout_role") != "wall":
        continue
    points = curve_points(source_obj, level)
    if len(points) < 2:
        continue
    is_glass = "glass" in source_obj.name.lower() or any(
        material is not None and "glass" in material.name.lower()
        for material in getattr(source_obj.data, "materials", [])
    )
    width = 0.075 if is_glass else (0.20 if "exterior" in source_obj.name.lower() else 0.14)
    material = MAT_GLASS if is_glass else MAT_WALL
    height_ratio = max(0.0, min(1.0, float(source_obj.get("wall_height_ratio", 1.0))))
    wall_role = "low_partition" if height_ratio < 1.0 else ("glass_wall" if is_glass else "solid_wall")
    for index in range(len(points) - 1):
        wall = make_segment_prism(
            "3D | " + source_obj.name + " | segment " + str(index + 1),
            points[index],
            points[index + 1],
            width,
            floor_z(level) + FLOOR_SLAB_THICKNESS,
            floor_z(level) + FLOOR_SLAB_THICKNESS + WALL_HEIGHT * height_ratio,
            wall_col,
            material,
            wall_role,
            level,
            source_obj.name,
        )
        if wall is not None:
            wall["wall_height_ratio"] = height_ratio
            if source_obj.get("partition_type"):
                wall["partition_type"] = source_obj["partition_type"]
            wall_count += 1


portal_groups = {}
for source_obj in bpy.data.objects:
    level = floor_level(source_obj)
    if level is None or source_obj.get("layout_role") != "door_portal":
        continue
    base_name, marker = source_obj.name.rsplit(" | ", 1)
    points = curve_points(source_obj, level)
    if not points:
        continue
    group = portal_groups.setdefault((level, base_name), {})
    group[marker] = points[0]
    group["leaf_count"] = max(group.get("leaf_count", 1), int(source_obj.get("leaf_count", 1)))
    group["full_height_to_wall"] = group.get("full_height_to_wall", False) or bool(source_obj.get("full_height_to_wall", False))
    if source_obj.get("door_state"):
        group["door_state"] = source_obj["door_state"]
    if source_obj.get("door_open_side"):
        group["door_open_side"] = source_obj["door_open_side"]


def build_door_component(level, base_name, group):
    """Build one independent door instance from a source portal placement."""
    point_a = group.get("jamb A")
    point_b = group.get("jamb B")
    if point_a is None or point_b is None:
        return None
    base_z = floor_z(level) + FLOOR_SLAB_THICKNESS
    post_size = 0.075
    leaf_count = max(1, int(group.get("leaf_count", 1)))
    full_height_to_wall = bool(group.get("full_height_to_wall", False))
    door_state = str(group.get("door_state", "closed")).lower()
    door_is_open = door_state == "open"
    door_open_side = 1 if int(group.get("door_open_side", 1)) >= 0 else -1
    wall_top = base_z + WALL_HEIGHT
    jamb_top = wall_top - 0.075 if full_height_to_wall else base_z + DOOR_HEIGHT
    header_top = wall_top if full_height_to_wall else jamb_top + 0.075
    is_main_entry = base_name == "F1 | main entry door"
    frame_material = MAT_PORTAL if is_main_entry else MAT_INTERIOR_FRAME
    door_component_col = component_collection(
        portal_col,
        "DOOR",
        level + " | " + base_name,
        level,
        level,
        base_name,
    )
    door_component_col["leaf_count"] = leaf_count
    door_component_col["full_height_to_wall"] = full_height_to_wall
    door_component_col["door_state"] = "open" if door_is_open else "closed"
    door_component_col["door_open_side"] = door_open_side
    door_component_col["style_reference"] = "generator-defined interior glass-door component"
    door_component_col["entrance_excluded_from_interior_style"] = is_main_entry
    stats = {
        "portal": 1,
        "double_door": 0,
        "door_leaf_count": 0,
        "door_leaf_objects": 0,
        "door_mullions": 0,
        "interior_glass_doors": 0,
        "interior_transoms": 0,
        "open_doors": 1 if door_is_open else 0,
        "door_leaf_frame_objects": 0,
    }
    for marker, point in (("A", point_a), ("B", point_b)):
        post = make_box(
            "3D | " + base_name + " | jamb " + marker,
            point[0] - post_size * 0.5,
            point[1] - post_size * 0.5,
            point[0] + post_size * 0.5,
            point[1] + post_size * 0.5,
            base_z,
            jamb_top,
            door_component_col,
            frame_material,
            "door_portal_jamb",
            level,
            base_name,
        )
        if post is not None:
            post["opening_type"] = "door_portal"
    header = make_segment_prism(
        "3D | " + base_name + " | header",
        point_a,
        point_b,
        0.075,
        jamb_top,
        header_top,
        door_component_col,
        frame_material,
        "door_portal_header",
        level,
        base_name,
    )
    if header is not None:
        header["opening_type"] = "door_portal"
        header["leaf_count"] = leaf_count
        header["full_height_to_wall"] = full_height_to_wall
    threshold = make_segment_prism(
        "3D | " + base_name + " | threshold",
        point_a,
        point_b,
        0.055,
        base_z,
        base_z + 0.035,
        door_component_col,
        frame_material,
        "door_portal_threshold",
        level,
        base_name,
    )
    if threshold is not None:
        threshold["opening_type"] = "door_portal"
        threshold["leaf_count"] = leaf_count
    if is_main_entry:
        midpoint = ((point_a[0] + point_b[0]) * 0.5, (point_a[1] + point_b[1]) * 0.5)
        mullion = make_box(
            "3D | " + base_name + " | center mullion",
            midpoint[0] - post_size * 0.5,
            midpoint[1] - post_size * 0.5,
            midpoint[0] + post_size * 0.5,
            midpoint[1] + post_size * 0.5,
            base_z,
            jamb_top,
            door_component_col,
            frame_material,
            "door_portal_mullion",
            level,
            base_name,
        )
        if mullion is not None:
            mullion["opening_type"] = "double_door_center_mullion"
            mullion["leaf_count"] = leaf_count
            mullion["full_height_to_wall"] = full_height_to_wall
            stats["door_mullions"] += 1
        segment = Vector((point_b[0] - point_a[0], point_b[1] - point_a[1]))
        segment_length = segment.length
        if segment_length > 1e-6:
            unit = segment / segment_length
            middle = Vector(midpoint)
            leaf_margin = min(0.035, segment_length * 0.08)
            if door_is_open:
                swing_normal = door_swing_normal(unit, door_open_side)
                leaf_span = max(0.10, segment_length * 0.5 - leaf_margin)
                leaf_ranges = (
                    (Vector(point_a) + swing_normal * 0.01, Vector(point_a) + swing_normal * leaf_span),
                    (Vector(point_b) + swing_normal * 0.01, Vector(point_b) + swing_normal * leaf_span),
                )
            else:
                leaf_ranges = (
                    (Vector(point_a) + unit * leaf_margin, middle - unit * leaf_margin),
                    (middle + unit * leaf_margin, Vector(point_b) - unit * leaf_margin),
                )
            for leaf_index, (leaf_start, leaf_end) in enumerate(leaf_ranges, start=1):
                leaf = make_vertical_panel(
                    "3D | " + base_name + " | door leaf " + str(leaf_index),
                    leaf_start,
                    leaf_end,
                    base_z + 0.025,
                    jamb_top - 0.015,
                    0.035,
                    door_component_col,
                    MAT_ENTRY_DOOR,
                    "door_leaf",
                    level,
                    base_name,
                )
                if leaf is not None:
                    leaf["opening_type"] = "double_door_leaf"
                    leaf["leaf_index"] = leaf_index
                    leaf["leaf_count"] = leaf_count
                    leaf["full_height_to_wall"] = full_height_to_wall
                    leaf["door_state"] = "open" if door_is_open else "closed"
                    if door_is_open:
                        leaf["hinge"] = "jamb A" if leaf_index == 1 else "jamb B"
                        leaf["swing_direction"] = "inward toward the room"
                    leaf_frame_parts = make_moving_leaf_frame(
                        "3D | " + base_name + " | door leaf " + str(leaf_index) + " frame",
                        leaf_start,
                        leaf_end,
                        base_z + 0.025,
                        jamb_top - 0.015,
                        0.055,
                        door_component_col,
                        frame_material,
                        level,
                        base_name,
                        leaf_index,
                        "open" if door_is_open else "closed",
                    )
                    stats["door_leaf_frame_objects"] += len(leaf_frame_parts)
                    stats["door_leaf_objects"] += 1
        stats["double_door"] = 1
        stats["door_leaf_count"] = leaf_count
    else:
        # Every interior portal uses the reusable interior-door component: a
        # lower glass leaf, a white header/frame, and an upper glass transom.
        segment = Vector((point_b[0] - point_a[0], point_b[1] - point_a[1]))
        segment_length = segment.length
        if segment_length > 1e-6:
            unit = segment / segment_length
            glass_margin = min(0.035, segment_length * 0.08)
            if door_is_open:
                swing_normal = door_swing_normal(unit, door_open_side)
                leaf_start = Vector(point_a) + swing_normal * 0.01
                leaf_end = Vector(point_a) + swing_normal * max(0.10, segment_length - glass_margin)
            else:
                leaf_start = Vector(point_a) + unit * glass_margin
                leaf_end = Vector(point_b) - unit * glass_margin
            glass_leaf = make_vertical_panel(
                "3D | " + base_name + " | glass leaf",
                leaf_start,
                leaf_end,
                base_z + 0.025,
                jamb_top - 0.015,
                0.035,
                door_component_col,
                MAT_INTERIOR_DOOR_GLASS,
                "door_leaf",
                level,
                base_name,
            )
            if glass_leaf is not None:
                glass_leaf["opening_type"] = "single_glass_door_leaf"
                glass_leaf["leaf_index"] = 1
                glass_leaf["leaf_count"] = 1
                glass_leaf["door_material"] = "transparent tinted cyan glass"
                glass_leaf["door_state"] = "open" if door_is_open else "closed"
                if door_is_open:
                    glass_leaf["hinge"] = "jamb A"
                    glass_leaf["swing_direction"] = "inward toward the room"
                leaf_frame_parts = make_moving_leaf_frame(
                    "3D | " + base_name + " | glass leaf frame",
                    leaf_start,
                    leaf_end,
                    base_z + 0.025,
                    jamb_top - 0.015,
                    0.055,
                    door_component_col,
                    frame_material,
                    level,
                    base_name,
                    1,
                    "open" if door_is_open else "closed",
                )
                stats["door_leaf_frame_objects"] += len(leaf_frame_parts)
                stats["door_leaf_objects"] += 1
                stats["interior_glass_doors"] += 1
            transom_glass = make_vertical_panel(
                "3D | " + base_name + " | upper transom glass",
                Vector(point_a),
                Vector(point_b),
                header_top,
                wall_top - 0.075,
                0.035,
                door_component_col,
                MAT_INTERIOR_DOOR_GLASS,
                "door_transom_glass",
                level,
                base_name,
            )
            if transom_glass is not None:
                transom_glass["opening_type"] = "door_transom_glass"
                transom_glass["door_material"] = "transparent tinted cyan glass"
                transom_glass["aligned_to_wall_top"] = True
                stats["interior_transoms"] += 1
            for marker, point in (("A", point_a), ("B", point_b)):
                transom_jamb = make_box(
                    "3D | " + base_name + " | transom jamb " + marker,
                    point[0] - post_size * 0.5,
                    point[1] - post_size * 0.5,
                    point[0] + post_size * 0.5,
                    point[1] + post_size * 0.5,
                    header_top,
                    wall_top,
                    door_component_col,
                    frame_material,
                    "door_transom_frame",
                    level,
                    base_name,
                )
                if transom_jamb is not None:
                    transom_jamb["opening_type"] = "door_transom_frame"
                    transom_jamb["aligned_to_wall_top"] = True
            transom_header = make_segment_prism(
                "3D | " + base_name + " | transom top frame",
                point_a,
                point_b,
                0.075,
                wall_top - 0.075,
                wall_top,
                door_component_col,
                frame_material,
                "door_transom_frame",
                level,
                base_name,
            )
            if transom_header is not None:
                transom_header["opening_type"] = "door_transom_frame"
                transom_header["aligned_to_wall_top"] = True
        stats["door_leaf_count"] = 1
    finalize_component(door_component_col)
    return stats


door_stats = []
for (level, base_name), group in portal_groups.items():
    stats = build_door_component(level, base_name, group)
    if stats is not None:
        door_stats.append(stats)
portal_count = sum(stats["portal"] for stats in door_stats)
double_door_count = sum(stats["double_door"] for stats in door_stats)
door_leaf_count_total = sum(stats["door_leaf_count"] for stats in door_stats)
door_leaf_object_count = sum(stats["door_leaf_objects"] for stats in door_stats)
door_mullion_count = sum(stats["door_mullions"] for stats in door_stats)
interior_glass_door_count = sum(stats["interior_glass_doors"] for stats in door_stats)
interior_transom_count = sum(stats["interior_transoms"] for stats in door_stats)
open_door_count = sum(stats["open_doors"] for stats in door_stats)
door_leaf_frame_object_count = sum(stats["door_leaf_frame_objects"] for stats in door_stats)


def add_stair_post(name, x, y, z0, z1, level, target_collection):
    return make_box(
        name,
        x - 0.026,
        y - 0.026,
        x + 0.026,
        y + 0.026,
        z0,
        z1,
        target_collection,
        MAT_HANDRAIL,
        "stair_handrail_post",
        level,
    )


stair_base_z = FLOOR_SLAB_THICKNESS + FLOOR_PANEL_THICKNESS
stair_top_z = FLOOR_HEIGHT
def add_step_series(prefix, source_name, level, x0, x1, y0, y1, z0, z1, count, direction, transition_name, flight_name, target_collection, reverse=False):
    """Create solid risers and thin tread caps for one source-traced flight.

    ``reverse`` makes the flight climb while travelling from ``y1`` back to
    ``y0``. That is the return leg of a dog-leg stair; keeping it in the same
    reusable builder prevents the two flights from becoming disconnected
    decorative strips.
    """
    if count < 1 or x1 <= x0 or y1 <= y0 or z1 <= z0:
        return 0, 0
    step_depth = (y1 - y0) / count
    step_rise = (z1 - z0) / count
    step_total = 0
    tread_total = 0
    for index in range(count):
        if reverse:
            step_y0 = y1 - (index + 1) * step_depth
            step_y1 = y1 - index * step_depth
        else:
            step_y0 = y0 + index * step_depth
            step_y1 = y0 + (index + 1) * step_depth
        step_top = z0 + (index + 1) * step_rise
        step = make_box(
            prefix + " | step " + f"{index + 1:02d}",
            x0,
            step_y0,
            x1,
            step_y1,
            z0,
            step_top,
            target_collection,
            MAT_STAIR,
            "stair_step",
            level,
            source_name,
        )
        if step is not None:
            step["direction"] = direction
            step["vertical_transition"] = transition_name
            step["stair_flight"] = flight_name
            step_total += 1
        cap_offset = min(0.015, step_depth * 0.25)
        tread = make_box(
            prefix + " | tread cap " + f"{index + 1:02d}",
            x0 - 0.04,
            step_y0 + cap_offset,
            x1 + 0.04,
            step_y1 + cap_offset,
            step_top - 0.055,
            step_top,
            target_collection,
            MAT_TREAD,
            "stair_tread_cap",
            level,
            source_name,
        )
        if tread is not None:
            tread["direction"] = direction
            tread["vertical_transition"] = transition_name
            tread["stair_flight"] = flight_name
            tread_total += 1
    return step_total, tread_total


def add_flight_rail(prefix, x, y0, y1, z0, z1, level, source_name, transition_name, target_collection):
    rail = make_curve(
        prefix + " handrail",
        [(x, y0, z0 + 0.72), (x, y1, z1 + 0.85)],
        target_collection,
        MAT_HANDRAIL,
        0.045,
        "stair_handrail",
        level,
        source_name,
    )
    if rail is not None:
        rail["vertical_transition"] = transition_name
    post_total = 0
    for post_index, fraction in enumerate((0.08, 0.50, 0.92), start=1):
        post_y = y0 + (y1 - y0) * fraction
        post_surface_z = z0 + (z1 - z0) * fraction
        post = add_stair_post(
            prefix + " post " + str(post_index),
            x,
            post_y,
            post_surface_z,
            post_surface_z + 0.72,
            level,
            target_collection,
        )
        if post is not None:
            post["vertical_transition"] = transition_name
            post_total += 1
    return int(rail is not None), post_total


def add_stair_landing(name, x0, y0, x1, y1, z0, level, source_name, transition_name, target_collection):
    """Build one open landing slab as part of an independent stair instance."""
    landing = make_box(
        name,
        x0,
        y0,
        x1,
        y1,
        z0,
        z0 + 0.06,
        target_collection,
        MAT_STAIR,
        "stair_landing",
        level,
        source_name,
    )
    if landing is not None:
        landing["vertical_transition"] = transition_name
        landing["stair_component_part"] = "open_landing"
    return landing


def add_u_turn_handrail(name, x0, y0, x1, y1, z0, level, source_name, transition_name, target_collection):
    """Build the open U-shaped guard rail around an upper landing."""
    inset = min(0.12, max(0.04, (x1 - x0) * 0.08))
    rail = make_curve(
        name,
        [
            (x0 + inset, y0, z0 + 0.72),
            (x0 + inset, y1, z0 + 0.72),
            (x1 - inset, y1, z0 + 0.72),
            (x1 - inset, y0, z0 + 0.72),
        ],
        target_collection,
        MAT_HANDRAIL,
        0.045,
        "stair_handrail",
        level,
        source_name,
    )
    if rail is not None:
        rail["vertical_transition"] = transition_name
        rail["handrail_turn"] = True
    post_count = 0
    for post_index, (post_x, post_y) in enumerate(
        (
            (x0 + inset, y0),
            (x0 + inset, y1),
            (x1 - inset, y1),
            (x1 - inset, y0),
        ),
        start=1,
    ):
        post = add_stair_post(
            name + " post " + str(post_index),
            post_x,
            post_y,
            z0,
            z0 + 0.72,
            level,
            target_collection,
        )
        if post is not None:
            post["vertical_transition"] = transition_name
            post["handrail_turn"] = True
            post_count += 1
    return int(rail is not None), post_count


def add_transition(name, location, direction, from_floor, to_floor, source_name):
    transition = bpy.data.objects.new(name, None)
    nav_col.objects.link(transition)
    transition.empty_display_type = "ARROWS"
    transition.empty_display_size = 0.60
    transition.location = location
    transition["layout_role"] = "vertical_transition"
    transition["navigation_included"] = True
    transition["review_only"] = DISPLAY_MODE in {"side_by_side", "top_bottom_review"}
    transition["physical_connection"] = DISPLAY_MODE not in {"side_by_side", "top_bottom_review"}
    transition["direction"] = direction
    transition["from_floor"] = from_floor
    transition["to_floor"] = to_floor
    transition["source_2d_object"] = source_name
    return transition


def build_return_stair_component(
    component_id,
    source_obj,
    level,
    from_floor,
    to_floor,
    x0,
    y0,
    x1,
    y1,
    left_flight_width,
):
    """Build the shared two-flight stair design for either floor.

    Both floor representations intentionally call this same builder. The
    left flight climbs toward the far landing and the right flight returns in
    the opposite direction, so the footprints and direction semantics stay
    aligned when the floors are combined.
    """
    transition_name = from_floor + " -> " + to_floor
    component_col = component_collection(
        stair_col,
        "STAIR",
        component_id,
        from_floor,
        to_floor,
        source_obj.name,
    )
    component_col["design_family"] = "RETURN_STAIR"
    component_col["stair_form"] = "left UP flight and right DOWN flight with open top U-turn landing"
    component_col["flight_count"] = 2
    component_col["left_flight_direction"] = "UP"
    component_col["right_flight_direction"] = "DOWN"
    component_col["left_flight_matches_shared_design"] = True

    landing_depth = 0.42
    flight_y0 = y0 + 0.28
    flight_y1 = y1 - landing_depth
    center_gap = 0.16
    edge_inset = 0.08
    split_x = x0 + left_flight_width
    left_x0 = x0 + edge_inset
    left_x1 = split_x - center_gap * 0.5
    right_x0 = split_x + center_gap * 0.5
    right_x1 = x1 - edge_inset
    mid_z = stair_base_z + (stair_top_z - stair_base_z) * 0.5

    component_col["left_flight_width"] = round(left_flight_width, 3)
    component_col["footprint_width"] = round(x1 - x0, 3)
    component_col["footprint_depth"] = round(y1 - y0, 3)
    component_col["top_landing_is_u_turn"] = True

    left_steps, left_caps = add_step_series(
        "3D | " + component_id + " | left UP flight",
        source_obj.name,
        level,
        left_x0,
        left_x1,
        flight_y0,
        flight_y1,
        stair_base_z,
        mid_z,
        9,
        "UP",
        transition_name,
        "left UP flight to top U-turn landing",
        component_col,
    )
    right_steps, right_caps = add_step_series(
        "3D | " + component_id + " | right DOWN flight",
        source_obj.name,
        level,
        right_x0,
        right_x1,
        flight_y0,
        flight_y1,
        mid_z,
        stair_top_z,
        9,
        "DOWN",
        transition_name,
        "right DOWN flight from upper floor",
        component_col,
        reverse=True,
    )

    landings = (
        add_stair_landing(
            "3D | " + component_id + " | lower floor landing",
            x0,
            y0 - 0.32,
            x1,
            flight_y0,
            stair_base_z,
            level,
            source_obj.name,
            transition_name,
            component_col,
        ),
        add_stair_landing(
            "3D | " + component_id + " | top U-turn landing",
            x0,
            flight_y1,
            x1,
            y1 + 0.10,
            mid_z,
            level,
            source_obj.name,
            transition_name,
            component_col,
        ),
        add_stair_landing(
            "3D | " + component_id + " | upper floor landing",
            x0,
            y0 - 0.32,
            x1,
            flight_y0,
            stair_top_z,
            level,
            source_obj.name,
            transition_name,
            component_col,
        ),
    )

    handrail_count = 0
    post_count = 0
    for rail_side, rail_x, rail_y0, rail_y1, rail_z0, rail_z1, flight_name in (
        (
            "left UP outer",
            left_x0 + 0.08,
            flight_y0 + 0.06,
            flight_y1 - 0.06,
            stair_base_z,
            mid_z,
            "left UP flight to top U-turn landing",
        ),
        (
            "left UP inner",
            left_x1 - 0.08,
            flight_y0 + 0.06,
            flight_y1 - 0.06,
            stair_base_z,
            mid_z,
            "left UP flight to top U-turn landing",
        ),
        (
            "right DOWN inner",
            right_x0 + 0.08,
            flight_y1 - 0.06,
            flight_y0 + 0.06,
            mid_z,
            stair_top_z,
            "right DOWN flight from upper floor",
        ),
        (
            "right DOWN outer",
            right_x1 - 0.08,
            flight_y1 - 0.06,
            flight_y0 + 0.06,
            mid_z,
            stair_top_z,
            "right DOWN flight from upper floor",
        ),
    ):
        rail_created, posts_created = add_flight_rail(
            "3D | " + component_id + " | " + rail_side,
            rail_x,
            rail_y0,
            rail_y1,
            rail_z0,
            rail_z1,
            level,
            source_obj.name,
            transition_name,
            component_col,
        )
        handrail_count += rail_created
        post_count += posts_created

    turn_rail_count, turn_post_count = add_u_turn_handrail(
        "3D | " + component_id + " | top U-turn handrail",
        x0,
        flight_y1,
        x1,
        y1 + 0.10,
        mid_z,
        level,
        source_obj.name,
        transition_name,
        component_col,
    )
    handrail_count += turn_rail_count
    post_count += turn_post_count
    finalize_component(component_col)
    return {
        "component": component_col,
        "steps": left_steps + right_steps,
        "tread_caps": left_caps + right_caps,
        "landings": landings,
        "handrails": handrail_count,
        "posts": post_count,
        "transition_location": (split_x, flight_y1, mid_z),
        "left_flight_bounds": (left_x0, flight_y0, left_x1, flight_y1),
        "right_flight_bounds": (right_x0, flight_y0, right_x1, flight_y1),
    }


# The two floors are deliberately displayed at the same Z and retain their
# source X positions. This is a review arrangement, not a claim that the
# building's physical floors are coplanar.
#
# Both floors use the same return-stair design. LT1's former gray side-clear
# strip is now the right-hand return flight, so the two source footprints and
# the two 3D component instances describe the same left-UP/right-DOWN form.
f1_stair_source = bpy.data.objects.get("F1 | STAIR UP TO LT2")
if f1_stair_source is None:
    raise SystemExit("approved LT1 stair source is missing")
f1_stair_bounds = bounds_xy(f1_stair_source, "FLOOR 1")
if f1_stair_bounds is None:
    raise SystemExit("approved LT1 stair bounds are missing")
f1_stair_x0, f1_stair_y0, f1_stair_x1, f1_stair_y1 = f1_stair_bounds
f1_left_flight_width = float(f1_stair_source.get("left_flight_width", (f1_stair_x1 - f1_stair_x0) * 0.5))
f1_stair_design = build_return_stair_component(
    "F1 | STAIR UP TO LT2",
    f1_stair_source,
    "FLOOR 1",
    "FLOOR 1",
    "FLOOR 2",
    f1_stair_x0,
    f1_stair_y0,
    f1_stair_x1,
    f1_stair_y1,
    f1_left_flight_width,
)
f1_stair_component_col = f1_stair_design["component"]
f1_steps = f1_stair_design["steps"]
f1_tread_caps = f1_stair_design["tread_caps"]
f1_lower_landing, f1_u_turn_landing, f1_upper_landing = f1_stair_design["landings"]
f1_rail_count = f1_stair_design["handrails"]
f1_post_count = f1_stair_design["posts"]
f1_transition = add_transition(
    "NAV | FLOOR 1 -> FLOOR 2 | STAIR TRANSITION",
    f1_stair_design["transition_location"],
    "UP",
    "FLOOR 1",
    "FLOOR 2",
    f1_stair_source.name,
)


# LT2 uses the same shared builder and the same normalized left-flight width.
# Its source footprint remains independently placed in the floorplan, while
# the component geometry stays identical in form to LT1.
f2_stair_source = bpy.data.objects.get("F2 | STAIR DOWN TO LT1")
if f2_stair_source is None:
    raise SystemExit("approved LT2 stair source is missing")
f2_stair_bounds = bounds_xy(f2_stair_source, "FLOOR 2")
if f2_stair_bounds is None:
    raise SystemExit("approved LT2 stair bounds are missing")
f2_stair_x0, f2_stair_y0, f2_stair_x1, f2_stair_y1 = f2_stair_bounds
f2_stair_design = build_return_stair_component(
    "F2 | STAIR DOWN TO LT1",
    f2_stair_source,
    "FLOOR 2",
    "FLOOR 2",
    "FLOOR 1",
    f2_stair_x0,
    f2_stair_y0,
    f2_stair_x1,
    f2_stair_y1,
    f1_left_flight_width,
)
f2_stair_component_col = f2_stair_design["component"]
f2_steps = f2_stair_design["steps"]
f2_tread_caps = f2_stair_design["tread_caps"]
f2_lower_landing, f2_u_turn_landing, f2_upper_landing = f2_stair_design["landings"]
f2_rail_count = f2_stair_design["handrails"]
f2_post_count = f2_stair_design["posts"]
f2_transition = add_transition(
    "NAV | FLOOR 2 -> FLOOR 1 | STAIR TRANSITION",
    f2_stair_design["transition_location"],
    "DOWN",
    "FLOOR 2",
    "FLOOR 1",
    f2_stair_source.name,
)

stair_step_count = f1_stair_design["steps"] + f2_stair_design["steps"]
stair_tread_cap_count = f1_stair_design["tread_caps"] + f2_stair_design["tread_caps"]
stair_landing_count = sum(
    landing is not None
    for landing in (*f1_stair_design["landings"], *f2_stair_design["landings"])
)
stair_handrail_count = f1_rail_count + f2_rail_count
stair_post_count = f1_post_count + f2_post_count
stair_component_count = 2
# The stair transition is an open stair/landing component. No door or frame
# is placed on either flight or landing.
stair_landing_door_count = 0
stair_landing_transom_count = 0


label_count = 0
for source_obj in bpy.data.objects:
    level = floor_level(source_obj)
    if level is None or source_obj.get("layout_role") != "presentation_label":
        continue
    x, y = transform_point((source_obj.location.x, source_obj.location.y), level)
    origin_x = floor_origin_x(level)
    origin_y = floor_origin_y(level)
    if not (origin_x - 0.01 <= x <= origin_x + 20.01 and origin_y - 0.01 <= y <= origin_y + 5.01):
        continue
    body = source_obj.data.body
    if source_obj.name in {"F1 | STAIR LABEL", "F2 | STAIR LABEL"}:
        continue
    label = make_text(
        "3D | " + source_obj.name,
        body,
        (x, y, floor_z(level) + FLOOR_SLAB_THICKNESS + FLOOR_PANEL_THICKNESS + 0.025),
        max(0.12, min(source_obj.data.size, 0.30)),
        label_col,
        MAT_LABEL,
        (0.0, 0.0, source_obj.rotation_euler.z),
        "floor_label",
        level,
        source_obj.name,
    )
    if label is not None:
        label_count += 1

stair_label = make_text(
    "3D | STAIR UP TO LT2 | label",
    "LEFT UP\nRIGHT DOWN",
    (
        f1_stair_design["transition_location"][0],
        f1_stair_design["transition_location"][1] + 0.10,
        f1_stair_design["transition_location"][2] + 0.18,
    ),
    0.20,
    label_col,
    MAT_LABEL,
    (0.0, 0.0, 0.0),
    "vertical_transition_label",
    "FLOOR 1",
    f1_stair_source.name,
)
if stair_label is not None:
    label_count += 1

f2_stair_label = make_text(
    "3D | STAIR DOWN TO LT1 | label",
    "LEFT UP\nRIGHT DOWN",
    (
        f2_stair_design["transition_location"][0],
        f2_stair_design["transition_location"][1] + 0.10,
        f2_stair_design["transition_location"][2] + 0.18,
    ),
    0.16,
    label_col,
    MAT_LABEL,
    (0.0, 0.0, 0.0),
    "vertical_transition_label",
    "FLOOR 2",
    f2_stair_source.name,
)
if f2_stair_label is not None:
    label_count += 1


make_box(
    "3D | CONTEXT GROUND",
    min(floor_origin_x(level) for level in ("FLOOR 1", "FLOOR 2")) - 2.5,
    min(floor_origin_y(level) for level in ("FLOOR 1", "FLOOR 2")) - 3.0,
    max(floor_origin_x(level) + 20.0 for level in ("FLOOR 1", "FLOOR 2")) + 2.5,
    max(floor_origin_y(level) + 5.0 for level in ("FLOOR 1", "FLOOR 2")) + 3.0,
    -0.16,
    -0.10,
    presentation_col,
    MAT_GROUND,
    "context_ground",
)


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


review_center_x = floor_origin_x("FLOOR 1") + 10.0
review_center_y = (floor_origin_y("FLOOR 1") + floor_origin_y("FLOOR 2")) * 0.5 + 2.5
camera_data = bpy.data.cameras.new("3D | Isometric Camera | Camera")
camera = bpy.data.objects.new("3D | Isometric Camera", camera_data)
presentation_col.objects.link(camera)
camera.location = (review_center_x, review_center_y - 29.0, 25.0)
camera_data.lens = 32.0
camera_data.clip_start = 0.05
camera_data.clip_end = 200.0
look_at(camera, (review_center_x, review_center_y, 1.45))
bpy.context.scene.camera = camera

sun_data = bpy.data.lights.new("3D | Sun | Light", "SUN")
sun = bpy.data.objects.new("3D | Sun | Light", sun_data)
presentation_col.objects.link(sun)
sun.rotation_euler = (math.radians(25.0), math.radians(-20.0), math.radians(-25.0))
sun_data.energy = 2.0

area_data = bpy.data.lights.new("3D | Fill | Light", "AREA")
area = bpy.data.objects.new("3D | Fill | Light", area_data)
presentation_col.objects.link(area)
area.location = (review_center_x, review_center_y - 5.0, 12.0)
area_data.energy = 750.0
area_data.shape = "RECTANGLE"
area_data.size = 12.0
area_data.size_y = 8.0
look_at(area, (review_center_x, review_center_y, 1.0))


scene = bpy.context.scene
scene.render.resolution_x = 1600
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene["design_checkpoint"] = "2 - separate 3D indoor layout blockout"
scene["three_d_revision"] = "componentized-doors-stairs-and-lt2-office-zone"
scene["three_d_status"] = "canonical componentized 3D review file"
scene["three_d_source_file"] = SOURCE
scene["three_d_output_file"] = OUTPUT
scene["three_d_layout_mode"] = "top-bottom Y-axis review"
scene["three_d_vertical_stack"] = False
scene["three_d_floor_display_z"] = "FLOOR 1 and FLOOR 2 both displayed at z=0; Floor 1 is above Floor 2 on display Y"
scene["three_d_review_axis"] = "Y"
scene["three_d_review_floor_order"] = "FLOOR 1 top, FLOOR 2 bottom"
scene["three_d_floor_height_normalized"] = FLOOR_HEIGHT
scene["three_d_floor_width_normalized"] = 20.0
scene["three_d_floor_length_normalized"] = 5.0
scene["three_d_floor_1_origin_x"] = floor_origin_x("FLOOR 1")
scene["three_d_floor_1_origin_y"] = floor_origin_y("FLOOR 1")
scene["three_d_floor_2_origin_x"] = floor_origin_x("FLOOR 2")
scene["three_d_floor_2_origin_y"] = floor_origin_y("FLOOR 2")
scene["three_d_scale_status"] = "normalized source geometry; physical meter calibration pending"
scene["three_d_source_2d_preserved"] = True
scene["three_d_source_2d_file_remains_unchanged"] = True
scene["three_d_navigation_scope"] = "visual blockout with semantic floor/portal/stair metadata; no live runtime integration"
scene["three_d_stair_transition"] = "top-bottom Y-axis review; LT1 and LT2 share the same left UP/right DOWN return-stair design"
scene["three_d_component_system"] = "independent component collections with moveable root empties; placement geometry is freshly generated per instance"
scene["three_d_component_editing"] = "move or edit one COMPONENT ROOT object to affect only that instance"
scene["three_d_stair_design_family"] = "RETURN_STAIR; both floor placements call build_return_stair_component"
scene["three_d_f1_stair_form"] = "left UP flight and right DOWN flight with open top U-turn landing"
scene["three_d_f2_stair_form"] = "left UP flight and right DOWN flight with open top U-turn landing"
scene["three_d_f1_left_flight_direction"] = "UP"
scene["three_d_f1_right_flight_direction"] = "DOWN"
scene["three_d_f2_left_flight_direction"] = "UP"
scene["three_d_f2_right_flight_direction"] = "DOWN"
scene["three_d_f1_left_flight_width_normalized"] = f1_left_flight_width
scene["three_d_f2_left_flight_width_normalized"] = f1_left_flight_width
scene["three_d_f2_stair_shift_normalized_x"] = 1.15
scene["three_d_f2_workroom_left_normalized_x"] = 6.90
scene["three_d_f2_restroom_right_normalized_x"] = 4.45
scene["three_d_f2_restroom_alignment"] = "right edge stretches to the LT2 stair left edge"
scene["three_d_f2_walkway_removed"] = True
scene["three_d_f2_office_zone_after_door"] = True
scene["three_d_f2_workroom_name"] = "WORKROOM 3"
scene["three_d_f2_workroom_door_position"] = str(
    scene.get(
        "f2_workroom_3_door_position",
        "left wall, flush to the lower wall; normalized position inherited from the 2D source",
    )
)
scene["three_d_f2_workroom_door_state"] = "open inward toward Workroom 3"
scene["three_d_door_state_policy"] = "all five door placements open; each leaf frame moves with its glass leaf"
scene["three_d_f2_kitchen_low_partition"] = "stair-facing north kitchen equipment edge"
scene["three_d_f2_kitchen_low_partition_height_ratio"] = 0.25
scene["three_d_f2_kitchen_low_partition_height_normalized"] = WALL_HEIGHT * 0.25
scene["three_d_stair_review_only"] = True
scene["three_d_f1_entry_door_form"] = "centered transparent tinted double-leaf entrance with center mullion"
scene["three_d_f1_entry_door_leaf_count"] = 2
scene["three_d_f1_entry_frame_top"] = "aligned to F1 wall top"
scene["three_d_f1_entry_door_material"] = "transparent tinted cyan glass"
scene["three_d_f1_workroom_1_position"] = "nearest to the main entrance; normalized x=12.50..18.15"
scene["three_d_f1_workroom_1_entry"] = "near-left-edge corridor glass door; entry-side opening closed"
scene["three_d_f1_workroom_1_door_removed"] = False
scene["three_d_f1_workroom_1_door_position"] = "normalized x=12.98..13.70; left-edge margin 0.48; flanks center divider"
scene["three_d_f1_workroom_1_door_width_normalized"] = 0.72
scene["three_d_f1_workroom_1_door_height_normalized"] = DOOR_HEIGHT
scene["three_d_f1_workroom_1_door_material"] = "transparent tinted cyan glass"
scene["three_d_f1_workroom_1_door_top"] = "same jamb/header height as Workroom 2"
scene["three_d_f1_workroom_1_transom"] = "upper glass panel closes the space from header to wall top"
scene["three_d_f1_workroom_1_transom_count"] = 1 if ("FLOOR 1", "F1 | workroom 1 door") in portal_groups else 0
scene["three_d_f1_workroom_2_position"] = "farther from the main entrance; normalized x=6.85..12.50"
scene["three_d_f1_workroom_2_door_position"] = "normalized x=11.30..12.02; right-edge margin 0.48; flanks center divider"
scene["three_d_interior_door_style_reference"] = "generator-defined interior glass-door component"
scene["three_d_interior_door_style_form"] = "lower tinted glass leaf plus white frame/header and upper glass transom; entrance excluded"
scene["three_d_interior_glass_door_count"] = interior_glass_door_count
scene["three_d_interior_transom_count"] = interior_transom_count
scene["three_d_stair_landing_style_reference"] = "public/building-photos/stair-landing.jpeg"
scene["three_d_stair_landing_style_form"] = "open stair flight with landing and handrails; no door or frame placed on the stair"
scene["three_d_stair_landing_placement"] = "F1 and F2 stair landings remain open within their independent stair components"
scene["three_d_door_component_count"] = portal_count
scene["three_d_stair_component_count"] = stair_component_count
scene["three_d_stair_landing_door_count"] = stair_landing_door_count
scene["three_d_stair_landing_transom_count"] = stair_landing_transom_count
scene["generator_source"] = "scripts/blender/generate_3d_layout.py"
scene["source_generator"] = "scripts/blender/generate_source_traced_layout.py"
scene["three_d_zone_panel_count"] = zone_count
scene["three_d_wall_segment_count"] = wall_count
scene["three_d_low_partition_count"] = len([o for o in bpy.data.objects if o.get("layout_role") == "low_partition"])
scene["three_d_door_portal_count"] = portal_count
scene["three_d_double_door_count"] = double_door_count
scene["three_d_door_leaf_count"] = door_leaf_count_total
scene["three_d_door_leaf_object_count"] = door_leaf_object_count
scene["three_d_door_mullion_count"] = door_mullion_count
scene["three_d_open_door_count"] = open_door_count
scene["three_d_door_leaf_frame_object_count"] = door_leaf_frame_object_count
scene["three_d_stair_step_count"] = stair_step_count
scene["three_d_stair_tread_cap_count"] = stair_tread_cap_count
scene["three_d_stair_landing_count"] = stair_landing_count
scene["three_d_stair_handrail_count"] = stair_handrail_count
scene["three_d_stair_post_count"] = stair_post_count
scene["three_d_label_count"] = label_count

component_guide = bpy.data.texts.get("COMPONENTS | README") or bpy.data.texts.new("COMPONENTS | README")
component_guide.clear()
component_guide.write("COMPONENTIZED 3D LAYOUT\n")
component_guide.write("Each door and stair placement has an independent collection and COMPONENT ROOT empty.\n")
component_guide.write("Move/edit one root to change only that instance. Mesh data is freshly generated per placement.\n")
component_guide.write("Reusable builders: build_door_component and build_return_stair_component, with shared step, landing, and rail helpers.\n")
component_guide.write("Door roots live under 03_LAYOUT_3D | DOOR PORTALS. Stair roots live under 03_LAYOUT_3D | STAIRS.\n")
component_guide.write("Stair landing reference: public/building-photos/stair-landing.jpeg; the stair remains open with no door.\n")
component_guide.write("Stair orientation: LT1 and LT2 both use left UP and right DOWN flights with the same open top U-turn design.\n")
component_guide.write("LT2: no walkway zone after the Workroom 3 door; the kitchen equipment edge uses a 25% height low partition.\n")
component_guide.write("All five doors: open for review; each moving leaf includes its own perimeter frame, while the portal frame and upper transom remain fixed.\n")

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUTPUT)
print("THREE_D_LAYOUT_SAVED", OUTPUT)
print("SOURCE_2D", SOURCE)
print("ZONE_PANELS", zone_count)
print("WALL_SEGMENTS", wall_count)
print("DOOR_PORTAL_FRAMES", portal_count)
print("DOUBLE_DOORS", double_door_count)
print("DOOR_LEAVES", door_leaf_count_total)
print("DOOR_LEAF_OBJECTS", door_leaf_object_count)
print("DOOR_MULLIONS", door_mullion_count)
print("INTERIOR_GLASS_DOORS", interior_glass_door_count)
print("INTERIOR_TRANSOMS", interior_transom_count)
print("OPEN_DOORS", open_door_count)
print("DOOR_LEAF_FRAME_OBJECTS", door_leaf_frame_object_count)
print("DOOR_COMPONENTS", portal_count)
print("STAIR_COMPONENTS", stair_component_count)
print("STAIR_LANDING_DOORS", stair_landing_door_count)
print("STAIR_LANDING_TRANSOMS", stair_landing_transom_count)
print("STAIR_STEPS", stair_step_count)
print("STAIR_TREAD_CAPS", stair_tread_cap_count)
print("STAIR_LANDINGS", stair_landing_count)
print("STAIR_HANDRAILS", stair_handrail_count)
print("STAIR_POSTS", stair_post_count)
print("LABELS", label_count)
print("FLOOR_HEIGHT", FLOOR_HEIGHT)
print("DISPLAY_MODE", DISPLAY_MODE)
print("SOURCE_2D_PRESERVED", True)
