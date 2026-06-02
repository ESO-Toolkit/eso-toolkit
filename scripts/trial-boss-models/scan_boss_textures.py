"""
Scan for ALL assets (models, textures, animations) for each trial boss creature.

For each creature boss model file_index, we:
1. Extract the GR2 model via read-gr2 to get material/texture count
2. Extract neighboring files (fi-20 to fi+30) to find DDS textures
3. Identify all DDS files by magic bytes and read their dimensions/format
4. Build a complete asset mapping: model + textures + animations
"""

import json
import os
import subprocess
import struct
import sys
import shutil
from pathlib import Path

TOOL = r"D:\code\eso-log-aggregator\tools\eso-model-extractor\target\release\eso-model-extractor.exe"
MNF = r"E:\Games\Steam\steamapps\common\Zenimax Online\The Elder Scrolls Online\depot\eso.mnf"
MAPPING_FILE = r"D:\code\eso-log-aggregator\scratch\trial_boss_models.json"
EXTRACT_DIR = r"D:\code\eso-log-aggregator\scratch\extracted_assets"
OUTPUT_JSON = r"D:\code\eso-log-aggregator\scratch\trial_boss_full_assets.json"
OUTPUT_TXT = r"D:\code\eso-log-aggregator\scratch\trial_boss_full_assets.txt"

# Range around the model file_index to scan for related assets
SCAN_RANGE_BEFORE = 10
SCAN_RANGE_AFTER = 30


def read_dds_info(filepath):
    """Read DDS file header to get dimensions and format."""
    try:
        with open(filepath, "rb") as f:
            magic = f.read(4)
            if magic != b"DDS ":
                return None
            header = f.read(124)
            height = struct.unpack_from("<I", header, 8)[0]
            width = struct.unpack_from("<I", header, 12)[0]
            # FourCC is at offset 80 in header (84 from file start - 4 for magic)
            four_cc_bytes = header[80:84]
            try:
                four_cc = four_cc_bytes.decode("ascii").strip("\x00")
            except UnicodeDecodeError:
                four_cc = f"0x{four_cc_bytes.hex()}"
            # DX10 extended header
            if four_cc == "DX10":
                dx10_header = f.read(20)
                dxgi_format = struct.unpack_from("<I", dx10_header, 0)[0]
                four_cc = f"DX10(DXGI={dxgi_format})"

            size_kb = os.path.getsize(filepath) // 1024
            return {
                "width": width,
                "height": height,
                "format": four_cc if four_cc else "uncompressed",
                "size_kb": size_kb,
            }
    except Exception as e:
        return None


def identify_file_type(filepath):
    """Identify file type from magic bytes."""
    try:
        with open(filepath, "rb") as f:
            magic = f.read(4)
        if magic == b"DDS ":
            return "dds"
        # GR2 files have ESO's custom magic 0x5E499BE5
        if magic == b"\xe5\x9b\x49\x5e":
            return "gr2"
        # PSB2 check
        ext = Path(filepath).suffix.lower()
        if ext == ".psb2":
            return "psb2"
        return f"unknown ({magic[:4].hex()})"
    except Exception:
        return "error"


def read_gr2_info(filepath):
    """Use the Granny SDK reader to get model info."""
    try:
        result = subprocess.run(
            [TOOL, "read-gr2", filepath],
            capture_output=True, text=True, timeout=30
        )
        output = result.stdout + result.stderr
        info = {
            "models": 0, "meshes": 0, "animations": 0,
            "textures": 0, "materials": 0, "mesh_names": [],
            "material_names": [], "texture_maps": []
        }
        for line in output.split("\n"):
            line = line.strip()
            if line.startswith("Models:"):
                info["models"] = int(line.split(":")[1].strip())
            elif line.startswith("Meshes:"):
                info["meshes"] = int(line.split(":")[1].strip())
            elif line.startswith("Animations:"):
                info["animations"] = int(line.split(":")[1].strip())
            elif line.startswith("Textures:"):
                info["textures"] = int(line.split(":")[1].strip())
            elif line.startswith("Materials:"):
                info["materials"] = int(line.split(":")[1].strip())
            elif "] " in line and "(verts=" in line:
                # Mesh info line like: [0] StormAtronach_A_Basic (verts=3635, tris=4425, bones=43)
                name = line.split("] ")[1].split(" (")[0]
                info["mesh_names"].append(name)
            elif "usage=" in line:
                # Material map: usage=diffuse material=Maps #0
                parts = {}
                for token in line.split():
                    if "=" in token:
                        k, v = token.split("=", 1)
                        parts[k] = v
                info["texture_maps"].append(parts)
            elif "] " in line and "(" in line and "maps)" in line:
                name = line.split("] ")[1].split(" (")[0]
                info["material_names"].append(name)
        return info
    except Exception as e:
        return {"error": str(e)}


def extract_file(file_index, output_dir):
    """Extract a single file from the MNF archive."""
    try:
        result = subprocess.run(
            [TOOL, "extract", MNF, "--file-index", str(file_index), "-o", output_dir],
            capture_output=True, text=True, timeout=60
        )
        # Search for extracted files
        for root, dirs, files in os.walk(output_dir):
            for f in files:
                if f.startswith(f"{file_index:07d}"):
                    return os.path.join(root, f)
        return None
    except Exception:
        return None


def scan_species_assets(species_name, model_fi, extract_base):
    """Scan for all assets around a model's file_index."""
    species_dir = os.path.join(extract_base, species_name)
    os.makedirs(species_dir, exist_ok=True)

    print(f"  Scanning fi={model_fi} range [{model_fi - SCAN_RANGE_BEFORE}..{model_fi + SCAN_RANGE_AFTER}]...")

    assets = {
        "model_gr2": None,
        "textures": [],
        "other_gr2": [],
        "other_files": [],
        "scan_range": [model_fi - SCAN_RANGE_BEFORE, model_fi + SCAN_RANGE_AFTER],
    }

    # Extract all files in the range
    for fi in range(model_fi - SCAN_RANGE_BEFORE, model_fi + SCAN_RANGE_AFTER + 1):
        filepath = extract_file(fi, species_dir)
        if filepath is None:
            continue

        file_type = identify_file_type(filepath)
        file_size_kb = os.path.getsize(filepath) // 1024

        if file_type == "dds":
            dds_info = read_dds_info(filepath)
            if dds_info:
                entry = {
                    "file_index": fi,
                    "width": dds_info["width"],
                    "height": dds_info["height"],
                    "format": dds_info["format"],
                    "size_kb": dds_info["size_kb"],
                    "filename": os.path.basename(filepath),
                }
                # Try to determine texture role based on order relative to model
                offset = fi - model_fi
                if offset > 0:
                    if len(assets["textures"]) == 0:
                        entry["probable_role"] = "diffuse"
                    elif len(assets["textures"]) == 1:
                        entry["probable_role"] = "normal"
                    elif len(assets["textures"]) == 2:
                        entry["probable_role"] = "specular"
                    else:
                        entry["probable_role"] = f"extra_{len(assets['textures'])}"
                assets["textures"].append(entry)

        elif file_type == "gr2":
            gr2_info = read_gr2_info(filepath)
            entry = {
                "file_index": fi,
                "size_kb": file_size_kb,
                "filename": os.path.basename(filepath),
            }

            if "error" not in gr2_info:
                entry["models"] = gr2_info["models"]
                entry["meshes"] = gr2_info["meshes"]
                entry["animations"] = gr2_info["animations"]
                entry["textures_ref"] = gr2_info["textures"]
                entry["materials"] = gr2_info["materials"]
                if gr2_info["mesh_names"]:
                    entry["mesh_names"] = gr2_info["mesh_names"]
                if gr2_info["texture_maps"]:
                    entry["texture_maps"] = gr2_info["texture_maps"]
                if gr2_info["material_names"]:
                    entry["material_names"] = gr2_info["material_names"]
            else:
                entry["parse_error"] = gr2_info["error"]

            if fi == model_fi:
                assets["model_gr2"] = entry
            else:
                # Determine if animation or skeleton
                if gr2_info.get("animations", 0) > 0:
                    entry["type"] = "animation"
                elif gr2_info.get("meshes", 0) == 0 and gr2_info.get("models", 0) > 0:
                    entry["type"] = "skeleton"
                else:
                    entry["type"] = "unknown_gr2"
                assets["other_gr2"].append(entry)
        elif file_type == "psb2":
            assets["other_files"].append({
                "file_index": fi,
                "type": "psb2",
                "size_kb": file_size_kb,
                "filename": os.path.basename(filepath),
            })
        else:
            assets["other_files"].append({
                "file_index": fi,
                "type": file_type,
                "size_kb": file_size_kb,
                "filename": os.path.basename(filepath),
            })

    return assets


def determine_texture_roles(model_info, textures):
    """Try to assign texture roles based on material info from GR2 and DDS properties."""
    if not model_info or not textures:
        return textures

    texture_maps = model_info.get("texture_maps", [])
    roles = []
    for tm in texture_maps:
        usage = tm.get("usage", "unknown")
        roles.append(usage)

    # Assign roles based on order matching (GR2 materials reference textures in order)
    for i, tex in enumerate(textures):
        if i < len(roles):
            tex["role"] = roles[i]
        elif "probable_role" in tex:
            tex["role"] = tex.pop("probable_role")
        # Clean up probable_role if role is set
        if "role" in tex and "probable_role" in tex:
            del tex["probable_role"]

    return textures


def main():
    # Load existing mapping
    with open(MAPPING_FILE, "r") as f:
        mapping = json.load(f)

    # Clean extract dir
    if os.path.exists(EXTRACT_DIR):
        shutil.rmtree(EXTRACT_DIR)
    os.makedirs(EXTRACT_DIR)

    # Collect all unique creature models to scan
    creature_bosses = []
    for trial_name, trial_data in mapping["trials"].items():
        for boss in trial_data["bosses"]:
            if boss.get("model_type") == "creature" and boss.get("model"):
                model = boss["model"]
                # We need species, variant name, and file_index
                creature_bosses.append({
                    "trial": trial_name,
                    "boss_name": boss["name"],
                    "species": boss.get("species", "unknown"),
                    "model_name": model["name"],
                    "file_index": model["file_index"],
                    "all_variants": boss.get("all_variants", []),
                })

    print(f"Found {len(creature_bosses)} creature bosses to scan for assets\n")

    # Deduplicate by file_index (some bosses share models)
    seen_fi = {}
    unique_scans = []
    for cb in creature_bosses:
        fi = cb["file_index"]
        if fi not in seen_fi:
            seen_fi[fi] = cb
            unique_scans.append(cb)
        else:
            # Note duplicate
            seen_fi[fi]["also_used_by"] = seen_fi[fi].get("also_used_by", [])
            seen_fi[fi]["also_used_by"].append(cb["boss_name"])

    print(f"Unique models to scan: {len(unique_scans)} (some bosses share models)\n")

    # Also scan all_variants that differ from the primary model
    variant_scans = []
    for cb in creature_bosses:
        for variant in cb.get("all_variants", []):
            vfi = variant["file_index"]
            if vfi not in seen_fi:
                seen_fi[vfi] = {
                    "trial": cb["trial"],
                    "boss_name": cb["boss_name"],
                    "species": cb["species"],
                    "model_name": variant["name"],
                    "file_index": vfi,
                    "is_variant": True,
                }
                variant_scans.append(seen_fi[vfi])

    print(f"Additional variant models to scan: {len(variant_scans)}\n")
    all_scans = unique_scans + variant_scans

    # Scan each model
    results = {}
    for i, scan in enumerate(all_scans):
        label = f"[{i+1}/{len(all_scans)}]"
        fi = scan["file_index"]
        key = f"{scan['species']}_{scan['model_name']}_fi{fi}"
        print(f"{label} {scan['boss_name']} -> {scan['model_name']} (fi={fi})")

        assets = scan_species_assets(
            f"{scan['species']}_{fi}",
            fi,
            EXTRACT_DIR
        )

        # Determine texture roles from model material info
        if assets["model_gr2"]:
            assets["textures"] = determine_texture_roles(
                assets["model_gr2"], assets["textures"]
            )

        results[key] = {
            "boss_name": scan["boss_name"],
            "trial": scan["trial"],
            "species": scan["species"],
            "model_name": scan["model_name"],
            "file_index": fi,
            "is_variant": scan.get("is_variant", False),
            "assets": assets,
        }

        tex_count = len(assets["textures"])
        gr2_count = len(assets.get("other_gr2", []))
        print(f"  -> Found: {tex_count} textures, {gr2_count} other GR2 files\n")

    # Build full output
    output = {
        "description": "ESO Trial Boss Complete Asset Mapping (Models + Textures + Animations)",
        "notes": [
            "Each creature boss includes: GR2 model, DDS textures (diffuse/normal/specular), and related GR2 files (skeleton/animations).",
            "Texture roles are determined from GR2 material references: diffuse (color), normal (bump), specular (shininess).",
            "DDS formats: DXT1 (compressed, no alpha), DXT5 (compressed, alpha), DX10 (modern format), uncompressed.",
            "file_index values can be used with eso-model-extractor to extract specific files.",
            "Humanoid bosses use player-type skeletons and are not included (they share generic player textures).",
        ],
        "summary": {
            "total_bosses_scanned": len(unique_scans),
            "unique_models_scanned": len(all_scans),
            "total_textures_found": sum(len(r["assets"]["textures"]) for r in results.values()),
            "total_gr2_found": sum(1 + len(r["assets"].get("other_gr2", [])) for r in results.values()),
        },
        "models": results,
    }

    # Write JSON
    with open(OUTPUT_JSON, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nWrote {OUTPUT_JSON}")

    # Write human-readable text
    with open(OUTPUT_TXT, "w") as f:
        f.write("=" * 80 + "\n")
        f.write("ESO TRIAL BOSS - COMPLETE ASSET MAPPING\n")
        f.write("Models + Textures + Animations\n")
        f.write("=" * 80 + "\n\n")

        f.write(f"Total models scanned: {output['summary']['unique_models_scanned']}\n")
        f.write(f"Total textures found: {output['summary']['total_textures_found']}\n")
        f.write(f"Total GR2 files found: {output['summary']['total_gr2_found']}\n\n")

        # Group by trial
        by_trial = {}
        for key, data in results.items():
            trial = data["trial"]
            if trial not in by_trial:
                by_trial[trial] = []
            by_trial[trial].append((key, data))

        for trial_name, trial_data in mapping["trials"].items():
            if trial_name not in by_trial:
                continue
            f.write("-" * 80 + "\n")
            f.write(f"TRIAL: {trial_name} ({trial_data['year']})\n")
            f.write("-" * 80 + "\n\n")

            for key, data in by_trial[trial_name]:
                variant_tag = " [VARIANT]" if data["is_variant"] else ""
                f.write(f"  Boss: {data['boss_name']}{variant_tag}\n")
                f.write(f"  Species: {data['species']}\n")
                f.write(f"  Model: {data['model_name']} (fi={data['file_index']})\n")

                assets = data["assets"]

                # Model GR2
                if assets["model_gr2"]:
                    mg = assets["model_gr2"]
                    f.write(f"  Model GR2: {mg['size_kb']}KB")
                    if mg.get("mesh_names"):
                        f.write(f" - meshes: {', '.join(mg['mesh_names'])}")
                    f.write(f" - {mg.get('textures_ref', 0)} texture refs, {mg.get('materials', 0)} materials\n")

                # Textures
                if assets["textures"]:
                    f.write(f"  Textures ({len(assets['textures'])}):\n")
                    for tex in assets["textures"]:
                        role = tex.get("role", tex.get("probable_role", "unknown"))
                        f.write(f"    [{role}] fi={tex['file_index']}: {tex['width']}x{tex['height']} {tex['format']} ({tex['size_kb']}KB)\n")
                else:
                    f.write(f"  Textures: NONE FOUND\n")

                # Other GR2 files
                if assets.get("other_gr2"):
                    f.write(f"  Other GR2 ({len(assets['other_gr2'])}):\n")
                    for g in assets["other_gr2"]:
                        gtype = g.get("type", "unknown")
                        f.write(f"    [{gtype}] fi={g['file_index']}: {g['size_kb']}KB")
                        if g.get("mesh_names"):
                            f.write(f" meshes={','.join(g['mesh_names'])}")
                        if g.get("animations", 0) > 0:
                            f.write(f" anims={g['animations']}")
                        f.write("\n")

                # Other files
                if assets.get("other_files"):
                    f.write(f"  Other files ({len(assets['other_files'])}):\n")
                    for o in assets["other_files"]:
                        f.write(f"    [{o['type']}] fi={o['file_index']}: {o['size_kb']}KB\n")

                f.write("\n")

    print(f"Wrote {OUTPUT_TXT}")
    print(f"\nDone! Summary:")
    print(f"  Models: {output['summary']['unique_models_scanned']}")
    print(f"  Textures: {output['summary']['total_textures_found']}")
    print(f"  GR2 files: {output['summary']['total_gr2_found']}")


if __name__ == "__main__":
    main()
