"""Render four neutral-lighting inspection views of a GLB with Blender."""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args() -> argparse.Namespace:
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--preserve-materials", action="store_true")
    return parser.parse_args(values)


def point_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(args.source.resolve()))

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("The GLB contains no mesh objects")
    corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    minimum = Vector(tuple(min(point[axis] for point in corners) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in corners) for axis in range(3)))
    center = (minimum + maximum) / 2
    extent = maximum - minimum
    radius = max(extent) * 1.65

    if not args.preserve_materials:
        material = bpy.data.materials.new("Inspection clay")
        material.diffuse_color = (0.32, 0.36, 0.42, 1.0)
        material.use_nodes = True
        principled = material.node_tree.nodes.get("Principled BSDF")
        principled.inputs["Base Color"].default_value = (0.24, 0.29, 0.37, 1.0)
        principled.inputs["Metallic"].default_value = 0.05
        principled.inputs["Roughness"].default_value = 0.72
        for obj in meshes:
            obj.data.materials.clear()
            obj.data.materials.append(material)

    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.data.lens = 58
    bpy.context.scene.camera = camera

    for energy, location, size in (
        (1200, center + Vector((radius, -radius, radius)), radius * 0.8),
        (800, center + Vector((-radius, -radius * 0.4, radius * 0.55)), radius),
        (1000, center + Vector((0, radius, radius * 0.8)), radius * 0.7),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        point_at(light, center)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new("Inspection world")
    scene.world.color = (0.025, 0.03, 0.04)
    scene.view_settings.look = "AgX - Medium High Contrast"

    # glTF characters import Y-up into Blender Z-up. Orbit around Blender Z.
    for name, degrees in (("front", 0), ("left", 90), ("back", 180), ("right", 270)):
        angle = math.radians(degrees)
        camera.location = center + Vector((math.sin(angle) * radius, -math.cos(angle) * radius, extent.z * 0.05))
        point_at(camera, center)
        scene.render.filepath = str((args.output_dir / f"{name}.png").resolve())
        bpy.ops.render.render(write_still=True)

    print(f"Rendered {len(meshes)} mesh object(s), bounds={tuple(round(v, 3) for v in extent)}")


if __name__ == "__main__":
    main()
