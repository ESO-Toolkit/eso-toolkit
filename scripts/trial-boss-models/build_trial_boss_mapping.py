#!/usr/bin/env python3
"""
Build a strict mapping of ESO trial bosses to their creature model variants.
Uses the creature catalog JSON + targeted scans for models not in the catalog.
"""
import json
import subprocess
import re
import sys
from pathlib import Path

EXTRACTOR = r"D:\code\eso-log-aggregator\tools\eso-model-extractor\target\release\eso-model-extractor.exe"
MNF_PATH = r"E:\Games\Steam\steamapps\common\Zenimax Online\The Elder Scrolls Online\depot\eso.mnf"
CATALOG_PATH = r"D:\code\eso-log-aggregator\scratch\creature_catalog.json"

def load_catalog():
    with open(CATALOG_PATH, 'r') as f:
        return json.load(f)

ALL_NAMES_PATH = r"D:\code\eso-log-aggregator\scratch\all_names.txt"
FULL_SCAN_PATH = r"D:\code\eso-log-aggregator\scratch\full_scan.txt"

def scan_batch(grep_pattern):
    """Run a single scan with combined grep pattern. Returns dict of species -> models."""
    cmd = [EXTRACTOR, "scan-mnf", "--unnamed-only", "--grep", grep_pattern, MNF_PATH]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    output = result.stdout + result.stderr
    
    models = []
    for line in output.splitlines():
        if "MATCH" not in line:
            continue
        fi_m = re.search(r'fi=(\d+)', line)
        size_m = re.search(r'\((\d+) KB\)', line)
        verts_m = re.search(r'verts=(\d+)', line)
        tris_m = re.search(r'tris=(\d+)', line)
        meshes_m = re.search(r'meshes=(\d+)', line)
        matched_m = re.search(r'matched=\["([^"]+)"\]', line)
        
        if not all([fi_m, size_m, verts_m, tris_m, meshes_m, matched_m]):
            continue
        if int(meshes_m.group(1)) == 0:
            continue
        if int(size_m.group(1)) < 30:
            continue
            
        models.append({
            "name": matched_m.group(1),
            "fi": int(fi_m.group(1)),
            "size_kb": int(size_m.group(1)),
            "verts": int(verts_m.group(1)),
            "tris": int(tris_m.group(1))
        })
    return models

def search_all_names(pattern):
    """Search the all_names.txt file for a pattern. Returns matched name strings."""
    try:
        with open(ALL_NAMES_PATH, 'r', encoding='utf-16') as f:
            content = f.read()
        return [line.strip() for line in content.splitlines() 
                if re.search(pattern, line, re.IGNORECASE) and line.strip()]
    except Exception:
        return []

def find_in_catalog(catalog, species_name):
    """Find a species in the catalog, case-insensitive."""
    for name, data in catalog["species"].items():
        if name.lower() == species_name.lower():
            return data
    return None

def best_variant(variants, prefer_boss=True, name_contains=None):
    """Pick the best variant from a list."""
    if name_contains:
        filtered = [v for v in variants if name_contains.lower() in v["name"].lower()]
        if filtered:
            variants = filtered
    
    if prefer_boss:
        boss_variants = [v for v in variants if v.get("is_boss", False) or "_Boss" in v["name"]]
        if boss_variants:
            return max(boss_variants, key=lambda v: v.get("size_kb", 0) or v.get("verts", 0))
    
    # Return largest variant
    return max(variants, key=lambda v: v.get("size_kb", 0) or v.get("verts", 0))


# ============================================================
# Trial boss definitions
# ============================================================
# Each trial contains bosses. Each boss has:
#   - name: Boss name as shown in-game
#   - model_type: "creature" or "humanoid" 
#   - species: creature species name (for creature types)
#   - model_hint: specific model name to prefer (optional)
#   - notes: additional context
# ============================================================

TRIALS = {
    "Hel Ra Citadel": {
        "location": "Craglorn",
        "year": 2014,
        "bosses": [
            {
                "name": "Ra Kotu",
                "model_type": "humanoid",
                "notes": "Yokedan warrior, uses player-type skeleton"
            },
            {
                "name": "Yokeda Rok'dun",
                "model_type": "humanoid",
                "notes": "Yokedan warrior, uses player-type skeleton"
            },
            {
                "name": "The Warrior",
                "model_type": "humanoid",
                "species": "Celestial",
                "notes": "Celestial being, unique humanoid model with celestial armor"
            }
        ]
    },
    "Aetherian Archive": {
        "location": "Craglorn",
        "year": 2014,
        "bosses": [
            {
                "name": "Lightning Storm Atronach",
                "model_type": "creature",
                "species": "StormAtronach",
                "notes": "Storm Atronach creature model"
            },
            {
                "name": "Foundation Stone Atronach",
                "model_type": "creature",
                "species": "StoneAtronach",
                "model_hint": "StoneAtronach_B_Boss",
                "notes": "Uses the boss-variant Stone Atronach model"
            },
            {
                "name": "Varlariel",
                "model_type": "humanoid",
                "notes": "High Elf NPC, uses player-type skeleton"
            },
            {
                "name": "The Mage",
                "model_type": "humanoid",
                "species": "Celestial",
                "notes": "Celestial being, unique humanoid model"
            }
        ]
    },
    "Sanctum Ophidia": {
        "location": "Craglorn",
        "year": 2014,
        "bosses": [
            {
                "name": "Stonebreaker",
                "model_type": "creature",
                "species": "Troll",
                "model_hint": "Troll_Craglorn_Boss",
                "notes": "Craglorn-specific boss troll variant"
            },
            {
                "name": "Ozara",
                "model_type": "creature",
                "species": "Lamia",
                "model_hint": "Lamia_A_Boss",
                "notes": "Boss variant Lamia Queen"
            },
            {
                "name": "Possessed Mantikora",
                "model_type": "creature",
                "species": "Mantikora",
                "model_hint": "Mantikora_B_Boss",
                "notes": "Boss variant Mantikora"
            },
            {
                "name": "The Serpent",
                "model_type": "humanoid",
                "species": "Celestial",
                "notes": "Celestial being, unique serpentine humanoid model. Transform phase uses GiantSnake-like model."
            }
        ]
    },
    "Maw of Lorkhaj": {
        "location": "Reaper's March",
        "year": 2016,
        "bosses": [
            {
                "name": "Zhaj'hassa the Forgotten",
                "model_type": "creature",
                "species": "DroMathraSenche",
                "notes": "Dro-m'Athra sabertooth/senche model. Large spectral cat creature."
            },
            {
                "name": "S'kinrai",
                "model_type": "humanoid",
                "notes": "Dro-m'Athra Khajiit, humanoid player-type skeleton with Dro-m'Athra effects"
            },
            {
                "name": "Vashai",
                "model_type": "humanoid",
                "notes": "Dro-m'Athra Khajiit, humanoid player-type skeleton with Dro-m'Athra effects"
            },
            {
                "name": "Rakkhat",
                "model_type": "humanoid",
                "notes": "Dro-m'Athra Khajiit lord, humanoid with unique Dro-m'Athra appearance"
            }
        ]
    },
    "Halls of Fabrication": {
        "location": "Vvardenfell (Morrowind)",
        "year": 2017,
        "bosses": [
            {
                "name": "Hunter-Killer Fabricants",
                "model_type": "creature",
                "species": "VerminousFabricant",
                "notes": "Pack of Fabricant creatures. Same base model as VerminousFabricant."
            },
            {
                "name": "Pinnacle Factotum",
                "model_type": "creature",
                "species": "Factotum",
                "notes": "Clockwork City factotum automaton"
            },
            {
                "name": "Archcustodian",
                "model_type": "creature",
                "species": "Factotum",
                "notes": "Large factotum automaton, same base model as Pinnacle Factotum"
            },
            {
                "name": "Assembly General",
                "model_type": "creature",
                "species": "ClockWorkImperfect",
                "model_hint": "ClockWorkImperfect_A_Basic",
                "notes": "The Imperfect - massive Clockwork construct, unique boss model"
            },
            {
                "name": "The Hunter",
                "model_type": "creature",
                "species": "ClockWorkTitan",
                "model_hint": "ClockWorkTitan_A_Basic",
                "notes": "Fabrication-created titan, similar to Clockwork Titan model"
            }
        ]
    },
    "Cloudrest": {
        "location": "Summerset",
        "year": 2018,
        "bosses": [
            {
                "name": "Shade of Galenwe",
                "model_type": "humanoid",
                "notes": "Welkynar knight shade, humanoid with gryphon rider armor"
            },
            {
                "name": "Shade of Siroria",
                "model_type": "humanoid",
                "notes": "Welkynar knight shade, humanoid with gryphon rider armor"
            },
            {
                "name": "Shade of Relequen",
                "model_type": "humanoid",
                "notes": "Welkynar knight shade, humanoid with gryphon rider armor"
            },
            {
                "name": "Z'Maja",
                "model_type": "creature",
                "species": "SeaSload",
                "notes": "Sea Sload — unique jellyfish-like aberration model"
            },
            {
                "name": "Gryphon (Welkynar Mounts)",
                "model_type": "creature",
                "species": "Gryphon",
                "model_hint": "Gryphon_A_Boss",
                "notes": "Welkynar gryphon mounts appear as mini-bosses. Uses Gryphon_A_Boss model."
            }
        ]
    },
    "Sunspire": {
        "location": "Northern Elsweyr",
        "year": 2019,
        "bosses": [
            {
                "name": "Yolnahkriin",
                "model_type": "creature",
                "species": "Dragon",
                "model_hint": "Fire",
                "notes": "Fire Dragon. Multi-part model: body + wings + head. ESO dragons are assembled from multiple GR2 files."
            },
            {
                "name": "Lokkestiiz",
                "model_type": "creature",
                "species": "Dragon",
                "model_hint": "Ice",
                "notes": "Ice Dragon. Multi-part model like all ESO dragons."
            },
            {
                "name": "Nahviintaas",
                "model_type": "creature",
                "species": "Dragon",
                "model_hint": "Lightning",
                "notes": "Lightning/Storm Dragon. Final boss. Multi-part model."
            }
        ]
    },
    "Kyne's Aegis": {
        "location": "Western Skyrim (Greymoor)",
        "year": 2020,
        "bosses": [
            {
                "name": "Yandir the Butcher",
                "model_type": "creature",
                "species": "Giant",
                "model_hint": "Giant_B_Basic",
                "notes": "Sea Giant. Uses the Giant model with Nordic/Sea Giant texture variant."
            },
            {
                "name": "Captain Vrol",
                "model_type": "humanoid",
                "notes": "Vampire sea captain, humanoid NPC model"
            },
            {
                "name": "Lord Falgravn",
                "model_type": "creature",
                "species": "VampireLord",
                "model_hint": "VampireLord_A_Basic",
                "notes": "Transforms into Vampire Lord form. Uses VampireLord creature model."
            }
        ]
    },
    "Rockgrove": {
        "location": "Blackwood",
        "year": 2021,
        "bosses": [
            {
                "name": "Oaxiltso",
                "model_type": "creature",
                "species": "ArgonianBehemoth",
                "model_hint": "ArgonianBehemoth_A_Red_Basic",
                "notes": "Red Argonian Behemoth. Unique red color variant (fi=2643525)."
            },
            {
                "name": "Flame-Herald Bahsei",
                "model_type": "humanoid",
                "notes": "Sul-Xan Argonian priest, humanoid NPC model"
            },
            {
                "name": "Xalvakka",
                "model_type": "humanoid",
                "notes": "Sul-Xan Argonian warlord, humanoid NPC model"
            }
        ]
    },
    "Dreadsail Reef": {
        "location": "High Isle",
        "year": 2022,
        "bosses": [
            {
                "name": "Lylanar and Turlassil",
                "model_type": "humanoid",
                "notes": "Dreadsail sea elf twins, humanoid NPC models"
            },
            {
                "name": "Taleria",
                "model_type": "humanoid",
                "notes": "Dreadsail Reef captain, humanoid NPC model"
            },
            {
                "name": "Reef Guardian",
                "model_type": "creature",
                "species": "CoralAtronach",
                "notes": "Coral Atronach — reef-themed atronach creature (uses AirAtronach_Coral_Boss base)."
            },
            {
                "name": "Tideborn",
                "model_type": "creature",
                "species": "Hadolid",
                "notes": "Large Hadolid sea creature (crab-like). Oversized variant."
            }
        ]
    },
    "Sanity's Edge": {
        "location": "Telvanni Peninsula (Necrom)",
        "year": 2023,
        "bosses": [
            {
                "name": "Exarchon of Emblazoned Sins",
                "model_type": "creature",
                "species": "MindTerror",
                "model_hint": "MindTerror_A_Boss",
                "notes": "Nightmare creature boss variant from Vaermina's realm"
            },
            {
                "name": "Ansuul the Tormented",
                "model_type": "humanoid",
                "notes": "Daedric being, humanoid with unique nightmare-themed appearance. Multiple phases."
            },
            {
                "name": "Mindterror Mini-bosses",
                "model_type": "creature",
                "species": "MindTerror",
                "model_hint": "MindTerror_A_Minion",
                "notes": "Mindterror minions appear throughout the trial"
            }
        ]
    },
    "Lucent Citadel": {
        "location": "West Weald (Gold Road)",
        "year": 2024,
        "bosses": [
            {
                "name": "Riftmaster",
                "model_type": "creature",
                "species": "Harbinger",
                "model_hint": "Harbinger_B_Boss",
                "notes": "Daedric Harbinger creature — large winged daedra boss"
            },
            {
                "name": "Xoryn the Ruthless",
                "model_type": "humanoid",
                "notes": "Daedric humanoid boss"
            },
            {
                "name": "Baron Thierry / Praxin Douare",
                "model_type": "humanoid",
                "notes": "Humanoid NPC bosses"
            },
            {
                "name": "Infernium Encounter",
                "model_type": "creature",
                "species": "Infernium",
                "model_hint": "Infernium_A_Boss",
                "notes": "Infernium creature boss — fire daedric beast from the Deadlands"
            }
        ]
    }
}


def main():
    print("Loading creature catalog...")
    catalog = load_catalog()
    print(f"  {catalog['total_meshes']} meshes across {catalog['total_species']} species")
    
    # Additional scans for species not in catalog — do a SINGLE batch scan
    extra_species_to_scan = [
        "StormAtronach",
        "Factotum",
        "SeaSload",
        "Sload",
        "Hadolid",
        "DroMathra",
    ]
    
    # Filter to species actually needed (not already in catalog)
    missing = [s for s in extra_species_to_scan if not find_in_catalog(catalog, s)]
    
    extra_models = {}
    if missing:
        # First try quick search in all_names.txt
        print(f"\nSearching all_names.txt for {len(missing)} species...")
        for species in missing:
            names = search_all_names(species)
            if names:
                print(f"  {species}: found {len(names)} name references in all_names.txt")
        
        # Batch scan for all missing species at once
        grep_pattern = "|".join(missing)
        print(f"\nBatch scanning for: {grep_pattern}")
        print("  (this scans the full MNF, may take a few minutes...)")
        all_scan_models = scan_batch(grep_pattern)
        print(f"  Found {len(all_scan_models)} creature meshes total")
        
        # Group by species
        for species in missing:
            species_models = [m for m in all_scan_models if species.lower() in m["name"].lower()]
            if species_models:
                extra_models[species] = species_models
                print(f"  {species}: {len(species_models)} models")
    
    # Also map CoralAtronach -> AirAtronach_Coral (already in catalog)
    # This is a virtual species alias
    coral_data = find_in_catalog(catalog, "AirAtronach")
    if coral_data:
        coral_variants = [v for v in coral_data["variants"] if "Coral" in v["name"]]
        if coral_variants:
            extra_models["CoralAtronach"] = coral_variants
    
    # Build the output mapping
    output = {
        "description": "ESO Trial Boss to Creature Model Mapping",
        "generated_by": "build_trial_boss_mapping.py",
        "notes": [
            "Each trial boss is mapped to either a specific creature model or marked as 'humanoid' (player-type skeleton).",
            "Creature bosses reference models from the creature catalog (creature_catalog.json) by species and variant name.",
            "file_index (fi) values can be used with eso-model-extractor to extract specific models.",
            "Humanoid bosses use player-type skeleton models and are not extractable as standalone creature meshes.",
            "Dragon models are multi-part (body, wings, head, tail as separate GR2 files) and require assembly."
        ],
        "trials": {}
    }
    
    for trial_name, trial_data in TRIALS.items():
        trial_entry = {
            "location": trial_data["location"],
            "year": trial_data["year"],
            "bosses": []
        }
        
        for boss in trial_data["bosses"]:
            boss_entry = {
                "name": boss["name"],
                "model_type": boss["model_type"],
                "notes": boss.get("notes", "")
            }
            
            if boss["model_type"] == "creature":
                species = boss.get("species", "")
                boss_entry["species"] = species
                
                # Try to find in catalog first
                catalog_data = find_in_catalog(catalog, species)
                if catalog_data:
                    hint = boss.get("model_hint", "")
                    variants = catalog_data["variants"]
                    
                    if hint:
                        # Try to find specific variant matching hint
                        matched = [v for v in variants if hint.lower() in v["name"].lower()]
                        if matched:
                            chosen = matched[0]
                        else:
                            chosen = best_variant(variants)
                    else:
                        chosen = best_variant(variants)
                    
                    boss_entry["model"] = {
                        "name": chosen["name"],
                        "file_index": chosen["fi"],
                        "size_kb": chosen["size_kb"],
                        "verts": chosen["verts"],
                        "tris": chosen["tris"]
                    }
                    boss_entry["all_variants"] = [
                        {"name": v["name"], "file_index": v["fi"], "size_kb": v["size_kb"]}
                        for v in variants
                    ]
                elif species in extra_models:
                    # Use extra scan results
                    models = extra_models[species]
                    hint = boss.get("model_hint", "")
                    if hint:
                        matched = [m for m in models if hint.lower() in m["name"].lower()]
                        if matched:
                            chosen = max(matched, key=lambda m: m["size_kb"])
                        else:
                            chosen = max(models, key=lambda m: m["size_kb"])
                    else:
                        chosen = max(models, key=lambda m: m["size_kb"])
                    
                    boss_entry["model"] = {
                        "name": chosen["name"],
                        "file_index": chosen["fi"],
                        "size_kb": chosen["size_kb"],
                        "verts": chosen["verts"],
                        "tris": chosen["tris"]
                    }
                    boss_entry["all_variants"] = [
                        {"name": m["name"], "file_index": m["fi"], "size_kb": m["size_kb"]}
                        for m in sorted(models, key=lambda m: -m["size_kb"])
                    ]
                else:
                    boss_entry["model"] = None
                    boss_entry["model_status"] = f"Not found in catalog or scans. Species '{species}' may use a different naming convention or multi-part model."
            
            trial_entry["bosses"].append(boss_entry)
        
        output["trials"][trial_name] = trial_entry
    
    # Write output
    out_path = Path("scratch/trial_boss_models.json")
    with open(out_path, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"\nWrote {out_path}")
    
    # Also write a human-readable summary
    summary_path = Path("scratch/trial_boss_models.txt")
    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("ESO TRIAL BOSS → CREATURE MODEL MAPPING\n")
        f.write("=" * 80 + "\n\n")
        
        for trial_name, trial_entry in output["trials"].items():
            f.write(f"{'─' * 60}\n")
            f.write(f"  {trial_name} ({trial_entry['location']}, {trial_entry['year']})\n")
            f.write(f"{'─' * 60}\n\n")
            
            for boss in trial_entry["bosses"]:
                if boss["model_type"] == "humanoid":
                    f.write(f"  {boss['name']}\n")
                    f.write(f"    Type: HUMANOID (player-type skeleton)\n")
                    f.write(f"    {boss['notes']}\n\n")
                else:
                    model = boss.get("model")
                    f.write(f"  {boss['name']}\n")
                    f.write(f"    Type: CREATURE — Species: {boss.get('species', '?')}\n")
                    if model:
                        f.write(f"    ★ Model: {model['name']}\n")
                        f.write(f"      fi={model['file_index']}  {model['size_kb']}KB  {model['verts']}v/{model['tris']}t\n")
                    else:
                        status = boss.get("model_status", "Unknown")
                        f.write(f"    ✗ Model: NOT RESOLVED — {status}\n")
                    f.write(f"    {boss['notes']}\n")
                    
                    # Show all variants
                    variants = boss.get("all_variants", [])
                    if variants:
                        f.write(f"    Variants:\n")
                        for v in variants:
                            marker = "→" if model and v["name"] == model["name"] else " "
                            f.write(f"      {marker} {v['name']} (fi={v['file_index']}, {v['size_kb']}KB)\n")
                    f.write("\n")
        
        # Summary stats
        total_bosses = sum(len(t["bosses"]) for t in output["trials"].values())
        creature_bosses = sum(1 for t in output["trials"].values() for b in t["bosses"] if b["model_type"] == "creature")
        humanoid_bosses = total_bosses - creature_bosses
        resolved = sum(1 for t in output["trials"].values() for b in t["bosses"] if b.get("model"))
        
        f.write(f"\n{'=' * 80}\n")
        f.write(f"SUMMARY\n")
        f.write(f"{'=' * 80}\n")
        f.write(f"  Trials:          {len(output['trials'])}\n")
        f.write(f"  Total Bosses:    {total_bosses}\n")
        f.write(f"  Creature Bosses: {creature_bosses} ({resolved} with resolved models)\n")
        f.write(f"  Humanoid Bosses: {humanoid_bosses} (player-type skeleton, not extractable)\n")
    
    print(f"Wrote {summary_path}")
    
    # Quick summary to stdout
    print(f"\n{'=' * 60}")
    print(f"SUMMARY")
    print(f"{'=' * 60}")
    total_bosses = sum(len(t["bosses"]) for t in output["trials"].values())
    creature_bosses = sum(1 for t in output["trials"].values() for b in t["bosses"] if b["model_type"] == "creature")
    humanoid_bosses = total_bosses - creature_bosses
    resolved = sum(1 for t in output["trials"].values() for b in t["bosses"] if b.get("model"))
    print(f"  Trials: {len(output['trials'])}")
    print(f"  Total bosses: {total_bosses}")
    print(f"  Creature: {creature_bosses} ({resolved} resolved)")
    print(f"  Humanoid: {humanoid_bosses}")
    
    unresolved = [
        (trial_name, boss["name"], boss.get("species", "?"))
        for trial_name, trial_entry in output["trials"].items()
        for boss in trial_entry["bosses"]
        if boss["model_type"] == "creature" and not boss.get("model")
    ]
    if unresolved:
        print(f"\n  UNRESOLVED creature bosses:")
        for trial, boss, species in unresolved:
            print(f"    {trial} > {boss} (species: {species})")


if __name__ == "__main__":
    main()
