"""Project four transparent character references onto a reconstructed GLB.

Run through Blender, with arguments after ``--``:
  blender --background --python project-reference-atlas.py -- \
    source.glb front.png back.png left.png right.png output.glb atlas.png
"""

import argparse
import os
import sys

import bpy
import numpy as np
from mathutils import Vector


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("front")
    parser.add_argument("back")
    parser.add_argument("left")
    parser.add_argument("right")
    parser.add_argument("destination")
    parser.add_argument("atlas")
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return parser.parse_args(argv)


def load_reference(path):
    image = bpy.data.images.load(os.path.abspath(path), check_existing=False)
    width, height = image.size
    pixels = np.asarray(image.pixels[:], dtype=np.float32).reshape((height, width, 4))
    pixels = np.flipud(pixels)
    mask = pixels[:, :, 3] > 0.5
    ys, xs = np.where(mask)
    if not len(xs):
        raise RuntimeError(f"Reference has no opaque pixels: {path}")
    rows = [np.where(mask[y])[0] if mask[y].any() else None for y in range(height)]
    return pixels, (xs.min(), ys.min(), xs.max(), ys.max()), rows


def reference_coordinate(pixels, bounds, rows, u, v, mirror=False):
    if mirror:
        u = 1.0 - u
    _, y0, _, y1 = bounds
    y = int(np.clip(round(y1 - v * (y1 - y0)), 0, pixels.shape[0] - 1))
    opaque = rows[y]
    if opaque is None:
        for offset in range(1, len(rows)):
            candidates = [index for index in (y - offset, y + offset) if 0 <= index < len(rows)]
            match = next((index for index in candidates if rows[index] is not None), None)
            if match is not None:
                y, opaque = match, rows[match]
                break
    if opaque is None:
        return None
    projected_x = opaque[0] + u * (opaque[-1] - opaque[0])
    return int(opaque[np.argmin(np.abs(opaque - projected_x))]), y


def fill_empty_slices(minimums, maximums):
    populated = np.flatnonzero(np.isfinite(minimums))
    if not len(populated):
        raise RuntimeError("Could not calculate occupied mesh slices")
    for index in np.flatnonzero(~np.isfinite(minimums)):
        nearest = populated[np.argmin(np.abs(populated - index))]
        minimums[index] = minimums[nearest]
        maximums[index] = maximums[nearest]


def main():
    args = parse_args()
    references = [load_reference(path) for path in (args.front, args.back, args.left, args.right)]
    dimensions = {reference[0].shape[:2] for reference in references}
    if len(dimensions) != 1:
        raise RuntimeError("All four reference images must have identical dimensions")

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(args.source))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one mesh object, found {len(meshes)}")
    obj = meshes[0]
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    mesh = obj.data

    world_vertices = [obj.matrix_world @ vertex.co for vertex in mesh.vertices]
    minimum = Vector(tuple(min(getattr(vertex, axis) for vertex in world_vertices) for axis in "xyz"))
    maximum = Vector(tuple(max(getattr(vertex, axis) for vertex in world_vertices) for axis in "xyz"))
    span_z = max(maximum.z - minimum.z, 1e-6)

    slice_count = 256
    min_x = np.full(slice_count, np.inf, dtype=np.float32)
    max_x = np.full(slice_count, -np.inf, dtype=np.float32)
    min_y = np.full(slice_count, np.inf, dtype=np.float32)
    max_y = np.full(slice_count, -np.inf, dtype=np.float32)
    for vertex in world_vertices:
        index = int(np.clip(((vertex.z - minimum.z) / span_z) * (slice_count - 1), 0, slice_count - 1))
        min_x[index], max_x[index] = min(min_x[index], vertex.x), max(max_x[index], vertex.x)
        min_y[index], max_y[index] = min(min_y[index], vertex.y), max(max_y[index], vertex.y)
    fill_empty_slices(min_x, max_x)
    fill_empty_slices(min_y, max_y)

    atlas_height, reference_width = references[0][0].shape[:2]
    atlas_width = reference_width * 4
    atlas_pixels = np.concatenate([reference[0] for reference in references], axis=1)
    atlas = bpy.data.images.new("Four-view reference atlas", atlas_width, atlas_height, alpha=True)
    atlas.pixels.foreach_set(np.flipud(atlas_pixels).reshape(-1))
    atlas.filepath_raw = os.path.abspath(args.atlas)
    atlas.file_format = "PNG"
    os.makedirs(os.path.dirname(atlas.filepath_raw), exist_ok=True)
    atlas.save()

    uv_layer = mesh.uv_layers.new(name="ProjectedReferenceUV")
    for polygon in mesh.polygons:
        normal = (obj.matrix_world.to_3x3() @ polygon.normal).normalized()
        side_facing = abs(normal.x) > abs(normal.y)
        view_index = (2 if normal.x < 0 else 3) if side_facing else (1 if normal.y > 0 else 0)
        pixels, bounds, rows = references[view_index]
        for loop_index in polygon.loop_indices:
            vertex = world_vertices[mesh.loops[loop_index].vertex_index]
            v = np.clip((vertex.z - minimum.z) / span_z, 0.0, 1.0)
            slice_index = int(v * (slice_count - 1))
            if side_facing:
                span = max(max_y[slice_index] - min_y[slice_index], 1e-6)
                depth = np.clip((vertex.y - min_y[slice_index]) / span, 0.0, 1.0)
                u = depth if view_index == 2 else 1.0 - depth
            else:
                span = max(max_x[slice_index] - min_x[slice_index], 1e-6)
                u = np.clip((vertex.x - min_x[slice_index]) / span, 0.0, 1.0)
            coordinate = reference_coordinate(pixels, bounds, rows, u, v, mirror=view_index == 1)
            x, y = coordinate if coordinate else (reference_width // 2, atlas_height // 2)
            uv_layer.data[loop_index].uv = (
                (x + reference_width * view_index + 0.5) / atlas_width,
                1.0 - ((y + 0.5) / atlas_height),
            )

    material = bpy.data.materials.new("Projected reference material")
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Metallic"].default_value = 0.0
    principled.inputs["Roughness"].default_value = 0.78
    texture = material.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image = atlas
    material.node_tree.links.new(texture.outputs["Color"], principled.inputs["Base Color"])
    mesh.materials.clear()
    mesh.materials.append(material)

    destination = os.path.abspath(args.destination)
    os.makedirs(os.path.dirname(destination), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=destination,
        export_format="GLB",
        use_selection=True,
        export_materials="EXPORT",
        export_vertex_color="NONE",
        export_attributes=True,
    )
    print(f"Projected four-view atlas: {destination}; faces={len(mesh.polygons)}")


if __name__ == "__main__":
    main()
