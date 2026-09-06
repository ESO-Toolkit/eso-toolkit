"""Reduce a mesh to a triangle budget with Blender's collapse decimator.

    python tools/fight-replay-models/decimate-mesh.py source.glb out.glb --target-triangles 45000

Run with the project's Python interpreter (which provides ``bpy``). There is no
standalone Blender install, so ``blender --background --python`` will not work.

Use this rather than a library-side quadric simplifier: the collapse modifier
keeps the surface welded, and this stage also normalises the material so the
projector receives one clean mesh with one slot.

This replaces the identity-specific ``polish-yandir-overview.py``. Its colour
grading, silhouette add-ons and helmet-curl options were part of the superseded
vertex-colour path and are deliberately not carried over.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("source", type=Path)
    p.add_argument("destination", type=Path)
    p.add_argument("--target-triangles", type=int, required=True)
    p.add_argument("--keep-first-mesh", action="store_true",
                   help="discard extra mesh objects instead of failing")
    return p.parse_args(argv)


def main():
    args = parse_args()
    if not 1_000 <= args.target_triangles <= 200_000:
        raise SystemExit("--target-triangles must be between 1,000 and 200,000")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(args.source.resolve()))

    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        raise SystemExit(f"no mesh objects in {args.source}")
    if len(meshes) > 1:
        if not args.keep_first_mesh:
            raise SystemExit(
                f"expected one mesh, found {len(meshes)}; pass --keep-first-mesh to drop the rest"
            )
        for extra in meshes[1:]:
            bpy.data.objects.remove(extra, do_unlink=True)
        meshes = meshes[:1]
    obj = meshes[0]

    for material in obj.data.materials:
        if material is None:
            continue
        material.use_backface_culling = True
        if getattr(material, "use_nodes", False):
            principled = material.node_tree.nodes.get("Principled BSDF")
            if principled is not None:
                principled.inputs["Metallic"].default_value = 0.0
                principled.inputs["Alpha"].default_value = 1.0

    triangles = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    if triangles > args.target_triangles:
        modifier = obj.modifiers.new("Triangle budget", "DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = args.target_triangles / triangles
        modifier.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)

    args.destination.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(args.destination.resolve()),
        export_format="GLB",
        export_apply=True,
        export_materials="EXPORT",
        export_normals=True,
        export_texcoords=False,
        export_animations=False,
        export_morph=False,
    )
    final = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    print(f"Decimated {args.source.name} -> {args.destination.name}: "
          f"{triangles:,} -> {final:,} triangles, {len(obj.data.vertices):,} vertices")


if __name__ == "__main__":
    main()
