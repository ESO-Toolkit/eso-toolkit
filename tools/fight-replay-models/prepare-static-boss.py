"""Prepare an image-to-3D boss reconstruction for the fight replay.

Run with Blender, for example:

    blender --background --python prepare-static-boss.py -- input.glb output.glb
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args() -> argparse.Namespace:
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--max-triangles", type=int, default=16_000)
    parser.add_argument("--texture-size", type=int, default=1024)
    return parser.parse_args(arguments)


def world_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    minimum = Vector(tuple(min(point[axis] for point in corners) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in corners) for axis in range(3)))
    return minimum, maximum


def main() -> None:
    args = parse_args()
    source = args.source.resolve()
    destination = args.destination.resolve()

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError(f"No mesh objects found in {source}")

    # The replay's static-boss renderer intentionally consumes one mesh/material hierarchy.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(meshes) > 1:
        bpy.ops.object.join()
    boss = bpy.context.view_layer.objects.active
    boss.name = "yandir-the-butcher-static-v1"

    triangle_count = sum(len(polygon.vertices) - 2 for polygon in boss.data.polygons)
    if triangle_count > args.max_triangles:
        modifier = boss.modifiers.new("Replay triangle budget", "DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = args.max_triangles / triangle_count
        modifier.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=modifier.name)

    for polygon in boss.data.polygons:
        polygon.use_smooth = True

    # Blender is Z-up. glTF export maps this to +Y-up. Center X/Y, put feet on Z=0,
    # and bake the translation so the runtime can rotate about a stable ground pivot.
    minimum, maximum = world_bounds([boss])
    boss.location += Vector(
        (
            -((minimum.x + maximum.x) / 2),
            -((minimum.y + maximum.y) / 2),
            -minimum.z,
        )
    )
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    for image in bpy.data.images:
        if image.type == "IMAGE" and max(image.size) > args.texture_size:
            image.scale(args.texture_size, args.texture_size)

    # Remove imported cameras/lights/empties and unused datablocks before deterministic export.
    for obj in list(bpy.context.scene.objects):
        if obj != boss:
            bpy.data.objects.remove(obj, do_unlink=True)
    for datablocks in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.textures):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)

    destination.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    boss.select_set(True)
    bpy.context.view_layer.objects.active = boss
    bpy.ops.export_scene.gltf(
        filepath=str(destination),
        export_format="GLB",
        use_selection=True,
        export_materials="EXPORT",
        export_normals=True,
        # Three.js derives tangents when a material actually needs them. Omitting the
        # de-indexed tangent stream saves roughly 1.4 MB on the Yandir prototype.
        export_tangents=False,
        export_animations=False,
        export_morph=False,
        export_image_format="AUTO",
        export_image_quality=85,
    )

    minimum, maximum = world_bounds([boss])
    triangles = sum(len(polygon.vertices) - 2 for polygon in boss.data.polygons)
    print(
        f"Prepared {destination.name}: {triangles} triangles, "
        f"dimensions={tuple(round(value, 4) for value in maximum - minimum)}, "
        f"materials={len(boss.material_slots)}, images={len(bpy.data.images)}"
    )


if __name__ == "__main__":
    main()
