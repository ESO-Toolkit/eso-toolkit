"""Render review images for a finished NPC asset.

    python tools/fight-replay-models/render-npc-views.py asset.glb out_dir
    python tools/fight-replay-models/render-npc-views.py asset.glb out_dir --head
    python tools/fight-replay-models/render-npc-views.py asset.glb out_dir --clay

Run with the project's Python interpreter (which provides ``bpy``). There is no
standalone Blender install.

Produces front / back / left / right / three-quarter under neutral orthographic
lighting with the Standard view transform, plus a 64px replay-distance strip.
``--head`` crops to the head band, which is where identity is judged. ``--clay``
strips the material so geometry can be assessed independently of texture - use
it before blaming a texture for something the mesh is doing.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

VIEWS = (("front", 0, 0.0), ("three-quarter", 40, 0.0), ("right", 90, 0.0),
         ("back", 180, 0.0), ("left", 270, 0.0))


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("source", type=Path)
    p.add_argument("output_dir", type=Path)
    p.add_argument("--clay", action="store_true", help="replace materials with neutral clay")
    p.add_argument("--head", action="store_true", help="frame the head band instead of the body")
    p.add_argument("--head-fraction", type=float, default=0.20)
    p.add_argument("--resolution", type=int, default=900)
    p.add_argument("--no-strip", action="store_true", help="skip the replay-distance strip")
    return p.parse_args(argv)


def main():
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(args.source.resolve()))

    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        raise SystemExit("the GLB contains no mesh objects")
    corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    minimum = Vector(tuple(min(p[i] for p in corners) for i in range(3)))
    maximum = Vector(tuple(max(p[i] for p in corners) for i in range(3)))
    height = maximum.z - minimum.z

    if args.head:
        bottom = maximum.z - height * args.head_fraction
        centre = Vector(((minimum.x + maximum.x) / 2, (minimum.y + maximum.y) / 2,
                         (bottom + maximum.z) / 2))
        frame = height * args.head_fraction * 1.5
    else:
        centre = (minimum + maximum) / 2
        frame = max(maximum.x - minimum.x, height) * 1.12

    if args.clay:
        clay = bpy.data.materials.new("clay")
        clay.use_nodes = True
        bsdf = clay.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = (0.55, 0.56, 0.58, 1.0)
        bsdf.inputs["Metallic"].default_value = 0.0
        bsdf.inputs["Roughness"].default_value = 0.55
        for obj in meshes:
            obj.data.materials.clear()
            obj.data.materials.append(clay)

    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = frame
    bpy.context.scene.camera = camera

    world = bpy.data.worlds.new("review")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.57, 0.60, 1.0)
    world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    bpy.context.scene.world = world
    bpy.ops.object.light_add(type="SUN", location=centre + Vector((2, -3, 4)))
    key = bpy.context.object
    key.data.energy = 2.2
    key.rotation_euler = (centre - key.location).to_track_quat("-Z", "Y").to_euler()

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = scene.render.resolution_y = args.resolution
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "Standard"

    radius = max(height, 1e-3) * 2.0
    for name, degrees, elevation in VIEWS:
        angle = math.radians(degrees)
        camera.location = centre + Vector((math.sin(angle) * radius,
                                           -math.cos(angle) * radius,
                                           elevation * radius))
        camera.rotation_euler = (centre - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str((args.output_dir / f"{name}.png").resolve())
        bpy.ops.render.render(write_still=True)

    if not args.no_strip and not args.head:
        from PIL import Image

        tiles = []
        for name, _, _ in VIEWS:
            image = Image.open(args.output_dir / f"{name}.png").convert("RGB")
            small = image.resize((max(1, int(64 * image.width / image.height)), 64), Image.LANCZOS)
            tiles.append(small.resize((small.width * 4, 256), Image.NEAREST))
        strip = Image.new("RGB", (sum(t.width for t in tiles), 256), (90, 92, 96))
        x = 0
        for tile in tiles:
            strip.paste(tile, (x, 0))
            x += tile.width
        strip.save(args.output_dir / "replay-distance-strip.png")

    print(f"Rendered {len(VIEWS)} views to {args.output_dir} "
          f"({'head' if args.head else 'body'}{', clay' if args.clay else ''})")


if __name__ == "__main__":
    main()
