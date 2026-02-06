# Task: Recreate All ESO Skill Line Data Files

## Objective
Regenerate all TypeScript skill line data files in `src/features/loadout-manager/data/` by scraping current skill information from ESO-Hub.com. The existing files contain outdated data with missing IDs and incorrect skill hierarchies.

## Progress Status

**❌ RESET REQUIRED (November 2025)**: Previous regeneration pass contained inconsistent structures and incorrect ability mappings. Treat all prior files as invalid and restart from a clean slate.
- **Action**: Overwrite every skill line module under `src/data/skill-lines/` (and any duplicated locations) using the workflow below.
- **Goal**: Produce a single authoritative module per skill line that downstream features can import directly.
- **Baseline**: Use ESO-Hub pages as the sole structural source of truth and `data/abilities.json` for ID/icon validation.

---

## Critical Requirements

### New Unified Skill Configuration Requirements

1. **One module per skill line**
  - Target directory: `src/data/skill-lines/{category}/{skill-line}.ts` (use kebab-case folders + camelCase filenames).
  - Each module must be the single source of truth consumed by Loadout Manager, parse analysis, detection utilities, and any future features.
  - Remove/replace duplicate legacy files that previously lived under `src/features/loadout-manager/data/**` or other ad-hoc directories.

2. **Standard export contract**
   - Export a `SkillLineData` object (see `src/data/types/skill-line-types.ts`) with:
     - `id`: deterministic slug (e.g., `class.herald-of-the-tome`).
     - `name`, `class`, `category`, `icon`, and `sourceUrl` metadata at the top level.
     - `skills`: array of `SkillData` entries where each skill includes `id`, `name`, `type`, `icon`, `baseSkillId`, `isPassive`, and `isUltimate` as needed.
   - Keep module-local helper maps minimal—prefer raw data objects so other systems (skill tooltips, roster planner, parsers) can import the same module without transformations.

3. **Active skill validation against `abilities.json`**
  - Every **active** (base + morphs + ultimates) must be matched by **exact name** against `data/abilities.json`.
  - If an active skill cannot be found, stop and resolve the mismatch (typo, wrong apostrophe, incorrect morph ordering). Passive skills may legitimately be missing from the JSON and can temporarily use `id: 0`.
  - When a match is found, populate:
    - `id`: use the corresponding numeric entry and cast to the `SkillIdEnum`/category enum (e.g., `ClassSkillId.RUNEBLADES`).
    - `icon`: copy the `icon` property from the JSON entry (strip query params to keep stable filenames).
    - `name`: keep the exact ESO-Hub string.

4. **SkillIdEnum population**
  - `ClassSkillId` already exists under `src/features/loadout-manager/data/classSkillIds.ts`. Create sibling enums for other categories as needed (e.g., `WeaponSkillId`, `GuildSkillId`).
  - Each enum member should follow the `CATEGORY_SKILL_NAME` pattern in SCREAMING_SNAKE_CASE.
  - Update the regeneration script to append new enum members automatically once IDs are pulled from `abilities.json`.

5. **Reset + verification workflow**
  - Delete previously generated outputs, rerun extraction, and re-seed configs.
  - Add a verification step that confirms every active skill listed in a module exists exactly once in `abilities.json` (case-sensitive string match).
  - Record mismatches in a `validation-reports/skill-line-regeneration.json` artifact for later auditing.

### 1. Data Source
- **Primary Source**: https://eso-hub.com/en/skills
- Each skill line has its own page (e.g., https://eso-hub.com/en/skills/arcanist/herald-of-the-tome)
- Use the VS Code MCP Playwright tool to navigate and extract data from these pages

## Example Output (Herald of the Tome)

```typescript
/**
 * Herald of the Tome — Arcanist Skill Line
 * Source: https://eso-hub.com/en/skills/arcanist/herald-of-the-tome
 * Regenerated: 2025-11-14T02:15:00Z
 */

import { SkillLineData } from '../../types/skill-line-types';
import { ClassSkillId } from '../../../features/loadout-manager/data/classSkillIds';

export const skillLine: SkillLineData = {
  id: 'class.herald-of-the-tome',
  name: 'Herald of the Tome',
  class: 'Arcanist',
  category: 'class',
  icon: 'ability_arcanist_006_a',
  sourceUrl: 'https://eso-hub.com/en/skills/arcanist/herald-of-the-tome',
  skills: [
    // Ultimate: The Languid Eye (base + morphs)
    {
      id: ClassSkillId.THE_UNBLINKING_EYE,
      name: 'The Unblinking Eye',
      type: 'ultimate',
      icon: 'ability_arcanist_006_a',
      baseSkillId: ClassSkillId.THE_UNBLINKING_EYE,
      isUltimate: true,
    },
    {
      id: ClassSkillId.THE_LANGUID_EYE,
      name: 'The Languid Eye',
      type: 'ultimate',
      icon: 'ability_arcanist_006_b',
      baseSkillId: ClassSkillId.THE_UNBLINKING_EYE,
      isUltimate: true,
    },
    {
      id: ClassSkillId.THE_TIDE_KINGS_GAZE,
      name: "The Tide King's Gaze",
      type: 'ultimate',
      icon: 'ability_arcanist_006_c',
      baseSkillId: ClassSkillId.THE_UNBLINKING_EYE,
      isUltimate: true,
    },

    // Active: Runeblades
    {
      id: ClassSkillId.RUNEBLADES,
      name: 'Runeblades',
      type: 'active',
      icon: 'ability_arcanist_004_a',
      baseSkillId: ClassSkillId.RUNEBLADES,
    },
    {
      id: ClassSkillId.ESCALATING_RUNEBLADES,
      name: 'Escalating Runeblades',
      type: 'active',
      icon: 'ability_arcanist_004_b',
      baseSkillId: ClassSkillId.RUNEBLADES,
    },
    {
      id: ClassSkillId.WRITHING_RUNEBLADES,
      name: 'Writhing Runeblades',
      type: 'active',
      icon: 'ability_arcanist_004_c',
      baseSkillId: ClassSkillId.RUNEBLADES,
    },

    // ...repeat for remaining actives and passives...
  ],
};
```

## Example Output (Heavy Armor — different shape)

```typescript
import { SkillLineData } from '../../types/skill-line-types';
import { ArmorSkillId } from '../ability-ids'; // create enums per category as needed

export const skillLine: SkillLineData = {
  id: 'armor.heavy',
  name: 'Heavy Armor',
  class: 'Armor',
  category: 'armor',
  icon: 'ability_armor_006_a',
  sourceUrl: 'https://eso-hub.com/en/skills/armor/heavy-armor',
  skills: [
    {
      id: ArmorSkillId.UNSTOPPABLE,
      name: 'Unstoppable',
      type: 'active',
      icon: 'ability_armor_006_a',
      baseSkillId: ArmorSkillId.UNSTOPPABLE,
    },
    {
      id: ArmorSkillId.IMMOVABLE,
      name: 'Immovable',
      type: 'active',
      icon: 'ability_armor_006_b',
      baseSkillId: ArmorSkillId.UNSTOPPABLE,
    },
    {
      id: ArmorSkillId.UNSTOPPABLE_BRUTE,
      name: 'Unstoppable Brute',
      type: 'active',
      icon: 'ability_armor_006_c',
      baseSkillId: ArmorSkillId.UNSTOPPABLE,
    },
    { id: ArmorSkillId.RESOLVE, name: 'Resolve', type: 'passive', icon: 'ability_armor_001_a' },
    { id: ArmorSkillId.CONSTITUTION, name: 'Constitution', type: 'passive', icon: 'ability_armor_001_b' },
    { id: ArmorSkillId.JUGGERNAUT, name: 'Juggernaut', type: 'passive', icon: 'ability_armor_001_c' },
    { id: ArmorSkillId.REVITALIZE, name: 'Revitalize', type: 'passive', icon: 'ability_armor_001_d' },
    { id: ArmorSkillId.RAPID_MENDING, name: 'Rapid Mending', type: 'passive', icon: 'ability_armor_001_e' },
  ],
};
```
  - Earthen Heart
- **Necromancer**: https://eso-hub.com/en/skills/necromancer
  - Grave Lord
  - Bone Tyrant
  - Living Death
- **Nightblade**: https://eso-hub.com/en/skills/nightblade
  - Assassination
  - Shadow
  - Siphoning
- **Sorcerer**: https://eso-hub.com/en/skills/sorcerer
  - Dark Magic
  - Daedric Summoning
  - Storm Calling
- **Templar**: https://eso-hub.com/en/skills/templar
  - Aedric Spear
  - Dawn's Wrath
  - Restoring Light
- **Warden**: https://eso-hub.com/en/skills/warden
  - Animal Companions
  - Green Balance
  - Winter's Embrace

**Weapon Skill Lines** (6 files):
- https://eso-hub.com/en/skills/weapon/two-handed
- https://eso-hub.com/en/skills/weapon/one-hand-and-shield
- https://eso-hub.com/en/skills/weapon/dual-wield
- https://eso-hub.com/en/skills/weapon/bow
- https://eso-hub.com/en/skills/weapon/destruction-staff
- https://eso-hub.com/en/skills/weapon/restoration-staff

**Armor Skill Lines** (3 files):
- https://eso-hub.com/en/skills/armor/light-armor
- https://eso-hub.com/en/skills/armor/medium-armor
- https://eso-hub.com/en/skills/armor/heavy-armor

**Guild Skill Lines** (6 files):
- https://eso-hub.com/en/skills/guild/mages-guild
- https://eso-hub.com/en/skills/guild/fighters-guild
- https://eso-hub.com/en/skills/guild/undaunted
- https://eso-hub.com/en/skills/guild/thieves-guild
- https://eso-hub.com/en/skills/guild/dark-brotherhood
- https://eso-hub.com/en/skills/guild/psijic-order

**Alliance War Skill Lines** (3 files):
- https://eso-hub.com/en/skills/alliance-war/assault
- https://eso-hub.com/en/skills/alliance-war/support
- https://eso-hub.com/en/skills/alliance-war/emperor

**World Skill Lines** (6 files):
- https://eso-hub.com/en/skills/world/soul-magic
- https://eso-hub.com/en/skills/world/werewolf
- https://eso-hub.com/en/skills/world/vampire
- https://eso-hub.com/en/skills/world/scrying
- https://eso-hub.com/en/skills/world/excavation
- https://eso-hub.com/en/skills/world/legerdemain

**Racial Skill Lines** (10 files):
- https://eso-hub.com/en/skills/racial (contains all races, split into separate files)

**Craft Skill Lines** (7 files):
- https://eso-hub.com/en/skills/craft/alchemy
- https://eso-hub.com/en/skills/craft/blacksmithing
- https://eso-hub.com/en/skills/craft/clothing
- https://eso-hub.com/en/skills/craft/enchanting
- https://eso-hub.com/en/skills/craft/jewelry-crafting
- https://eso-hub.com/en/skills/craft/provisioning
- https://eso-hub.com/en/skills/craft/woodworking

## Critical Data Extraction Rules

### From ESO-Hub Web Pages:
1. **Verify Base vs Morph Hierarchy**: ESO-Hub shows the true base skill with an arrow (→) pointing to morphs
   - Example: "The Imperfect Ring → Fulminating Rune, Rune of Displacement"
   - This means The Imperfect Ring is BASE, the other two are MORPHS

2. **Extract Skill Names**: Use EXACT names from the web page (watch for apostrophes: `\'` in TypeScript)

3. **Skill IDs & icons (actives are mandatory)**:
  - For every ultimate and active (base + morphs), immediately locate the exact ability in `data/abilities.json`.
  - Copy both the numeric `id` **and** `icon` into the skill definition.
  - If multiple entries share the same name, choose the one whose tooltip text matches ESO-Hub or whose `skillLine` metadata aligns. Document any ambiguity in the validation report.
  - Passive skills may remain at `id: 0` when no entry exists, but still record their names.

4. **Base Skill ID Logic**:
  - Base skills: `baseSkillId` must equal their own ability ID.
  - Morphs: `baseSkillId` references the parent base skill's ID (use the enum constant once generated).
  - Passives without morphs can keep `baseSkillId` unset or `0` until additional metadata is available.

5. **Count Skills Carefully**:
   - Class lines: 22 skills (1 ult + 2 morphs, 5 actives + 10 morphs, 4 passives)
   - Other lines: VARIES - verify from ESO-Hub page

### From abilities.json (Required ID/Icon Source):
- File location: `d:\code\eso-log-aggregator\data\abilities.json`
- Format: Object keyed by numeric ability IDs with `{ name, icon, ... }` payloads.
- Use PowerShell or Node scripts to search: `Get-Content data\abilities.json | Select-String -Pattern "^\s*\"\d+\":\s*\{[^}]*\"name\":\s*\"Skill Name\""`.
- Active skills **must** be resolved here before a module is considered complete. ESO-Hub defines the structure; abilities.json confirms numeric IDs and icons.

## Workflow

### Step 1: Navigate ESO-Hub Pages
```typescript
// Use VS Code MCP Playwright tool
mcp_microsoft_pla_browser_navigate(url: 'https://eso-hub.com/en/skills/arcanist/herald-of-the-tome')
mcp_microsoft_pla_browser_snapshot() // Get page structure
```

### Step 2: Extract Skill Table Data
From the snapshot, locate the skill table structure:
- Ultimate abilities section (if present)
- Active abilities section
- Passive abilities section

**Pay close attention to arrows (→) showing morphs!**

### Step 3: Create the unified module
For each skill line:
1. Create/overwrite `src/data/skill-lines/{category}/{skillLine}.ts` (kebab-case folder, camelCase filename).
2. Include a header comment with the ESO-Hub source URL and the regeneration timestamp.
3. Import `SkillLineData` from `src/data/types/skill-line-types.ts`.
4. Export `export const skillLine: SkillLineData = { ... }`.
5. Populate `skills` with placeholder entries (names + type + ordering) **before** looking up IDs so you preserve structure context.
6. Ensure each skill entry also contains `morphGroup` notes if the line deviates from base→morph→passive ordering.

### Step 4: Resolve IDs, icons, and enums
After the structure is in place:
1. Search `data/abilities.json` for every active/ultimate. Paste the numeric `id` and `icon` values into the skill entries.
2. Update `baseSkillId` for base abilities to match their own ID; set each morph's `baseSkillId` to the parent base ID.
3. If a new enum (e.g., `WeaponSkillId`) is needed, append entries using the same naming convention as `ClassSkillId`.
4. Store unresolved lookups in `validation-reports/skill-line-regeneration.json` and block completion until the mismatch is addressed.

### Step 5: Validation
After creating each file:
- Verify skill count matches ESO-Hub page.
- Verify base → morph hierarchy matches ESO-Hub arrows.
- Verify all skill names match ESO-Hub exactly (including apostrophes).
- Run: `$content = Get-Content filename.ts -Raw; $matches = [regex]::Matches($content, '\{\s*id:\s*\d+'); $matches.Count` and confirm it equals the number of active skills recorded in ESO-Hub.

## Example Output (Herald of the Tome)

```typescript
/**
 * Herald of the Tome - Arcanist Skill Line
 * Focuses on offensive damage and enemy debuffs
 * Data sourced from: https://eso-hub.com/en/skills/arcanist/herald-of-the-tome
 */

import { SkillData } from '../../types';

const CATEGORY = 'Herald of the Tome';

export const HERALD_OF_THE_TOME_SKILLS: SkillData[] = [
  // Ultimate: The Languid Eye (base from ESO-Hub)
  { id: 0, name: 'The Languid Eye', category: CATEGORY, isUltimate: true, baseSkillId: 0 },
  { id: 0, name: 'The Unblinking Eye', category: CATEGORY, isUltimate: true, baseSkillId: 0 },
  { id: 0, name: 'The Tide King\'s Gaze', category: CATEGORY, isUltimate: true, baseSkillId: 0 },
  
  // Active: Runeblades
  { id: 0, name: 'Runeblades', category: CATEGORY, baseSkillId: 0 },
  { id: 0, name: 'Escalating Runeblades', category: CATEGORY, baseSkillId: 0 },
  { id: 0, name: 'Writhing Runeblades', category: CATEGORY, baseSkillId: 0 },
  
  // Active: Fatecarver
  { id: 0, name: 'Fatecarver', category: CATEGORY, baseSkillId: 0 },
  { id: 0, name: 'Exhausting Fatecarver', category: CATEGORY, baseSkillId: 0 },
  { id: 0, name: 'Pragmatic Fatecarver', category: CATEGORY, baseSkillId: 0 },
  
  // Active: Abyssal Impact
  { id: 0, name: 'Abyssal Impact', category: CATEGORY, baseSkillId: 0 },
  { id: 0, name: 'Cephaliarch\'s Flail', category: CATEGORY, baseSkillId: 0 },
  { id: 0, name: 'Tentacular Dread', category: CATEGORY, baseSkillId: 0 },
  
  // Active: Tome-Bearer's Inspiration
  { id: 0, name: 'Tome-Bearer\'s Inspiration', category: CATEGORY, baseSkillId: 0 },
  { id: 0, name: 'Inspired Scholarship', category: CATEGORY, baseSkillId: 0 },
  { id: 0, name: 'Recuperative Treatise', category: CATEGORY, baseSkillId: 0 },
  
  // Active: The Imperfect Ring (base from ESO-Hub)
  { id: 0, name: 'The Imperfect Ring', category: CATEGORY, baseSkillId: 0 },
  { id: 0, name: 'Fulminating Rune', category: CATEGORY, baseSkillId: 0 },
  { id: 0, name: 'Rune of Displacement', category: CATEGORY, baseSkillId: 0 },
  
  // Passives
  { id: 0, name: 'Fated Fortune', category: CATEGORY, isPassive: true, baseSkillId: 0 },
  { id: 0, name: 'Harnessed Quintessence', category: CATEGORY, isPassive: true, baseSkillId: 0 },
  { id: 0, name: 'Psychic Lesion', category: CATEGORY, isPassive: true, baseSkillId: 0 },
  { id: 0, name: 'Splintered Secrets', category: CATEGORY, isPassive: true, baseSkillId: 0 },
];
```

## Example Output (Heavy Armor - Different Structure)

```typescript
/**
 * Heavy Armor Skill Line
 * Data sourced from: https://eso-hub.com/en/skills/armor/heavy-armor
 */

import type { SkillData } from '../types';

const CATEGORY = 'Heavy Armor';

export const HEAVY_ARMOR_SKILLS: SkillData[] = [
  // Active: Unstoppable (only 1 active in armor lines)
  { id: 0, name: 'Unstoppable', category: CATEGORY, baseSkillId: 0 },
  { id: 0, name: 'Immovable', category: CATEGORY, baseSkillId: 0 },
  { id: 0, name: 'Unstoppable Brute', category: CATEGORY, baseSkillId: 0 },

  // Passives (6-7 passives)
  { id: 0, name: 'Heavy Armor Bonuses', category: CATEGORY, isPassive: true, baseSkillId: 0 },
  { id: 0, name: 'Heavy Armor Penalties', category: CATEGORY, isPassive: true, baseSkillId: 0 },
  { id: 0, name: 'Resolve', category: CATEGORY, isPassive: true, baseSkillId: 0 },
  { id: 0, name: 'Constitution', category: CATEGORY, isPassive: true, baseSkillId: 0 },
  { id: 0, name: 'Juggernaut', category: CATEGORY, isPassive: true, baseSkillId: 0 },
  { id: 0, name: 'Revitalize', category: CATEGORY, isPassive: true, baseSkillId: 0 },
  { id: 0, name: 'Rapid Mending', category: CATEGORY, isPassive: true, baseSkillId: 0 },
];
```

## Common Pitfalls to Avoid

1. **DO NOT** assume current file structure is correct - verify everything against ESO-Hub
2. **DO NOT** assume all skill lines have 22 skills - they vary from 8 to 25
3. **DO NOT** use abilities.json for skill hierarchy - only for ID validation later
4. **DO NOT** create files with wrong morph parents (this was the bug we found)
5. **DO NOT** forget apostrophe escaping in TypeScript strings (`\'`)
6. **DO NOT** skip the file header with source URL
7. **DO NOT** mix up similar skill names (e.g., "Escalating Rune" vs "Escalating Runeblades")

## Post-Creation Tasks (Do NOT do these - inform user they're needed)

After all files are created:
1. Search abilities.json for skill IDs using PowerShell
2. Update `id` fields where found
3. Update `baseSkillId` fields for morphs to point to parent IDs
4. Run validation script to check structure
5. Update playerSkills.ts imports if needed

## Deliverables

- 60+ TypeScript skill line files (exact count depends on structure)
- All files in correct directory structure under `src/features/loadout-manager/data/`
- All files with valid TypeScript syntax
- All files with accurate skill hierarchies matching ESO-Hub
- Summary report showing:
  - Total files created
  - Skill counts per file
  - Which skills have IDs in abilities.json vs which need external lookup
  - Any discrepancies or issues found

## Execution Strategy

**Start with the class skill lines** (Arcanist, Dragonknight, Necromancer, Nightblade, Sorcerer, Templar, Warden) since those are the most complex and have consistent structure (22 skills each).

Then proceed to:
1. Weapon skill lines (variable structure)
2. Armor skill lines (simpler: 1 active + passives)
3. Guild skill lines (variable structure)
4. Alliance War skill lines
5. World skill lines (highly variable)
6. Racial skill lines
7. Craft skill lines (likely mostly passives)

Work systematically through each category, verifying the structure from ESO-Hub before creating the file.
