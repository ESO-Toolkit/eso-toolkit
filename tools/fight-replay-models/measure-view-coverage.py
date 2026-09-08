"""Measure how much reference-camera coverage a mesh actually has.

    python tools/fight-replay-models/measure-view-coverage.py mesh.glb \
        --views front,back --views front,back,right,left

Answers "would side plates be worth sourcing for this subject?" BEFORE anything
is sourced, and without plates, a GPU or a build. It runs the same unwrap,
raster and occlusion test the projection does (``unwrap_atlas``,
``raster_attributes``, ``axis_depth_buffers``), so the percentages are directly
comparable to the ``visibility`` and ``grazing_fill_percent`` lines of a build
report - it simply never samples any colour.

The two numbers that matter are the ones that condemned the Dwarven Colossus:
the share of texels **no** camera sees, and the share below the grazing cosine,
which is the share that ends up as neighbour-averaged fill carrying no real
detail. Run it with two view sets to read the difference a second camera pair
would buy.

Density warps are NOT applied: this measures the mesh, and the warp only moves
texels between charts. Pass the atlas settings a config uses if the absolute
texel counts need to line up.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import trimesh

import npc_pipeline as engine


def parse_args():
    p = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    p.add_argument("mesh", type=Path)
    p.add_argument("--views", action="append", default=None,
                   help="comma-separated camera set; repeatable to compare sets "
                        "(default: front,back then front,back,right,left)")
    p.add_argument("--atlas-size", type=int, default=1024)
    p.add_argument("--supersample", type=int, default=2)
    p.add_argument("--depth-size", type=int, default=2048)
    p.add_argument("--grazing-threshold", type=float, default=0.35)
    p.add_argument("--json", type=Path, default=None, help="write the report here")
    return p.parse_args()


def measure(views, pts, nn, span, depth, screen_x, qy, covb, factor,
            grazing_threshold, filled, isl_lo):
    """Visibility, best-observed cosine and grazing share for one camera set."""
    columns = []
    for view in views:
        axis, keep_max = engine.view_depth_axis(view)
        near, far = depth[axis]
        column = screen_x[axis]
        bias = 0.01 * span[axis]
        columns.append(pts[:, axis] >= near[qy, column] - bias if keep_max
                       else pts[:, axis] <= far[qy, column] + bias)
    visible = np.stack(columns, axis=1)

    dirs = np.array([engine.VIEW_DIRECTIONS[view] for view in views])
    align = nn @ dirs.T
    observed = np.where(visible, align, -1.0).max(axis=1)

    full_o = np.full(covb.shape, -1.0, np.float32)
    full_o[covb] = observed
    obs, _ = engine.block_mean(full_o, covb, factor)
    low = filled & (obs < grazing_threshold)

    # The chart-local fill only runs where a chart has enough well-observed
    # neighbours to average from, so count it the way the projection does.
    fillable = 0
    for cid in np.unique(isl_lo[filled]):
        m = filled & (isl_lo == cid)
        lo_m, hi_m = m & low, m & ~low
        if lo_m.sum() == 0 or hi_m.sum() < 8:
            continue
        fillable += int(lo_m.sum())

    return {
        "views": list(views),
        "neither_percent": round(float((~visible.any(axis=1)).mean() * 100), 2),
        "per_view_visible_percent": {
            view: round(float(visible[:, k].mean() * 100), 2) for k, view in enumerate(views)
        },
        "below_grazing_percent": round(float(100 * low.sum() / max(filled.sum(), 1)), 2),
        "grazing_fill_percent": round(float(100 * fillable / max(filled.sum(), 1)), 2),
        "covered_texels": int(filled.sum()),
        "mean_best_cosine": round(float(obs[filled].mean()), 4),
    }


def main():
    args = parse_args()
    sets = [tuple(v.strip() for v in group.split(",")) for group in
            (args.views or ["front,back", "front,back,right,left"])]
    for views in sets:
        engine.ordered_views({v: None for v in views})

    mesh = trimesh.load(args.mesh, force="scene").to_geometry()
    mesh.merge_vertices()
    V = np.asarray(mesh.vertices, np.float64)
    F = np.asarray(mesh.faces, np.int64)
    N = np.asarray(mesh.vertex_normals, np.float64)
    print(f"geometry: faces={len(F):,} verts={len(V):,}")

    settings = engine.ProjectionSettings(atlas_size=args.atlas_size,
                                         supersample=args.supersample,
                                         depth_size=args.depth_size)
    mapping, afaces, uvs, utilization = engine.unwrap_atlas(V, F, settings)
    aV, aN = V[mapping], N[mapping]
    nisl, face_isl = engine.island_ids(afaces, len(aV))
    print(f"unwrap: charts={nisl} ({len(afaces) / nisl:.1f} faces/chart) "
          f"utilization={utilization:.3f}")

    size = args.atlas_size
    S = size * args.supersample
    uv_px = np.empty_like(uvs, np.float32)
    uv_px[:, 0] = uvs[:, 0] * (S - 1)
    uv_px[:, 1] = (1 - uvs[:, 1]) * (S - 1)
    pos, nrm, isl, cover = engine.raster_attributes(
        uv_px, afaces, aV.astype(np.float32), aN.astype(np.float32), face_isl, S
    )
    covb = cover.astype(bool)

    lo, hi = V.min(axis=0), V.max(axis=0)
    span = np.maximum(hi - lo, 1e-9)
    ds = args.depth_size
    depth = {axis: engine.axis_depth_buffers(V, F, lo, span, ds, axis) for axis in (2, 0)}

    pts = pos[covb].astype(np.float64)
    nn = nrm[covb].astype(np.float64)
    nn /= np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-9)
    qx = np.clip(((pts[:, 0] - lo[0]) / span[0] * (ds - 1)).astype(np.int32), 0, ds - 1)
    qy = np.clip(((pts[:, 1] - lo[1]) / span[1] * (ds - 1)).astype(np.int32), 0, ds - 1)
    qz = np.clip(((pts[:, 2] - lo[2]) / span[2] * (ds - 1)).astype(np.int32), 0, ds - 1)

    filled = covb.reshape(size, args.supersample, size, args.supersample).any(axis=(1, 3))
    isl_lo = isl.reshape(size, args.supersample, size, args.supersample).max(axis=(1, 3))

    report = {
        "mesh": str(args.mesh),
        "faces": int(len(F)),
        "vertices": int(len(V)),
        "charts": int(nisl),
        "faces_per_chart": round(float(len(afaces) / nisl), 1),
        "atlas_size": size,
        "grazing_threshold": args.grazing_threshold,
        "sets": [],
    }
    for views in sets:
        result = measure(engine.ordered_views({v: None for v in views}), pts, nn, span,
                         depth, {2: qx, 0: qz}, qy, covb, args.supersample,
                         args.grazing_threshold, filled, isl_lo)
        report["sets"].append(result)
        print(f"{len(result['views'])} cameras ({', '.join(result['views'])}): "
              + " ".join(f"{v}={p:.1f}%" for v, p in result["per_view_visible_percent"].items())
              + f" | neither={result['neither_percent']:.1f}%"
              + f" below-cos{args.grazing_threshold}={result['below_grazing_percent']:.1f}%"
              + f" grazing-fill={result['grazing_fill_percent']:.1f}%")

    if len(report["sets"]) > 1:
        first, last = report["sets"][0], report["sets"][-1]
        print(f"delta: neither {first['neither_percent']:.1f}% -> "
              f"{last['neither_percent']:.1f}%, grazing fill "
              f"{first['grazing_fill_percent']:.1f}% -> {last['grazing_fill_percent']:.1f}%")
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(report, indent=2))
        print(f"report: {args.json}")


if __name__ == "__main__":
    main()
