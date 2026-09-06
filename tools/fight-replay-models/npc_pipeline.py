"""Reconstruction engine for fight-replay NPC assets.

This module is the shared implementation behind the command line scripts in this
folder. It is importable (underscored name) while the scripts stay hyphenated to
match the rest of the repository.

Everything runs under the project's Python interpreter, which supplies both
CUDA torch and ``bpy``. There is no standalone Blender install; do not write
``blender --background --python ...`` commands against these scripts.

The engine projects reference plates directly into a UV atlas at texel
resolution. The superseded vertex-colour path (colour carried on ~29k vertices
and baked at the end) is gone: it capped colour at roughly a ninth of what a
1024 atlas holds and produced visibly smeared results.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import trimesh
import xatlas
from numba import njit, prange
from PIL import Image
from scipy import ndimage
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from scipy.spatial import cKDTree
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals

LUMA = np.array([0.299, 0.587, 0.114], dtype=np.float32)


# --------------------------------------------------------------------------
# colour helpers
# --------------------------------------------------------------------------
def srgb_to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c):
    c = np.maximum(c, 0.0)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


# --------------------------------------------------------------------------
# silhouette-normalised projection (retained from the original projector)
# --------------------------------------------------------------------------
def _fill_empty_slices(minimums: np.ndarray, maximums: np.ndarray) -> None:
    populated = np.flatnonzero(np.isfinite(minimums))
    if not len(populated):
        raise RuntimeError("Could not calculate occupied mesh slices")
    for index in np.flatnonzero(~np.isfinite(minimums)):
        nearest = populated[np.argmin(np.abs(populated - index))]
        minimums[index] = minimums[nearest]
        maximums[index] = maximums[nearest]


def projected_u(points, slice_indices, screen_right, slice_count, envelope_sigma=0.0):
    """Horizontal coordinate of each point within its own height slice.

    This is what registers the mesh against the plate: both are normalised by
    the silhouette extent at the same height, so a reconstruction whose
    silhouette matches the plate lands its features in the right place.
    """
    projected = points @ screen_right
    minimums = np.full(slice_count, np.inf)
    maximums = np.full(slice_count, -np.inf)
    np.minimum.at(minimums, slice_indices, projected)
    np.maximum.at(maximums, slice_indices, projected)
    _fill_empty_slices(minimums, maximums)
    if envelope_sigma > 0:
        minimums = ndimage.gaussian_filter1d(minimums, envelope_sigma, mode="nearest")
        maximums = ndimage.gaussian_filter1d(maximums, envelope_sigma, mode="nearest")
    span = np.maximum(maximums[slice_indices] - minimums[slice_indices], 1e-6)
    return np.clip((projected - minimums[slice_indices]) / span, 0.0, 1.0)


# --------------------------------------------------------------------------
# reference plates
# --------------------------------------------------------------------------
class Plate:
    """A NATIVE-resolution RGBA reference with silhouette bookkeeping.

    Plates are never upsampled. An earlier revision Lanczos-upscaled the crop
    twice before sampling, which manufactured staircase detail that measured as
    sharpness but mipped to mush.
    """

    def __init__(self, path: Path, feather: int = 0, envelope_sigma: float = 0.0):
        rgba = np.asarray(Image.open(path).convert("RGBA"), dtype=np.float32) / 255.0
        self.path = Path(path)
        self.rgb = rgba[:, :, :3]
        self.alpha = rgba[:, :, 3] > 0.5
        if not self.alpha.any():
            raise RuntimeError(f"plate has no opaque pixels: {path}")
        self.h, self.w = self.alpha.shape
        rows = np.flatnonzero(self.alpha.any(axis=1))
        self.top, self.bottom = int(rows[0]), int(rows[-1])

        left = np.full(self.h, np.nan)
        right = np.full(self.h, np.nan)
        for y in range(self.h):
            xs = np.flatnonzero(self.alpha[y])
            if len(xs):
                left[y], right[y] = xs[0], xs[-1]
        known = np.flatnonzero(np.isfinite(left))
        for y in np.flatnonzero(~np.isfinite(left)):
            n = known[np.argmin(np.abs(known - y))]
            left[y], right[y] = left[n], right[n]
        if envelope_sigma > 0:
            sigma_rows = envelope_sigma * (self.bottom - self.top) / 255.0
            left = ndimage.gaussian_filter1d(left, sigma_rows, mode="nearest")
            right = ndimage.gaussian_filter1d(right, sigma_rows, mode="nearest")
        self.row_left, self.row_right = left, right

        # Used only when all four bilinear taps land in background.
        _, self.nearest = ndimage.distance_transform_edt(~self.alpha, return_indices=True)

        if feather > 0:
            inside = ndimage.distance_transform_edt(self.alpha)
            border = np.minimum.outer(
                np.minimum(np.arange(self.h), self.h - 1 - np.arange(self.h)),
                np.minimum(np.arange(self.w), self.w - 1 - np.arange(self.w)),
            )
            self.weight = (np.clip(inside / 3.0, 0, 1) * np.clip(border / feather, 0, 1)).astype(
                np.float32
            )
        else:
            self.weight = self.alpha.astype(np.float32)

    def sample(self, x, y):
        """Alpha-weighted bilinear sample. Returns (rgb, weight)."""
        x = np.clip(x, 0, self.w - 1.001)
        y = np.clip(y, 0, self.h - 1.001)
        x0 = np.floor(x).astype(np.int32)
        y0 = np.floor(y).astype(np.int32)
        fx = (x - x0)[:, None]
        fy = (y - y0)[:, None]
        x1, y1 = x0 + 1, y0 + 1
        acc = np.zeros((len(x), 3), np.float32)
        wsum = np.zeros((len(x), 1), np.float32)
        for xi, yi, bw in (
            (x0, y0, (1 - fx) * (1 - fy)),
            (x1, y0, fx * (1 - fy)),
            (x0, y1, (1 - fx) * fy),
            (x1, y1, fx * fy),
        ):
            a = self.weight[yi, xi][:, None] * bw
            acc += self.rgb[yi, xi] * a
            wsum += a
        good = wsum[:, 0] > 1e-4
        out = np.zeros_like(acc)
        out[good] = acc[good] / wsum[good]
        if (~good).any():
            iy = np.clip(np.rint(y[~good]).astype(np.int32), 0, self.h - 1)
            ix = np.clip(np.rint(x[~good]).astype(np.int32), 0, self.w - 1)
            out[~good] = self.rgb[self.nearest[0][iy, ix], self.nearest[1][iy, ix]]
        return out, np.clip(wsum[:, 0], 0, 1)

    def target_coords(self, u, v, inset):
        y = self.bottom - np.clip(v, 0, 1) * (self.bottom - self.top)
        iy = np.clip(np.rint(y).astype(np.int32), 0, self.h - 1)
        left, right = self.row_left[iy], self.row_right[iy]
        span = right - left
        pad = np.minimum(span * inset, np.maximum(span * 0.45, 0.0))
        x = left + pad + np.clip(u, 0, 1) * (span - 2 * pad)
        return x, y


# --------------------------------------------------------------------------
# rasterisers
# --------------------------------------------------------------------------
@njit(cache=True, parallel=True)
def raster_attributes(uv_px, faces, positions, normals, face_island, size):
    pos = np.zeros((size, size, 3), np.float32)
    nrm = np.zeros((size, size, 3), np.float32)
    isl = np.full((size, size), -1, np.int32)
    cover = np.zeros((size, size), np.uint8)
    for fi in prange(len(faces)):
        i0, i1, i2 = faces[fi, 0], faces[fi, 1], faces[fi, 2]
        x0, y0 = uv_px[i0, 0], uv_px[i0, 1]
        x1, y1 = uv_px[i1, 0], uv_px[i1, 1]
        x2, y2 = uv_px[i2, 0], uv_px[i2, 1]
        den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
        if abs(den) < 1e-12:
            continue
        lo_x = max(0, int(np.floor(min(x0, x1, x2))) - 1)
        hi_x = min(size - 1, int(np.ceil(max(x0, x1, x2))) + 1)
        lo_y = max(0, int(np.floor(min(y0, y1, y2))) - 1)
        hi_y = min(size - 1, int(np.ceil(max(y0, y1, y2))) + 1)
        for y in range(lo_y, hi_y + 1):
            sy = y + 0.5
            for x in range(lo_x, hi_x + 1):
                sx = x + 0.5
                w0 = ((y1 - y2) * (sx - x2) + (x2 - x1) * (sy - y2)) / den
                w1 = ((y2 - y0) * (sx - x2) + (x0 - x2) * (sy - y2)) / den
                w2 = 1.0 - w0 - w1
                if w0 >= -0.35 and w1 >= -0.35 and w2 >= -0.35:
                    for c in range(3):
                        pos[y, x, c] = (
                            positions[i0, c] * w0 + positions[i1, c] * w1 + positions[i2, c] * w2
                        )
                        nrm[y, x, c] = (
                            normals[i0, c] * w0 + normals[i1, c] * w1 + normals[i2, c] * w2
                        )
                    isl[y, x] = face_island[fi]
                    cover[y, x] = 1
    return pos, nrm, isl, cover


@njit(cache=True)
def raster_depth(sx, sy, sz, faces, size, keep_max):
    depth = np.full((size, size), -1e9 if keep_max else 1e9, np.float32)
    for fi in range(len(faces)):
        i0, i1, i2 = faces[fi, 0], faces[fi, 1], faces[fi, 2]
        x0, y0, z0 = sx[i0], sy[i0], sz[i0]
        x1, y1, z1 = sx[i1], sy[i1], sz[i1]
        x2, y2, z2 = sx[i2], sy[i2], sz[i2]
        den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
        if abs(den) < 1e-12:
            continue
        for y in range(
            max(0, int(min(y0, y1, y2))), min(size - 1, int(np.ceil(max(y0, y1, y2)))) + 1
        ):
            py = y + 0.5
            for x in range(
                max(0, int(min(x0, x1, x2))), min(size - 1, int(np.ceil(max(x0, x1, x2)))) + 1
            ):
                px = x + 0.5
                w0 = ((y1 - y2) * (px - x2) + (x2 - x1) * (py - y2)) / den
                w1 = ((y2 - y0) * (px - x2) + (x0 - x2) * (py - y2)) / den
                w2 = 1.0 - w0 - w1
                if w0 >= -1e-4 and w1 >= -1e-4 and w2 >= -1e-4:
                    z = z0 * w0 + z1 * w1 + z2 * w2
                    if keep_max:
                        if z > depth[y, x]:
                            depth[y, x] = z
                    elif z < depth[y, x]:
                        depth[y, x] = z
    return depth


# --------------------------------------------------------------------------
# small helpers
# --------------------------------------------------------------------------
def island_ids(faces, vertex_count):
    rows = np.repeat(np.arange(len(faces)), 3)
    inc = coo_matrix(
        (np.ones(len(rows)), (rows, faces.ravel())), shape=(len(faces), vertex_count)
    ).tocsr()
    count, labels = connected_components(inc @ inc.T, directed=False)
    return count, labels.astype(np.int32)


def block_mean(values, cover, factor):
    size = values.shape[0] // factor
    if values.ndim == 2:
        values = values[..., None]
    c = cover.reshape(size, factor, size, factor, 1).astype(np.float32)
    v = values.reshape(size, factor, size, factor, values.shape[-1])
    num = (v * c).sum(axis=(1, 3))
    den = c.sum(axis=(1, 3))
    out = np.zeros_like(num)
    ok = den[:, :, 0] > 0
    out[ok] = num[ok] / den[ok]
    return np.squeeze(out), ok


def smoothstep(a, b, t):
    x = np.clip((t - a) / max(b - a, 1e-9), 0, 1)
    return x * x * (3 - 2 * x)


def uv_density_warp(vertices, head_scale, head_v, leg_scale, leg_v, ramp):
    """Return a copy of the mesh warped so xatlas spends texels where we want.

    xatlas allocates atlas area in proportion to 3D surface area, so enlarging
    the head on a throwaway copy buys it texels. The UVs are then applied to the
    ORIGINAL geometry, leaving the shipped mesh untouched.

    The scale must be applied LOCALLY. Scaling about the model centre displaces
    the head far enough that the neck ramp degenerates into slivers whose area
    swamps the atlas; x/z are therefore scaled about the vertical axis and y is
    warped by the integral of the field, so every face sees a locally uniform
    scale.
    """
    if head_scale == 1.0 and leg_scale == 1.0:
        return vertices, None

    lo, hi = vertices.min(axis=0), vertices.max(axis=0)
    vn = (vertices[:, 1] - lo[1]) / max(hi[1] - lo[1], 1e-9)

    def field(t):
        s = 1.0 + (head_scale - 1.0) * smoothstep(head_v - ramp, head_v, t)
        return s * (1.0 - (1.0 - leg_scale) * (1.0 - smoothstep(leg_v, leg_v + ramp, t)))

    s = field(vn)
    grid = np.linspace(0.0, 1.0, 4001)
    sg = field(grid)
    cumulative = np.concatenate([[0.0], np.cumsum(0.5 * (sg[1:] + sg[:-1]) * np.diff(grid))])
    span_y = max(hi[1] - lo[1], 1e-9)
    cx, cz = (lo[0] + hi[0]) / 2.0, (lo[2] + hi[2]) / 2.0

    warped = np.empty_like(vertices)
    warped[:, 0] = cx + (vertices[:, 0] - cx) * s
    warped[:, 2] = cz + (vertices[:, 2] - cz) * s
    warped[:, 1] = lo[1] + np.interp(vn, grid, cumulative) * span_y
    return warped, s


# --------------------------------------------------------------------------
# measurement
# --------------------------------------------------------------------------
def measure_uv_allocation(vertices, faces, uvs, head_v_min, atlas_size, front_dot=0.5):
    """Head / front-facing-face share of the atlas, in texels."""
    lo, hi = vertices.min(axis=0), vertices.max(axis=0)
    span = np.maximum(hi - lo, 1e-9)
    vn = (vertices[:, 1] - lo[1]) / span[1]
    head = (vn[faces] > head_v_min).all(axis=1)

    a, b, c = uvs[faces[:, 0]], uvs[faces[:, 1]], uvs[faces[:, 2]]
    uv_area = 0.5 * np.abs(np.cross(b - a, c - a))
    total = max(uv_area.sum(), 1e-12)

    p0, p1, p2 = vertices[faces[:, 0]], vertices[faces[:, 1]], vertices[faces[:, 2]]
    n = np.cross(p1 - p0, p2 - p0)
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    face_mask = head & (n[:, 2] > front_dot)

    result = {}
    for name, mask in (("head", head), ("face", face_mask)):
        texels = float(uv_area[mask].sum()) * atlas_size * atlas_size
        result[name] = {
            "faces": int(mask.sum()),
            "uv_fraction_of_used": float(uv_area[mask].sum() / total),
            "percent_of_atlas": float(texels / (atlas_size * atlas_size) * 100.0),
            "texels": int(round(texels)),
            "equivalent_square": round(float(np.sqrt(max(texels, 0.0))), 1),
        }
    return result


# --------------------------------------------------------------------------
# main projection
# --------------------------------------------------------------------------
@dataclass
class CloseupRef:
    plate: Plate
    scale: float
    row: float
    col: float
    source: str
    v_min: float | None = None
    v_feather: float = 0.12


@dataclass
class ProjectionSettings:
    atlas_size: int = 1024
    supersample: int = 2
    depth_size: int = 2048
    pack_resolution: int = 2048
    pack_padding: int = 4
    blend_power: float = 3.0
    silhouette_inset: float = 0.02
    grazing_threshold: float = 0.35
    # Gaussian smoothing (in height slices) applied to the mesh AND plate silhouette envelopes
    # before they normalise the horizontal coordinate. Non-zero by default: at 0 the envelopes step
    # abruptly where the shoulders meet the neck, and because the mesh and plate step at slightly
    # different heights the two normalisations stop cancelling — which threw the sampled plate
    # coordinate 40-70px sideways in a single texel row and drew a hard bar across the chin and
    # pauldrons. The normalisation is a deformation field correcting mesh-vs-plate silhouette error,
    # so it should be band-limited; a step in it corrects nothing and amplifies a 2-3 slice
    # registration error into a ~20% horizontal error. Raise it if a seam persists.
    envelope_sigma: float = 3.0
    contrast: float = 1.08
    saturation: float = 1.10
    unsharp_sigma: float = 0.7
    unsharp_amount: float = 0.45
    unsharp_threshold: float = 4 / 255
    dilate: int = 24
    roughness: float = 0.78
    closeup_feather: int = 60
    head_uv_scale: float = 1.0
    head_uv_v: float = 0.80
    leg_uv_scale: float = 1.0
    leg_uv_v: float = 0.45
    uv_ramp: float = 0.08
    chart_max_cost: float = 64.0
    chart_normal_deviation_weight: float = 0.5
    material_name: str = "ProjectedAtlas"
    head_v_min_measure: float = 0.80
    log: object = print
    stats: dict = field(default_factory=dict)


def project_atlas(mesh_path, base_plates, closeups, settings: ProjectionSettings,
                  atlas_path: Path, glb_path: Path):
    """Project plates into a UV atlas and write the textured GLB + lossless PNG."""
    say = settings.log
    stats = settings.stats

    mesh = trimesh.load(mesh_path, force="scene").to_geometry()
    mesh.merge_vertices()
    V = np.asarray(mesh.vertices, np.float64)
    F = np.asarray(mesh.faces, np.int64)
    N = np.asarray(mesh.vertex_normals, np.float64)
    say(f"geometry: faces={len(F):,} verts={len(V):,}")

    V_unwrap, _ = uv_density_warp(
        V, settings.head_uv_scale, settings.head_uv_v,
        settings.leg_uv_scale, settings.leg_uv_v, settings.uv_ramp,
    )
    if V_unwrap is not V:
        say(f"uv density: head x{settings.head_uv_scale} above v={settings.head_uv_v}, "
            f"legs x{settings.leg_uv_scale} below v={settings.leg_uv_v}, ramp={settings.uv_ramp}")

    chart = xatlas.ChartOptions()
    chart.max_cost = settings.chart_max_cost
    chart.normal_deviation_weight = settings.chart_normal_deviation_weight
    chart.roundness_weight = 0.01
    chart.straightness_weight = 3.0
    chart.normal_seam_weight = 1.0
    chart.texture_seam_weight = 0.25
    chart.max_iterations = 8
    pack = xatlas.PackOptions()
    # xatlas clamps a chart to the packer resolution. UVs are normalised and
    # rasterised into our own texture, so a larger packer resolution is free and
    # keeps that clamp away from the enlarged head charts.
    pack.resolution = settings.pack_resolution
    pack.padding = settings.pack_padding
    pack.bruteForce = True
    pack.rotate_charts = True
    pack.blockAlign = True

    atlas = xatlas.Atlas()
    atlas.add_mesh(V_unwrap.astype(np.float32), F.astype(np.uint32))
    atlas.generate(chart_options=chart, pack_options=pack)
    mapping, afaces, uvs = atlas[0]
    afaces = np.asarray(afaces, np.int64)
    uvs = np.asarray(uvs, np.float64)
    aV, aN = V[mapping], N[mapping]
    nisl, face_isl = island_ids(afaces, len(aV))
    say(f"unwrap: charts={nisl} ({len(afaces)/nisl:.1f} faces/chart) "
        f"utilization={atlas.utilization:.3f}")
    stats["chart_count"] = int(nisl)
    stats["xatlas_utilization"] = round(float(atlas.utilization), 4)

    size = settings.atlas_size
    S = size * settings.supersample
    uv_px = np.empty_like(uvs, np.float32)
    uv_px[:, 0] = uvs[:, 0] * (S - 1)
    uv_px[:, 1] = (1 - uvs[:, 1]) * (S - 1)
    pos, nrm, isl, cover = raster_attributes(
        uv_px, afaces, aV.astype(np.float32), aN.astype(np.float32), face_isl, S
    )
    covb = cover.astype(bool)

    lo, hi = V.min(axis=0), V.max(axis=0)
    span = np.maximum(hi - lo, 1e-9)
    ds = settings.depth_size
    dsx = ((V[:, 0] - lo[0]) / span[0] * (ds - 1)).astype(np.float32)
    dsy = ((V[:, 1] - lo[1]) / span[1] * (ds - 1)).astype(np.float32)
    dsz = V[:, 2].astype(np.float32)
    depth_front = raster_depth(dsx, dsy, dsz, F, ds, True)
    depth_back = raster_depth(dsx, dsy, dsz, F, ds, False)

    pts = pos[covb].astype(np.float64)
    nn = nrm[covb].astype(np.float64)
    nn /= np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-9)
    qx = np.clip(((pts[:, 0] - lo[0]) / span[0] * (ds - 1)).astype(np.int32), 0, ds - 1)
    qy = np.clip(((pts[:, 1] - lo[1]) / span[1] * (ds - 1)).astype(np.int32), 0, ds - 1)
    bias = 0.01 * span[2]
    visible = np.stack(
        [pts[:, 2] >= depth_front[qy, qx] - bias, pts[:, 2] <= depth_back[qy, qx] + bias], axis=1
    )
    say(f"visibility: front={visible[:,0].mean()*100:.1f}% back={visible[:,1].mean()*100:.1f}% "
        f"neither={(~visible.any(axis=1)).mean()*100:.1f}%")

    v = np.clip((pts[:, 1] - lo[1]) / span[1], 0, 1)
    slice_idx = np.clip((v * 255).astype(np.int32), 0, 255)
    rights = np.array([[1.0, 0, 0], [-1.0, 0, 0]])
    dirs = np.array([[0, 0, 1.0], [0, 0, -1.0]])
    us = [projected_u(pts, slice_idx, r, 256, settings.envelope_sigma) for r in rights]

    sampled = np.zeros((len(pts), 2, 3), np.float32)
    for k, view in enumerate(("front", "back")):
        plate = base_plates[view]
        x, y = plate.target_coords(us[k], v, settings.silhouette_inset)
        rgb, _ = plate.sample(x, y)
        for ref in closeups.get(view, []):
            cx, cy = (x - ref.col) / ref.scale, (y - ref.row) / ref.scale
            crgb, cw = ref.plate.sample(cx, cy)
            inside = (cx >= 0) & (cx <= ref.plate.w - 1) & (cy >= 0) & (cy <= ref.plate.h - 1)
            gate = np.ones_like(cw)
            if ref.v_min is not None:
                gate = np.clip(
                    (v - (ref.v_min - ref.v_feather)) / max(ref.v_feather, 1e-6), 0.0, 1.0
                ).astype(np.float32)
            w = (cw * inside * gate)[:, None]
            rgb = rgb * (1 - w) + crgb * w
            scope = f"region>v{ref.v_min:.3f} feather {ref.v_feather:.3f}" if ref.v_min else "whole plate"
            say(f"  {view}: {ref.source} ({scope}) -> {(w[:,0]>0.01).mean()*100:.1f}% of texels")
        sampled[:, k] = rgb

    align = nn @ dirs.T
    weights = np.exp(settings.blend_power * (align - 1.0))
    weights = np.where(~visible, weights * 1e-4, weights)
    weights /= np.maximum(weights.sum(axis=1, keepdims=True), 1e-12)
    colors = np.sum(sampled * weights[:, :, None], axis=1)
    observed = np.where(visible, align, -1.0).max(axis=1)

    f = settings.supersample
    full_c = np.zeros((S, S, 3), np.float32)
    full_c[covb] = colors
    full_o = np.full((S, S), -1.0, np.float32)
    full_o[covb] = observed
    full_p = np.zeros((S, S, 3), np.float32)
    full_p[covb] = pts
    img, ok = block_mean(full_c, covb, f)
    obs, _ = block_mean(full_o, covb, f)
    pts_lo, _ = block_mean(full_p, covb, f)
    isl_lo = isl.reshape(size, f, size, f).max(axis=(1, 3))
    filled = ok
    coverage = float(filled.mean())
    say(f"raster {S}x{S} -> {size}: {filled.sum():,} texels covered ({coverage*100:.1f}%)")
    stats["coverage_percent"] = round(coverage * 100, 2)
    stats["covered_texels"] = int(filled.sum())

    # --- grazing fill: chart-local, feathered -----------------------------
    low = filled & (obs < settings.grazing_threshold)
    say(f"grazing: {100*low.sum()/max(filled.sum(),1):.1f}% of covered texels below "
        f"cos={settings.grazing_threshold}")
    filled_count = 0
    for cid in np.unique(isl_lo[filled]):
        m = filled & (isl_lo == cid)
        lo_m, hi_m = m & low, m & ~low
        if lo_m.sum() == 0 or hi_m.sum() < 8:
            continue
        src = pts_lo[hi_m]
        k = min(12, len(src))
        d, i = cKDTree(src).query(pts_lo[lo_m], k=k, workers=-1)
        if k == 1:
            d, i = d[:, None], i[:, None]
        w = 1.0 / np.maximum(d, 1e-6) ** 2
        w /= w.sum(axis=1, keepdims=True)
        blended = np.sum(img[hi_m][i] * w[:, :, None], axis=1)
        ramp = np.clip(
            (settings.grazing_threshold - obs[lo_m]) / max(settings.grazing_threshold, 1e-6), 0, 1
        )[:, None]
        img[lo_m] = img[lo_m] * (1 - ramp) + blended * ramp
        filled_count += int(lo_m.sum())
    say(f"  filled {filled_count:,} texels ({100*filled_count/max(filled.sum(),1):.1f}%)")
    stats["grazing_fill_texels"] = filled_count
    stats["grazing_fill_percent"] = round(100 * filled_count / max(int(filled.sum()), 1), 2)

    # --- tone: area-weighted so it is invariant to UV allocation ----------
    srgb = np.clip(img, 0, 1)
    tri = np.cross(aV[afaces[:, 1]] - aV[afaces[:, 0]], aV[afaces[:, 2]] - aV[afaces[:, 0]])
    face_area = 0.5 * np.linalg.norm(tri, axis=1)
    area_per_island = np.bincount(face_isl, weights=face_area, minlength=nisl)
    texels_per_island = np.bincount(np.clip(isl_lo[filled], 0, nisl - 1), minlength=nisl)
    density = np.divide(
        area_per_island, np.maximum(texels_per_island, 1),
        out=np.zeros(nisl), where=texels_per_island > 0,
    )
    tw = density[np.clip(isl_lo, 0, nisl - 1)]
    obs_mask = filled & (obs > 0.5)

    def weighted(mask, image):
        w = tw[mask]
        px = image[mask] * 255
        total = max(w.sum(), 1e-9) * 3
        mean = (px * w[:, None]).sum() / total
        var = ((px - mean) ** 2 * w[:, None]).sum() / total
        return mean, float(np.sqrt(max(var, 0.0)))

    src_px = np.concatenate([p.rgb[p.alpha] for p in base_plates.values()]) * 255
    m0, s0 = weighted(obs_mask, srgb)
    pivot = m0 / 255.0
    x = np.clip(pivot + (srgb - pivot) * settings.contrast, 0, 1)
    m1, _ = weighted(obs_mask, x)
    delta = float(np.clip((src_px.mean() - m1) / 255.0, -0.12, 0.12))
    x = np.clip(x + delta, 0, 1)
    luma = (x * LUMA).sum(axis=2, keepdims=True)
    x = np.clip(luma + (x - luma) * settings.saturation, 0, 1)
    m2, s2 = weighted(obs_mask, x)
    say(f"tone: source mean={src_px.mean():.1f} std={src_px.std():.1f} | "
        f"atlas(area-weighted) {m0:.1f}/{s0:.1f} -> {m2:.1f}/{s2:.1f} "
        f"(contrast {settings.contrast}, exposure {delta*255:+.1f}, saturation {settings.saturation})")
    stats["tone"] = {
        "source_mean": round(float(src_px.mean()), 2),
        "source_std": round(float(src_px.std()), 2),
        "atlas_mean_before": round(float(m0), 2),
        "atlas_mean_after": round(float(m2), 2),
        "atlas_std_after": round(float(s2), 2),
        "exposure_delta": round(delta * 255, 2),
    }

    # --- masked unsharp ---------------------------------------------------
    sharp_mask = filled & (obs > 0.5)
    wgt = sharp_mask.astype(np.float32)[:, :, None]
    num = ndimage.gaussian_filter(x * wgt, (settings.unsharp_sigma, settings.unsharp_sigma, 0))
    den = ndimage.gaussian_filter(wgt, (settings.unsharp_sigma, settings.unsharp_sigma, 0))
    detail = x - num / np.maximum(den, 1e-6)
    act = (np.abs(detail).max(axis=2) > settings.unsharp_threshold) & sharp_mask
    x[act] = np.clip(x[act] + settings.unsharp_amount * detail[act], 0, 1)
    say(f"unsharp: sigma={settings.unsharp_sigma} amount={settings.unsharp_amount} "
        f"-> {act.sum():,} texels ({100*act.sum()/max(filled.sum(),1):.1f}%)")

    # --- dilate + write ---------------------------------------------------
    dist, near = ndimage.distance_transform_edt(~filled, return_indices=True)
    grow = (~filled) & (dist <= settings.dilate)
    x[grow] = x[near[0][grow], near[1][grow]]
    texture = Image.fromarray(np.rint(np.clip(x, 0, 1) * 255).astype(np.uint8), "RGB")
    atlas_path.parent.mkdir(parents=True, exist_ok=True)
    texture.save(atlas_path)
    Image.fromarray((filled * 255).astype(np.uint8), "L").save(
        atlas_path.with_name(atlas_path.stem + "-coverage.png")
    )

    out = trimesh.Trimesh(
        vertices=aV, faces=afaces, vertex_normals=aN, process=False,
        visual=TextureVisuals(
            uv=uvs,
            material=PBRMaterial(
                baseColorTexture=texture, metallicFactor=0.0,
                roughnessFactor=settings.roughness, doubleSided=False,
                name=settings.material_name,
            ),
        ),
    )
    glb_path.parent.mkdir(parents=True, exist_ok=True)
    out.export(glb_path, file_type="glb")

    stats["uv_allocation"] = measure_uv_allocation(
        aV, afaces, uvs, settings.head_v_min_measure, size
    )
    say(f"uv allocation: head {stats['uv_allocation']['head']['texels']:,} texels "
        f"({stats['uv_allocation']['head']['percent_of_atlas']:.1f}% of atlas), "
        f"face {stats['uv_allocation']['face']['texels']:,} texels "
        f"(~{stats['uv_allocation']['face']['equivalent_square']:.0f}^2)")
    return stats


# --------------------------------------------------------------------------
# finished-asset inspection
# --------------------------------------------------------------------------
def inspect_glb(path: Path, master_png: Path | None = None):
    """Read back a finished GLB: geometry, texture encoding, bounds, PSNR."""
    import io
    import struct

    raw = Path(path).read_bytes()
    json_length = struct.unpack_from("<I", raw, 12)[0]
    doc = json.loads(raw[20:20 + json_length].decode("utf-8"))
    primitive = doc["meshes"][0]["primitives"][0]

    report = {
        "bytes": int(Path(path).stat().st_size),
        "mesh_count": len(doc["meshes"]),
        "material_count": len(doc.get("materials", [])),
        "primitive_count": len(doc["meshes"][0]["primitives"]),
        "attributes": sorted(primitive["attributes"].keys()),
        "has_skins": "skins" in doc,
        "has_animations": "animations" in doc,
        "has_morph_targets": primitive.get("targets") is not None,
        "extensions_used": doc.get("extensionsUsed"),
        "node_name": doc.get("nodes", [{}])[0].get("name"),
        "material_name": (doc.get("materials") or [{}])[0].get("name"),
    }

    if doc.get("images"):
        view = doc["bufferViews"][doc["images"][0]["bufferView"]]
        offset = 12 + 8 + json_length + 8 + view.get("byteOffset", 0)
        data = raw[offset:offset + view["byteLength"]]
        picture = Image.open(io.BytesIO(data))
        report["texture"] = {
            "mime": doc["images"][0].get("mimeType"),
            "bytes": len(data),
            "size": list(picture.size),
            "mode": picture.mode,
            "luma_quant_table": [int(q) for q in picture.quantization[0][:8]]
            if getattr(picture, "quantization", None) else None,
            "sampling": [list(s) for s in picture.layer] if hasattr(picture, "layer") else None,
            "chroma_subsampled": (
                any(s[1] != 1 or s[2] != 1 for s in picture.layer)
                if hasattr(picture, "layer") and picture.layer else None
            ),
        }
        if master_png and Path(master_png).exists():
            ref = np.asarray(Image.open(master_png).convert("RGB"), dtype=np.float64)
            got = np.asarray(picture.convert("RGB"), dtype=np.float64)
            if ref.shape == got.shape:
                mse = ((ref - got) ** 2).mean()
                report["texture"]["psnr_db"] = (
                    round(float(10 * np.log10(255.0 ** 2 / mse)), 2) if mse > 0 else None
                )

    geometry = next(iter(trimesh.load(path, force="scene").geometry.values()))
    minimum, maximum = geometry.bounds
    report.update({
        "triangles": int(len(geometry.faces)),
        "vertices": int(len(geometry.vertices)),
        "bounds_min": [round(float(v), 6) for v in minimum],
        "bounds_max": [round(float(v), 6) for v in maximum],
        "dimensions": [round(float(v), 4) for v in (maximum - minimum)],
        "min_y": round(float(minimum[1]), 6),
        "centred_xz": [round(float(v), 6) for v in ((minimum + maximum) / 2)[[0, 2]]],
    })
    return report
