"""
Get model details (verts/tris) for DwemerCenturion models and scan textures
for the new trial bosses (Asylum Sanctorium + Ossein Cage).
"""
import json
import os
import subprocess
import struct
from pathlib import Path

TOOL = r"D:\code\eso-log-aggregator\tools\eso-model-extractor\target\release\eso-model-extractor.exe"
MNF = r"E:\Games\Steam\steamapps\common\Zenimax Online\The Elder Scrolls Online\depot\eso.mnf"
BASE = r"D:\code\eso-log-aggregator\scratch"

# New models to scan (species, variant, file_index)
MODELS_TO_SCAN = [
    ("DwemerCenturion", "DwemerCenturion_B_Basic", 862681),
    ("DwemerCenturion", "DwemerCenturion_C_Basic", 862695),
    ("FleshAbomination", "FleshAbomination_C_Boss", 777383),
    ("Titan", "Titan_A_Boss", 234219),
]

# Range for texture scan around each model
SCAN_BEFORE = 10
SCAN_AFTER = 30


def extract_file(file_index, output_dir):
    """Extract a single file from MNF."""
    os.makedirs(output_dir, exist_ok=True)
    try:
        result = subprocess.run(
            [TOOL, "extract", MNF, "--file-index", str(file_index), "-o", output_dir],
            capture_output=True, text=True, timeout=60
        )
        for root, dirs, files in os.walk(output_dir):
            for f in files:
                fpath = os.path.join(root, f)
                if str(file_index) in f:
                    return fpath
        # Fallback: find any newly created file
        for root, dirs, files in os.walk(output_dir):
            for f in files:
                return os.path.join(root, f)
        return None
    except Exception as e:
        print(f"    Error extracting fi={file_index}: {e}")
        return None


def read_gr2_details(filepath):
    """Read GR2 model details via eso-model-extractor read-gr2."""
    try:
        result = subprocess.run(
            [TOOL, "read-gr2", filepath],
            capture_output=True, text=True, timeout=30
        )
        output = result.stdout + result.stderr
        info = {"verts": 0, "tris": 0, "meshes": 0, "materials": 0, "animations": 0}
        for line in output.split("\n"):
            line = line.strip()
            if "(verts=" in line:
                try:
                    verts = int(line.split("verts=")[1].split(",")[0])
                    tris = int(line.split("tris=")[1].split(",")[0])
                    info["verts"] += verts
                    info["tris"] += tris
                    info["meshes"] += 1
                except:
                    pass
            elif line.startswith("Materials:"):
                try:
                    info["materials"] = int(line.split(":")[1].strip())
                except:
                    pass
            elif line.startswith("Animations:"):
                try:
                    info["animations"] = int(line.split(":")[1].strip())
                except:
                    pass
        return info
    except Exception as e:
        return {"error": str(e)}


def read_dds_info(filepath):
    """Read DDS file header."""
    try:
        with open(filepath, "rb") as f:
            magic = f.read(4)
            if magic != b"DDS ":
                return None
            header = f.read(124)
            height = struct.unpack_from("<I", header, 8)[0]
            width = struct.unpack_from("<I", header, 12)[0]
            four_cc_bytes = header[80:84]
            try:
                four_cc = four_cc_bytes.decode("ascii").strip("\x00")
            except UnicodeDecodeError:
                four_cc = f"0x{four_cc_bytes.hex()}"
            if four_cc == "DX10":
                dx10_header = f.read(20)
                dxgi_format = struct.unpack_from("<I", dx10_header, 0)[0]
                four_cc = f"DX10(DXGI={dxgi_format})"
            return {
                "width": width, "height": height,
                "format": four_cc if four_cc else "uncompressed",
                "size_kb": os.path.getsize(filepath) // 1024,
            }
    except:
        return None


def identify_file(filepath):
    """Identify file type from magic bytes."""
    try:
        with open(filepath, "rb") as f:
            magic = f.read(4)
        if magic == b"DDS ":
            return "dds"
        if magic == b"\xe5\x9b\x49\x5e":
            return "gr2"
        return "other"
    except:
        return "error"


# =============================================================
print("=== SCANNING NEW BOSS MODELS ===\n")

results = {}

for species_name, variant_name, fi in MODELS_TO_SCAN:
    print(f"\n--- {variant_name} (fi={fi}) ---")
    scan_dir = os.path.join(BASE, "extracted_assets", f"{species_name}_{fi}")
    os.makedirs(scan_dir, exist_ok=True)

    # 1. Extract and read the model itself
    model_file = extract_file(fi, scan_dir)
    model_info = None
    if model_file:
        model_info = read_gr2_details(model_file)
        print(f"  Model: {model_info.get('verts', '?')}v/{model_info.get('tris', '?')}t, {model_info.get('materials', '?')} materials")
    else:
        print(f"  ERROR: Could not extract model")

    # 2. Scan for textures in surrounding file indices
    textures = []
    other_gr2 = []
    
    for scan_fi in range(fi - SCAN_BEFORE, fi + SCAN_AFTER + 1):
        if scan_fi == fi:
            continue  # Skip the model itself
        
        out_dir = os.path.join(scan_dir, f"fi_{scan_fi}")
        extracted = extract_file(scan_fi, out_dir)
        if not extracted:
            continue
        
        ftype = identify_file(extracted)
        if ftype == "dds":
            dds_info = read_dds_info(extracted)
            if dds_info:
                textures.append({
                    "file_index": scan_fi,
                    "offset": scan_fi - fi,
                    **dds_info
                })
        elif ftype == "gr2":
            size_kb = os.path.getsize(extracted) // 1024
            other_gr2.append({
                "file_index": scan_fi,
                "offset": scan_fi - fi,
                "size_kb": size_kb
            })

    print(f"  Textures found: {len(textures)}")
    for t in textures:
        print(f"    fi={t['file_index']} (offset={t['offset']:+d}): {t['width']}x{t['height']} {t['format']} ({t['size_kb']}KB)")
    
    print(f"  Other GR2s: {len(other_gr2)}")
    for g in other_gr2:
        print(f"    fi={g['file_index']} (offset={g['offset']:+d}): {g['size_kb']}KB")
    
    results[variant_name] = {
        "species": species_name,
        "file_index": fi,
        "model": model_info,
        "textures": textures,
        "other_gr2": other_gr2
    }

# Save results
output_path = os.path.join(BASE, "new_boss_scan_results.json")
with open(output_path, "w") as f:
    json.dump(results, f, indent=2)

print(f"\n\nResults saved to {output_path}")
