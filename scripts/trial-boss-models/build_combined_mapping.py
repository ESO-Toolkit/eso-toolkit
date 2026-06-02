"""
Build the final combined trial boss asset mapping.
Merges model data from trial_boss_models.json with texture data from trial_boss_full_assets.json.
Produces a clean, comprehensive output with models, textures, and animations for each boss.

Usage:
    cd <repo-root>
    python scripts/trial-boss-models/build_combined_mapping.py
"""

import json
from pathlib import Path
from collections import defaultdict

# All paths relative to repo root / data/trial-boss-models/
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "trial-boss-models"
MODELS_FILE = DATA_DIR / "trial_boss_models.json"
ASSETS_FILE = DATA_DIR / "trial_boss_full_assets.json"
NEW_SCAN_FILE = DATA_DIR / "new_boss_scan_results.json"
OUTPUT_JSON = DATA_DIR / "trial_boss_complete.json"
OUTPUT_TXT = DATA_DIR / "trial_boss_complete.txt"


def classify_textures(textures, model_tex_refs):
    """
    Classify textures into primary set and extras.
    Primary set = first 3 textures after the model (diffuse, normal, specular).
    Extras = remaining textures (LOD, variant textures, mipmap chains).
    """
    primary = []
    extras = []
    role_order = ["diffuse", "normal", "specular"]

    for tex in textures:
        role = tex.get("role", tex.get("probable_role", "unknown"))
        entry = {
            "file_index": tex["file_index"],
            "width": tex["width"],
            "height": tex["height"],
            "format": tex["format"],
            "size_kb": tex["size_kb"],
            "role": role,
        }

        if role in role_order and len(primary) < 3:
            primary.append(entry)
        elif role.startswith("extra_") or role == "unknown":
            extras.append(entry)
        else:
            primary.append(entry)

    return primary, extras


def build_combined():
    with open(MODELS_FILE) as f:
        models = json.load(f)
    with open(ASSETS_FILE) as f:
        assets_data = json.load(f)

    assets = assets_data["models"]

    # Build a lookup from (species, file_index) -> asset data
    asset_lookup = {}
    for key, data in assets.items():
        fi = data["file_index"]
        species = data["species"]
        asset_lookup[(species, fi)] = data

    # Load new boss scan results (different format) and merge into asset_lookup
    if Path(NEW_SCAN_FILE).exists():
        with open(NEW_SCAN_FILE) as f:
            new_scan = json.load(f)
        for model_name, scan_data in new_scan.items():
            species = scan_data["species"]
            fi = scan_data["file_index"]
            if (species, fi) not in asset_lookup:
                # Convert new scan format to match existing asset format
                converted = {
                    "species": species,
                    "model_name": model_name,
                    "file_index": fi,
                    "assets": {
                        "model_gr2": {
                            "file_index": fi,
                            "meshes": scan_data["model"].get("meshes", 1),
                            "verts": scan_data["model"]["verts"],
                            "tris": scan_data["model"]["tris"],
                            "materials": scan_data["model"].get("materials", 0),
                        },
                        "textures": [
                            {
                                "file_index": tex["file_index"],
                                "width": tex["width"],
                                "height": tex["height"],
                                "format": tex["format"],
                                "size_kb": tex["size_kb"],
                                "role": (["diffuse", "normal", "specular"][i] if i < 3 else "unknown"),
                            }
                            for i, tex in enumerate(scan_data.get("textures", []))
                        ],
                        "other_gr2": [
                            {
                                "file_index": gr2["file_index"],
                                "size_kb": gr2["size_kb"],
                                "type": "unknown",
                            }
                            for gr2 in scan_data.get("other_gr2", [])
                        ],
                    },
                }
                asset_lookup[(species, fi)] = converted

    # Build the combined output
    output = {
        "description": "ESO Trial Boss Complete Asset Mapping — Models, Textures & Animations",
        "generated_by": "build_combined_mapping.py",
        "notes": [
            "Each creature boss includes: GR2 model geometry, DDS textures (diffuse/normal/specular where found), and related GR2 skeleton/animation files.",
            "Texture roles: diffuse (base color), normal (surface detail/bump), specular (shininess/reflectivity).",
            "DDS formats: DXT1 (compressed, no alpha), DXT3/DXT5 (compressed, alpha), DX10 (modern), uncompressed (raw RGBA).",
            "file_index values can extract specific files: eso-model-extractor extract <mnf> --file-index <fi>",
            "Humanoid bosses use player-type skeletons with generic player textures (not extractable as standalone creatures).",
            "Some models have 0 textures found — ESO stores their textures in a non-adjacent archive region we cannot link without runtime data.",
            "Dragon models: Living dragon meshes are stored as unnamed multi-part files. BoneDragon_A_Basic is the skeletal dragon reference.",
        ],
        "trials": {},
    }

    stats = {
        "total_bosses": 0,
        "creature_bosses": 0,
        "humanoid_bosses": 0,
        "models_with_textures": 0,
        "models_without_textures": 0,
        "total_primary_textures": 0,
        "total_extra_textures": 0,
        "total_other_gr2": 0,
    }

    txt_lines = []
    txt_lines.append("=" * 90)
    txt_lines.append("ESO TRIAL BOSS — COMPLETE ASSET MAPPING")
    txt_lines.append("Models + Textures + Animations")
    txt_lines.append("=" * 90)
    txt_lines.append("")

    for trial_name, trial_data in models["trials"].items():
        trial_output = {
            "location": trial_data["location"],
            "year": trial_data["year"],
            "bosses": [],
        }

        txt_lines.append("-" * 90)
        txt_lines.append(f"TRIAL: {trial_name} ({trial_data['year']}) — {trial_data['location']}")
        txt_lines.append("-" * 90)
        txt_lines.append("")

        for boss in trial_data["bosses"]:
            stats["total_bosses"] += 1
            boss_name = boss["name"]
            model_type = boss.get("model_type", "unknown")

            if model_type == "humanoid":
                stats["humanoid_bosses"] += 1
                boss_entry = {
                    "name": boss_name,
                    "model_type": "humanoid",
                    "notes": boss.get("notes", ""),
                }
                trial_output["bosses"].append(boss_entry)

                txt_lines.append(f"  {boss_name}")
                txt_lines.append(f"    Type: HUMANOID (player-type skeleton)")
                txt_lines.append(f"    Notes: {boss.get('notes', 'N/A')}")
                txt_lines.append("")
                continue

            # Creature boss
            stats["creature_bosses"] += 1
            species = boss.get("species", "unknown")
            model = boss.get("model", {})
            model_name = model.get("name", "unknown")
            model_fi = model.get("file_index", 0)

            # Look up asset data for the primary model
            asset_data = asset_lookup.get((species, model_fi))

            boss_entry = {
                "name": boss_name,
                "model_type": "creature",
                "species": species,
                "notes": boss.get("notes", ""),
                "model": {
                    "name": model_name,
                    "file_index": model_fi,
                    "size_kb": model.get("size_kb", 0),
                    "verts": model.get("verts", 0),
                    "tris": model.get("tris", 0),
                },
            }

            if boss.get("model_note"):
                boss_entry["model"]["note"] = boss["model_note"]

            txt_lines.append(f"  {boss_name}")
            txt_lines.append(f"    Type: CREATURE ({species})")
            txt_lines.append(f"    Model: {model_name} (fi={model_fi}, {model.get('size_kb',0)}KB, {model.get('verts',0)}v/{model.get('tris',0)}t)")
            if boss.get("model_note") == "reference_skeleton":
                txt_lines.append(f"    ⚠ REFERENCE SKELETON ONLY — living model cannot be located by name search")

            # Textures
            if asset_data and asset_data["assets"]["textures"]:
                textures = asset_data["assets"]["textures"]
                model_info = asset_data["assets"].get("model_gr2", {})
                tex_refs = model_info.get("textures_ref", 0) if model_info else 0

                primary, extras = classify_textures(textures, tex_refs)
                stats["total_primary_textures"] += len(primary)
                stats["total_extra_textures"] += len(extras)
                stats["models_with_textures"] += 1

                boss_entry["textures"] = {
                    "primary": primary,
                    "additional": extras if extras else None,
                    "total_count": len(textures),
                }

                txt_lines.append(f"    Textures ({len(textures)} total, {len(primary)} primary):")
                for tex in primary:
                    txt_lines.append(f"      [{tex['role']:>10}] fi={tex['file_index']}: {tex['width']}x{tex['height']} {tex['format']} ({tex['size_kb']}KB)")
                if extras:
                    txt_lines.append(f"      + {len(extras)} additional textures (LOD/variant/mipmap)")
                    for tex in extras[:3]:
                        txt_lines.append(f"         fi={tex['file_index']}: {tex['width']}x{tex['height']} {tex['format']} ({tex['size_kb']}KB)")
                    if len(extras) > 3:
                        txt_lines.append(f"         ... and {len(extras) - 3} more")
            else:
                stats["models_without_textures"] += 1
                boss_entry["textures"] = {
                    "primary": [],
                    "additional": None,
                    "total_count": 0,
                    "note": "Textures not found via adjacent file scan — stored in non-adjacent archive region"
                }
                txt_lines.append(f"    Textures: ⚠ NOT FOUND (stored in non-adjacent archive region)")

            # Other GR2 files (skeleton, animations)
            if asset_data and asset_data["assets"].get("other_gr2"):
                other_gr2 = asset_data["assets"]["other_gr2"]
                stats["total_other_gr2"] += len(other_gr2)

                skeletons = [g for g in other_gr2 if g.get("type") == "skeleton"]
                animations = [g for g in other_gr2 if g.get("type") == "animation"]
                unknown = [g for g in other_gr2 if g.get("type") not in ("skeleton", "animation")]

                gr2_summary = {
                    "animations": [{"file_index": a["file_index"], "size_kb": a["size_kb"]} for a in animations],
                    "skeletons": [{"file_index": s["file_index"], "size_kb": s["size_kb"]} for s in skeletons],
                    "other": [{"file_index": u["file_index"], "size_kb": u["size_kb"], "type": u.get("type", "unknown")} for u in unknown],
                }
                boss_entry["related_gr2"] = gr2_summary

                parts = []
                if animations:
                    parts.append(f"{len(animations)} anims")
                if skeletons:
                    parts.append(f"{len(skeletons)} skeletons")
                if unknown:
                    parts.append(f"{len(unknown)} other GR2")
                if parts:
                    txt_lines.append(f"    Related GR2: {', '.join(parts)}")

            # All variants
            all_variants = boss.get("all_variants", [])
            if all_variants and len(all_variants) > 1:
                variant_entries = []
                for variant in all_variants:
                    vfi = variant["file_index"]
                    vname = variant["name"]
                    v_asset = asset_lookup.get((species, vfi))

                    v_entry = {
                        "name": vname,
                        "file_index": vfi,
                        "size_kb": variant.get("size_kb", 0),
                    }

                    if v_asset and v_asset["assets"]["textures"]:
                        v_textures = v_asset["assets"]["textures"]
                        v_primary, v_extras = classify_textures(v_textures, 0)
                        v_entry["textures"] = len(v_textures)
                        v_entry["has_textures"] = True
                    else:
                        v_entry["textures"] = 0
                        v_entry["has_textures"] = False

                    variant_entries.append(v_entry)

                boss_entry["all_variants"] = variant_entries

                txt_lines.append(f"    Variants ({len(all_variants)}):")
                for v in variant_entries:
                    tex_tag = f"✓ {v['textures']} tex" if v["has_textures"] else "✗ no tex"
                    txt_lines.append(f"      {v['name']} (fi={v['file_index']}, {v['size_kb']}KB) [{tex_tag}]")

            txt_lines.append("")
            trial_output["bosses"].append(boss_entry)

        output["trials"][trial_name] = trial_output

    output["summary"] = stats

    # Write summary header
    txt_lines.insert(4, f"")
    txt_lines.insert(5, f"SUMMARY")
    txt_lines.insert(6, f"  Total Bosses: {stats['total_bosses']} ({stats['creature_bosses']} creature, {stats['humanoid_bosses']} humanoid)")
    txt_lines.insert(7, f"  Models with textures found: {stats['models_with_textures']}")
    txt_lines.insert(8, f"  Models without textures: {stats['models_without_textures']}")
    txt_lines.insert(9, f"  Primary textures (diffuse/normal/specular): {stats['total_primary_textures']}")
    txt_lines.insert(10, f"  Additional textures (LOD/variant/mipmap): {stats['total_extra_textures']}")
    txt_lines.insert(11, f"  Related GR2 files (skeleton/animation): {stats['total_other_gr2']}")
    txt_lines.insert(12, f"")

    # Write JSON
    with open(OUTPUT_JSON, "w") as f:
        json.dump(output, f, indent=2)
    print(f"Wrote {OUTPUT_JSON}")

    # Write TXT
    with open(OUTPUT_TXT, "w", encoding="utf-8") as f:
        f.write("\n".join(txt_lines))
    print(f"Wrote {OUTPUT_TXT}")

    print(f"\n{'='*60}")
    print(f"FINAL SUMMARY")
    print(f"{'='*60}")
    print(f"Total bosses: {stats['total_bosses']}")
    print(f"  Creature: {stats['creature_bosses']}")
    print(f"  Humanoid: {stats['humanoid_bosses']}")
    print(f"Models with textures: {stats['models_with_textures']}/{stats['creature_bosses']}")
    print(f"Primary textures: {stats['total_primary_textures']}")
    print(f"Additional textures: {stats['total_extra_textures']}")
    print(f"Related GR2 files: {stats['total_other_gr2']}")
    print(f"Models WITHOUT textures: {stats['models_without_textures']}")


if __name__ == "__main__":
    build_combined()
