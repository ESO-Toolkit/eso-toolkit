"""Blend four character references into dense mesh vertex colors.

This is a seam-resistant alternative to planar UV assignment for preview and
replay-distance assets. Run it with the Python environment used by Hunyuan3D:

  python project-reference-vertex-colors.py \
    source.glb front.png back.png left.png right.png output.glb
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import trimesh
from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("front", type=Path)
    parser.add_argument("back", type=Path)
    parser.add_argument("left", type=Path)
    parser.add_argument("right", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--blend-power", type=float, default=4.0)
    parser.add_argument("--silhouette-inset", type=float, default=0.025)
    parser.add_argument("--oblique-angle", type=float, default=30.0)
    parser.add_argument("--front-head", type=Path)
    parser.add_argument("--back-head", type=Path)
    parser.add_argument("--oblique-head", type=Path)
    parser.add_argument("--front-torso", type=Path)
    parser.add_argument("--back-torso", type=Path)
    parser.add_argument("--front-legs", type=Path)
    parser.add_argument("--back-legs", type=Path)
    return parser.parse_args()


def load_reference(path: Path) -> tuple[np.ndarray, list[np.ndarray | None]]:
    pixels = np.asarray(Image.open(path).convert("RGBA"), dtype=np.float32) / 255.0
    mask = pixels[:, :, 3] > 0.5
    rows = [np.flatnonzero(row) if row.any() else None for row in mask]
    if not mask.any():
        raise RuntimeError(f"Reference has no opaque pixels: {path}")
    return pixels, rows


def fill_empty_slices(minimums: np.ndarray, maximums: np.ndarray) -> None:
    populated = np.flatnonzero(np.isfinite(minimums))
    if not len(populated):
        raise RuntimeError("Could not calculate occupied mesh slices")
    for index in np.flatnonzero(~np.isfinite(minimums)):
        nearest = populated[np.argmin(np.abs(populated - index))]
        minimums[index] = minimums[nearest]
        maximums[index] = maximums[nearest]


def projected_u(
    vertices: np.ndarray,
    slice_indices: np.ndarray,
    screen_right: np.ndarray,
    slice_count: int,
) -> np.ndarray:
    projected = vertices @ screen_right
    minimums = np.full(slice_count, np.inf)
    maximums = np.full(slice_count, -np.inf)
    np.minimum.at(minimums, slice_indices, projected)
    np.maximum.at(maximums, slice_indices, projected)
    fill_empty_slices(minimums, maximums)
    span = np.maximum(maximums[slice_indices] - minimums[slice_indices], 1e-6)
    return np.clip((projected - minimums[slice_indices]) / span, 0.0, 1.0)


def nearest_opaque_row(rows: list[np.ndarray | None], y: int) -> np.ndarray:
    opaque = rows[y]
    if opaque is not None:
        return opaque
    for offset in range(1, len(rows)):
        for candidate in (y - offset, y + offset):
            if 0 <= candidate < len(rows) and rows[candidate] is not None:
                return rows[candidate]  # type: ignore[return-value]
    raise RuntimeError("Reference unexpectedly contains no opaque row")


def sample_reference(
    reference: tuple[np.ndarray, list[np.ndarray | None]],
    u: np.ndarray,
    v: np.ndarray,
    inset: float,
) -> np.ndarray:
    pixels, rows = reference
    height = pixels.shape[0]
    opaque_y = np.flatnonzero(np.array([row is not None for row in rows]))
    top, bottom = int(opaque_y[0]), int(opaque_y[-1])
    ys = np.rint(bottom - np.clip(v, 0.0, 1.0) * (bottom - top)).astype(np.int32)
    colors = np.empty((len(u), 3), dtype=np.float32)
    for y in np.unique(ys):
        indices = np.flatnonzero(ys == y)
        opaque = nearest_opaque_row(rows, int(y))
        left, right = float(opaque[0]), float(opaque[-1])
        padding = min((right - left) * inset, max((right - left) * 0.45, 0.0))
        targets = left + padding + np.clip(u[indices], 0.0, 1.0) * (right - left - 2 * padding)
        # A row can contain disconnected pieces (for example hand, torso,
        # hand). Sampling the entire silhouette span would hit transparent
        # gaps whose hidden RGB is usually white. Snap each projected point
        # to the nearest opaque character pixel instead.
        insertion = np.searchsorted(opaque, targets)
        upper_index = np.clip(insertion, 0, len(opaque) - 1)
        lower_index = np.clip(insertion - 1, 0, len(opaque) - 1)
        upper = opaque[upper_index]
        lower = opaque[lower_index]
        xs = np.where(np.abs(targets - lower) <= np.abs(upper - targets), lower, upper)
        colors[indices] = pixels[y, xs, :3]
    return colors


def srgb_to_linear(colors: np.ndarray) -> np.ndarray:
    """Convert screenshot RGB values to glTF's required linear color space."""
    return np.where(
        colors <= 0.04045,
        colors / 12.92,
        np.power((colors + 0.055) / 1.055, 2.4),
    )


def smoothstep(edge0: float, edge1: float, values: np.ndarray) -> np.ndarray:
    scaled = np.clip((values - edge0) / max(edge1 - edge0, 1e-6), 0.0, 1.0)
    return scaled * scaled * (3.0 - 2.0 * scaled)


def apply_detail_zone(
    base: np.ndarray,
    path: Path | None,
    u: np.ndarray,
    v: np.ndarray,
    zone_bottom: float,
    zone_top: float,
    feather: float,
    inset: float,
) -> np.ndarray:
    """Blend a tightly framed reference into one vertical mesh region."""
    if path is None:
        return base

    local_v = np.clip((v - zone_bottom) / (zone_top - zone_bottom), 0.0, 1.0)
    detail = sample_reference(load_reference(path), u, local_v, inset)
    lower = smoothstep(zone_bottom, zone_bottom + feather, v)
    upper = 1.0 - smoothstep(zone_top - feather, zone_top, v)
    weight = (lower * upper)[:, None]
    return base * (1.0 - weight) + detail * weight


def main() -> None:
    args = parse_args()
    references = [load_reference(path) for path in (args.front, args.back, args.left, args.right)]
    dimensions = {reference[0].shape[:2] for reference in references}
    if len(dimensions) != 1:
        raise RuntimeError("All four reference images must have identical dimensions")

    scene = trimesh.load(args.source, force="scene")
    mesh = scene.to_geometry()
    if not isinstance(mesh, trimesh.Trimesh):
        raise RuntimeError("Source did not resolve to a triangle mesh")

    vertices = np.asarray(mesh.vertices)
    normals = np.asarray(mesh.vertex_normals)
    minimum, maximum = vertices.min(axis=0), vertices.max(axis=0)
    span_y = max(maximum[1] - minimum[1], 1e-6)
    v = np.clip((vertices[:, 1] - minimum[1]) / span_y, 0.0, 1.0)

    slice_count = 256
    slice_indices = np.clip((v * (slice_count - 1)).astype(np.int32), 0, slice_count - 1)
    angle = np.deg2rad(args.oblique_angle)
    azimuths = np.array([0.0, np.pi, angle, -angle])
    view_directions = np.stack(
        [np.sin(azimuths), np.zeros(len(azimuths)), np.cos(azimuths)], axis=1
    )
    screen_rights = np.stack(
        [np.cos(azimuths), np.zeros(len(azimuths)), -np.sin(azimuths)], axis=1
    )
    view_u = [projected_u(vertices, slice_indices, right, slice_count) for right in screen_rights]
    synthetic_mirror = args.left.resolve() == args.right.resolve()
    if synthetic_mirror:
        view_u[3] = 1.0 - view_u[3]
    x_u = view_u[0]
    sampled = np.stack(
        [sample_reference(reference, u, v, args.silhouette_inset) for reference, u in zip(references, view_u)],
        axis=1,
    )

    # Full-body screenshots establish global alignment. Tightly framed source
    # screenshots restore the small armor features that would otherwise be
    # represented by only a few pixels. Overlaps are feathered to avoid bands.
    detail_zones = (
        (args.front_legs, args.back_legs, 0.00, 0.57, 0.04),
        (args.front_torso, args.back_torso, 0.43, 0.86, 0.04),
        (args.front_head, args.back_head, 0.72, 1.00, 0.04),
    )
    for front_path, back_path, bottom, top, feather in detail_zones:
        sampled[:, 0] = apply_detail_zone(
            sampled[:, 0], front_path, x_u, v, bottom, top, feather, args.silhouette_inset
        )
        sampled[:, 1] = apply_detail_zone(
            sampled[:, 1], back_path, 1.0 - x_u, v, bottom, top, feather, args.silhouette_inset
        )

    sampled[:, 2] = apply_detail_zone(
        sampled[:, 2],
        args.oblique_head,
        view_u[2],
        v,
        0.72,
        1.00,
        0.04,
        args.silhouette_inset,
    )
    if synthetic_mirror:
        sampled[:, 3] = apply_detail_zone(
            sampled[:, 3],
            args.oblique_head,
            view_u[3],
            v,
            0.72,
            1.00,
            0.04,
            args.silhouette_inset,
        )

    angular_alignment = normals @ view_directions.T
    # A true 90-degree turnaround view is as trustworthy as front/back. The
    # lower confidence remains useful for the older 30-degree screenshot path,
    # where front-facing pixels are stretched around the side of the mesh.
    side_confidence = 1.0 if np.isclose(abs(args.oblique_angle), 90.0) else 0.75
    confidences = np.array(
        [1.0, 1.0, side_confidence, 0.25 if synthetic_mirror else side_confidence]
    )
    weights = confidences * np.exp(args.blend_power * (angular_alignment - 1.0))
    weights /= weights.sum(axis=1, keepdims=True)
    colors = srgb_to_linear(np.sum(sampled * weights[:, :, None], axis=1))
    colors = np.concatenate([colors, np.ones((len(colors), 1), dtype=np.float32)], axis=1)
    mesh.visual = trimesh.visual.ColorVisuals(mesh=mesh, vertex_colors=np.rint(colors * 255).astype(np.uint8))

    args.destination.parent.mkdir(parents=True, exist_ok=True)
    mesh.export(args.destination, file_type="glb")
    print(f"Blended vertex colors: {args.destination}; vertices={len(mesh.vertices)}; faces={len(mesh.faces)}")


if __name__ == "__main__":
    main()
