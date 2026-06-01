# Trial Boss Model & Texture Mapping

ESO trial boss → 3D model asset mapping for three.js rendering. Maps every boss across all 14 ESO trials to their extractable GR2 model files and DDS texture files within the game's MNF archive.

## Quick Start (three.js Rendering)

```bash
# 1. Build the extraction tool
cd tools/eso-model-extractor
cargo build --release

# 2. Extract a boss model + textures using file_index from the mapping
#    Example: Saint Felms the Bold (DwemerCenturion_B_Basic)
$mnf = "E:\Games\Steam\steamapps\common\Zenimax Online\The Elder Scrolls Online\depot\eso.mnf"
$tool = ".\target\release\eso-model-extractor.exe"

# Extract the GR2 model
& $tool extract $mnf --file-index 862681 --output ./extracted

# Extract each DDS texture (file indices from trial_boss_complete.json)
862673, 862675, 862677, 862683, 862685, 862689, 862691 | ForEach-Object {
    & $tool extract $mnf --file-index $_ --output ./extracted
}

# 3. Read model geometry with Granny SDK
& $tool read-gr2 ./extracted/0862681_*.gr2

# 4. Convert GR2 → glTF (or use Noesis/lslib for full fidelity)
& $tool convert ./extracted/0862681_*.gr2 --output ./gltf/saint_felms.gltf

# 5. Load in three.js with GLTFLoader + assign DDS textures
```

## Data Files

All mapping data lives in `data/trial-boss-models/`:

| File | Size | Purpose |
|------|------|---------|
| `trial_boss_complete.json` | 103 KB | **Primary artifact** — complete mapping with models, textures, animations, and related GR2 files for every boss |
| `trial_boss_models.json` | 32 KB | Core model-only mapping (species, variant, file_index, verts/tris) |
| `creature_catalog.json` | 105 KB | Full creature species catalog (132 species, 456 mesh variants) |
| `trial_boss_full_assets.json` | 289 KB | Raw adjacency scan data for original 56 model file indices |
| `new_boss_scan_results.json` | 6.7 KB | Supplementary scan data for 4 models added when Asylum Sanctorium and Ossein Cage were added |
| `trial_boss_complete.txt` | 23 KB | Human-readable summary of the complete mapping |

### `trial_boss_complete.json` Structure

This is the primary file a three.js application would consume:

```jsonc
{
  "trials": {
    "Halls of Fabrication": {
      "location": "Vvardenfell",
      "year": 2017,
      "bosses": [
        {
          "name": "Pinnacle Factotum",
          "model_type": "creature",     // "creature" = extractable 3D model, "humanoid" = player skeleton
          "species": "DwemerCenturion",
          "model": {
            "name": "DwemerCenturion_B_Basic",
            "file_index": 862681,       // ← use this with eso-model-extractor to extract the GR2
            "size_kb": 623,
            "verts": 8210,
            "tris": 9076
          },
          "textures": {
            "primary": [
              {
                "file_index": 862673,   // ← extract this for the diffuse texture
                "width": 256, "height": 512,
                "format": "DXT5",       // DDS compression format
                "size_kb": 170,
                "role": "diffuse"       // diffuse, normal, or specular
              }
              // ... normal, specular
            ],
            "additional": [ /* LOD/variant textures */ ],
            "total_count": 7
          },
          "related_gr2": {              // skeleton and animation files
            "animations": [{ "file_index": 862679, "size_kb": 59 }],
            "skeletons": [],
            "other": [{ "file_index": 862695, "size_kb": 566 }]
          }
        }
      ]
    }
  },
  "summary": {
    "total_bosses": 54,
    "creature_bosses": 30,
    "humanoid_bosses": 24,
    "models_with_textures": 22,
    "models_without_textures": 8
  }
}
```

### Key Fields for three.js

| Field | Usage |
|-------|-------|
| `model.file_index` | Extract the GR2 model file from the MNF archive |
| `model.verts` / `model.tris` | Geometry complexity (for LOD decisions) |
| `textures.primary[].file_index` | Extract DDS texture files |
| `textures.primary[].role` | Map to three.js material channels: `diffuse` → `map`, `normal` → `normalMap`, `specular` → `specularMap` |
| `textures.primary[].format` | DDS compression: `DXT1` (no alpha), `DXT5` (alpha), `DXT3`, `DX10`, `uncompressed` |
| `related_gr2.animations` | Skeleton/animation GR2 files for animated rendering |
| `model_type` | `"humanoid"` bosses use player-type skeletons (not standalone extractable models) |

## Coverage

**14 trials, 54 bosses** (30 creature models, 24 humanoid):

| Trial | Year | Location | Bosses | Creature Models |
|-------|------|----------|--------|----------------|
| Hel Ra Citadel | 2014 | Craglorn | 3 | 0 (all humanoid) |
| Aetherian Archive | 2014 | Craglorn | 4 | 2 |
| Sanctum Ophidia | 2014 | Craglorn | 3 | 2 |
| Maw of Lorkhaj | 2016 | Reaper's March | 3 | 2 |
| Halls of Fabrication | 2017 | Vvardenfell | 5 | 5 |
| Asylum Sanctorium | 2017 | Clockwork City | 3 | 3 |
| Cloudrest | 2018 | Summerset | 4 | 1 |
| Sunspire | 2019 | Northern Elsweyr | 3 | 3 |
| Kyne's Aegis | 2020 | Western Skyrim | 3 | 0 (all humanoid) |
| Rockgrove | 2021 | Blackwood | 3 | 3 |
| Dreadsail Reef | 2022 | High Isle | 3 | 2 |
| Sanity's Edge | 2023 | Telvanni Peninsula | 5 | 4 |
| Lucent Citadel | 2024 | West Weald | 6 | 3 |
| Ossein Cage | 2025 | Solstice (Coldharbour) | 6 | 2 |

**Texture coverage:** 22 of 30 creature models have associated DDS textures found. 8 models have textures stored in non-adjacent archive regions that the adjacency scan cannot link (see Limitations below).

## How the Data Was Generated

### Pipeline Overview

```
ESO MNF Archive (eso.mnf, ~60GB across .dat files)
        │
        ▼
  ┌─────────────────────────┐
  │  eso-model-extractor    │  Rust CLI tool
  │  (scan-mnf, extract,    │  Reads MNF manifest, extracts files from DAT archives
  │   read-gr2)             │  Decompresses zlib/Oodle, reads GR2 via Granny SDK
  └─────────────────────────┘
        │
        ▼
  ┌─────────────────────────┐
  │  creature_catalog_builder│  Python script
  │  + build_catalog.py      │  Scans all 2,476 GR2 models in the archive
  └─────────────────────────┘  Extracts each, reads verts/tris/materials via read-gr2
        │                      Groups by species name → creature_catalog.json
        ▼
  ┌─────────────────────────┐
  │  build_trial_boss_       │  Python script
  │  mapping.py              │  Cross-references UESP wiki boss names with creature
  └─────────────────────────┘  catalog species to build trial_boss_models.json
        │
        ▼
  ┌─────────────────────────┐
  │  scan_boss_textures.py   │  Python script (+ scan_new_bosses.py)
  │  (adjacency scanning)    │  For each model file_index, extracts files at fi±10/+30
  └─────────────────────────┘  Checks for DDS magic bytes, reads DDS headers
        │                      Also finds related GR2 files (skeletons/animations)
        ▼
  ┌─────────────────────────┐
  │  build_combined_         │  Python script
  │  mapping.py              │  Merges model data + texture scan data
  └─────────────────────────┘  Produces trial_boss_complete.json + .txt
```

### Step 1: Creature Catalog

The creature catalog was built by scanning all named GR2 files in the ESO MNF archive:

1. **Scan the MNF** for all named files matching creature patterns: `scan-mnf eso.mnf --list-names`
2. **Extract each GR2** model: `extract eso.mnf --file-index <fi>`
3. **Read geometry** via Granny SDK: `read-gr2 <file>.gr2` → extracts vertex count, triangle count, materials, mesh count
4. **Group by species** — Creature models follow ESO's naming convention: `{Species}_{Variant}_{Type}` (e.g., `DwemerCenturion_B_Basic`, `FleshAbomination_C_Boss`)

Result: `creature_catalog.json` — 132 species, 456 mesh variants.

### Step 2: Boss-to-Model Mapping

Trial boss names were sourced from [UESP's Trials page](https://en.uesp.net/wiki/Online:Trials) and individual trial pages. Each boss was manually matched to a creature species/variant:

- **Creature bosses** → mapped to specific variants (e.g., "Pinnacle Factotum" → `DwemerCenturion_B_Basic`)
- **Humanoid bosses** → marked as `model_type: "humanoid"` (use player-type skeletons, not standalone models)
- **Multi-part models** → noted where bosses use multiple GR2 files (e.g., dragons: body + wings + head + tail)

Result: `trial_boss_models.json` — 54 bosses across 14 trials.

### Step 3: Texture Discovery via Adjacency Scanning

ESO's MNF archive has **no file linking mechanism** — there is no way to know which textures belong to which model from metadata alone. Textures were discovered using **file index adjacency scanning**:

1. For each model's `file_index`, extract files in the range `[fi - 10, fi + 30]`
2. Check each extracted file for **DDS magic bytes** (`DDS ` = `0x44445320` at offset 0)
3. Read the **DDS header** (128 bytes) for width, height, pixel format (DXT1/DXT3/DXT5/DX10/uncompressed)
4. Also detect related GR2 files (skeletons, animations) in the same range

This heuristic works because ESO typically stores model assets in clusters: the GR2 model file is adjacent to its DDS textures in the archive's file index space. The approach successfully found textures for 22 of 30 creature boss models.

**Why 8 models have no textures:** Some models (particularly newer/larger ones like ClockWorkTitan, BoneDragon, ArgonianBehemoth) have their textures stored at distant file indices. Without runtime data linking (e.g., from ESO's shader system), these cannot be mapped.

### Step 4: Combined Mapping

The final `build_combined_mapping.py` script merges:
- Model data from `trial_boss_models.json`
- Texture/asset data from `trial_boss_full_assets.json` (original 56-model scan)
- Supplementary data from `new_boss_scan_results.json` (4 models from Asylum Sanctorium and Ossein Cage)

Texture classification assigns roles based on position after the model file:
- First 3 textures after the model → labeled as `diffuse`, `normal`, `specular`
- Remaining textures → classified as additional (LOD, variant, mipmap)

## Three.js Integration Guide

### Loading GR2 Models

ESO uses Granny 3D (`.gr2`) format. Options for three.js:

1. **Pre-convert to glTF** — Use `eso-model-extractor convert` or [Noesis](https://richwhitehouse.com/index.php?content=inc_projects.php&showproject=91) to convert GR2 → glTF/FBX, then load with `GLTFLoader`
2. **Runtime GR2 parsing** — Write a custom three.js loader that reads GR2 section headers and extracts vertex/index buffers directly (advanced)

Recommended approach: pre-convert all needed models to glTF at build time.

### Loading DDS Textures

three.js supports DDS natively via `DDSLoader`:

```javascript
import { DDSLoader } from 'three/examples/jsm/loaders/DDSLoader.js';

const loader = new DDSLoader();
const texture = loader.load('path/to/texture.dds');

// Assign to material based on role from the mapping
const material = new THREE.MeshStandardMaterial({
  map: diffuseTexture,        // role: "diffuse"
  normalMap: normalTexture,    // role: "normal"
  roughnessMap: specTexture,   // role: "specular" (invert for roughness)
});
```

### DDS Format Guide

| Format | Alpha | Notes |
|--------|-------|-------|
| DXT1 | No | Most common, 4:1 compression. Used for diffuse/normal without alpha. |
| DXT3 | Yes (explicit) | Rare in ESO. Sharp alpha transitions. |
| DXT5 | Yes (interpolated) | Common for normal maps and textures needing smooth alpha. |
| DX10 | Varies | Modern format, may need `KTX2Loader` instead of `DDSLoader`. |
| uncompressed | Yes | Raw RGBA, largest file size. Direct texture upload. |

### Texture Resolution Reference

Boss model textures range from 128×128 to 4096×2048:
- **Small detail textures**: 128×128 to 256×512 (eye glow, emissives)
- **Standard body textures**: 1024×1024 to 2048×2048 (most common)
- **High-res boss textures**: 4096×2048 (FleshAbomination, large creatures)

## Regenerating the Data

If ESO updates add new trials or change models, regenerate:

```bash
# Prerequisite: eso-model-extractor built and ESO installed
cd scripts/trial-boss-models

# 1. Rebuild creature catalog (slow — scans all 2,476 models)
python creature_catalog_builder.py

# 2. Update trial_boss_models.json (manual UESP cross-reference)
python build_trial_boss_mapping.py

# 3. Scan textures for all boss models
python scan_boss_textures.py

# 4. Rebuild combined mapping
python build_combined_mapping.py
```

**Note:** The Python scripts expect `eso-model-extractor` at `tools/eso-model-extractor/target/release/eso-model-extractor.exe` and the ESO MNF at the path configured in each script. Update the path constants at the top of each script if your ESO installation differs.

## Limitations

1. **8 creature models missing textures** — Textures stored in non-adjacent archive regions. These models can still be rendered with placeholder materials.
2. **Humanoid bosses not extractable** — 24 bosses use ESO's player skeleton system. Their appearance comes from equipment meshes + character model, not standalone creature models.
3. **Dragon multi-part models** — Dragon bosses (Nahviintaas, Lokkestiiz, Yolnahkriin, Xalvakka) use separate GR2 files for body parts. The mapping includes the primary body model; wings/head/tail are in the related_gr2 entries.
4. **Texture role assignment is heuristic** — Roles (diffuse/normal/specular) are assigned by position rather than material reference analysis. Manual verification recommended for critical renders.
5. **Ossein Cage models are best-guess** — The Ossein Cage trial (2025) boss models are mapped to existing creature species that best match their descriptions. Actual in-game models may differ.
