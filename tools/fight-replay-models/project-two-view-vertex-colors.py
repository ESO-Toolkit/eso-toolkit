"""Two-view (front/back only) vertex-color projection for Captain Vrol.

The esomodelviewer Vrol page publishes no true left/right profile plate, so
rather than fabricate one this reuses the repository projector's sampling and
silhouette-normalization maths with a strict two-view angular blend. Imported
from tools/fight-replay-models/project-reference-vertex-colors.py so the
per-slice silhouette normalization, opaque-pixel snapping and sRGB->linear
conversion stay identical to the accepted Yandir path.
"""
from __future__ import annotations

import argparse
import importlib.util
import sys
from pathlib import Path

import numpy as np
import trimesh

# Resolve the sibling projector relative to this file so the tool works from any checkout.
TOOLS_DIR = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location(
    "reference_projector",
    TOOLS_DIR / "project-reference-vertex-colors.py",
)
projector = importlib.util.module_from_spec(SPEC)
sys.modules["reference_projector"] = projector
SPEC.loader.exec_module(projector)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("front", type=Path)
    parser.add_argument("back", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--blend-power", type=float, default=3.0)
    parser.add_argument("--silhouette-inset", type=float, default=0.02)
    args = parser.parse_args()

    references = [projector.load_reference(path) for path in (args.front, args.back)]
    if len({reference[0].shape[:2] for reference in references}) != 1:
        raise RuntimeError("Both reference images must have identical dimensions")

    scene = trimesh.load(args.source, force="scene")
    mesh = scene.to_geometry()
    if not isinstance(mesh, trimesh.Trimesh):
        raise RuntimeError("Source did not resolve to a triangle mesh")

    vertices = np.asarray(mesh.vertices)
    normals = np.asarray(mesh.vertex_normals)
    minimum, maximum = vertices.min(axis=0), vertices.max(axis=0)
    v = np.clip((vertices[:, 1] - minimum[1]) / max(maximum[1] - minimum[1], 1e-6), 0.0, 1.0)

    slice_count = 256
    slice_indices = np.clip((v * (slice_count - 1)).astype(np.int32), 0, slice_count - 1)
    # Front looks down -Z at the model's +Z face; back is its mirror.
    view_directions = np.array([[0.0, 0.0, 1.0], [0.0, 0.0, -1.0]])
    screen_rights = np.array([[1.0, 0.0, 0.0], [-1.0, 0.0, 0.0]])
    view_u = [
        projector.projected_u(vertices, slice_indices, right, slice_count)
        for right in screen_rights
    ]
    sampled = np.stack(
        [
            projector.sample_reference(reference, u, v, args.silhouette_inset)
            for reference, u in zip(references, view_u)
        ],
        axis=1,
    )

    alignment = normals @ view_directions.T
    weights = np.exp(args.blend_power * (alignment - 1.0))
    weights /= weights.sum(axis=1, keepdims=True)
    colors = projector.srgb_to_linear(np.sum(sampled * weights[:, :, None], axis=1))
    colors = np.concatenate([colors, np.ones((len(colors), 1), dtype=np.float32)], axis=1)
    mesh.visual = trimesh.visual.ColorVisuals(
        mesh=mesh, vertex_colors=np.rint(colors * 255).astype(np.uint8)
    )

    args.destination.parent.mkdir(parents=True, exist_ok=True)
    mesh.export(args.destination, file_type="glb")
    print(
        f"Blended two-view vertex colors: {args.destination}; "
        f"vertices={len(mesh.vertices)}; faces={len(mesh.faces)}"
    )


if __name__ == "__main__":
    main()
