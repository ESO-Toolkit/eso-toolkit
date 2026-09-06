"""Reference-plate preparation and registration for NPC reconstruction.

Plates are cropped to a shared square framing at NATIVE resolution and never
upsampled. Closeups are kept as separate native-resolution files related to the
base plate by a recorded (scale, row, col) transform, rather than being pasted
into an enlarged canvas.

Registration is deliberately semi-automatic. Automatic accept/reject gates were
tried and abandoned: whole-body silhouette matching, masked NCC (raw and
low-passed) and silhouette precision/recall each accepted a helm plate that had
locked onto the torso and/or rejected a torso plate that was visibly correct,
because frame-cropped closeups reduce to "wide body blob" under every global
statistic. What does work is matching the HEAD REGION only for helm plates, and
confirming every accepted plate against a saved overlay. The overlay is the
evidence; the config records the decision.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


def background_remover():
    """Lazy import: rembg pulls onnxruntime, which is slow to load."""
    from hy3dgen.rembg import BackgroundRemover

    return BackgroundRemover()


def silhouette_profile(rgba):
    """Per-row silhouette width and centre of an RGBA image."""
    mask = np.asarray(rgba)[:, :, 3] > 128
    widths = np.zeros(mask.shape[0])
    centres = np.full(mask.shape[0], np.nan)
    for y in range(mask.shape[0]):
        xs = np.flatnonzero(mask[y])
        if len(xs):
            widths[y] = xs[-1] - xs[0] + 1
            centres[y] = (xs[-1] + xs[0]) / 2.0
    return mask, widths, centres


def shoulder_row(widths, top, bottom, frac=0.62, search=0.60):
    """Row where the silhouette first reaches pauldron width.

    Keyed to a fraction of the widest upper-body row. Seeding from the topmost
    rows instead makes whatever sits at the crown dominate - a narrow helm spike
    or a wide horn span - and fires far too early.
    """
    band = bottom - top
    if band < 10:
        return bottom
    upper = widths[top:top + max(4, int(search * band)) + 1]
    peak = upper.max()
    if peak <= 0:
        return top + int(0.35 * band)
    threshold = frac * peak
    for y in range(top, bottom + 1):
        if widths[y] > threshold:
            return y
    return top + int(0.35 * band)


def _fit(rows, close_w, close_c, full_w, full_c, scales, row_lo, row_hi, min_overlap=0.55):
    best = None
    for s in scales:
        mapped = rows * s
        span = mapped.max() - mapped.min()
        if span < 12 or span > len(full_w):
            continue
        for t in np.arange(row_lo, row_hi, 0.5):
            target = np.rint(mapped - mapped[0] + t).astype(int)
            clipped = np.clip(target, 0, len(full_w) - 1)
            ok = (target >= 0) & (target < len(full_w)) & (full_w[clipped] > 0)
            if ok.sum() < min_overlap * len(rows):
                continue
            a = close_w[rows][ok] * s
            b = full_w[target[ok]]
            error = float(np.abs(a - b).mean() / max(b.mean(), 1e-6))
            if best is None or error < best["width_error"]:
                best = {
                    "width_error": error,
                    "scale": float(s),
                    "row": float(t - mapped[0]),
                    "col": float(np.nanmean(full_c[target[ok]] - close_c[rows][ok] * s)),
                    "rows_matched": int(ok.sum()),
                }
    return best


def register_whole_body(base_rgba, close_rgba, scales=np.arange(0.15, 0.95, 0.01)):
    """Match a torso/body closeup against the full plate over all silhouette rows."""
    _, fw, fc = silhouette_profile(base_rgba)
    cmask, cw, cc = silhouette_profile(close_rgba)
    rows = np.flatnonzero(cw > 0)
    if not len(rows):
        return None
    return _fit(rows, cw, cc, fw, fc, scales, 0.0, float(len(fw) - 1))


def register_head_region(base_rgba, close_rgba):
    """Match a helm closeup using ONLY the rows above the shoulder line.

    Whole-body matching is dominated by the torso, which is exactly how a helm
    plate ends up registered onto the chest. Cutting both silhouettes at the
    shoulder removes that failure mode, and the scale search is seeded from the
    ratio of the two head heights.
    """
    bmask, bw, bc = silhouette_profile(base_rgba)
    cmask, cw, cc = silhouette_profile(close_rgba)
    brows = np.flatnonzero(bmask.any(axis=1))
    crows_all = np.flatnonzero(cmask.any(axis=1))
    if not len(brows) or not len(crows_all):
        return None
    b_top, b_bottom = int(brows[0]), int(brows[-1])
    c_top, c_bottom = int(crows_all[0]), int(crows_all[-1])
    b_sh = shoulder_row(bw, b_top, b_bottom)
    c_sh = shoulder_row(cw, c_top, c_bottom)

    seed = (b_sh - b_top) / max(c_sh - c_top, 1)
    scales = np.arange(max(0.05, seed * 0.65), seed * 1.45, 0.005)
    rows = np.arange(c_top, c_sh + 1)
    head_height = max(b_sh - b_top, 1)
    best = _fit(
        rows, cw, cc, bw, bc, scales,
        b_top - 0.25 * head_height, b_top + 0.35 * head_height,
    )
    if best is not None:
        best.update({
            "method": "head-region-silhouette",
            "plate_head_top": b_top,
            "plate_shoulder": int(b_sh),
            "plate_rows": [b_top, b_bottom],
            "closeup_shoulder": int(c_sh),
            "seed_scale": round(float(seed), 4),
        })
    return best


def overlay(base_rgba, close_rgba, fit, out_path: Path, label="", crop_head=False, alpha=0.5):
    """Save a 50% composite so a human can confirm the fit."""
    w = max(1, int(round(close_rgba.width * fit["scale"])))
    h = max(1, int(round(close_rgba.height * fit["scale"])))
    small = close_rgba.resize((w, h), Image.LANCZOS)
    canvas = base_rgba.convert("RGB").copy()
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    layer.paste(small, (int(round(fit["col"])), int(round(fit["row"]))), small)
    blended = Image.blend(canvas, layer.convert("RGB"), alpha)

    if crop_head and "plate_shoulder" in fit:
        top, sh = fit["plate_head_top"], fit["plate_shoulder"]
        mask = np.asarray(base_rgba)[:, :, 3] > 128
        pad = int(0.6 * max(sh - top, 1))
        xs = np.flatnonzero(mask[top:sh + 1].any(axis=0))
        if len(xs):
            box = (max(0, int(xs[0]) - pad), max(0, top - pad // 2),
                   min(base_rgba.width, int(xs[-1]) + pad),
                   min(base_rgba.height, sh + pad))
            blended = blended.crop(box)
    draw = ImageDraw.Draw(blended)
    draw.text((6, 6), f"{label} err={fit['width_error']*100:.2f}% s={fit['scale']:.3f}",
              fill=(255, 255, 0))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    blended.save(out_path)
    return out_path


def prepare_base_plates(front_src: Path, back_src: Path, out_dir: Path,
                        margin=1.06, min_width_ratio=1.30, remover=None):
    """Crop front/back to one shared NATIVE square. No resizing is applied."""
    remover = remover or background_remover()
    out_dir.mkdir(parents=True, exist_ok=True)
    sources, cutouts, boxes = {}, {}, {}
    for name, path in (("front", front_src), ("back", back_src)):
        rgb = Image.open(path).convert("RGB")
        cut = remover(rgb).convert("RGBA")
        alpha = np.asarray(cut)[:, :, 3] > 16
        ys, xs = np.nonzero(alpha)
        boxes[name] = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))
        sources[name], cutouts[name] = rgb, cut

    top = min(b[1] for b in boxes.values())
    bottom = max(b[3] for b in boxes.values())
    width = max(b[2] - b[0] for b in boxes.values())
    height = sources["front"].height
    side = int(min(max((bottom - top) * margin, width * min_width_ratio), height))
    cy = min(max((top + bottom) / 2.0, side / 2), height - side / 2)

    meta = {"native_side": side, "plates": {}}
    for name in ("front", "back"):
        x0, y0, x1, y1 = boxes[name]
        cx = min(max((x0 + x1) / 2.0, side / 2), sources[name].width - side / 2)
        box = (int(round(cx - side / 2)), int(round(cy - side / 2)),
               int(round(cx + side / 2)), int(round(cy + side / 2)))
        arr = np.asarray(cutouts[name].crop(box)).copy()
        arr[:, :, 3] = np.where(arr[:, :, 3] > 96, 255, 0).astype(np.uint8)
        Image.fromarray(arr, "RGBA").save(out_dir / f"{name}-native.png")
        meta["plates"][name] = {
            "source": str(Path(front_src if name == "front" else back_src).name),
            "crop_box": box,
            "size": side,
            "subject_height_px": int(y1 - y0 + 1),
            "subject_width_px": int(x1 - x0 + 1),
        }
    (out_dir / "plates.json").write_text(json.dumps(meta, indent=2))
    return meta


def prepare_closeup(source: Path, out_path: Path, remover=None):
    remover = remover or background_remover()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cut = remover(Image.open(source).convert("RGB")).convert("RGBA")
    cut.save(out_path)
    return cut
