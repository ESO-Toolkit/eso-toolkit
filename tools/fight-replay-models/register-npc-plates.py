"""Register reference closeups against the base plates and emit config snippets.

    python tools/fight-replay-models/register-npc-plates.py \
        --references refs/captain-vrol --plates build/captain-vrol/plates \
        --closeup view-07.jpg --role torso --view front \
        --closeup view-04.jpg --role helm  --view front --region head

For each closeup this prints the fitted (scale, row, col) plus the width error,
and saves a 50% overlay under ``<plates>/registration/``. **Look at the overlay
before marking a plate accepted in the config.** There is no reliable automatic
gate: whole-body silhouette matching, masked NCC (raw and low-passed) and
silhouette precision/recall were each tried and each mis-ranked known-good
against known-bad plates, because frame-cropped closeups collapse to a
body-shaped blob under any global statistic.

Use ``--region head`` for helm plates. That restricts matching to the rows above
the shoulder line, which is what stops a helm plate locking onto the torso.

Copy the printed JSON into the NPC config's ``reference.closeups`` array, set
``accepted`` yourself, and record why for anything rejected.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image

import npc_references as refs


class _Collect(argparse.Action):
    def __call__(self, parser, namespace, values, option_string=None):
        items = getattr(namespace, "specs", None) or []
        items.append({"file": values, "role": None, "view": "front", "region": "whole"})
        namespace.specs = items


class _Attr(argparse.Action):
    def __call__(self, parser, namespace, values, option_string=None):
        items = getattr(namespace, "specs", None)
        if not items:
            parser.error(f"{option_string} must follow a --closeup")
        items[-1][option_string.lstrip("-")] = values


def parse_args():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--references", required=True, type=Path,
                   help="directory holding the raw reference images")
    p.add_argument("--plates", required=True, type=Path,
                   help="prepared plates directory (contains front-native.png / back-native.png)")
    p.add_argument("--closeup", action=_Collect, help="reference file name; repeatable")
    p.add_argument("--role", action=_Attr, help="torso | helm | legs | ... (labels the config)")
    p.add_argument("--view", action=_Attr, choices=["front", "back"])
    p.add_argument("--region", action=_Attr, choices=["whole", "head"])
    p.set_defaults(specs=[])
    args = p.parse_args()
    if not args.specs:
        p.error("at least one --closeup is required")
    return args


def main():
    args = parse_args()
    bases = {v: Image.open(args.plates / f"{v}-native.png").convert("RGBA")
             for v in ("front", "back")}
    overlay_dir = args.plates / "registration"
    remover = refs.background_remover()

    snippets = []
    for spec in args.specs:
        source = args.references / spec["file"]
        close = remover(Image.open(source).convert("RGB")).convert("RGBA")
        base = bases[spec["view"]]
        head = spec["region"] == "head"
        fit = (refs.register_head_region(base, close) if head
               else refs.register_whole_body(base, close))
        if fit is None:
            print(f"{spec['file']}: NO VIABLE FIT")
            continue
        stem = Path(spec["file"]).stem
        path = refs.overlay(base, close, fit,
                            overlay_dir / f"{spec['view']}-{stem}.png",
                            label=f"{spec['file']} -> {spec['view']}",
                            crop_head=head)
        entry = {
            "file": spec["file"],
            "role": spec["role"],
            "view": spec["view"],
            "accepted": None,
            "registration": {
                "scale": round(fit["scale"], 4),
                "row": round(fit["row"], 2),
                "col": round(fit["col"], 2),
                "width_error": round(fit["width_error"], 5),
                "method": fit.get("method", "silhouette-profile"),
                "profile_variation": fit.get("profile_variation"),
                "verified_by": "TODO: overlay reviewed by <name>",
            },
        }
        if head:
            entry["region"] = "head"
            top, bottom = fit["plate_rows"]
            entry["registration"]["suggested_head_v_min"] = round(
                (bottom - fit["plate_shoulder"]) / (bottom - top), 4)
        snippets.append(entry)
        print(f"{spec['file']} -> {spec['view']}"
              f"{' (head region)' if head else ''}: err={fit['width_error']*100:.2f}% "
              f"scale={fit['scale']:.3f} row={fit['row']:.1f} col={fit['col']:.1f}")
        caveat = refs.registration_caveat(spec["role"])
        if caveat:
            print(f"    !! {caveat}")
            entry["registration"]["error_meaningful"] = False
            entry["registration"]["caveat"] = caveat
        if fit.get("seed_window_excluded_best"):
            print(f"    !! {fit['note']}")
            entry["registration"]["seed_window_excluded_best"] = True
        if head:
            print(f"    suggested regions.head_v_min = "
                  f"{entry['registration']['suggested_head_v_min']}")
        print(f"    overlay -> {path}   REVIEW THIS BEFORE ACCEPTING")

    print("\n--- paste into reference.closeups, then set \"accepted\" yourself ---")
    print(json.dumps(snippets, indent=2))


if __name__ == "__main__":
    main()
