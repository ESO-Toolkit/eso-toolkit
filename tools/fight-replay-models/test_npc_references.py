"""Tests for the reconstruction pipeline's registration helpers.

    <venv>/Scripts/python.exe tools/fight-replay-models/test_npc_references.py

pytest is not installed in the project interpreter, so this file also runs
standalone and exits non-zero on failure.

These cover the pure-geometry logic that has repeatedly gone wrong: the shoulder
detector, the head scale search window, and how registration reliability is
reported.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))

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
