"""Build a runtime-ready fight-replay NPC asset from a single config file.

    python tools/fight-replay-models/build-npc-asset.py npcs/captain-vrol.json

Adding an NPC is: drop the reference plates somewhere, write one config under
``npcs/<slug>.json``, run this once. The result is a plain GLB plus a JSON build
report carrying every number a reviewer needs.

INTERPRETER
    There is NO standalone Blender in this project. Run every script here with
    the project's Python interpreter, which supplies both CUDA torch and ``bpy``:

        <venv>/Scripts/python.exe tools/fight-replay-models/build-npc-asset.py ...

    Do not write ``blender --background --python ...``; it will not work.

STAGES
    plates    crop front/back to a shared NATIVE square, cut out closeups
    geometry  optional Blender-collapse decimation to the triangle budget
    project   texel-space projection into a density-weighted UV atlas
    prepare   join / apply transforms / centre / ground feet / budget / export
    encode    re-encode the atlas into the GLB at the configured JPEG quality
    report    emit <slug>-build-report.json beside the asset

Geometry for an already-accepted model is never regenerated: point
``geometry.source`` at the reviewed mesh and leave ``geometry.decimate`` off if
the source is already at budget.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

from PIL import Image

import npc_pipeline as engine
import npc_references as refs

HERE = Path(__file__).resolve().parent


def resolve(base: Path, value):
    """Resolve a config path relative to the config file unless absolute."""
    if value is None:
        return None
    p = Path(value)
    return p if p.is_absolute() else (base / p).resolve()


def run(script: str, *args):
    cmd = [sys.executable, str(HERE / script), *[str(a) for a in args]]
    print(f"  $ {Path(cmd[1]).name} {' '.join(cmd[2:])}")
    done = subprocess.run(cmd, capture_output=True, text=True)
    if done.returncode != 0:
        sys.stderr.write(done.stdout + done.stderr)
        raise SystemExit(f"{script} failed with exit code {done.returncode}")
    tail = [ln for ln in done.stdout.splitlines() if ln.strip()][-1:]
    for line in tail:
        print(f"    {line}")
    return done.stdout


def parse_args():
    p = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    p.add_argument("config", type=Path, help="path to npcs/<slug>.json")
    p.add_argument("--workspace", type=Path, default=None,
                   help="root that relative config paths resolve against "
                        "(default: the config file's directory). Keeps reconstruction inputs "
                        "outside the repository without absolute paths in the config.")
    p.add_argument("--work", type=Path, default=None,
                   help="scratch directory for intermediates (default: alongside the config's "
                        "work_dir, else ./build/<slug>)")
    p.add_argument("--out", type=Path, default=None,
                   help="directory to write the GLB and build report into")
    p.add_argument("--refresh-plates", action="store_true",
                   help="re-cut the reference plates even if the cache exists")
    p.add_argument("--plates-only", action="store_true",
                   help="cut the plates and geometry crops, then stop. Use this before "
                        "register-npc-plates.py: registration needs plates/, which used to "
                        "exist only after a full build, which needed the registration.")
    p.add_argument("--refresh-geometry", action="store_true",
                   help="re-run decimation even if the cached decimated mesh exists")
    p.add_argument("--skip-encode", action="store_true",
                   help="leave the prepared PNG-textured GLB; do not re-encode to JPEG")
    return p.parse_args()


def main():
    args = parse_args()
    config_path = args.config.resolve()
    cfg = json.loads(config_path.read_text())
    base = (args.workspace.resolve() if args.workspace else config_path.parent)
    slug = cfg["slug"]

    work = args.work or resolve(base, cfg.get("work_dir")) or (Path.cwd() / "build" / slug)
    work = Path(work).resolve()
    out_dir = (args.out or resolve(base, cfg.get("output", {}).get("directory"))
               or work).resolve()
    plates_dir = work / "plates"
    work.mkdir(parents=True, exist_ok=True)
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"== {cfg.get('display_name', slug)} ==\nwork={work}\nout={out_dir}")

    reference = cfg["reference"]
    ref_dir = resolve(base, reference["directory"])
    plates_cfg = reference["plates"]

    # ---- 1. plates -------------------------------------------------------
    # The base crops and the per-closeup cutouts are cached independently. They
    # used to share one branch, so the natural register -> build order (which
    # leaves plates.json already present) never cut the closeups and the build
    # died on a missing closeup-*.png.
    remover = None

    def get_remover():
        nonlocal remover
        if remover is None:
            remover = refs.background_remover()
        return remover

    if args.refresh_plates or not (plates_dir / "plates.json").exists():
        print("[plates] cutting native front/back crops")
        meta = refs.prepare_base_plates(
            ref_dir / plates_cfg["front"]["file"],
            ref_dir / plates_cfg["back"]["file"],
            plates_dir,
            remover=get_remover(),
        )
    else:
        meta = json.loads((plates_dir / "plates.json").read_text())
        print(f"[plates] reusing cache ({plates_dir})")

    missing = [
        entry for entry in reference.get("closeups", [])
        if entry.get("accepted")
        and not (plates_dir / f"closeup-{Path(entry['file']).stem}.png").exists()
    ]
    if args.refresh_plates:
        missing = [e for e in reference.get("closeups", []) if e.get("accepted")]
    for entry in missing:
        refs.prepare_closeup(
            ref_dir / entry["file"],
            plates_dir / f"closeup-{Path(entry['file']).stem}.png",
            remover=get_remover(),
        )
    if missing:
        print(f"  cut {len(missing)} closeup cutout(s): "
              f"{', '.join(e['file'] for e in missing)}")

    # Hunyuan runs its own background removal, so geometry generation needs the
    # ORIGINAL backdrop rather than an alpha cutout. Emit those crops here so
    # nobody has to re-derive them from plates.json by hand.
    for view, spec in plates_cfg.items():
        target = plates_dir / f"{view}-geometry.png"
        if args.refresh_plates or not target.exists():
            box = meta["plates"][view]["crop_box"]
            Image.open(ref_dir / spec["file"]).convert("RGB").crop(box).save(target)
    print(f"  native square={meta['native_side']}px; "
          f"subject {meta['plates']['front']['subject_height_px']}px tall in source; "
          f"geometry crops ready ({plates_dir.name}/<view>-geometry.png)")

    if args.plates_only:
        print("\n[plates-only] stopping before geometry. Register closeups with:\n"
              f"  register-npc-plates.py --references {ref_dir} --plates {plates_dir} "
              "--closeup <file> --role <role> --view <front|back> [--region head]")
        return

    # ---- 2. geometry -----------------------------------------------------
    geom = cfg["geometry"]
    source_mesh = resolve(base, geom["source"])
    if not source_mesh.exists():
        raise SystemExit(f"geometry.source not found: {source_mesh}")
    mesh_for_projection = source_mesh
    if geom.get("decimate", True):
        decimated = work / f"{slug}-decimated.glb"
        if args.refresh_geometry or not decimated.exists():
            print("[geometry] Blender-collapse decimation")
            run("decimate-mesh.py", source_mesh, decimated,
                "--target-triangles", geom["target_triangles"])
        else:
            print(f"[geometry] reusing {decimated.name}")
        mesh_for_projection = decimated
    else:
        print("[geometry] using source mesh as-is (decimate=false)")

    # ---- 3. projection ---------------------------------------------------
    proj = cfg.get("projection", {})
    regions = cfg.get("regions", {})
    settings = engine.ProjectionSettings(
        atlas_size=cfg["atlas"]["size"],
        supersample=proj.get("supersample", 2),
        depth_size=proj.get("depth_size", 2048),
        pack_resolution=proj.get("pack_resolution", 2048),
        pack_padding=proj.get("pack_padding", 4),
        blend_power=proj.get("blend_power", 3.0),
        silhouette_inset=proj.get("silhouette_inset", 0.02),
        grazing_threshold=proj.get("grazing_threshold", 0.35),
        envelope_sigma=proj.get("envelope_sigma", 3.0),
        contrast=cfg.get("tone", {}).get("contrast", 1.08),
        saturation=cfg.get("tone", {}).get("saturation", 1.10),
        unsharp_sigma=cfg.get("unsharp", {}).get("sigma", 0.7),
        unsharp_amount=cfg.get("unsharp", {}).get("amount", 0.45),
        unsharp_threshold=cfg.get("unsharp", {}).get("threshold", 4 / 255),
        dilate=proj.get("dilate", 24),
        roughness=cfg["atlas"].get("roughness", 0.78),
        closeup_feather=proj.get("closeup_feather", 60),
        head_uv_scale=cfg.get("uv_density", {}).get("head_scale", 1.0),
        head_uv_v=cfg.get("uv_density", {}).get("head_v", 0.80),
        leg_uv_scale=cfg.get("uv_density", {}).get("leg_scale", 1.0),
        leg_uv_v=cfg.get("uv_density", {}).get("leg_v", 0.45),
        uv_ramp=cfg.get("uv_density", {}).get("ramp", 0.08),
        material_name=cfg["atlas"].get("material_name", f"{slug}-atlas"),
        head_v_min_measure=regions.get("head_v_min", 0.80),
    )

    base_plates = {
        n: engine.Plate(plates_dir / f"{n}-native.png", envelope_sigma=settings.envelope_sigma)
        for n in ("front", "back")
    }
    closeups: dict[str, list[engine.CloseupRef]] = {"front": [], "back": []}
    accepted_records = []
    for entry in reference.get("closeups", []):
        if not entry.get("accepted"):
            continue
        reg = entry["registration"]
        is_head = entry.get("region") == "head"
        closeups[entry["view"]].append(engine.CloseupRef(
            plate=engine.Plate(plates_dir / f"closeup-{Path(entry['file']).stem}.png",
                               feather=settings.closeup_feather,
                               envelope_sigma=settings.envelope_sigma),
            scale=reg["scale"], row=reg["row"], col=reg["col"],
            source=entry["file"],
            v_min=(reg.get("v_min", regions.get("head_v_min")) if is_head else None),
            v_feather=reg.get("v_feather", regions.get("head_feather", 0.12)),
        ))
        accepted_records.append({
            "file": entry["file"], "role": entry.get("role"), "view": entry["view"],
            "region": entry.get("region", "whole"),
            "width_error": reg.get("width_error"),
            "method": reg.get("method"), "verified": reg.get("verified_by"),
        })

    print("[project] texel-space projection")
    atlas_png = work / f"{slug}-atlas.png"
    projected_glb = work / f"{slug}-projected.glb"
    settings.log = lambda m: print(f"  {m}")
    stats = engine.project_atlas(
        mesh_for_projection, base_plates, closeups, settings, atlas_png, projected_glb
    )

    # ---- 4. prepare (deterministic runtime gate) -------------------------
    print("[prepare] grounding / centring / budget / export")
    prepared = work / f"{slug}-prepared.glb"
    run("prepare-static-boss.py", projected_glb, prepared,
        "--max-triangles", cfg["geometry"].get("max_triangles", geom["target_triangles"] + 5000),
        "--texture-size", cfg["atlas"]["size"], "--name", slug)

    # ---- 5. encode -------------------------------------------------------
    final = out_dir / f"{slug}{cfg.get('output', {}).get('suffix', '')}.glb"
    if args.skip_encode:
        final.write_bytes(prepared.read_bytes())
        print(f"[encode] skipped; copied prepared GLB to {final.name}")
    else:
        print("[encode] JPEG re-encode from the lossless master")
        run("reencode-glb-texture.py", prepared, final,
            "--quality", cfg["atlas"].get("jpeg_quality", 92), "--source", atlas_png)

    # ---- 6. report -------------------------------------------------------
    report = {
        "slug": slug,
        "display_name": cfg.get("display_name"),
        "aliases": cfg.get("aliases", []),
        "encounter": cfg.get("encounter"),
        "built": date.today().isoformat(),
        "config": config_path.name,
        "reference": {
            "page_url": reference.get("page_url"),
            "native_plate_side_px": meta["native_side"],
            "subject_height_px": meta["plates"]["front"]["subject_height_px"],
            "subject_width_px": meta["plates"]["front"]["subject_width_px"],
            "base_plates": {k: v["file"] for k, v in plates_cfg.items()},
            "closeups_accepted": accepted_records,
            "closeups_rejected": [
                {"file": e["file"], "reason": e.get("rejected_reason")}
                for e in reference.get("closeups", []) if not e.get("accepted")
            ],
        },
        "settings": {
            "atlas_size": cfg["atlas"]["size"],
            "jpeg_quality": cfg["atlas"].get("jpeg_quality", 92),
            "uv_density": cfg.get("uv_density", {}),
            "regions": regions,
            "grazing_threshold": settings.grazing_threshold,
            "unsharp": {"sigma": settings.unsharp_sigma, "amount": settings.unsharp_amount,
                        "threshold": round(settings.unsharp_threshold, 5)},
            "tone": {"contrast": settings.contrast, "saturation": settings.saturation},
        },
        "atlas": stats,
        "asset": engine.inspect_glb(final, atlas_png),
        "artifacts": {
            "glb": str(final),
            "lossless_atlas": str(atlas_png),
            "coverage_mask": str(atlas_png.with_name(atlas_png.stem + "-coverage.png")),
        },
    }
    checks = report["checks"] = {
        "single_mesh": report["asset"]["mesh_count"] == 1,
        "single_material": report["asset"]["material_count"] == 1,
        "single_primitive": report["asset"]["primitive_count"] == 1,
        "no_skin_or_animation": not (report["asset"]["has_skins"]
                                     or report["asset"]["has_animations"]
                                     or report["asset"]["has_morph_targets"]),
        "no_extensions": not report["asset"]["extensions_used"],
        "feet_on_ground": abs(report["asset"]["min_y"]) < 1e-4,
        "horizontally_centred": all(abs(v) < 1e-4 for v in report["asset"]["centred_xz"]),
        "within_byte_budget": report["asset"]["bytes"] <= cfg.get("output", {}).get(
            "max_bytes", 2_500_000),
        "within_triangle_budget": report["asset"]["triangles"] <= cfg["geometry"].get(
            "max_triangles", geom["target_triangles"] + 5000),
    }
    if report["asset"].get("texture"):
        checks["no_chroma_subsampling"] = report["asset"]["texture"].get(
            "chroma_subsampled") is False
    report["all_checks_passed"] = all(checks.values())

    report_path = out_dir / f"{slug}-build-report.json"
    report_path.write_text(json.dumps(report, indent=2))

    face = stats["uv_allocation"]["face"]
    head = stats["uv_allocation"]["head"]
    print(f"\n== {slug} ==")
    print(f"  face {face['texels']:,} texels (~{face['equivalent_square']:.0f}^2), "
          f"head {head['percent_of_atlas']:.1f}% of atlas, charts {stats['chart_count']}, "
          f"coverage {stats['coverage_percent']:.1f}%")
    print(f"  {report['asset']['triangles']:,} tris / {report['asset']['vertices']:,} verts / "
          f"{report['asset']['bytes']:,} bytes")
    if report["asset"].get("texture"):
        t = report["asset"]["texture"]
        print(f"  texture {t['size'][0]}x{t['size'][1]} {t['mime']} q-table {t['luma_quant_table']} "
              f"PSNR {t.get('psnr_db')} dB")
    failed = [k for k, v in checks.items() if not v]
    print(f"  checks: {'ALL PASSED' if not failed else 'FAILED -> ' + ', '.join(failed)}")
    print(f"  report: {report_path}")
    if not report["all_checks_passed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
