# Trial Boss Model Scripts

Python scripts used to generate the data files in `data/trial-boss-models/`.

## Prerequisites

- **eso-model-extractor** — Built Rust binary at `tools/eso-model-extractor/target/release/eso-model-extractor.exe`
- **ESO installation** — Game data files (`eso.mnf`, `*.dat`) accessible on disk
- **Python 3.10+** — No external dependencies (stdlib only)

## Path Configuration

Scripts contain hardcoded paths that must be updated for your environment:

| Variable | Example | Description |
|----------|---------|-------------|
| `TOOL` / `EXTRACTOR` | `tools/eso-model-extractor/target/release/eso-model-extractor.exe` | Path to the built extraction tool |
| `MNF` / `MNF_PATH` | `E:\Games\...\eso.mnf` | Path to ESO's MNF manifest file |
| Input/output paths | `data/trial-boss-models/*.json` | Data directory paths |

Update these constants at the top of each script before running.

## Scripts

| Script | Purpose | Inputs | Outputs |
|--------|---------|--------|---------|
| `creature_catalog_builder.py` | Scan all creature GR2 models in the MNF | `eso.mnf` | `creature_catalog.json` |
| `build_catalog.py` | Alternative catalog builder (reads from pre-scanned data) | `boss_scan.txt` | `creature_catalog.json` |
| `build_trial_boss_mapping.py` | Map trial bosses to creature models | `creature_catalog.json`, UESP data | `trial_boss_models.json` |
| `scan_boss_textures.py` | Adjacency scan for DDS textures around each model | `trial_boss_models.json`, `eso.mnf` | `trial_boss_full_assets.json` |
| `scan_new_bosses.py` | Supplementary scan for Asylum Sanctorium + Ossein Cage models | `eso.mnf` | `new_boss_scan_results.json` |
| `build_combined_mapping.py` | Merge model + texture data into final combined mapping | `trial_boss_models.json`, `trial_boss_full_assets.json`, `new_boss_scan_results.json` | `trial_boss_complete.json`, `trial_boss_complete.txt` |

## Regeneration Order

```
creature_catalog_builder.py  →  creature_catalog.json
                                        ↓
build_trial_boss_mapping.py  →  trial_boss_models.json
                                        ↓
scan_boss_textures.py        →  trial_boss_full_assets.json
scan_new_bosses.py           →  new_boss_scan_results.json
                                        ↓
build_combined_mapping.py    →  trial_boss_complete.json + .txt
```

The `build_combined_mapping.py` script uses relative paths from the repo root and can be run directly:

```bash
cd <repo-root>
python scripts/trial-boss-models/build_combined_mapping.py
```

Other scripts require path constant updates first — see Path Configuration above.
