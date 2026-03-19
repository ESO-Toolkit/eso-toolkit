---
name: gear-data-regen
description: Update gear set bonuses and tooltip data from ESO-Hub.com. Use this when ESO game patches change set bonuses, when a new set needs to be added, or when existing set data in src/data/Gear Sets/ is outdated. Accepts a set name, slug, or full eso-hub URL.
---

You are an ESO gear set data assistant. You update the TypeScript gear set files in `src/data/Gear Sets/` by fetching bulk bonus data from the ESO-Hub JSON API via a project script, rather than scraping individual pages.

## How It Works (API-Based, Efficient)

ESO-Hub exposes a JSON API that returns all sets paginated (100 per page, ~8 pages total = ~800 sets). The script `scripts/refresh-gear-sets.mjs` fetches all pages, parses bonus text, compares against local TypeScript files, and applies updates automatically.

**This requires only ~8 HTTP requests** instead of 800+ browser navigations.

```
ESO-Hub JSON API (8 pages × 100 sets)
    ↓ node scripts/refresh-gear-sets.mjs
src/data/Gear Sets/*.ts  ←→  diff/apply
    ↓
tmp/gear-set-refresh-report.json
```

## Quick Commands

```powershell
# Diff only — see what has changed without writing anything
node scripts/refresh-gear-sets.mjs

# Apply all changed bonuses to TypeScript files
node scripts/refresh-gear-sets.mjs --apply

# Check a single set (diff only)
node scripts/refresh-gear-sets.mjs --set "Turning Tide"

# Check and apply a single set
node scripts/refresh-gear-sets.mjs --apply --set "Turning Tide"
```

## Gear Set File Layout

```
src/data/Gear Sets/
  light.ts          — Default file for Dungeon/Overland/Trial/Craftable/Class sets (light armor or unspecified)
  medium.ts         — Medium armor sets
  heavy.ts          — Heavy armor sets
  arena.ts          — Arena sets (Maelstrom, Vateshran weapons)
  arena-specials.ts — Special arena-unique sets
  mythics.ts        — Mythic items (1-piece)
  monster.ts        — Monster sets (2-piece, head/shoulder)
  shared.ts         — 2-piece shared PvP jewelry/weapon sets
```

## Step-by-Step: Full Refresh

### 1. Run the diff to see what needs updating

```powershell
node scripts/refresh-gear-sets.mjs
```

Read the summary output:
- **Changed** — sets that exist locally but have different bonus text on ESO-Hub
- **New on ESO-Hub** — sets on ESO-Hub not yet in any local file (need manual placement)
- **Local only** — local sets not found in the ESO-Hub armor-sets API (may be arena weapon sets, mythics on a different endpoint, or renamed sets — not necessarily a problem)

The full diff is also saved to `tmp/gear-set-refresh-report.json` for review.

### 2. Apply the bonus updates

```powershell
node scripts/refresh-gear-sets.mjs --apply
```

This rewrites the `bonuses: [...]` array for each changed entry in-place, preserving `name`, `icon`, `setType`, and the TypeScript block structure.

### 3. Validate

```powershell
npm run typecheck 2>&1 | Select-String "error" | Select-Object -First 20
```

Fix any syntax errors before proceeding.

### 4. Handle new sets manually

New sets from ESO-Hub (those in the "New on ESO-Hub" section of the report) need to be manually added to the correct file. Use the `category` shown in the report to decide which file.

For each new set, determine the correct target file and add a new entry:

```typescript
export const turningTide: GearSetData = {
  name: 'Turning Tide',
  icon: 'Turning Tide',
  setType: 'Dungeon',
  bonuses: [
    '(2 items) Adds 1206 Maximum Health',
    '(3 items) Adds 1096 Maximum Stamina',
    '(4 items) Adds 1206 Maximum Health',
    "(5 items) When you Block, you gain Flowing Water...",
  ],
};
```

**Quoting rule**: Use single quotes `'...'` unless the bonus text itself contains a single quote/apostrophe, in which case use double quotes `"..."`.

**Export variable naming**: Convert set name to camelCase, removing apostrophes.
- "Turning Tide" → `turningTide`
- "Alessia's Bulwark" → `alessiasBulwark`
- "Mother's Sorrow" → `mothersSorrow`

**File routing** by `category` label:

| Category | File |
|---|---|
| Dungeon | `light.ts` (default) |
| Overland | `light.ts` |
| Craftable | `light.ts` |
| Trial | `light.ts` |
| Class Sets | `light.ts` |
| PvP | `shared.ts` |
| Arena | `arena.ts` |
| Mythic | `mythics.ts` |
| Monster Set | `monster.ts` |

If the user specifies armor weight (heavy/medium) for a non-PvP/Arena/Monster set, use `heavy.ts` or `medium.ts` instead.

Entries within each file are sorted alphabetically by export variable name. When inserting, find the correct position.

### 5. Re-run typecheck after adding new sets

```powershell
npm run typecheck
```

## Single-Set Update (Without a Full Refresh)

To update just one set by name (useful after a targeted patch):

```powershell
node scripts/refresh-gear-sets.mjs --apply --set "Mother's Sorrow"
```

## Listing All Currently Tracked Sets

```powershell
# Count per file
Get-ChildItem "src/data/Gear Sets/*.ts" | ForEach-Object {
  $count = (Select-String -Path $_.FullName -Pattern "name: '").Count
  [PSCustomObject]@{ File = $_.Name; SetCount = $count }
}

# Find which file a specific set is in
Select-String -Path "src/data/Gear Sets/*.ts" -Pattern "name: 'Turning Tide'"
```

## API Details (for debugging)

The ESO-Hub armor-sets API:
```
GET https://eso-hub.com/api/search/armor-sets?sort=name&all=1&lang=en&page=1
```

Response shape:
```json
{
  "data": [
    {
      "name": "Turning Tide",
      "url": "https://eso-hub.com/en/sets/turning-tide",
      "icon": "/storage/icons/...",
      "html": "<strong ...>(2 items)</strong> Adds ...<br>...",
      "category": "Dungeon",
      "class": null
    }
  ],
  "current_page": 1,
  "total_pages": 8,
  "has_next_page": true
}
```

The `html` field contains bonus text with HTML tags (`<strong>`, `<span>`, `<br>` separators). The script strips all tags to produce clean plain text.

**Note**: This API covers armor sets only. Arena weapon sets (e.g., Maelstrom's Bow, Vateshran weapons in `arena.ts`) are not included and must be maintained manually or sourced from a different endpoint.

## Troubleshooting

| Problem | Solution |
|---|---|
| Script returns empty `[]` | Add `Referer` and `X-Requested-With` headers (already included in the script) |
| Set in "not found on ESO-Hub" | Likely an arena weapon set — fine, skip it |
| Bonus text has garbled apostrophes | The script decodes `&#39;` to `'` automatically |
| Typecheck error after apply | Check if apostrophe quoting rule was violated; re-run apply |
| New set has unknown category | Visit `https://eso-hub.com/en/sets/{slug}` and check the breadcrumb |

---

## Legacy: Scraping a Single Set Page Manually

If the script can't find a set (e.g., a brand-new set not yet indexed by the API), you can fall back to scraping its individual page with the MCP Playwright browser:

1. Navigate to `https://eso-hub.com/en/sets/{slug}`
2. Take a snapshot and read the bonus lines from the dark tooltip card
3. Copy bonus text exactly as shown
4. Manually add/update the entry using the TypeScript format above

The slug is the set name lowercased with spaces replaced by hyphens, apostrophes removed:
- "Mother's Sorrow" → `mothers-sorrow`
- "Turning Tide" → `turning-tide`

---

## Original Data Flow (for reference only)

```
ESO-Hub.com → scripts/refresh-gear-sets.mjs → src/data/Gear Sets/*.ts
```
