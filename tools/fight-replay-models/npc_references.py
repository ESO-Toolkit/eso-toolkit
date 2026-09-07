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


def profile_variation(widths, rows):
    """Coefficient of variation of a silhouette width profile.

    Reported for information only. It is NOT a reliability gate: measured on the
    plates that actually misregistered (Llothis and Felms ``view-11``, rear
    legs) the variation was 0.40, the HIGHEST of any plate on those models,
    while the errors were the lowest. A low-variance theory was tried and
    disproved against that data.
    """
    values = np.asarray(widths)[rows]
    values = values[values > 0]
    if len(values) < 8:
        return 0.0
    return float(values.std() / max(values.mean(), 1e-6))


# Plate roles whose reported width error has demonstrably misled. Rear-leg
# plates registered with the lowest error of any plate on two separate models
# and were doubled by ~25px both times. No cheap statistic separated them from
# good fits, so the caveat is attached by role and the overlay stays the gate.
UNRELIABLE_ROLES = {"legs", "leg", "tail", "wing"}


def registration_caveat(role):
    """Standing warning for plate roles whose width error has misled before."""
    if role and role.lower() in UNRELIABLE_ROLES:
        return (
            f"width error is NOT sufficient evidence for a '{role}' plate: rear-leg plates "
            "registered with the lowest error of any plate on two models and were still "
            "doubled by ~25px. Inspect the overlay and accept only on that."
        )
    return None


def register_whole_body(base_rgba, close_rgba, scales=np.arange(0.15, 0.95, 0.01)):
    """Match a torso/body closeup against the full plate over all silhouette rows."""
    _, fw, fc = silhouette_profile(base_rgba)
    cmask, cw, cc = silhouette_profile(close_rgba)
    rows = np.flatnonzero(cw > 0)
    if not len(rows):
        return None
    best = _fit(rows, cw, cc, fw, fc, scales, 0.0, float(len(fw) - 1))
    if best is not None:
        best["method"] = "silhouette-profile"
        best["profile_variation"] = round(profile_variation(cw, rows), 4)
    return best


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
    rows = np.arange(c_top, c_sh + 1)
    head_height = max(b_sh - b_top, 1)
    row_lo, row_hi = b_top - 0.25 * head_height, b_top + 0.35 * head_height

    # A helm closeup usually crops the shoulders out of frame, so the CLOSEUP's
    # own shoulder detection falls back and the seeded window can exclude the
    # true scale entirely. That silently cost four helm plates: every one pinned
    # to the window's lower bound. Search a wide absolute range instead and let
    # the row window - anchored to the base plate's reliable head band - do the
    # constraining. The old window is still reported so the miss is visible.
    seed_lo, seed_hi = max(0.05, seed * 0.65), seed * 1.45
    scales = np.arange(0.08, 1.30, 0.005)
    best = _fit(rows, cw, cc, bw, bc, scales, row_lo, row_hi)
    if best is None:
        return None

    seeded = _fit(rows, cw, cc, bw, bc,
                  np.arange(seed_lo, max(seed_hi, seed_lo + 0.01), 0.005), row_lo, row_hi)
    cv = profile_variation(cw, rows)
    best.update({
        "method": "head-region-silhouette",
        "plate_head_top": b_top,
        "plate_shoulder": int(b_sh),
        "plate_rows": [b_top, b_bottom],
        "closeup_shoulder": int(c_sh),
        "seed_scale": round(float(seed), 4),
        "seed_window": [round(seed_lo, 4), round(seed_hi, 4)],
        "profile_variation": round(cv, 4),
    })
    if not (seed_lo <= best["scale"] <= seed_hi):
        best["seed_window_excluded_best"] = True
        best["seeded_width_error"] = round(seeded["width_error"], 5) if seeded else None
        best["note"] = (
            f"best scale {best['scale']:.3f} lies OUTSIDE the seeded window "
            f"[{seed_lo:.3f}, {seed_hi:.3f}] - the closeup's own shoulder detection is "
            "unreliable (shoulders likely out of frame). The wide sweep found "
            f"{best['width_error']*100:.2f}% where the seeded window would have reported "
            f"{(seeded['width_error']*100 if seeded else float('nan')):.2f}%."
        )
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


def _framing_centre(centre, side, extent):
    """Keep the crop inside the source when it fits; letterbox when it does not.

    A square wider than the source cannot be slid into range, so clamping the
    centre is meaningless there and the old code instead SHRANK the square to the
    source height. For a wide subject that silently truncates: Saint Olms needs a
    ~1913-1970 px square from a 1080-tall source, so 44-45% of the wingspan was
    cut off and the cutout alpha ran into both edge columns. Padding costs
    nothing (the crop falls outside the image, which reads as transparent) and
    keeps the subject whole and centred.
    """
    if extent < side:
        return centre
    return min(max(centre, side / 2), extent - side / 2)


def prepare_base_plates(front_src: Path, back_src: Path, out_dir: Path,
                        margin=1.06, min_width_ratio=1.30, remover=None):
    """Crop front/back to one shared NATIVE square. No resizing is applied.

    The square is sized from the subject, never clamped to the source: a subject
    wider than the source is LETTERBOXED with transparent padding instead of
    being cut. Narrow subjects (every humanoid shipped so far) are unaffected -
    their square already fits, so both the size and the centring are identical.
    """
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
    side = int(max((bottom - top) * margin, width * min_width_ratio))
    cy = _framing_centre((top + bottom) / 2.0, side, height)

    meta = {
        "native_side": side,
        "letterboxed": side > height,
        # The subject's share of the square's height. A side plate is framed to
        # reproduce this fraction, which is the whole of its registration.
        "subject_height_px": int(bottom - top + 1),
        "subject_fill": round(float((bottom - top + 1) / side), 6),
        "plates": {},
    }
    for name in ("front", "back"):
        x0, y0, x1, y1 = boxes[name]
        source_width = sources[name].width
        cx = _framing_centre((x0 + x1) / 2.0, side, source_width)
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
            "pad_px": {
                "left": max(0, -box[0]), "top": max(0, -box[1]),
                "right": max(0, box[2] - source_width),
                "bottom": max(0, box[3] - sources[name].height),
            },
            "subject_touches_edge": bool(x0 <= 0 or x1 >= source_width - 1),
        }
    (out_dir / "plates.json").write_text(json.dumps(meta, indent=2))
    return meta


def base_subject_fill(meta):
    """Subject height as a fraction of the shared square, from a plates.json.

    Recomputed from the front plate when the key is absent, so a plates cache cut
    before side plates existed still registers correctly instead of raising.
    """
    if meta.get("subject_fill"):
        return float(meta["subject_fill"])
    front = meta["plates"]["front"]
    return float(front["subject_height_px"]) / float(front.get("size", meta["native_side"]))


def side_plate_specs(reference):
    """The left/right plates a config supplies, or nothing at all.

    Most reference pages publish no true profile. That is the normal case and not
    an error: the projection runs with two cameras exactly as it did before side
    plates existed. What IS an error is a config that lists profile files while
    declaring ``available: false``, because one of the two statements is wrong
    and guessing which would silently change the build.
    """
    block = reference.get("side_plates") or {}
    specs = {view: block[view] for view in ("left", "right")
             if isinstance(block.get(view), dict) and block[view].get("file")}
    if specs and block.get("available") is False:
        raise ValueError(
            f"reference.side_plates lists {', '.join(sorted(specs))} but is marked "
            "available=false. Remove the files or set available=true; a side view is never "
            "synthesised, so the two must agree."
        )
    return specs


def prepare_side_plates(sources, out_dir: Path, meta, remover=None):
    """Cut left/right profile plates onto the base plates' subject framing.

    WHAT IS AND IS NOT MATCHED. A profile silhouette is a DIFFERENT silhouette
    from the front: its width is the subject's DEPTH, which has no counterpart in
    the front plate's width, so there is nothing horizontal to match and none is
    attempted. HEIGHT is the one axis both captures share, so each side plate is
    cropped to its own square sized such that the subject fills the same fraction
    of it as the subject fills the base square. That is a uniform scale expressed
    as a crop, so nothing is resampled - the module's rule that plates are never
    upsampled still holds.

    THE ASSUMPTION, stated plainly: the side capture shows the SAME subject at
    the SAME pose, uncropped, standing on the same ground line. If it is cropped
    vertically the height match is meaningless, so that is detected and reported
    rather than silently absorbed. The projection normalises v over each plate's
    own silhouette top-to-bottom anyway, which means a vertically cropped side
    plate does not merely register badly, it stretches the wrong band of the
    model across the whole plate.

    Returns ``meta`` with the side plates added under ``plates`` and a
    ``side_plates`` record carrying the registration and any warnings.
    """
    remover = remover or background_remover()
    out_dir.mkdir(parents=True, exist_ok=True)
    fill = base_subject_fill(meta)
    base_height = int(meta.get("subject_height_px")
                      or meta["plates"]["front"]["subject_height_px"])
    record = meta.setdefault("side_plates", {})

    for name, path in sources.items():
        if name not in ("left", "right"):
            raise ValueError(f"side plate view must be 'left' or 'right', got {name!r}")
        rgb = Image.open(path).convert("RGB")
        cut = remover(rgb).convert("RGBA")
        alpha = np.asarray(cut)[:, :, 3] > 16
        ys, xs = np.nonzero(alpha)
        if not len(ys):
            raise RuntimeError(f"side plate has no subject after cutout: {path}")
        x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())
        subject_height = y1 - y0 + 1

        side = max(int(round(subject_height / max(fill, 1e-6))), subject_height)
        cx = _framing_centre((x0 + x1) / 2.0, side, rgb.width)
        cy = _framing_centre((y0 + y1) / 2.0, side, rgb.height)
        box = (int(round(cx - side / 2)), int(round(cy - side / 2)),
               int(round(cx + side / 2)), int(round(cy + side / 2)))
        arr = np.asarray(cut.crop(box)).copy()
        arr[:, :, 3] = np.where(arr[:, :, 3] > 96, 255, 0).astype(np.uint8)
        Image.fromarray(arr, "RGBA").save(out_dir / f"{name}-native.png")

        cropped = bool(y0 <= 0 or y1 >= rgb.height - 1)
        entry = {
            "source": str(Path(path).name),
            "crop_box": box,
            "size": side,
            "subject_height_px": subject_height,
            "subject_width_px": int(x1 - x0 + 1),
            "pad_px": {
                "left": max(0, -box[0]), "top": max(0, -box[1]),
                "right": max(0, box[2] - rgb.width),
                "bottom": max(0, box[3] - rgb.height),
            },
            "subject_touches_edge": bool(x0 <= 0 or x1 >= rgb.width - 1 or cropped),
            "registration": {
                "method": "height-matched-square",
                "base_subject_height_px": base_height,
                "base_subject_fill": round(fill, 6),
                "scale_to_base": round(float(base_height) / max(subject_height, 1), 4),
                "assumption": (
                    "the side capture shows the same subject, same pose, full height. Only "
                    "height is matched: a profile's width is DEPTH and has no counterpart in "
                    "the front plate's width."
                ),
            },
        }
        if cropped:
            entry["registration"]["warning"] = (
                f"the {name} plate's subject touches the top or bottom edge, so its height is "
                "a crop rather than the subject's height. Height is the only axis this "
                "registration has; source an uncropped profile instead of accepting this one."
            )
        meta["plates"][name] = entry
        record[name] = entry["registration"]

    (out_dir / "plates.json").write_text(json.dumps(meta, indent=2))
    return meta


def side_plate_warnings(meta):
    """Build-report warnings for any registered side plate that cannot be trusted."""
    return [entry["registration"]["warning"]
            for name, entry in (meta.get("plates") or {}).items()
            if name in ("left", "right") and entry.get("registration", {}).get("warning")]


def prepare_closeup(source: Path, out_path: Path, remover=None):
    remover = remover or background_remover()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cut = remover(Image.open(source).convert("RGB")).convert("RGBA")
    cut.save(out_path)
    return cut
