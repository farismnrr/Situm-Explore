"""Generate the source-traced Situm Explore layout review scene.

Run from the repository root with Blender 5.x:

    blender --background --python scripts/blender/generate_source_traced_layout.py
    blender --background --python scripts/blender/generate_source_traced_layout.py -- --output /tmp/layout.blend
    blender --background --python scripts/blender/generate_source_traced_layout.py -- --floor 1 --output /tmp/lt1-layout.blend

The public floorplan/photo files are used as references when present. Edit the
floor constants in the ``F1``/``F2`` build section to adjust the 2D design.
The default edit focus is LT1; both floor drawings stay visible for comparison.
Pass ``--floor both`` when neither floor should be marked as the edit focus.
This generator intentionally stops at the 2D review scene; it never creates
the 3D indoor map.
"""

import bpy
import math
import os
import sys


REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_OUTPUT = os.path.join("/tmp", "situm-explore-layout-source-traced.blend")


def output_path():
    argv = sys.argv
    if "--" not in argv:
        return DEFAULT_OUTPUT
    args = argv[argv.index("--") + 1:]
    if "--output" not in args:
        return DEFAULT_OUTPUT
    index = args.index("--output")
    if index + 1 >= len(args):
        raise SystemExit("--output requires a .blend path")
    return os.path.abspath(args[index + 1])


def floor_scope():
    argv = sys.argv
    if "--" not in argv:
        return "1"
    args = argv[argv.index("--") + 1:]
    if "--floor" not in args:
        return "1"
    index = args.index("--floor")
    if index + 1 >= len(args) or args[index + 1] not in {"1", "2", "both"}:
        raise SystemExit("--floor must be 1, 2, or both")
    return args[index + 1]


OUT = output_path()
FLOOR_SCOPE = floor_scope()


bpy.ops.wm.read_factory_settings(use_empty=True)


def make_collection(name):
    result = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(result)
    return result


reference_col = make_collection("00_REFERENCE | PHOTO INDEX")
zones_col = make_collection("01_LAYOUT_2D | ZONES")
walls_col = make_collection("01_LAYOUT_2D | WALLS")
details_col = make_collection("02_LAYOUT_2D | DOORS & STAIRS")
presentation_col = make_collection("90_PRESENTATION | LABELS LEGEND")

zones_col = bpy.data.collections.get("01_LAYOUT_2D | ZONES")
walls_col = bpy.data.collections.get("01_LAYOUT_2D | WALLS")
details_col = bpy.data.collections.get("02_LAYOUT_2D | DOORS & STAIRS")
presentation_col = bpy.data.collections.get("90_PRESENTATION | LABELS LEGEND")


def remove_object(obj):
    bpy.data.objects.remove(obj, do_unlink=True)


# The factory scene is empty, so each run is deterministic and does not depend
# on a previous temporary .blend file.


def material(name, color, roughness=0.70):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get("Principled BSDF")
    if principled:
        principled.inputs["Base Color"].default_value = (*color, 1.0)
        principled.inputs["Roughness"].default_value = roughness
    return mat


MAT = {
    "corridor": bpy.data.materials.get("MAT | Clear Circulation") or material("MAT | Clear Circulation", (0.15, 0.22, 0.31)),
    "kitchen": bpy.data.materials.get("MAT | Kitchen Zone") or material("MAT | Kitchen Zone", (0.56, 0.34, 0.17)),
    "workroom": bpy.data.materials.get("MAT | Enclosed Workroom") or material("MAT | Enclosed Workroom", (0.08, 0.38, 0.45)),
    "open_workroom": bpy.data.materials.get("MAT | Open Workroom") or material("MAT | Open Workroom", (0.08, 0.31, 0.43)),
    "entry": bpy.data.materials.get("MAT | Glass Entry") or material("MAT | Glass Entry", (0.10, 0.49, 0.50)),
    "restroom": bpy.data.materials.get("MAT | Restroom Zone") or material("MAT | Restroom Zone", (0.19, 0.39, 0.30)),
    "aisle": bpy.data.materials.get("MAT | Clear Aisle") or material("MAT | Clear Aisle", (0.22, 0.46, 0.57)),
    "stairs": bpy.data.materials.get("MAT | Stair Core") or material("MAT | Stair Core", (0.33, 0.21, 0.48)),
    "wall": bpy.data.materials.get("MAT | Solid Wall") or material("MAT | Solid Wall", (0.78, 0.84, 0.91), 0.62),
    "glass_wall": bpy.data.materials.get("MAT | Glass Partition") or material("MAT | Glass Partition", (0.16, 0.91, 0.90), 0.42),
    "portal": bpy.data.materials.get("MAT | Clean Door Portal") or material("MAT | Clean Door Portal", (0.55, 0.91, 0.86), 0.48),
    "stair_detail": bpy.data.materials.get("MAT | Stair Detail") or material("MAT | Stair Detail", (0.70, 0.53, 0.95), 0.55),
    "label": bpy.data.materials.get("MAT | Label") or material("MAT | Label", (0.88, 0.95, 1.0)),
    "muted": bpy.data.materials.get("MAT | Muted Label") or material("MAT | Muted Label", (0.48, 0.66, 0.75)),
    "accent": bpy.data.materials.get("MAT | Accent") or material("MAT | Accent", (0.22, 0.95, 0.86), 0.42),
}


REFERENCE_PATHS = [
    "public/building-layouts/gedung-lt1-big.jpeg",
    "public/building-layouts/gedung-lt2-big.jpeg",
    "public/building-photos/entrance-floor-1.jpeg",
    "public/building-photos/down-stairs.jpeg",
    "public/building-photos/stairs-down-1.jpeg",
    "public/building-photos/workroom-1-floor-1.jpeg",
    "public/building-photos/workroom-2-floor-1.jpeg",
    "public/building-photos/kitchen-1-floor-1.jpeg",
    "public/building-photos/stairs-down-2.jpeg",
    "public/building-photos/kitchen-2-floor-2.jpeg",
    "public/building-photos/workroom-3-floor-2.jpeg",
    "public/building-photos/stair-landing.jpeg",
]

packed_reference_names = []
missing_reference_paths = []
for relative_path in REFERENCE_PATHS:
    path = os.path.join(REPO_ROOT, relative_path)
    if not os.path.exists(path):
        missing_reference_paths.append(relative_path)
        continue
    image = bpy.data.images.load(path, check_existing=True)
    image.name = "REFERENCE | " + os.path.basename(path)
    if image.packed_file is None:
        image.pack()
    image.use_fake_user = True
    packed_reference_names.append(image.name)


def P(origin, x, y):
    return origin[0] + x, origin[1] + y


def prism(name, x0, y0, x1, y1, z0, z1, target_collection, mat, role, floor):
    verts = [
        (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
        (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1),
    ]
    faces = [
        (0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
        (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7),
    ]
    mesh = bpy.data.meshes.new(name + " | Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    target_collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj["layout_role"] = role
    obj["floor_level"] = floor
    return obj


def line(name, points, target_collection, mat, bevel, z, role, floor):
    curve = bpy.data.curves.new(name + " | Curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = bevel
    curve.bevel_resolution = 1
    curve.use_fill_caps = True
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, (x, y) in zip(spline.points, points):
        point.co = (x, y, z, 1.0)
    obj = bpy.data.objects.new(name, curve)
    target_collection.objects.link(obj)
    curve.materials.append(mat)
    obj["layout_role"] = role
    obj["floor_level"] = floor
    return obj


def label(name, body, x, y, size, mat=None, rotation=0.0):
    data = bpy.data.curves.new(name + " | Text", "FONT")
    data.body = body
    data.align_x = "CENTER"
    data.align_y = "CENTER"
    data.size = size
    data.extrude = 0.008
    data.bevel_depth = 0.002
    obj = bpy.data.objects.new(name, data)
    presentation_col.objects.link(obj)
    obj.location = (x, y, 0.34)
    obj.rotation_euler[2] = rotation
    data.materials.append(mat or MAT["label"])
    obj["layout_role"] = "presentation_label"
    return obj


def zone(name, origin, x0, y0, x1, y1, mat, floor, source, role="zone", z=0.035):
    gx0, gy0 = P(origin, x0, y0)
    gx1, gy1 = P(origin, x1, y1)
    obj = prism(name, gx0, gy0, gx1, gy1, 0.0, z, zones_col, mat, role, floor)
    obj["source_basis"] = source
    obj["future_3d"] = "preserve_traced_footprint"
    return obj


def polygon_zone(name, origin, points, mat, floor, source, role="zone", z=0.035):
    global_points = [P(origin, x, y) for x, y in points]
    count = len(global_points)
    verts = [(x, y, 0.0) for x, y in global_points]
    verts.extend((x, y, z) for x, y in global_points)
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    faces.extend((index, (index + 1) % count, (index + 1) % count + count, index + count) for index in range(count))
    mesh = bpy.data.meshes.new(name + " | Mesh")
    mesh.from_pydata(verts, [], list(faces))
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    zones_col.objects.link(obj)
    obj.data.materials.append(mat)
    obj["layout_role"] = role
    obj["floor_level"] = floor
    obj["source_basis"] = source
    obj["future_3d"] = "preserve_traced_footprint"
    return obj


def wall_segment(name, p0, p1, mat, floor, bevel=0.065, role="wall"):
    return line(name, [p0, p1], walls_col, mat, bevel, 0.22, role, floor)


def wall_h(name, origin, x0, x1, y, floor, mat, openings=None, bevel=0.065):
    cursor = x0
    for index, (a, b) in enumerate(sorted(openings or [])):
        if a > cursor:
            wall_segment(f"{name} | segment {index}", P(origin, cursor, y), P(origin, a, y), mat, floor, bevel)
        cursor = max(cursor, b)
    if cursor < x1:
        wall_segment(f"{name} | segment final", P(origin, cursor, y), P(origin, x1, y), mat, floor, bevel)


def wall_v(name, origin, x, y0, y1, floor, mat, openings=None, bevel=0.065):
    cursor = y0
    for index, (a, b) in enumerate(sorted(openings or [])):
        if a > cursor:
            wall_segment(f"{name} | segment {index}", P(origin, x, cursor), P(origin, x, a), mat, floor, bevel)
        cursor = max(cursor, b)
    if cursor < y1:
        wall_segment(f"{name} | segment final", P(origin, x, cursor), P(origin, x, y1), mat, floor, bevel)


def low_partition_v(name, origin, x, y0, y1, floor, mat, height_ratio=0.25, bevel=0.065):
    """Draw a source wall keyline that becomes a low 3D partition."""
    segment = wall_segment(name, P(origin, x, y0), P(origin, x, y1), mat, floor, bevel)
    segment["wall_height_ratio"] = height_ratio
    segment["partition_type"] = "low kitchen equipment divider"
    segment["source_basis"] = "kitchen-2-floor-2.jpeg"
    return segment


def portal_h(name, origin, x0, x1, y, floor, side=1, leaf_count=1, door_state="closed", door_open_side=None):
    a = P(origin, x0, y)
    b = P(origin, x1, y)
    depth = 0.15 * side
    open_side = side if door_open_side is None else door_open_side
    objects = [
        line(name + " | jamb A", [a, (a[0], a[1] + depth)], details_col, MAT["portal"], 0.034, 0.275, "door_portal", floor),
        line(name + " | jamb B", [b, (b[0], b[1] + depth)], details_col, MAT["portal"], 0.034, 0.275, "door_portal", floor),
        line(name + " | threshold", [(a[0], a[1] + depth * 0.38), (b[0], b[1] + depth * 0.38)], details_col, MAT["portal"], 0.026, 0.275, "door_portal", floor),
    ]
    for obj in objects:
        obj["opening_type"] = "door_portal"
        obj["clear_width"] = round(x1 - x0, 3)
        obj["leaf_count"] = leaf_count
        obj["door_state"] = door_state
        obj["door_open_side"] = open_side
        obj["future_3d"] = "preserve_wall_gap"


def portal_v(name, origin, x, y0, y1, floor, side=1, leaf_count=1, full_height_to_wall=False, door_state="closed", door_open_side=None):
    a = P(origin, x, y0)
    b = P(origin, x, y1)
    depth = 0.15 * side
    open_side = side if door_open_side is None else door_open_side
    objects = [
        line(name + " | jamb A", [a, (a[0] + depth, a[1])], details_col, MAT["portal"], 0.034, 0.275, "door_portal", floor),
        line(name + " | jamb B", [b, (b[0] + depth, b[1])], details_col, MAT["portal"], 0.034, 0.275, "door_portal", floor),
        line(name + " | threshold", [(a[0] + depth * 0.38, a[1]), (b[0] + depth * 0.38, b[1])], details_col, MAT["portal"], 0.026, 0.275, "door_portal", floor),
    ]
    for obj in objects:
        obj["opening_type"] = "door_portal"
        obj["clear_width"] = round(y1 - y0, 3)
        obj["leaf_count"] = leaf_count
        obj["full_height_to_wall"] = full_height_to_wall
        obj["door_state"] = door_state
        obj["door_open_side"] = open_side
        obj["future_3d"] = "preserve_wall_gap"
    if leaf_count == 2:
        center = (y0 + y1) * 0.5
        mullion = line(
            name + " | center mullion",
            [(a[0], P(origin, 0.0, center)[1]), (a[0] + depth, P(origin, 0.0, center)[1])],
            details_col,
            MAT["portal"],
            0.030,
            0.275,
            "door_portal_mullion",
            floor,
        )
        mullion["opening_type"] = "double_door_center_mullion"
        mullion["leaf_count"] = leaf_count
        mullion["full_height_to_wall"] = full_height_to_wall


def stair(name, origin, x0, y0, x1, y1, floor, direction, photo_basis, left_flight_width=None):
    stair_obj = zone(name, origin, x0, y0, x1, y1, MAT["stairs"], floor, photo_basis, role="vertical_stair", z=0.08)
    stair_obj["space_type"] = "external / open stair"
    stair_obj["navigation_included"] = True
    stair_obj["vertical_transition"] = "FLOOR 1 -> FLOOR 2" if direction == "UP" else "FLOOR 2 -> FLOOR 1"
    stair_obj["direction"] = direction
    stair_obj["stair_form"] = "left UP flight and right DOWN flight with top U-turn"
    stair_obj["left_flight_direction"] = "UP"
    stair_obj["right_flight_direction"] = "DOWN"

    gx0, gy0 = P(origin, x0, y0)
    gx1, gy1 = P(origin, x1, y1)
    local_left_flight_width = (x1 - x0) * 0.5 if left_flight_width is None else left_flight_width
    mid_x = gx0 + local_left_flight_width
    stair_obj["left_flight_width"] = local_left_flight_width
    stair_obj["right_flight_width"] = (x1 - x0) - local_left_flight_width
    landing_depth = 0.42
    flight_y0 = gy0 + 0.28
    flight_y1 = gy1 - landing_depth
    landing = prism(name + " | top U-turn landing", gx0, flight_y1, gx1, gy1, 0.085, 0.13, zones_col, MAT["stair_detail"], "stair_landing", floor)
    landing["vertical_transition"] = stair_obj["vertical_transition"]
    landing["stair_component_part"] = "open_top_u_turn"

    left0 = gx0 + 0.08
    left1 = mid_x - 0.08
    right0 = mid_x + 0.08
    right1 = gx1 - 0.08
    steps = 9
    for index in range(steps + 1):
        left_y = flight_y0 + index * (flight_y1 - flight_y0) / steps
        right_y = flight_y1 - index * (flight_y1 - flight_y0) / steps
        line(f"{name} | left UP tread {index+1:02d}", [(left0, left_y), (left1, left_y)], details_col, MAT["stair_detail"], 0.024, 0.18, "stair_tread_up", floor)
        line(f"{name} | right DOWN tread {index+1:02d}", [(right0, right_y), (right1, right_y)], details_col, MAT["stair_detail"], 0.024, 0.18, "stair_tread_down", floor)

    line(name + " | open edge west", [(gx0, gy0), (gx0, gy1)], details_col, MAT["stair_detail"], 0.042, 0.22, "stair_edge", floor)
    line(name + " | open edge east", [(gx1, gy0), (gx1, gy1)], details_col, MAT["stair_detail"], 0.042, 0.22, "stair_edge", floor)
    line(
        name + " | top U-turn handrail",
        [(gx0 + 0.08, flight_y1), (gx0 + 0.08, gy1 - 0.06), (gx1 - 0.08, gy1 - 0.06), (gx1 - 0.08, flight_y1)],
        details_col,
        MAT["accent"],
        0.042,
        0.25,
        "stair_handrail",
        floor,
    )
    left_arrow_x = (left0 + left1) * 0.5
    right_arrow_x = (right0 + right1) * 0.5
    line(name + " | left UP direction", [(left_arrow_x, gy0 + 0.48), (left_arrow_x, flight_y1 - 0.28)], details_col, MAT["accent"], 0.032, 0.27, "stair_direction_up", floor)
    line(name + " | left UP arrow", [(left_arrow_x - 0.20, flight_y1 - 0.52), (left_arrow_x, flight_y1 - 0.26), (left_arrow_x + 0.20, flight_y1 - 0.52)], details_col, MAT["accent"], 0.032, 0.27, "stair_direction_up", floor)
    line(name + " | right DOWN direction", [(right_arrow_x, flight_y1 - 0.28), (right_arrow_x, gy0 + 0.48)], details_col, MAT["accent"], 0.032, 0.27, "stair_direction_down", floor)
    line(name + " | right DOWN arrow", [(right_arrow_x - 0.20, gy0 + 0.68), (right_arrow_x, gy0 + 0.42), (right_arrow_x + 0.20, gy0 + 0.68)], details_col, MAT["accent"], 0.032, 0.27, "stair_direction_down", floor)


def frame(prefix, origin, floor, east_opening=False, east_openings=None):
    W, H = 20.0, 5.0
    wall_h(prefix + " | north exterior", origin, 0.0, W, H, floor, MAT["wall"], bevel=0.09)
    wall_h(prefix + " | south exterior", origin, 0.0, W, 0.0, floor, MAT["wall"], bevel=0.09)
    wall_v(prefix + " | west exterior", origin, 0.0, 0.0, H, floor, MAT["wall"], bevel=0.09)
    openings = east_openings if east_openings is not None else ([(2.15, 3.25)] if east_opening else [])
    wall_v(prefix + " | east exterior", origin, W, 0.0, H, floor, MAT["wall"], openings=openings, bevel=0.09)


F1 = (-21.5, 0.0)
F2 = (2.5, 0.0)

# Center the entrance in the full exterior wall span, matching the visible
# entrance wall rather than the narrower inner entry bay.
F1_ENTRY_OPENING_CENTER_Y = (0.0 + 5.0) * 0.5
F1_ENTRY_OPENING_HALF_WIDTH = 0.60
F1_ENTRY_OPENING_Y0 = F1_ENTRY_OPENING_CENTER_Y - F1_ENTRY_OPENING_HALF_WIDTH
F1_ENTRY_OPENING_Y1 = F1_ENTRY_OPENING_CENTER_Y + F1_ENTRY_OPENING_HALF_WIDTH

# Match the Workroom 1 corridor door to Workroom 2: same clear width and the
# same small right-edge margin inside each workroom footprint.
F1_WORKROOM_DOOR_WIDTH = 0.72
F1_WORKROOM_DOOR_RIGHT_MARGIN = 0.48
F1_WORKROOM_1_DOOR_LEFT_MARGIN = 0.48
F1_WORKROOM_2_DOOR_X1 = 12.50 - F1_WORKROOM_DOOR_RIGHT_MARGIN
F1_WORKROOM_2_DOOR_X0 = F1_WORKROOM_2_DOOR_X1 - F1_WORKROOM_DOOR_WIDTH
F1_WORKROOM_1_DOOR_X0 = 12.50 + F1_WORKROOM_1_DOOR_LEFT_MARGIN
F1_WORKROOM_1_DOOR_X1 = F1_WORKROOM_1_DOOR_X0 + F1_WORKROOM_DOOR_WIDTH

# LT2 is intentionally shifted to follow LT1's stair entry line. The added
# kitchen width is taken from the open workroom, so the total floor outline
# stays unchanged while the stair and workroom boundary move together.
F2_STAIR_SHIFT_X = 1.15
F2_KITCHEN_RIGHT_X = 3.30 + F2_STAIR_SHIFT_X
F2_STAIR_X0 = 3.30 + F2_STAIR_SHIFT_X
F2_STAIR_X1 = 5.75 + F2_STAIR_SHIFT_X
F2_WORKROOM_X0 = 5.75 + F2_STAIR_SHIFT_X
F2_WORKROOM_Y0 = 0.25
F2_STAIR_Y0 = 1.02
F2_STAIR_Y1 = 4.68
F2_WORKROOM_DOOR_Y0 = F2_WORKROOM_Y0
# Keep the Workroom 3 portal entirely below the stair's lower edge. The
# portal line bevel extends beyond the clear opening, so leave an explicit
# presentation gap rather than letting the frame visually cut into the stair.
F2_WORKROOM_DOOR_WIDTH = 0.72
F2_WORKROOM_DOOR_STAIR_CLEARANCE = 0.06
F2_WORKROOM_DOOR_Y1 = min(
    F2_WORKROOM_DOOR_Y0 + F2_WORKROOM_DOOR_WIDTH,
    F2_STAIR_Y0 - F2_WORKROOM_DOOR_STAIR_CLEARANCE,
)
F2_WORKROOM_LABEL_X = (F2_WORKROOM_X0 + 19.75) * 0.5
F2_STAIR_LABEL_X = F2_STAIR_X0 + 1.20
F2_RESTROOM_X1 = F2_STAIR_X0
F2_RESTROOM_LABEL_X = (1.45 + F2_RESTROOM_X1) * 0.5
F2_KITCHEN_PARTITION_Y0 = F2_STAIR_Y0
F2_KITCHEN_PARTITION_Y1 = 2.55
F2_KITCHEN_PARTITION_HEIGHT_RATIO = 0.25


# These values are normalized to the 20 x 5 sheet and trace the major source
# keylines: LT1 kitchen ~4%, stair ~12%, workrooms ~28% each; LT2 lower kitchen
# and walkway, bathroom above the kitchen stretched to the shifted stair, then
# the reduced long workroom.
frame("F1", F1, "FLOOR 1", east_openings=[(F1_ENTRY_OPENING_Y0, F1_ENTRY_OPENING_Y1)])
polygon_zone(
    "F1 | KITCHEN + WALKWAY",
    F1,
    [(0.25, 0.25), (19.75, 0.25), (19.75, 1.30), (4.45, 1.30), (4.45, 4.75), (0.25, 4.75)],
    MAT["kitchen"],
    "FLOOR 1",
    "gedung-lt1-big.jpeg",
)
zone("F1 | WORKROOM 2", F1, 6.85, 1.30, 12.50, 4.75, MAT["workroom"], "FLOOR 1", "workroom-2-floor-1.jpeg")
zone("F1 | WORKROOM 1", F1, 12.50, 1.30, 18.15, 4.75, MAT["workroom"], "FLOOR 1", "workroom-1-floor-1.jpeg")
zone("F1 | GLASS ENTRY", F1, 18.15, 1.30, 19.75, 4.75, MAT["entry"], "FLOOR 1", "entrance-floor-1.jpeg")
stair("F1 | STAIR UP TO LT2", F1, 4.45, 1.28, 6.85, 4.75, "FLOOR 1", "UP", "stairs-down-1.jpeg; stairs-down-2.jpeg", left_flight_width=1.20)

# The kitchen set and the access path are one continuous floor area. The source
# plan has no separating partition and no kitchen door, so no wall/portal is
# generated at that boundary. The patterned lines at the far end are treated
# as kitchen equipment and intentionally omitted from the layout geometry.
wall_h("F1 | workroom 2 corridor glass", F1, 6.85, 12.50, 1.30, "FLOOR 1", MAT["glass_wall"], openings=[(F1_WORKROOM_2_DOOR_X0, F1_WORKROOM_2_DOOR_X1)], bevel=0.050)
# The workroom doors flank the shared center divider: Workroom 2 sits near its
# right edge and Workroom 1 sits near its left edge.
wall_h("F1 | workroom 1 corridor glass", F1, 12.50, 18.15, 1.30, "FLOOR 1", MAT["glass_wall"], openings=[(F1_WORKROOM_1_DOOR_X0, F1_WORKROOM_1_DOOR_X1)], bevel=0.050)
wall_v("F1 | workroom 2 glass", F1, 6.85, 1.30, 4.75, "FLOOR 1", MAT["glass_wall"], bevel=0.050)
wall_v("F1 | workroom division glass", F1, 12.50, 1.30, 4.75, "FLOOR 1", MAT["glass_wall"], bevel=0.050)
wall_v("F1 | entry glass partition", F1, 18.15, 1.30, 4.75, "FLOOR 1", MAT["glass_wall"], bevel=0.050)
# Workroom 1 is the room nearest the main entrance. Its door matches the
# farther Workroom 2 portal in width, height, and right-edge inset.
portal_h("F1 | workroom 1 door", F1, F1_WORKROOM_1_DOOR_X0, F1_WORKROOM_1_DOOR_X1, 1.30, "FLOOR 1", side=1, door_state="open")
portal_h("F1 | workroom 2 door", F1, F1_WORKROOM_2_DOOR_X0, F1_WORKROOM_2_DOOR_X1, 1.30, "FLOOR 1", side=1, door_state="open")
portal_v(
    "F1 | main entry door",
    F1,
    20.0,
    F1_ENTRY_OPENING_Y0,
    F1_ENTRY_OPENING_Y1,
    "FLOOR 1",
    side=-1,
    leaf_count=2,
    full_height_to_wall=True,
    door_state="open",
)


frame("F2", F2, "FLOOR 2")
polygon_zone(
    "F2 | KITCHEN",
    F2,
    [(0.25, 0.25), (F2_WORKROOM_X0, 0.25), (F2_WORKROOM_X0, F2_STAIR_Y0), (F2_KITCHEN_RIGHT_X, F2_STAIR_Y0), (F2_KITCHEN_RIGHT_X, 2.55), (0.25, 2.55)],
    MAT["kitchen"],
    "FLOOR 2",
    "gedung-lt2-big.jpeg",
)
zone("F2 | RESTROOM ZONE", F2, 1.45, 2.55, F2_RESTROOM_X1, 4.75, MAT["restroom"], "FLOOR 2", "gedung-lt2-big.jpeg")
zone("F2 | WORKROOM 3", F2, F2_WORKROOM_X0, F2_WORKROOM_Y0, 19.75, 4.75, MAT["open_workroom"], "FLOOR 2", "workroom-3-floor-2.jpeg")
stair("F2 | STAIR DOWN TO LT1", F2, F2_STAIR_X0, F2_STAIR_Y0, F2_STAIR_X1, F2_STAIR_Y1, "FLOOR 2", "DOWN", "stairs-down-1.jpeg; stairs-down-2.jpeg", left_flight_width=1.20)

low_partition_v(
    "F2 | kitchen equipment low partition",
    F2,
    F2_KITCHEN_RIGHT_X,
    F2_KITCHEN_PARTITION_Y0,
    F2_KITCHEN_PARTITION_Y1,
    "FLOOR 2",
    MAT["wall"],
    height_ratio=F2_KITCHEN_PARTITION_HEIGHT_RATIO,
    bevel=0.050,
)
wall_v("F2 | restroom west partition", F2, 1.45, 2.55, 4.75, "FLOOR 2", MAT["wall"])
wall_h("F2 | restroom south partition", F2, 1.45, F2_RESTROOM_X1, 2.55, "FLOOR 2", MAT["wall"], openings=[(2.35, 3.05)])
wall_v("F2 | restroom east partition", F2, F2_RESTROOM_X1, 2.55, 4.75, "FLOOR 2", MAT["wall"])
wall_v("F2 | workroom 3 glass entry", F2, F2_WORKROOM_X0, F2_WORKROOM_Y0, 4.75, "FLOOR 2", MAT["glass_wall"], openings=[(F2_WORKROOM_DOOR_Y0, F2_WORKROOM_DOOR_Y1)], bevel=0.050)
portal_h("F2 | restroom door", F2, 2.35, 3.05, 2.55, "FLOOR 2", side=-1, door_state="open", door_open_side=1)
portal_v("F2 | workroom 3 door", F2, F2_WORKROOM_X0, F2_WORKROOM_DOOR_Y0, F2_WORKROOM_DOOR_Y1, "FLOOR 2", side=1, door_state="open")


label("TITLE | SOURCE TRACED 2D LAYOUT", "SOURCE-TRACED 2D LAYOUT  |  CHECKPOINT 1", 0.5, 6.00, 0.42, MAT["accent"])
label("F1 | PLAN LABEL", "FLOOR 1  ·  KITCHEN + EXTERNAL STAIR UP + ENCLOSED WORKROOMS", F1[0] + 10.0, 5.42, 0.28)
label("F2 | PLAN LABEL", "FLOOR 2  ·  KITCHEN + STAIR DOWN + WORKROOM 3", F2[0] + 10.0, 5.42, 0.28)
label("F1 | KITCHEN LABEL", "KITCHEN", *P(F1, 2.20, 2.50), 0.24, MAT["label"], rotation=math.pi / 2)
label("F1 | WORKROOM 2 LABEL", "WORKROOM 2", *P(F1, 9.68, 3.45), 0.28)
label("F1 | WORKROOM 1 LABEL", "WORKROOM 1", *P(F1, 15.33, 3.45), 0.28)
label("F1 | ENTRY LABEL", "ENTRY", *P(F1, 19.02, 3.05), 0.20, MAT["label"], rotation=math.pi / 2)
label("F1 | STAIR LABEL", "LEFT UP\nRIGHT DOWN", *P(F1, 5.65, 2.90), 0.20)
label("F1 | WALKWAY LABEL", "WALKWAY", *P(F1, 10.0, 0.68), 0.20, MAT["label"])
label("F2 | KITCHEN LABEL", "KITCHEN", *P(F2, 0.85, 1.65), 0.24, MAT["label"], rotation=math.pi / 2)
label("F2 | RESTROOM LABEL", "RESTROOM", *P(F2, F2_RESTROOM_LABEL_X, 3.55), 0.17)
label("F2 | WORKROOM LABEL", "WORKROOM 3", *P(F2, F2_WORKROOM_LABEL_X, 2.50), 0.34)
label("F2 | STAIR LABEL", "LEFT UP\nRIGHT DOWN", *P(F2, F2_STAIR_LABEL_X, 2.70), 0.22)
label("NOTES | SCOPE", "SOURCE KEYLINE TRACE  ·  F1 kitchen + walkway unified  ·  F2 office zone has no walkway  ·  3D generated separately", 0.5, -0.72, 0.20, MAT["muted"])


camera = bpy.data.objects.get("Top View | Floorplan Comparison")
if camera is None:
    camera_data = bpy.data.cameras.new("Top View | Floorplan Comparison | Camera")
    camera = bpy.data.objects.new("Top View | Floorplan Comparison", camera_data)
    presentation_col.objects.link(camera)
camera.location = (0.5, 2.65, 30.0)
camera.rotation_euler = (0.0, 0.0, 0.0)
camera.data.type = "ORTHO"
camera.data.ortho_scale = 12.0
bpy.context.scene.camera = camera

# ``--floor`` marks the floor being edited first; it must not isolate that
# floor. Keeping F1 and F2 visible makes it possible to check the stair
# relationship while only changing the LT1 design.

scene = bpy.context.scene
scene.render.resolution_x = 2400
scene.render.resolution_y = 600
scene.render.resolution_percentage = 100
scene["design_checkpoint"] = "1 - source-traced proper 2D layout"
scene["layout_revision"] = "shared-return-stair-and-lt2-office-zone"
scene["layout_dimensions"] = "normalized 20 x 5 sheet per floor; major source keylines traced"
scene["kitchen_door_openings"] = False
scene["lt1_stair_interpretation"] = "external/open return stair with left flight UP and right flight DOWN; top U-turn landing"
scene["lt2_stair_interpretation"] = "external/open return stair with left flight UP and right flight DOWN; top U-turn landing"
scene["door_notation"] = "clean portal markers; swing arcs omitted"
scene["three_d_status"] = "implemented separately in a review file"
scene["three_d_approval_required"] = False
scene["next_checkpoint"] = "user review of the LT2 office zone, low kitchen partition, and door placement"
scene["generator_source"] = "scripts/blender/generate_source_traced_layout.py"
scene["reference_image_count"] = len(packed_reference_names)
scene["missing_reference_count"] = len(missing_reference_paths)
scene["edit_focus_floor"] = "FLOOR " + FLOOR_SCOPE if FLOOR_SCOPE in {"1", "2"} else "both"
scene["review_floor_scope"] = "both"
scene["f2_visibility"] = "visible; not isolated"
scene["f1_kitchen_walkway_unified"] = True
scene["f1_kitchen_boundary"] = "no interior partition; no kitchen door"
scene["f1_stair_form"] = "equal-width left UP and right DOWN flights with top U-turn"
scene["f1_stair_width_normalized"] = 2.40
scene["f1_left_flight_width_normalized"] = 1.20
scene["f1_right_flight_width_normalized"] = 1.20
scene["f1_kitchen_expanded_to_normalized_x"] = 4.45
scene["f2_kitchen_walkway_unified"] = False
scene["f2_walkway_removed"] = True
scene["f2_office_zone_after_door"] = True
scene["f2_bathroom_position"] = "in front of / above kitchen; door opens toward kitchen"
scene["f2_kitchen_boundary"] = "kitchen ends at the stair edge; no walkway zone after the Workroom 3 door"
scene["f2_workroom_3_label_position"] = "center of full Workroom 3 footprint"
scene["f2_workroom_3_position"] = "full office zone after the left-edge door; normalized y=0.25..4.75"
scene["f2_workroom_3_door_position"] = f"left wall, flush to the lower wall; normalized y={F2_WORKROOM_DOOR_Y0:.2f}..{F2_WORKROOM_DOOR_Y1:.2f}; clear of the stair lower edge"
scene["f2_workroom_3_door_width_normalized"] = round(F2_WORKROOM_DOOR_Y1 - F2_WORKROOM_DOOR_Y0, 3)
scene["f2_workroom_3_door_stair_clearance_normalized"] = F2_WORKROOM_DOOR_STAIR_CLEARANCE
scene["f2_workroom_3_door_state"] = "open inward toward Workroom 3"
scene["door_state_policy"] = "all five door placements open for the 3D review"
scene["f2_central_clear_aisle"] = "removed; open workroom remains uninterrupted"
scene["f2_stair_shift_normalized_x"] = F2_STAIR_SHIFT_X
scene["f2_stair_alignment"] = "left edge moved to normalized x=4.45 to follow LT1"
scene["f2_stair_form"] = "left UP and right DOWN flights with top U-turn"
scene["f2_left_flight_direction"] = "UP"
scene["f2_right_flight_direction"] = "DOWN"
scene["f2_left_flight_matches_lt1"] = True
scene["f2_workroom_reduction_normalized_x"] = F2_STAIR_SHIFT_X
scene["f2_restroom_right_boundary_normalized_x"] = F2_RESTROOM_X1
scene["f2_restroom_width_normalized"] = F2_RESTROOM_X1 - 1.45
scene["f2_restroom_alignment"] = "right edge stretched to the LT2 stair left edge"
scene["f2_kitchen_low_partition"] = "vertical divider at the north kitchen/equipment edge beside the stair"
scene["f2_kitchen_low_partition_height_ratio"] = F2_KITCHEN_PARTITION_HEIGHT_RATIO
scene["f2_kitchen_low_partition_height_normalized"] = 2.75 * F2_KITCHEN_PARTITION_HEIGHT_RATIO
scene["f1_entry_door_form"] = "centered double-leaf entrance in full exterior wall span; top frame aligned to exterior wall top"
scene["f1_entry_door_leaf_count"] = 2
scene["f1_entry_opening_center_normalized_y"] = F1_ENTRY_OPENING_CENTER_Y
scene["f1_entry_opening_width_normalized"] = F1_ENTRY_OPENING_HALF_WIDTH * 2.0
scene["f1_entry_opening_reference"] = "full exterior wall y=0..5"
scene["f1_workroom_1_position"] = "nearest to the main entrance; normalized x=12.50..18.15"
scene["f1_workroom_1_entry"] = "near-left-edge corridor glass door; entry-side opening closed"
scene["f1_workroom_1_door_removed"] = False
scene["f1_workroom_1_door_position"] = "normalized x=12.98..13.70; left-edge margin 0.48; flanks center divider"
scene["f1_workroom_1_door_width_normalized"] = F1_WORKROOM_DOOR_WIDTH
scene["f1_workroom_1_door_left_margin_normalized"] = F1_WORKROOM_1_DOOR_LEFT_MARGIN
scene["f1_workroom_1_door_top"] = "same jamb/header height as Workroom 2"
scene["f1_workroom_1_transom"] = "upper glass panel closes the space from header to wall top"
scene["f1_workroom_2_position"] = "farther from the main entrance; normalized x=6.85..12.50"
scene["f1_workroom_2_door_position"] = "normalized x=11.30..12.02; right-edge margin 0.48; flanks center divider"
scene["interior_door_style_reference"] = "generator-defined interior glass-door component"
scene["interior_door_style_form"] = "lower glass door panel plus upper glass transom in a white frame; entrance excluded"
scene["stair_landing_style_reference"] = "public/building-photos/stair-landing.jpeg"
scene["stair_landing_style_form"] = "open stair flight with landing and handrails; no door or frame placed on the stair"

index = bpy.data.texts.get("REFERENCE | Photo Index") or bpy.data.texts.new("REFERENCE | Photo Index")
index.clear()
index.write("Source-traced 2D layout reference index\n")
index.write("Major footprint keylines are traced from the supplied LT1/LT2 denah images.\n")
index.write("LT1 kitchen and walkway are one continuous zone; no kitchen door/opening is represented.\n")
index.write("LT2 has no walkway zone after the Workroom 3 door; the office zone fills the right side down to the lower wall.\n")
index.write("LT2 kitchen equipment is bounded on its stair-facing/north section by a low divider at 25% of the wall height.\n")
index.write("LT1 and LT2 use the same return-stair design: left UP and right DOWN flights with an open top U-turn landing.\n")
index.write("LT1 room order: Workroom 2 is farther left; Workroom 1 is nearest the main entrance.\n")
index.write("F1 Workroom 1 near the entrance has one near-left-edge corridor glass door; its separate entry-side opening is closed. Workroom 2 mirrors it from the opposite side of the divider.\n")
index.write("Interior doors use the reusable glass-door component. stair-landing.jpeg is the reference for the open stair flight/landing; no door is placed on the stair.\n")
index.write("Furniture/components remain intentionally omitted. Both floors stay visible; edit focus is " + scene["edit_focus_floor"] + ". 3D is generated separately for review.\n")
index.write("LT1 entrance is centered in the full exterior wall span as a double-leaf portal with its top frame aligned to the wall top.\n")
index.write("Generator: scripts/blender/generate_source_traced_layout.py\n")
for image_name in sorted(packed_reference_names):
    index.write("- " + image_name + "\n")
for relative_path in missing_reference_paths:
    index.write("- MISSING: " + relative_path + "\n")

reference_col.hide_viewport = True
reference_col.hide_render = True

bpy.context.scene.world = bpy.context.scene.world or bpy.data.worlds.new("World | Situm Explore Layout")
bpy.context.scene.world.color = (0.012, 0.02, 0.04)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("SOURCE_TRACED_LAYOUT_SAVED", OUT)
print("GENERATOR", "scripts/blender/generate_source_traced_layout.py")
print("REFERENCE_IMAGES", len(packed_reference_names))
print("MISSING_REFERENCES", len(missing_reference_paths))
print("KITCHEN_DOOR_PORTALS", len([o for o in bpy.data.objects if o.get("layout_role") == "door_portal" and "KITCHEN" in o.name.upper()]))
print("DOOR_PORTAL_OBJECTS", len([o for o in bpy.data.objects if o.get("layout_role") == "door_portal"]))
print("F1_STAIR_OBJECTS", len([o for o in bpy.data.objects if o.get("floor_level") == "FLOOR 1" and (o.get("layout_role") or "").startswith("stair") or o.name.startswith("F1 | STAIR UP")]))
print("F2_STAIR_OBJECTS", len([o for o in bpy.data.objects if o.get("floor_level") == "FLOOR 2" and (o.get("layout_role") or "").startswith("stair") or o.name.startswith("F2 | STAIR DOWN")]))
