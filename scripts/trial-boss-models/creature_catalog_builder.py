"""Efficient creature variant finder.
For each known boss species, search for ALL variants of that species.
Filter out mounts, pets, zone art, animations."""
import re
import subprocess
import sys
import json
from collections import defaultdict

ESO_MNF = r"E:\Games\Steam\steamapps\common\Zenimax Online\The Elder Scrolls Online\depot\eso.mnf"
EXTRACTOR = r"D:\code\eso-log-aggregator\tools\eso-model-extractor\target\release\eso-model-extractor.exe"

# Parse boss_scan.txt to get list of boss creature names and species
boss_entries = []
with open("scratch/boss_scan.txt", "r", encoding="utf-16") as f:
    for line in f:
        if "MATCH" not in line:
            continue
        m = re.search(r'fi=(\d+)\].*?\((\d+)\s+KB\)\s+\|.*?models=\["([^"]*?)"\].*?meshes=(\d+)\s+verts=(\d+)\s+tris=(\d+)\s+\|.*?matched=\["([^"]+)"', line)
        if m:
            boss_entries.append({
                'fi': int(m.group(1)), 'size_kb': int(m.group(2)),
                'model_name': m.group(3), 'meshes': int(m.group(4)),
                'verts': int(m.group(5)), 'tris': int(m.group(6)),
                'name': m.group(7)
            })

# Filter to actual creature meshes
creature_bosses = [e for e in boss_entries if e['meshes'] > 0 and e['model_name'] == 'Bip01' and e['size_kb'] > 50]

# Get unique base species
boss_species = set()
for e in creature_bosses:
    parts = e['name'].split('_')
    boss_species.add(parts[0])

# Add known species that don't have _Boss suffix but ARE boss creatures
extra_species = {
    "ArgonianBehemoth", "BoneColossus", "Dragon", "DwarvenColossus",
    "DwarvenCenturion", "FleshColossus", "FrostAtronach", "IronAtronach",
    "Lurcher", "WerewolfBehemoth", "Gargoyle", "Wamasu", "Werewolf",
    "BoneDragon", "IceWraith", "Ogrim", "Xivilai", "SpiderDaedra",
    "WingedTwilight", "Hunger", "Lurker", "Netch", "Spriggan",
    "Dreugh", "Indrik", "Hag", "Nereid", "Salamander", "Shalk",
    "Welwa", "Yaghra", "Thunderbug", "Chaurus", "Ghost", "Zombie",
    "Lich", "Wraith", "Ogre", "Giant", "Senche", "Durzog", "Guar",
    "Kagouti", "Kwama", "NixOx", "Nixhound", "Imp", "Scamp",
    "Bear", "Snake", "Scorpion", "Fabricant", "Spider",  
    "Voriplasm", "Hagraven", "Reef", "Basilisk", "Watcher",
}

all_species = sorted(boss_species | extra_species)

print(f"Known boss species: {len(boss_species)}")
print(f"Extra species to check: {len(extra_species)}")
print(f"Total species to search: {len(all_species)}")
print()

# Search all species in batches, but ONLY keep creature meshes (not mounts/pets/zone art)
def search_species_batch(species_list):
    pattern = "|".join(species_list)
    cmd = [EXTRACTOR, "scan-mnf", "--unnamed-only", "--grep", pattern, ESO_MNF]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    output = result.stdout + result.stderr
    
    entries = []
    for line in output.split('\n'):
        if 'MATCH' not in line:
            continue
        m = re.search(r'fi=(\d+)\].*?\((\d+)\s+KB\)\s+\|.*?models=\["([^"]*?)"\].*?meshes=(\d+)\s+verts=(\d+)\s+tris=(\d+)\s+\|.*?matched=\["([^"]+)"', line)
        if m:
            entries.append({
                'fi': int(m.group(1)), 'size_kb': int(m.group(2)),
                'model_name': m.group(3), 'meshes': int(m.group(4)),
                'verts': int(m.group(5)), 'tris': int(m.group(6)),
                'name': m.group(7)
            })
    return entries
def classify(entry):
    name = entry['name']
    # Must be actual mesh (not animation)
    if entry['meshes'] == 0:
        return 'animation'
    # Skip zone art (starts with | or contains zone codes)
    if name.startswith('|') or '_INC_' in name or '_EXC_' in name or '_DUC_' in name:
        return 'zone_art'
    # Skip mounts
    if 'Mount' in name or 'mount' in name:
        return 'mount'
    # Skip pets
    if 'Pet' in name and 'pet' not in name.lower()[:4]:
        return 'pet'
    # Skip inventory/polymorph/first-person views
    if '_Inventory' in name or '_FP' in name or 'Polymorph' in name:
        return 'other'
    # Skip saddle/speed/stamina (mount parts)
    if '_Saddle' in name or '_Speed' in name or '_Stamina' in name:
        return 'mount_part'
    # Must have Bip01 (creature rig) and reasonable size
    if entry['model_name'] != 'Bip01':
        return 'non_creature'
    if entry['size_kb'] < 30:
        return 'too_small'
    return 'creature'

# Run searches in batches of 10
all_creature_entries = []
batch_size = 10
for i in range(0, len(all_species), batch_size):
    batch = all_species[i:i+batch_size]
    print(f"Batch {i//batch_size + 1}/{(len(all_species) + batch_size - 1)//batch_size}: {', '.join(batch[:3])}...", file=sys.stderr)
    entries = search_species_batch(batch)
    for e in entries:
        cls = classify(e)
        if cls == 'creature':
            all_creature_entries.append(e)

# Deduplicate by fi
seen = set()
unique = []
for e in all_creature_entries:
    if e['fi'] not in seen:
        seen.add(e['fi'])
        unique.append(e)

# Group by species
by_species = defaultdict(list)
for e in unique:
    name = e['name']
    base = name.split('_')[0]
    by_species[base].append(e)

for sp in by_species:
    by_species[sp].sort(key=lambda e: -e['size_kb'])

# Output as structured JSON + readable text
output = {
    'total_creature_meshes': len(unique),
    'total_species': len(by_species),
    'species': {}
}

print(f"\n{'='*80}")
print(f"ESO CREATURE MODEL CATALOG — ACTUAL CREATURE MESHES ONLY")
print(f"{'='*80}")
print(f"Total unique creature meshes: {len(unique)}")
print(f"Total species: {len(by_species)}")

for species, models in sorted(by_species.items()):
    has_boss = any('Boss' in e['name'] for e in models)
    basic = [e for e in models if 'Basic' in e['name'] or e['name'].endswith('_00') or '_A_' in e['name']]
    bosses = [e for e in models if 'Boss' in e['name']]
    others = [e for e in models if e not in basic and e not in bosses]
    
    marker = " ★" if has_boss else ""
    print(f"\n{'─'*60}")
    print(f"  {species}{marker} ({len(models)} variants)")
    print(f"{'─'*60}")
    
    species_data = {'variants': [], 'has_boss': has_boss}
    
    for e in models:
        is_boss = 'Boss' in e['name']
        tag = " ◄ BOSS" if is_boss else ""
        print(f"    {e['name']:50s} {e['size_kb']:5d} KB  {e['verts']:6d} verts  fi={e['fi']}{tag}")
        species_data['variants'].append({
            'name': e['name'], 'fi': e['fi'],
            'size_kb': e['size_kb'], 'verts': e['verts'], 'tris': e['tris'],
            'is_boss': is_boss
        })
    
    # Show size comparison if both basic and boss exist
    if basic and bosses:
        b = basic[0]
        for boss in bosses:
            ratio = boss['size_kb'] / b['size_kb'] if b['size_kb'] > 0 else 0
            vratio = boss['verts'] / b['verts'] if b['verts'] > 0 else 0
            print(f"    → Boss/Basic ratio: {ratio:.2f}x size, {vratio:.2f}x vertices")
    
    output['species'][species] = species_data

# Save JSON version
with open('scratch/creature_catalog.json', 'w') as f:
    json.dump(output, f, indent=2)
print(f"\n\nJSON catalog saved to scratch/creature_catalog.json")

# Print summary of species with Boss variants
print(f"\n{'='*80}")
print("SPECIES WITH DEDICATED BOSS MODELS")
print(f"{'='*80}")
for species, data in sorted(output['species'].items()):
    if data['has_boss']:
        bosses = [v for v in data['variants'] if v['is_boss']]
        basics = [v for v in data['variants'] if 'Basic' in v['name'] or '_A_' in v['name']]
        print(f"\n  {species}:")
        for b in bosses:
            print(f"    Boss:  {b['name']:45s} {b['size_kb']:5d} KB  {b['verts']:6d} v  fi={b['fi']}")
        for b in basics[:2]:
            print(f"    Basic: {b['name']:45s} {b['size_kb']:5d} KB  {b['verts']:6d} v  fi={b['fi']}")

# Species WITHOUT Boss models but with multiple variants
print(f"\n{'='*80}")
print("SPECIES WITHOUT DEDICATED BOSS MODELS (may use scaled Basic)")
print(f"{'='*80}")
no_boss_species = {sp: m for sp, m in by_species.items() if not any('Boss' in e['name'] for e in m)}
for species, models in sorted(no_boss_species.items()):
    if len(models) >= 2:  # Only show species with multiple variants
        print(f"\n  {species} ({len(models)} variants):")
        for e in models[:5]:
            print(f"    {e['name']:50s} {e['size_kb']:5d} KB  {e['verts']:6d} v  fi={e['fi']}")
        if len(models) > 5:
            print(f"    ... and {len(models) - 5} more")
