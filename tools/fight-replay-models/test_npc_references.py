"""Tests for the reconstruction pipeline's registration helpers.

    <venv>/Scripts/python.exe tools/fight-replay-models/test_npc_references.py

pytest is not installed in the project interpreter, so this file also runs
standalone and exits non-zero on failure.

These cover the pure-geometry logic that has repeatedly gone wrong: the shoulder
detector, the head scale search window, how registration reliability is
reported, the head-band run-structure detector, wide-subject plate framing, and
normalised 3D region boxes.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))

import npc_pipeline as engine  # noqa: E402
import npc_references as refs  # noqa: E402


def silhouette(rows):
    """Build an RGBA image from (width, count) bands, centred horizontally."""
    height = sum(count for _, count in rows)
    width = max(w for w, _ in rows) + 40
    arr = np.zeros((height, width, 4), dtype=np.uint8)
    y = 0
    for band_width, count in rows:
        x0 = (width - band_width) // 2
        arr[y:y + count, x0:x0 + band_width] = 255
        y += count
    return Image.fromarray(arr, "RGBA")


# --------------------------------------------------------------------------
# shoulder detector
# --------------------------------------------------------------------------
def test_shoulder_row_finds_the_pauldron_flare():
    # narrow head, then a wide body: the shoulder is where the body starts
    image = silhouette([(40, 100), (200, 300)])
    _, widths, _ = refs.silhouette_profile(image)
    assert abs(refs.shoulder_row(widths, 0, 399) - 100) <= 3


def test_shoulder_row_is_not_fooled_by_a_narrow_crown_spike():
    # a thin spike above the head must not seed the threshold
    image = silhouette([(6, 30), (60, 90), (220, 280)])
    _, widths, _ = refs.silhouette_profile(image)
    assert abs(refs.shoulder_row(widths, 0, 399) - 120) <= 4


def test_shoulder_row_is_not_fooled_by_a_wide_head_ornament():
    # a halo ring narrower than ~62% of the body still must not trigger
    image = silhouette([(40, 40), (150, 120), (60, 20), (260, 250)])
    _, widths, _ = refs.silhouette_profile(image)
    row = refs.shoulder_row(widths, 0, 429)
    assert row >= 170, f"fired inside the head ornament at row {row}"


def test_shoulder_row_falls_back_on_a_degenerate_silhouette():
    image = silhouette([(100, 200)])
    _, widths, _ = refs.silhouette_profile(image)
    # a constant-width silhouette has no flare; the fallback must stay in range
    row = refs.shoulder_row(widths, 0, 199)
    assert 0 <= row <= 199


# --------------------------------------------------------------------------
# registration reliability reporting
# --------------------------------------------------------------------------
def test_profile_variation_is_high_for_a_varied_silhouette():
    image = silhouette([(60, 40), (220, 80), (120, 60), (200, 60)])
    _, widths, _ = refs.silhouette_profile(image)
    rows = np.flatnonzero(widths > 0)
    assert refs.profile_variation(widths, rows) > 0.15


def test_profile_variation_is_low_for_a_constant_width_shape():
    image = silhouette([(120, 100), (120, 100), (120, 100)])
    _, widths, _ = refs.silhouette_profile(image)
    rows = np.flatnonzero(widths > 0)
    assert refs.profile_variation(widths, rows) < 0.05


def test_leg_plates_carry_a_standing_caveat():
    """Rear-leg plates misregistered twice with the LOWEST errors of any plate.

    No cheap statistic separated them (measured variation was the highest, not
    the lowest), so the caveat is attached by role instead.
    """
    assert refs.registration_caveat("legs") is not None
    assert "overlay" in refs.registration_caveat("legs")
    assert refs.registration_caveat("torso") is None
    assert refs.registration_caveat("helm") is None


def test_register_whole_body_reports_profile_variation():
    base = silhouette([(60, 60), (200, 120), (130, 220)])
    torso = silhouette([(120, 60), (400, 120), (260, 100)])
    fit = refs.register_whole_body(base, torso)
    assert fit is not None
    assert fit["method"] == "silhouette-profile"
    assert isinstance(fit["profile_variation"], float)


# --------------------------------------------------------------------------
# head scale search window
# --------------------------------------------------------------------------
def test_head_registration_searches_beyond_the_seeded_window():
    """The regression that lost four helm plates.

    The closeup crops the shoulders away, so its own shoulder detection is
    wrong, the seed scale is far too large, and the seeded window excludes the
    true scale. The wide sweep must still find it and say the window missed it.
    """
    base = silhouette([(50, 60), (150, 90), (300, 250)])
    # closeup: head fills the frame, no shoulder flare visible at all
    close = silhouette([(200, 240), (600, 240)])
    fit = refs.register_head_region(base, close)
    assert fit is not None
    assert fit["method"] == "head-region-silhouette"
    assert "seed_window" in fit and "seed_scale" in fit
    low, high = fit["seed_window"]
    if fit.get("seed_window_excluded_best"):
        assert not (low <= fit["scale"] <= high)
        assert "OUTSIDE the seeded window" in fit["note"]
    # whatever happens, the search range itself must be wide, not seed-bound
    assert fit["scale"] <= 1.30


def test_head_registration_reports_the_plate_shoulder_for_head_v_min():
    base = silhouette([(50, 60), (150, 90), (300, 250)])
    close = silhouette([(200, 240), (600, 240)])
    fit = refs.register_head_region(base, close)
    top, bottom = fit["plate_rows"]
    v_min = (bottom - fit["plate_shoulder"]) / (bottom - top)
    assert 0.0 < v_min < 1.0


# --------------------------------------------------------------------------
# head-band run-structure detector
# --------------------------------------------------------------------------
class FakePlate:
    """Minimum of engine.Plate that the detector reads."""

    def __init__(self, alpha):
        self.alpha = np.asarray(alpha, dtype=bool)
        self.h, self.w = self.alpha.shape
        rows = np.flatnonzero(self.alpha.any(axis=1))
        self.top, self.bottom = int(rows[0]), int(rows[-1])


def band_image(rows, width=400):
    """Build a boolean image from per-row lists of (start_frac, end_frac) runs."""
    arr = np.zeros((len(rows), width), dtype=bool)
    for y, runs in enumerate(rows):
        for start, end in runs:
            arr[y, int(start * width):int(end * width)] = True
    return arr


def test_opaque_runs_ignores_antialiasing_specks():
    row = np.zeros(400, dtype=bool)
    row[100:300] = True
    row[301] = True  # one-pixel speck across a one-pixel crack
    centres, widths, span = engine.opaque_runs(row)
    assert len(centres) == 1, f"speck became a run: {centres}"
    assert span == 202


def test_opaque_runs_resolves_a_genuine_three_run_row():
    row = np.zeros(400, dtype=bool)
    row[40:80] = True      # left horn
    row[140:260] = True    # mask
    row[320:360] = True    # right horn
    centres, widths, _ = engine.opaque_runs(row)
    assert len(centres) == 3, f"expected horn/mask/horn, got {centres}"
    assert centres[0] < 0.2 < centres[1] < 0.8 < centres[2]


def test_opaque_runs_is_resolution_independent():
    """The mesh row is ~5x the plate row's resolution; the answer must not be.

    Measured in raw pixels the noise floor is 5x stricter on the plate, which
    inverted the detector: it scored an ornamented head BELOW an ordinary one.
    """
    coarse = np.zeros(200, dtype=bool)
    coarse[20:60] = True
    coarse[80:120] = True
    fine = np.repeat(coarse, 5)
    assert len(engine.opaque_runs(coarse)[0]) == len(engine.opaque_runs(fine)[0])
    for a, b in zip(engine.opaque_runs(coarse)[0], engine.opaque_runs(fine)[0]):
        assert abs(a - b) < 0.02


def test_correspondence_displacement_is_zero_for_identical_structure():
    runs = ([0.1, 0.5, 0.9], [0.15, 0.3, 0.15])
    assert engine.correspondence_displacement(runs, runs) == 0.0


def test_correspondence_displacement_tolerates_a_small_registration_error():
    """A two-cell difference in run extents must not read as a large error.

    Cumulative-coverage mass transport reported 0.603 for exactly this shape on
    Captain Vrol; it is discontinuous at gaps. Do not reintroduce it.
    """
    mesh = ([0.10, 0.90], [0.20, 0.20])
    plate = ([0.12, 0.88], [0.22, 0.18])
    assert engine.correspondence_displacement(mesh, plate) < 0.05


def test_correspondence_displacement_catches_a_merged_ornament():
    """The plate resolves horn/gap/horn; the reconstruction merged them."""
    plate = ([0.08, 0.50, 0.92], [0.16, 0.30, 0.16])
    mesh = ([0.50], [1.0])
    assert engine.correspondence_displacement(mesh, plate) > 0.15


def test_run_detector_stays_silent_on_an_ordinary_head():
    """Same silhouette on both sides at every slice must not warn."""
    rows = [[(0.30, 0.70)] for _ in range(200)]
    mesh = band_image(rows)
    plate = FakePlate(band_image(rows))
    result = engine.detect_run_count_mismatch(mesh, plate, v_min=0.0)
    assert result["slices_flagged"] == 0, result["slices"]
    assert engine.run_mismatch_warning(result) is None


def test_run_detector_fires_on_a_merged_head_ornament():
    """Plate resolves horn/gap/body/gap/horn; the mesh has one solid run."""
    plate_rows = [[(0.05, 0.20), (0.35, 0.65), (0.80, 0.95)] for _ in range(200)]
    mesh_rows = [[(0.05, 0.95)] for _ in range(200)]
    result = engine.detect_run_count_mismatch(
        band_image(mesh_rows), FakePlate(band_image(plate_rows)), v_min=0.0
    )
    assert result["run_count_mismatches"] > 0
    assert result["flagged_fraction"] > 0.20
    warning = engine.run_mismatch_warning(result)
    assert warning is not None
    assert "hand-registered plate" in warning


def test_run_detector_reuses_coverage_and_touches_only_the_band():
    """It must read the head band only - O(rows), no new rendering."""
    rows = [[(0.30, 0.70)] for _ in range(200)]
    bad = [[(0.02, 0.20), (0.40, 0.60), (0.80, 0.98)] for _ in range(200)]
    mesh = band_image(rows)
    plate_alpha = band_image(rows)
    # break only the BOTTOM half of the plate, which sits below the band
    plate_alpha[100:] = band_image(bad)[100:]
    result = engine.detect_run_count_mismatch(mesh, FakePlate(plate_alpha), v_min=0.60)
    assert result["slices_checked"] > 0
    assert result["slices_flagged"] == 0, "looked outside the head band"


# --------------------------------------------------------------------------
# wide-subject plate framing
# --------------------------------------------------------------------------
def test_framing_centre_clamps_when_the_square_fits():
    # unchanged behaviour for every humanoid shipped so far
    assert refs._framing_centre(10.0, 200, 1080) == 100.0
    assert refs._framing_centre(1000.0, 200, 1080) == 980.0
    assert refs._framing_centre(540.0, 200, 1080) == 540.0


def test_framing_centre_letterboxes_a_subject_wider_than_the_source():
    """Saint Olms needs a ~2400px square from a 1080-tall source.

    Clamping to the source height cut 44-45% of the wingspan and pushed the
    cutout alpha into both edge columns. Padding keeps the subject whole.
    """
    centre = refs._framing_centre(540.0, 2415, 1080)
    assert centre == 540.0
    assert centre - 2415 / 2 < 0, "crop must be allowed to start outside the source"


# --------------------------------------------------------------------------
# normalised 3D region boxes
# --------------------------------------------------------------------------
def cube(n=6):
    """A unit-cube point grid, so box membership is easy to reason about."""
    g = np.linspace(0.0, 1.0, n)
    return np.stack(np.meshgrid(g, g, g, indexing="ij"), axis=-1).reshape(-1, 3)


def test_region_boxes_normalise_and_reject_degenerate_input():
    boxes = refs and engine.normalise_region_boxes(
        [{"name": "skull", "box": [0.4, 0.4, 0.3, 0.6, 0.6, 0.7], "uv_scale": 3.0}]
    )
    assert len(boxes) == 1
    assert boxes[0]["name"] == "skull"
    assert boxes[0]["uv_scale"] == 3.0
    try:
        engine.normalise_region_boxes([{"box": [0, 0, 0, 1, 1]}])
    except ValueError:
        pass
    else:
        raise AssertionError("a 5-value box must be rejected")
    try:
        engine.normalise_region_boxes([{"box": [0.5, 0, 0, 0.5, 1, 1]}])
    except ValueError:
        pass
    else:
        raise AssertionError("a zero-thickness box must be rejected")


def test_region_box_weight_is_one_inside_and_zero_far_outside():
    points = cube()
    box = engine.normalise_region_boxes([{"box": [0.0, 0.0, 0.0, 0.4, 0.4, 0.4],
                                          "feather": 0.05}])[0]
    weight = engine.region_box_weight(points, box)
    inside = (points <= 0.4).all(axis=1)
    assert np.allclose(weight[inside], 1.0)
    assert weight[(points >= 0.8).all(axis=1)].max() < 1e-6


def test_region_box_selects_a_mid_height_region_no_scalar_can():
    """Saint Olms's skull sits below the wings, so head_v_min cannot select it."""
    points = cube(9)
    box = engine.normalise_region_boxes(
        [{"box": [0.4, 0.4, 0.4, 0.6, 0.6, 0.6], "feather": 0.01}]
    )
    weight = engine.region_boxes_weight(points, box)
    selected = points[weight >= 0.5]
    assert len(selected) > 0
    assert selected[:, 1].max() < 0.7, "box must not reach the top of the model"
    assert selected[:, 1].min() > 0.3, "box must not reach the bottom either"


def test_region_box_warp_inflates_only_its_own_region():
    points = cube(9)
    boxes = engine.normalise_region_boxes(
        [{"box": [0.0, 0.0, 0.0, 0.3, 0.3, 0.3], "uv_scale": 3.0, "feather": 0.05}]
    )
    warped, applied = engine.region_box_warp(points, boxes)
    far = (points >= 0.6).all(axis=1)
    assert np.allclose(warped[far], points[far]), "warp leaked outside the box"
    inside = (points <= 0.3).all(axis=1)
    assert not np.allclose(warped[inside], points[inside]), "box was not inflated"


def test_region_box_warp_supports_more_than_one_box():
    points = cube(9)
    boxes = engine.normalise_region_boxes([
        {"name": "skull", "box": [0.0, 0.0, 0.0, 0.25, 0.25, 0.25], "uv_scale": 2.0,
         "feather": 0.03},
        {"name": "wings", "box": [0.75, 0.75, 0.75, 1.0, 1.0, 1.0], "uv_scale": 4.0,
         "feather": 0.03},
    ])
    warped, _ = engine.region_box_warp(points, boxes)
    assert not np.allclose(warped[(points <= 0.25).all(axis=1)],
                           points[(points <= 0.25).all(axis=1)])
    assert not np.allclose(warped[(points >= 0.75).all(axis=1)],
                           points[(points >= 0.75).all(axis=1)])
    middle = np.abs(points - 0.5).max(axis=1) < 0.1
    assert np.allclose(warped[middle], points[middle]), "the gap between boxes moved"


def test_measure_uv_allocation_without_boxes_is_the_old_head_band():
    """Backwards compatibility: every shipped config uses head_v_min."""
    vertices = np.array([[0, 0, 0], [1, 0, 0], [0, 0, 1],
                         [0, 1, 0], [1, 1, 0], [0, 1, 1]], dtype=np.float64)
    faces = np.array([[0, 1, 2], [3, 4, 5]])
    uvs = np.array([[0, 0], [0.1, 0], [0, 0.1],
                    [0.5, 0.5], [0.7, 0.5], [0.5, 0.7]], dtype=np.float64)
    result = engine.measure_uv_allocation(vertices, faces, uvs, 0.5, 1024)
    assert result["region"]["kind"] == "head_v_min"
    assert result["head"]["faces"] == 1  # only the upper triangle is in the band
    assert "texels" in result["face"]


def test_measure_uv_allocation_with_boxes_reports_region_texels():
    vertices = np.array([[0, 0, 0], [1, 0, 0], [0, 0, 1],
                         [0, 1, 0], [1, 1, 0], [0, 1, 1]], dtype=np.float64)
    faces = np.array([[0, 1, 2], [3, 4, 5]])
    uvs = np.array([[0, 0], [0.1, 0], [0, 0.1],
                    [0.5, 0.5], [0.7, 0.5], [0.5, 0.7]], dtype=np.float64)
    boxes = engine.normalise_region_boxes(
        [{"name": "base", "box": [0.0, 0.0, 0.0, 1.0, 0.2, 1.0], "feather": 0.01}]
    )
    result = engine.measure_uv_allocation(vertices, faces, uvs, 0.5, 1024,
                                          region_boxes=boxes)
    assert result["region"]["kind"] == "boxes"
    assert result["region"]["boxes"][0]["name"] == "base"
    # the BOTTOM triangle is now the region - the opposite of what head_v_min picks
    assert result["head"]["faces"] == 1
    assert engine.measure_uv_allocation(
        vertices, faces, uvs, 0.5, 1024)["head"]["faces"] == 1


# --------------------------------------------------------------------------
def _main():
    tests = [(n, o) for n, o in sorted(globals().items())
             if n.startswith("test_") and callable(o)]
    failed = []
    for name, fn in tests:
        try:
            fn()
            print(f"  PASS  {name}")
        except Exception as exc:  # noqa: BLE001
            failed.append((name, exc))
            print(f"  FAIL  {name}: {exc}")
    print(f"{len(tests) - len(failed)}/{len(tests)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(_main())
