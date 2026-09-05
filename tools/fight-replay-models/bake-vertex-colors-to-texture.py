"""Create a replay LOD and bake its source vertex colors into one texture.

The source mesh remains immutable. The output is a single-mesh GLB with a
fresh xatlas UV layout and an embedded sRGB base-color texture. This is useful
for screenshot-reconstructed assets whose dense vertex colors lose detail
during ordinary mesh decimation.

Run with the Python environment used by Hunyuan3D::

  python bake-vertex-colors-to-texture.py source.glb output.glb
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import trimesh
import xatlas
from numba import njit
from PIL import Image
from scipy import ndimage
from scipy.spatial import cKDTree
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--target-triangles", type=int, default=45_000)
    parser.add_argument("--texture-size", type=int, default=2_048)
    parser.add_argument("--padding", type=int, default=16)
    parser.add_argument("--roughness", type=float, default=0.78)
    return parser.parse_args()


def source_colors(mesh: trimesh.Trimesh) -> np.ndarray:
    attributes = getattr(mesh.visual, "vertex_attributes", {})
    colors = attributes.get("color")
    if colors is None and hasattr(mesh.visual, "vertex_colors"):
        colors = mesh.visual.vertex_colors
    if colors is None:
        raise RuntimeError("Source mesh has no vertex color attribute")

    result = np.asarray(colors, dtype=np.float32)
    if result.shape[1] == 4:
        result = result[:, :3]
    if result.max(initial=0.0) > 1.0:
        result /= 255.0
    if len(result) != len(mesh.vertices):
        raise RuntimeError("Vertex color count does not match source vertices")
    return np.clip(result, 0.0, 1.0)


def transfer_colors(
    source_vertices: np.ndarray,
    colors: np.ndarray,
    destination_vertices: np.ndarray,
) -> np.ndarray:
    """Smoothly transfer colors from nearby high-resolution vertices."""
    neighbor_count = min(4, len(source_vertices))
    distances, indices = cKDTree(source_vertices).query(
        destination_vertices, k=neighbor_count, workers=-1
    )
    if neighbor_count == 1:
        return colors[indices]
    weights = 1.0 / np.maximum(distances, 1e-8) ** 2
    weights /= weights.sum(axis=1, keepdims=True)
    return np.sum(colors[indices] * weights[:, :, None], axis=1)


def linear_to_srgb(colors: np.ndarray) -> np.ndarray:
    return np.where(
        colors <= 0.0031308,
        colors * 12.92,
        1.055 * np.power(colors, 1.0 / 2.4) - 0.055,
    )


@njit(cache=True)
def rasterize_triangles(
    pixel_vertices: np.ndarray,
    faces: np.ndarray,
    colors: np.ndarray,
    size: int,
) -> tuple[np.ndarray, np.ndarray]:
    image = np.zeros((size, size, 3), dtype=np.float32)
    coverage = np.zeros((size, size), dtype=np.uint8)
    for face_index in range(len(faces)):
        i0, i1, i2 = faces[face_index]
        x0, y0 = pixel_vertices[i0]
        x1, y1 = pixel_vertices[i1]
        x2, y2 = pixel_vertices[i2]
        denominator = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
        if abs(denominator) < 1e-10:
            continue
        minimum_x = max(0, int(np.floor(min(x0, x1, x2))))
        maximum_x = min(size - 1, int(np.ceil(max(x0, x1, x2))))
        minimum_y = max(0, int(np.floor(min(y0, y1, y2))))
        maximum_y = min(size - 1, int(np.ceil(max(y0, y1, y2))))
        for y in range(minimum_y, maximum_y + 1):
            sample_y = y + 0.5
            for x in range(minimum_x, maximum_x + 1):
                sample_x = x + 0.5
                w0 = ((y1 - y2) * (sample_x - x2) + (x2 - x1) * (sample_y - y2)) / denominator
                w1 = ((y2 - y0) * (sample_x - x2) + (x0 - x2) * (sample_y - y2)) / denominator
                w2 = 1.0 - w0 - w1
                if w0 >= -1e-5 and w1 >= -1e-5 and w2 >= -1e-5:
                    image[y, x] = colors[i0] * w0 + colors[i1] * w1 + colors[i2] * w2
                    coverage[y, x] = 1
    return image, coverage


def pad_texture(image: np.ndarray, coverage: np.ndarray, padding: int) -> np.ndarray:
    if not coverage.any():
        raise RuntimeError("UV rasterizer produced an empty texture")
    _, nearest = ndimage.distance_transform_edt(coverage == 0, return_indices=True)
    distances = ndimage.distance_transform_edt(coverage == 0)
    padded = image.copy()
    region = (coverage == 0) & (distances <= padding)
    padded[region] = image[nearest[0][region], nearest[1][region]]
    return padded


def main() -> None:
    args = parse_args()
    if args.target_triangles <= 0 or args.texture_size <= 0 or args.padding < 0:
        raise ValueError("Triangle count and texture size must be positive; padding cannot be negative")

    scene = trimesh.load(args.source, force="scene")
    if len(scene.geometry) != 1:
        raise RuntimeError("Source must contain exactly one mesh")
    # Trimesh currently drops generic glTF vertex attributes (including the
    # imported COLOR_0 value) from TextureVisuals when a mesh is copied.
    source = next(iter(scene.geometry.values()))
    if not isinstance(source, trimesh.Trimesh):
        raise RuntimeError("Source did not resolve to a triangle mesh")
    colors = source_colors(source)
    node = scene.graph.nodes_geometry[0]
    transform, geometry_name = scene.graph[node]
    if geometry_name != next(iter(scene.geometry.keys())):
        raise RuntimeError("Could not resolve the source mesh transform")
    source.apply_transform(transform)

    if len(source.faces) > args.target_triangles:
        low = source.simplify_quadric_decimation(face_count=args.target_triangles)
    else:
        low = trimesh.Trimesh(
            vertices=np.asarray(source.vertices).copy(),
            faces=np.asarray(source.faces).copy(),
            process=False,
        )
    low.remove_unreferenced_vertices()

    low_colors = transfer_colors(
        np.asarray(source.vertices), colors, np.asarray(low.vertices)
    )
    mapping, atlas_faces, uvs = xatlas.parametrize(
        np.asarray(low.vertices, dtype=np.float32),
        np.asarray(low.faces, dtype=np.uint32),
    )
    vertices = np.asarray(low.vertices)[mapping]
    normals = np.asarray(low.vertex_normals)[mapping]
    atlas_colors = linear_to_srgb(low_colors[mapping])

    pixel_vertices = np.empty_like(uvs, dtype=np.float32)
    pixel_vertices[:, 0] = uvs[:, 0] * (args.texture_size - 1)
    pixel_vertices[:, 1] = (1.0 - uvs[:, 1]) * (args.texture_size - 1)
    pixels, coverage = rasterize_triangles(
        pixel_vertices,
        np.asarray(atlas_faces, dtype=np.int64),
        np.asarray(atlas_colors, dtype=np.float32),
        args.texture_size,
    )
    pixels = pad_texture(pixels, coverage, args.padding)
    texture = Image.fromarray(
        np.rint(np.clip(pixels, 0.0, 1.0) * 255.0).astype(np.uint8), mode="RGB"
    )

    material = PBRMaterial(
        baseColorTexture=texture,
        metallicFactor=0.0,
        roughnessFactor=args.roughness,
        doubleSided=False,
        name="YandirBakedVertexColor",
    )
    output = trimesh.Trimesh(
        vertices=vertices,
        faces=np.asarray(atlas_faces),
        vertex_normals=normals,
        process=False,
        visual=TextureVisuals(uv=np.asarray(uvs), material=material),
    )
    args.destination.parent.mkdir(parents=True, exist_ok=True)
    output.export(args.destination, file_type="glb")
    print(
        f"Baked {args.destination}; faces={len(output.faces)}; "
        f"vertices={len(output.vertices)}; texture={args.texture_size}x{args.texture_size}"
    )


if __name__ == "__main__":
    main()
