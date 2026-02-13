# UESP Data Skill for GitHub Copilot

Fetches and manages ESO item icon data from UESP (Unofficial Elder Scrolls Pages). Used to keep the local item icon database up to date after ESO content patches.

## Quick Start

```
@workspace Fetch latest item icons from UESP
@workspace Check icon coverage for our gear data
@workspace Look up item 147237
```

## Available Tools

### 1. `fetch_item_icons`

Downloads all item→icon mappings from UESP's `minedItemSummary` table and writes the local `itemIcons.json` file. This is a single bulk API call that fetches ~154K items.

**When to use:** After a new ESO content patch adds gear items.

**Usage:**
```
@workspace Fetch latest item icons from UESP
@workspace Update the item icon database
```

**Output:**
- Updates `src/features/loadout-manager/data/itemIcons.json`
- Reports total items, coverage stats, and new items since last fetch

### 2. `check_icon_coverage`

Verifies what percentage of gear items in the app have icons in the local data. Uses extracted Wizard's Wardrobe gear data from `tmp/extracted-item-ids.csv` if available.

**Usage:**
```
@workspace Check icon coverage
@workspace Do all gear items have icons?
```

### 3. `lookup_item`

Looks up a specific ESO item by ID. Shows the icon URL from both local data and the live UESP API, and whether they're in sync.

**Usage:**
```
@workspace Look up item 147237
@workspace What icon does item 187632 use?
```

## Data Flow

```
UESP API (minedItemSummary)
    ↓ fetch_item_icons
itemIcons.json (local, ~2.5 MB)
    ↓ imported at build time
itemIconResolver.ts
    ↓ instant lookup
GearSelector.tsx → <img> → esoicons.uesp.net CDN
```

## Manual Alternative

The same fetch can be done via the standalone script:

```powershell
node scripts/fetch-item-icons.mjs
```

## File Locations

| File | Purpose |
|------|---------|
| `scripts/fetch-item-icons.mjs` | Standalone fetch script |
| `src/features/loadout-manager/data/itemIcons.json` | Pre-fetched icon data |
| `src/features/loadout-manager/utils/itemIconResolver.ts` | Runtime resolver |
