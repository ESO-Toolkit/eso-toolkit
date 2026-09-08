"""Report the runtime-relevant numbers for a finished NPC GLB.

    python tools/fight-replay-models/measure-npc-asset.py asset.glb --head-v-min 0.8121

``build-npc-asset.py`` writes the same figures automatically; this exists to
audit an asset that is already in the repository, or to compare a candidate
against what is shipped without rebuilding it.

``--head-v-min`` is the shoulder line as a fraction of model height (the same
value the NPC config carries under ``regions``). Head and face texel counts are
meaningless without it, so it must be supplied to report them.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import trimesh

import npc_pipeline as engine


def parse_args():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("asset", type=Path)
    p.add_argument("--head-v-min", type=float, default=None,
                   help="shoulder line as a fraction of model height (regions.head_v_min)")
    p.add_argument("--master", type=Path, default=None,
                   help="lossless atlas PNG, to report texture PSNR")
    p.add_argument("--front-dot", type=float, default=0.5,
                   help="normal.z threshold that defines the front-facing face subset")
    p.add_argument("--json", action="store_true", help="print the raw JSON report")
    return p.parse_args()


def main():
    args = parse_args()
    report = engine.inspect_glb(args.asset, args.master)

    if args.head_v_min is not None:
        geometry = next(iter(trimesh.load(args.asset, force="scene").geometry.values()))
        size = report.get("texture", {}).get("size", [1024, 1024])[0]
        report["uv_allocation"] = engine.measure_uv_allocation(
            np.asarray(geometry.vertices), np.asarray(geometry.faces),
            np.asarray(geometry.visual.uv), args.head_v_min, size, args.front_dot,
        )

    if args.json:
        print(json.dumps(report, indent=2))
        return

    print(f"{args.asset.name}")
    print(f"  {report['triangles']:,} triangles / {report['vertices']:,} vertices / "
          f"{report['bytes']:,} bytes")
    print(f"  meshes={report['mesh_count']} materials={report['material_count']} "
          f"primitives={report['primitive_count']} attrs={report['attributes']}")
    print(f"  skins={report['has_skins']} animations={report['has_animations']} "
          f"morph={report['has_morph_targets']} extensions={report['extensions_used']}")
    print(f"  dimensions={report['dimensions']} min_y={report['min_y']} "
          f"centred_xz={report['centred_xz']}")
    texture = report.get("texture")
    if texture:
        print(f"  texture {texture['size'][0]}x{texture['size'][1]} {texture['mime']} "
              f"{texture['bytes']:,} bytes")
        print(f"    luma quant table {texture['luma_quant_table']} "
              f"chroma_subsampled={texture['chroma_subsampled']}")
        if texture.get("psnr_db"):
            print(f"    PSNR vs master {texture['psnr_db']} dB")
    allocation = report.get("uv_allocation")
    if allocation:
        for name in ("head", "face"):
            a = allocation[name]
            print(f"  {name}: {a['faces']:,} faces, {a['texels']:,} texels "
                  f"(~{a['equivalent_square']:.0f}^2, {a['percent_of_atlas']:.1f}% of atlas)")


if __name__ == "__main__":
    main()
