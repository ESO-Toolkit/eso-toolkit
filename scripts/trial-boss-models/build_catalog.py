"""Build creature model catalog from ESO depot.
Writes output directly to scratch/creature_catalog_output.txt and scratch/creature_catalog.json."""
import re, subprocess, json, sys
from collections import defaultdict

ESO_MNF = r"E:\Games\Steam\steamapps\common\Zenimax Online\The Elder Scrolls Online\depot\eso.mnf"
EXTRACTOR = r"D:\code\eso-log-aggregator\tools\eso-model-extractor\target\release\eso-model-extractor.exe"
OUT_TXT = "scratch/creature_catalog_output.txt"
OUT_JSON = "scratch/creature_catalog.json"

# Parse boss_scan.txt
boss_entries = []
with open("scratch/boss_scan.txt", "r", encoding="utf-16") as f:
    for line in f:
        if "MATCH" not in line: continue
        m = re.search(r'fi=(\d+)\].*?\((\d+)\s+KB\)\s+\|.*?models=\["([^"]*?)"\].*?meshes=(\d+)\s+verts=(\d+)\s+tris=(\d+)\s+\|.*?matched=\["([^"]+)"', line)
        if m:
            boss_entries.append({'fi': int(m.group(1)), 'size_kb': int(m.group(2)),
                'model_name': m.group(3), 'meshes': int(m.group(4)),
                'verts': int(m.group(5)), 'tris': int(m.group(6)), 'name': m.group(7)})

creature_bosses = [e for e in boss_entries if e['meshes'] > 0 and e['model_name'] == 'Bip01' and e['size_kb'] > 50]
boss_species = set()
for e in creature_bosses:
    boss_species.add(e['name'].split('_')[0])

extra_species = {
    "ArgonianBehemoth", "BoneColossus", "Dragon", "DwarvenColossus", "DwarvenCenturion",
    "FleshColossus", "FrostAtronach", "IronAtronach", "Lurcher", "WerewolfBehemoth",
    "Gargoyle", "Wamasu", "Werewolf", "BoneDragon", "IceWraith", "Ogrim", "Xivilai",
    "SpiderDaedra", "WingedTwilight", "Hunger", "Lurker", "Netch", "Spriggan",
    "Dreugh", "Indrik", "Hag", "Nereid", "Salamander", "Shalk", "Welwa", "Yaghra",
    "Thunderbug", "Chaurus", "Ghost", "Zombie", "Lich", "Wraith", "Ogre", "Giant",
    "Senche", "Durzog", "Guar", "Kagouti", "Kwama", "NixOx", "Nixhound", "Imp",
    "Scamp", "Bear", "Snake", "Scorpion", "Fabricant", "Spider", "Voriplasm",
    "Hagraven", "Reef", "Basilisk", "Watcher",
}
all_species = sorted(boss_species | extra_species)

def search_batch(species_list):
    pattern = "|".join(species_list)
    cmd = [EXTRACTOR, "scan-mnf", "--unnamed-only", "--grep", pattern, ESO_MNF]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    output = result.stdout + result.stderr
    entries = []
    for line in output.split('\n'):
        if 'MATCH' not in line: continue
        m = re.search(r'fi=(\d+)\].*?\((\d+)\s+KB\)\s+\|.*?models=\["([^"]*?)"\].*?meshes=(\d+)\s+verts=(\d+)\s+tris=(\d+)\s+\|.*?matched=\["([^"]+)"', line)
        if m:
            entries.append({'fi': int(m.group(1)), 'size_kb': int(m.group(2)),
                'model_name': m.group(3), 'meshes': int(m.group(4)),
                'verts': int(m.group(5)), 'tris': int(m.group(6)), 'name': m.group(7)})
    return entries

def is_creature_mesh(entry):
    name = entry['name']
    if entry['meshes'] == 0: return False
    if entry['model_name'] != 'Bip01': return False
    if entry['size_kb'] < 30: return False
    if name.startswith('|') or '_INC_' in name or '_EXC_' in name or '_DUC_' in name: return False
    if 'Mount' in name: return False
    if '_Inventory' in name or '_FP' in name or 'Polymorph' in name: return False
    if '_Saddle' in name or '_Speed' in name or '_Stamina' in name: return False
    return True

# Run searches
print(f"Searching {len(all_species)} species...", flush=True)
all_creatures = []
batch_size = 10
for i in range(0, len(all_species), batch_size):
    batch = all_species[i:i+batch_size]
    print(f"  Batch {i//batch_size + 1}/{(len(all_species)+batch_size-1)//batch_size}: {batch[0]}..{batch[-1]}", flush=True)
    for e in search_batch(batch):
        if is_creature_mesh(e):
            all_creatures.append(e)

# Deduplicate
seen = set()
unique = []
for e in all_creatures:
    if e['fi'] not in seen:
        seen.add(e['fi'])
        unique.append(e)

# Group by species
by_species = defaultdict(list)
for e in unique:
    by_species[e['name'].split('_')[0]].append(e)
for sp in by_species:
    by_species[sp].sort(key=lambda e: -e['size_kb'])

# Write output file
with open(OUT_TXT, 'w', encoding='utf-8') as out:
    out.write(f"{'='*80}\n")
    out.write(f"ESO CREATURE MODEL CATALOG\n")
    out.write(f"{'='*80}\n")
    out.write(f"Total unique creature meshes: {len(unique)}\n")
    out.write(f"Total species: {len(by_species)}\n\n")

    # All species with variants
    for species, models in sorted(by_species.items()):
        has_boss = any('Boss' in e['name'] for e in models)
        marker = " [BOSS]" if has_boss else ""
        out.write(f"\n--- {species}{marker} ({len(models)} variants) ---\n")
        for e in models:
            tag = " <<<BOSS>>>" if 'Boss' in e['name'] else ""
            out.write(f"  {e['name']:50s} {e['size_kb']:5d} KB  {e['verts']:6d} v  fi={e['fi']}{tag}\n")
        # Boss/Basic comparison
        basic = [e for e in models if 'Basic' in e['name']]
        bosses = [e for e in models if 'Boss' in e['name']]
        if basic and bosses:
            b = basic[0]
            for boss in bosses:
                r = boss['size_kb'] / b['size_kb'] if b['size_kb'] > 0 else 0
                vr = boss['verts'] / b['verts'] if b['verts'] > 0 else 0
                out.write(f"  -> Boss vs Basic: {r:.2f}x size, {vr:.2f}x verts\n")

    # Summary: species with boss models
    out.write(f"\n\n{'='*80}\n")
    out.write(f"SPECIES WITH DEDICATED BOSS MODELS\n")
    out.write(f"{'='*80}\n")
    for species, models in sorted(by_species.items()):
        bosses = [e for e in models if 'Boss' in e['name']]
        basics = [e for e in models if 'Basic' in e['name']]
        if bosses:
            out.write(f"\n  {species}:\n")
            for b in bosses:
                out.write(f"    BOSS:  {b['name']:45s} {b['size_kb']:5d} KB  {b['verts']:6d} v  fi={b['fi']}\n")
            for b in basics[:2]:
                out.write(f"    Basic: {b['name']:45s} {b['size_kb']:5d} KB  {b['verts']:6d} v  fi={b['fi']}\n")

    # Species without boss models
    out.write(f"\n\n{'='*80}\n")
    out.write(f"SPECIES WITHOUT DEDICATED BOSS MODELS\n")
    out.write(f"{'='*80}\n")
    for species, models in sorted(by_species.items()):
        if not any('Boss' in e['name'] for e in models) and len(models) >= 2:
            out.write(f"\n  {species} ({len(models)} variants):\n")
            for e in models[:5]:
                out.write(f"    {e['name']:50s} {e['size_kb']:5d} KB  {e['verts']:6d} v  fi={e['fi']}\n")
            if len(models) > 5:
                out.write(f"    ... and {len(models)-5} more\n")

# Write JSON
json_data = {'total_meshes': len(unique), 'total_species': len(by_species), 'species': {}}
for species, models in sorted(by_species.items()):
    json_data['species'][species] = {
        'has_boss': any('Boss' in e['name'] for e in models),
        'variant_count': len(models),
        'variants': [{'name': e['name'], 'fi': e['fi'], 'size_kb': e['size_kb'],
                      'verts': e['verts'], 'tris': e['tris'],
                      'is_boss': 'Boss' in e['name']} for e in models]
    }
with open(OUT_JSON, 'w') as f:
    json.dump(json_data, f, indent=2)

print(f"\nDone! {len(unique)} creature meshes across {len(by_species)} species")
print(f"Output: {OUT_TXT} and {OUT_JSON}")
