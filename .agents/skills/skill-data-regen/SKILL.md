---
name: skill-data-regen
description: Regenerate ESO skill line TypeScript data files by scraping ESO-Hub.com and cross-referencing with abilities.json. Use this when ESO game patches add new skills, change ability IDs, or when skill line data needs to be updated.
---

You are an ESO skill data regeneration assistant. You update the TypeScript skill line data files by scraping ESO-Hub.com and matching abilities against `data/abilities.json`.

## Data Flow

```
ESO-Hub.com (skill names, hierarchies, types)
    ↓ MCP Playwright browser scraping
abilities.json (numeric IDs, icon names)
    ↓ lookup by name
src/data/skill-lines/{category}/{skillLine}.ts
    ↓ validate
validation-reports/skill-line-regeneration.json
```

## Skill Line Categories and File Locations

```
src/data/skill-lines/
  class/          — Class skill lines (Dragonknight, Nightblade, etc.)
  weapon/         — Weapon skill lines (Two Handed, Bow, etc.)
  armor/          — Armor skill lines (Light, Medium, Heavy)
  world/          — World skill lines (Legerdemain, Soul Magic, etc.)
  alliance/       — Alliance War skill lines
  guild/          — Guild skill lines (Mages, Fighters, Undaunted, etc.)
  craft/          — Crafting skill lines
```

## Step 1 — List Available Skill Lines

```powershell
# See all existing skill line files
Get-ChildItem "src/data/skill-lines" -Filter "*.ts" -Recurse | Select-Object FullName
```

## Step 2 — Lookup Abilities in abilities.json

Before creating a skill file, look up ability names to get their numeric IDs and icon names:

```powershell
# Search for an ability by name (case-insensitive partial match)
$abilities = Get-Content "data/abilities.json" | ConvertFrom-Json
$abilities | Where-Object { $_.name -like "*Runeblades*" } | Select-Object id, name, icon

# Search by ID
$abilities | Where-Object { $_.id -eq 12345 }

# Find all morphs/variants of a skill
$abilities | Where-Object { $_.name -like "*Fatecarver*" } | Select-Object id, name, icon, type
```

## Step 3 — Scrape ESO-Hub for Skill Data

Use the MCP Playwright browser to navigate to the skill line page:

ESO-Hub URL pattern: `https://eso-hub.com/en/skills/{category}/{skill-line-slug}`

Examples:
- `https://eso-hub.com/en/skills/class/herald-of-the-tome`
- `https://eso-hub.com/en/skills/weapon/two-handed`
- `https://eso-hub.com/en/skills/guild/fighters-guild`

Extract from each skill page:
1. Skill line name
2. All active skills (with morphs)
3. All ultimate skills (with morphs)
4. All passive skills

For each active/ultimate skill: name, morph names, type (Active/Ultimate).
For passives: name, rank count.

## Step 4 — File Structure

Each skill line TypeScript file follows this structure:

```typescript
import type { SkillLine } from '@/types/skills';

export const heraldOfTheTome: SkillLine = {
  name: 'Herald of the Tome',
  class: 'Arcanist',
  actives: [
    {
      name: 'Runeblades',
      id: 183876,
      icon: 'ability_arcanist_003',
      morphs: [
        { name: 'Fatecarver', id: 183889, icon: 'ability_arcanist_003a' },
        { name: 'Chakram Shields', id: 183895, icon: 'ability_arcanist_003b' },
      ],
    },
    // ... more skills
  ],
  ultimates: [
    {
      name: 'The Tide King\'s Gaze',
      id: 185490,
      icon: 'ability_arcanist_001',
      morphs: [
        { name: 'Abyssal Impact', id: 185494, icon: 'ability_arcanist_001a' },
        { name: 'The Languid Eye', id: 185497, icon: 'ability_arcanist_001b' },
      ],
    },
  ],
  passives: [
    { name: 'Crux Caller', id: 183900, ranks: 2 },
    // ... more passives
  ],
};
```

## Step 5 — Validate a Skill Module

After creating a file, validate it against abilities.json:

```powershell
# Check that all IDs in the file exist in abilities.json
$file = Get-Content "src/data/skill-lines/class/heraldOfTheTome.ts" -Raw
# Extract IDs using regex
$ids = [regex]::Matches($file, 'id:\s*(\d+)') | ForEach-Object { $_.Groups[1].Value }

$abilities = Get-Content "data/abilities.json" | ConvertFrom-Json
$lookup = @{}
$abilities | ForEach-Object { $lookup[$_.id] = $_.name }

$ids | ForEach-Object {
    $id = [int]$_
    if (-not $lookup.ContainsKey($id)) {
        Write-Host "❌ ID $id NOT FOUND in abilities.json"
    } else {
        Write-Host "✅ ID $id = $($lookup[$id])"
    }
}
```

## Step 6 — Generate Validation Report

```powershell
# Check all skill modules for validation issues
# (Lists any IDs that can't be found in abilities.json)
npx tsx scripts/validate-skill-lines.ts 2>&1 | Tee-Object validation-reports/skill-line-regeneration.txt
```

If the validation script doesn't exist, do the validation manually per Step 5.

## Critical Rules

1. **Never guess ability IDs** — always look them up in `abilities.json` by name
2. **Morphs are separate entries** in `abilities.json` with their own IDs
3. **Icon names** come from the `icon` field in `abilities.json` (without path or extension)
4. **Passive skills** have ranks (typically 2) but no morphs
5. **Keep the file naming** in camelCase matching the skill line name (e.g., `heraldOfTheTome.ts`)

## Full Reference

See [documentation/ai-agents/SKILL_DATA_REGENERATION_PROMPT.md](../../../documentation/ai-agents/SKILL_DATA_REGENERATION_PROMPT.md) for the complete workflow with examples and all ESO-Hub URLs.
