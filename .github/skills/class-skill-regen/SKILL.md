---
name: class-skill-regen
description: Refresh ESO class skill descriptions and icons from the ESO-Hub API. Use this when ESO game patches change skill descriptions or icons, or when local skill-line files have the short placeholder summaries instead of the full text. Covers all 7 class skill trees (Arcanist, Dragonknight, Necromancer, Nightblade, Sorcerer, Templar, Warden).
---

You are an ESO class skill data assistant. You update the TypeScript skill-line files in `src/data/skill-lines/class/` by fetching skill descriptions and icons from the ESO-Hub JSON API via a project script, rather than scraping individual pages.

## How It Works (API-Based, Efficient)

ESO-Hub exposes a JSON API that returns all skills paginated (100 per page, 10 pages = ~1000 skills). The script `scripts/refresh-class-skills.mjs` fetches all pages, filters to the 7 class categories (462 skills), compares against local TypeScript files, and applies description + icon updates automatically.

**This requires only ~10 HTTP requests** instead of hundreds of browser navigations.

```
ESO-Hub Skills API (10 pages x 100 skills, filtered to 7 class categories)
    down node scripts/refresh-class-skills.mjs
src/data/skill-lines/class/*.ts  <->  diff/apply
    down
tmp/class-skill-refresh-report.json
```

## What Gets Updated vs What Doesn't

| Field | Updated by script | Notes |
|---|---|---|
| `description` | Yes | Full text from ESO-Hub, HTML stripped |
| `icon` | Yes | Icon filename (no path, no extension) |
| Skill numeric `id` | No | Use `skill-data-regen` skill for ID changes |
| `type` / `isPassive` / `isUltimate` | No | Requires manual update |
| `baseSkillId` / `alternateIds` | No | Requires manual update |
| Entirely new skills/morphs | No | Script reports them but does not add them |

## Quick Commands

```powershell
# Diff only -- see what has changed without writing anything
node scripts/refresh-class-skills.mjs

# Apply all changed descriptions and icons to TypeScript files
node scripts/refresh-class-skills.mjs --apply

# Diff a single skill line (use the URL slug, e.g. ardent-flame)
node scripts/refresh-class-skills.mjs --line ardent-flame

# Apply changes to a single skill line
node scripts/refresh-class-skills.mjs --apply --line ardent-flame
```

## Skill-Line File Layout

```
src/data/skill-lines/class/
  ardentFlame.ts          -- Dragonknight: Ardent Flame      (ardent-flame)
  draconicPower.ts        -- Dragonknight: Draconic Power    (draconic-power)
  earthenHeart.ts         -- Dragonknight: Earthen Heart     (earthen-heart)
  assassination.ts        -- Nightblade: Assassination       (assassination)
  shadow.ts               -- Nightblade: Shadow              (shadow)
  siphoning.ts            -- Nightblade: Siphoning           (siphoning)
  daedricSummoning.ts     -- Sorcerer: Daedric Summoning     (daedric-summoning)
  darkMagic.ts            -- Sorcerer: Dark Magic            (dark-magic)
  stormCalling.ts         -- Sorcerer: Storm Calling         (storm-calling)
  aedricSpear.ts          -- Templar: Aedric Spear           (aedric-spear)
  dawnsWrath.ts           -- Templar: Dawn's Wrath           (dawns-wrath)
  restoringLight.ts       -- Templar: Restoring Light        (restoring-light)
  animalCompanions.ts     -- Warden: Animal Companions       (animal-companions)
  greenBalance.ts         -- Warden: Green Balance           (green-balance)
  wintersEmbrace.ts       -- Warden: Winter's Embrace        (winters-embrace)
  boneTyrant.ts           -- Necromancer: Bone Tyrant        (bone-tyrant)
  graveLord.ts            -- Necromancer: Grave Lord         (grave-lord)
  livingDeath.ts          -- Necromancer: Living Death       (living-death)
  heraldOfTheTome.ts      -- Arcanist: Herald of the Tome   (herald-of-the-tome)
  curativeRuneforms.ts    -- Arcanist: Curative Runeforms    (curative-runeforms)
  soldierOfApocrypha.ts   -- Arcanist: Soldier of Apocrypha (soldier-of-apocrypha)
```

Note: The `--line` flag uses the URL slug from ESO-Hub (e.g., `dawns-wrath`, `winters-embrace`). These may differ slightly from the local filename -- the script normalises apostrophe-containing slugs automatically.

## Step-by-Step: Full Refresh

### 1. Run the diff to see what needs updating

```powershell
node scripts/refresh-class-skills.mjs
```

Read the summary output:
- **Descriptions changed** -- skills that exist locally but have different description text on ESO-Hub
- **Icons changed** -- skills where the ESO-Hub icon name differs from the local value
- **New skills on API** -- skills on ESO-Hub not yet in any local file (morphs from a new patch; need manual addition)
- **Unknown slugs** -- skill-line slugs from the API that don't match any local file (usually indicates a new class skill line)

The full diff is also saved to `tmp/class-skill-refresh-report.json` for review.

### 2. Apply description and icon updates

```powershell
node scripts/refresh-class-skills.mjs --apply
```

This rewrites each skill's `description` and `icon` field in-place, preserving the surrounding TypeScript structure (IDs, types, morph relationships, etc.).

### 3. Validate

```powershell
npm run typecheck 2>&1 | Select-String "error" | Select-Object -First 20
```

Fix any syntax errors before proceeding.

### 4. Handle new skills or morphs manually

If a patch adds a new skill or morph, the script report flags them in the "New skills on API" section. You must add these manually following the existing pattern in the relevant file:

```typescript
{
  id: ClassSkillId.MyNewSkillId,
  name: 'My New Skill',
  type: 'active',
  icon: 'ability_class_skill_icon',
  description: 'The full description text from ESO-Hub.',
  isPassive: false,
  isUltimate: false,
  baseSkillId: ClassSkillId.BaseSkillId,
},
```

New skill numeric IDs must first be added to `src/features/loadout-manager/data/classSkillIds.ts`. Use the `skill-data-regen` skill for guidance on that process.

## API Reference

- **Endpoint**: `https://eso-hub.com/api/search/skills?lang=en&all=1&page=N`
- **Pages**: 10 total (100 skills per page)
- **Class categories**: `Arcanist`, `Dragonknight`, `Necromancer`, `Nightblade`, `Sorcerer`, `Templar`, `Warden`
- **Join key**: `skillLine.url` last path segment (slug) matches the `sourceUrl` last path segment in local files
- **Icon field**: Full URL like `/storage/icons/ability_dk_003.png` -- strip path and extension -> `ability_dk_003`
- **Description field**: `html` property (contains HTML tags) -- script strips tags and decodes entities