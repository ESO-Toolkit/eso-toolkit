"""Build the bounded, replay-distance Yandir overview asset.

This is intentionally an identity LOD rather than a close-up reconstruction. It keeps one
vertex-colored material, optionally reinforces the large color/silhouette cues visible from the
replay camera, and reduces the result to a fixed triangle budget. Helmet curls remain opt-in
because generated head ornaments are especially noticeable when their silhouette is inaccurate.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy

REPLAY_VALUE_SCALE = 0.78


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--target-triangles", type=int, default=10_000)
    parser.add_argument(
        "--grade-colors",
        action="store_true",
        help="Apply broad replay-distance color blocking instead of preserving projected colors.",
    )
    parser.add_argument(
        "--add-helmet-curls",
        action="store_true",
        help="Add the experimental compact helmet curls before decimation.",
    )
    parser.add_argument(
        "--broaden-shoulders",
        action="store_true",
        help="Apply the experimental shoulder silhouette adjustment.",
    )
    parser.add_argument(
        "--keep-first-mesh",
        action="store_true",
        help="Keep the first source mesh and discard separate reconstruction add-ons.",
    )
    return parser.parse_args(values)


def smoothstep(edge_a: float, edge_b: float, value: float) -> float:
    normalized = max(0.0, min(1.0, (value - edge_a) / (edge_b - edge_a)))
    return normalized * normalized * (3.0 - 2.0 * normalized)


def blend(
    source: tuple[float, float, float],
    target: tuple[float, float, float],
    amount: float,
) -> tuple[float, float, float]:
    return tuple(source[index] * (1.0 - amount) + target[index] * amount for index in range(3))


def select_target_color(x: float, y: float, z: float) -> tuple[tuple[float, float, float], float]:
    """Return an sRGB target and blend strength for Yandir's replay-distance color blocking."""
    absolute_x = abs(x)

    # Near-black blue cloth is the dominant read in the reference and anchors the pale fur/metal.
    target = (0.075, 0.095, 0.10)
    strength = 0.68

    # Dark brown leather torso and waist.
    if -0.12 <= z <= 0.42 and absolute_x <= 0.29:
        target = (0.20, 0.115, 0.065)
        strength = 0.72

    # Broad pale shoulder mantle. Preserve some projected variation so it does not read as plastic.
    if 0.34 <= z <= 0.60 and absolute_x >= 0.12:
        target = (0.52, 0.53, 0.50)
        strength = 0.60

    # Pale sleeves/forearm armor form the second-largest light mass after the shoulders.
    if -0.12 <= z <= 0.34 and absolute_x >= 0.27:
        target = (0.38, 0.40, 0.39)
        strength = 0.58

    # Light boot and shin bands remain readable at 32–64 px actor height.
    if -0.90 <= z <= -0.48 and 0.08 <= absolute_x <= 0.34:
        target = (0.42, 0.43, 0.40)
        strength = 0.62

    # Keep the helmet darker than the fur and horns, without losing its metal read.
    if z >= 0.58:
        target = (0.16, 0.18, 0.18)
        strength = 0.68

    # Small warm beard patch: visible from the front, but deliberately not face-detail work.
    if y <= -0.13 and 0.58 <= z <= 0.76 and absolute_x <= 0.09:
        target = (0.46, 0.19, 0.055)
        strength = 0.78

    return target, strength


def grade_vertex_colors(obj: bpy.types.Object) -> None:
    mesh = obj.data
    attribute = mesh.color_attributes.get("Color")
    if attribute is None or attribute.domain != "CORNER":
        raise RuntimeError("Expected a CORNER-domain vertex color attribute named 'Color'")

    for loop_index, loop in enumerate(mesh.loops):
        coordinate = mesh.vertices[loop.vertex_index].co
        entry = attribute.data[loop_index]
        source = tuple(entry.color_srgb[:3])
        target, strength = select_target_color(coordinate.x, coordinate.y, coordinate.z)

        # Retain a little source shading while suppressing white projection spill.
        graded = tuple(
            channel * REPLAY_VALUE_SCALE for channel in blend(source, target, strength)
        )
        entry.color_srgb = (*graded, 1.0)


def broaden_shoulders(obj: bpy.types.Object) -> None:
    """Make the shoulder line slightly wider/flatter without adding geometry."""
    for vertex in obj.data.vertices:
        z = vertex.co.z
        if not 0.28 <= z <= 0.64:
            continue
        height_weight = 1.0 - abs(z - 0.46) / 0.18
        outward_weight = smoothstep(0.10, 0.35, abs(vertex.co.x))
        vertex.co.x *= 1.0 + 0.055 * max(0.0, height_weight) * outward_weight


def add_horn(material: bpy.types.Material, side: float, label: str) -> bpy.types.Object:
    """Add a short, thick helmet curl that reads as head width rather than a hanging loop."""
    path = [
        (0.075, -0.035, 0.825),
        (0.125, -0.043, 0.815),
        (0.177, -0.057, 0.775),
        (0.198, -0.076, 0.725),
        (0.184, -0.099, 0.686),
        (0.150, -0.112, 0.682),
    ]
    radii = (1.0, 1.05, 0.96, 0.76, 0.48, 0.10)

    curve = bpy.data.curves.new(f"Yandir helmet curl {label}", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 4
    curve.bevel_depth = 0.025
    curve.bevel_resolution = 1
    curve.resolution_u = 5
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(path) - 1)
    for point, coordinate, radius in zip(spline.bezier_points, path, radii):
        point.co = (side * coordinate[0], coordinate[1], coordinate[2])
        point.radius = radius
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"

    horn = bpy.data.objects.new(f"Yandir helmet curl {label}", curve)
    bpy.context.collection.objects.link(horn)
    horn.data.materials.append(material)
    bpy.context.view_layer.objects.active = horn
    horn.select_set(True)
    bpy.ops.object.convert(target="MESH")
    horn.select_set(False)

    colors = horn.data.color_attributes.new(name="Color", type="BYTE_COLOR", domain="CORNER")
    for entry in colors.data:
        entry.color_srgb = (0.07, 0.075, 0.07, 1.0)
    return horn


def join_meshes(base: bpy.types.Object, additions: list[bpy.types.Object]) -> bpy.types.Object:
    if not additions:
        return base

    bpy.ops.object.select_all(action="DESELECT")
    base.select_set(True)
    for addition in additions:
        addition.select_set(True)
    bpy.context.view_layer.objects.active = base
    bpy.ops.object.join()

    # Joining objects that share the same material can still retain duplicate slots.
    while len(base.data.materials) > 1:
        base.data.materials.pop(index=len(base.data.materials) - 1)
    for polygon in base.data.polygons:
        polygon.material_index = 0
    return base


def reduce_to_budget(obj: bpy.types.Object, target_triangles: int) -> None:
    current_triangles = sum(len(polygon.vertices) - 2 for polygon in obj.data.polygons)
    if current_triangles <= target_triangles:
        return
    modifier = obj.modifiers.new(name="Replay overview triangle budget", type="DECIMATE")
    modifier.ratio = target_triangles / current_triangles
    modifier.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)


def configure_material(material: bpy.types.Material) -> None:
    material.surface_render_method = "DITHERED"
    # glTF export maps this to an opaque, single-sided material. The renderer can still opt into
    # DoubleSide when a reconstruction actually needs it, but this closed overview mesh does not.
    material.use_backface_culling = True
    material.diffuse_color[3] = 1.0

    principled = material.node_tree.nodes.get("Principled BSDF") if material.use_nodes else None
    if principled is not None:
        principled.inputs["Metallic"].default_value = 0.0
        principled.inputs["Roughness"].default_value = 0.5
        principled.inputs["Alpha"].default_value = 1.0


def main() -> None:
    args = parse_args()
    if not 1_000 <= args.target_triangles <= 100_000:
        raise ValueError("target-triangles must stay between 1,000 and the 100,000 hero-LOD ceiling")

    args.destination.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(args.source.resolve()))

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if args.keep_first_mesh and meshes:
        for addition in meshes[1:]:
            bpy.data.objects.remove(addition, do_unlink=True)
        meshes = meshes[:1]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one reconstructed source mesh, found {len(meshes)}")
    base = meshes[0]
    if len(base.data.materials) != 1:
        raise RuntimeError(f"Expected one source material, found {len(base.data.materials)}")

    material = base.data.materials[0]
    configure_material(material)
    if args.grade_colors:
        grade_vertex_colors(base)
    if args.broaden_shoulders:
        broaden_shoulders(base)
    horns = (
        [add_horn(material, -1.0, "L"), add_horn(material, 1.0, "R")]
        if args.add_helmet_curls
        else []
    )
    result = join_meshes(base, horns)
    reduce_to_budget(result, args.target_triangles)

    bpy.ops.export_scene.gltf(
        filepath=str(args.destination.resolve()),
        export_format="GLB",
        export_apply=True,
        export_materials="EXPORT",
        export_normals=True,
        export_texcoords=False,
        export_vertex_color="ACTIVE",
    )

    triangles = sum(len(polygon.vertices) - 2 for polygon in result.data.polygons)
    print(
        f"Saved {args.destination}: triangles={triangles}, vertices={len(result.data.vertices)}, "
        f"materials={len(result.data.materials)}"
    )


if __name__ == "__main__":
    main()
