---
name: uesp-data
description: Fetch and manage ESO item icon data from UESP (Unofficial Elder Scrolls Pages). Updates the local item icon database after ESO content patches. Use this to refresh item icons, check icon coverage, or look up a specific item's icon.
---

You are a UESP data assistant for ESO Log Aggregator. You manage the local item icon database sourced from UESP's ESO item data.

## Data Files

| File | Purpose |
|------|---------|
| `src/features/loadout-manager/data/itemIcons.json` | Pre-fetched icon data (~2.5 MB) |
| `src/features/loadout-manager/utils/itemIconResolver.ts` | Runtime icon resolver |
| `scripts/fetch-item-icons.mjs` | Standalone fetch script |
| `tmp/extracted-item-ids.csv` | Wizard's Wardrobe gear data (if imported) |

## Fetching Latest Item Icons

### Option A — Use the standalone script (recommended)

```powershell
node scripts/fetch-item-icons.mjs
```

This script:
1. Calls `https://esolog.uesp.net/exportJson.php?table=minedItemSummary&limit=200000&fields=itemId,icon`
2. Processes all ~154K items to extract icon names
3. Writes the indexed result to `src/features/loadout-manager/data/itemIcons.json`
4. Reports stats: total items, items with icons, unique icon count, file size

### Option B — Fetch directly in PowerShell

```powershell
$response = Invoke-RestMethod "https://esolog.uesp.net/exportJson.php?table=minedItemSummary&limit=200000&fields=itemId,icon"
$items = $response.minedItemSummary

# Build item → icon map
$iconMap = @{}
foreach ($item in $items) {
    if ($item.icon -and $item.icon -notlike "*icon_missing*") {
        $match = [regex]::Match($item.icon, '([^/]+)\.dds$')
        if ($match.Success) {
            $iconMap[$item.itemId] = $match.Groups[1].Value
        }
    }
}

Write-Host "Items with icons: $($iconMap.Count)"
```

## Checking Icon Coverage

After fetching, verify that gear items in the app have icons:

```powershell
# Load the icon data
$iconData = Get-Content "src/features/loadout-manager/data/itemIcons.json" | ConvertFrom-Json
Write-Host "Total icon mappings: $($iconData.items.PSObject.Properties.Count)"
Write-Host "Unique icons: $($iconData.icons.Count)"

# If Wizard's Wardrobe data is available, check coverage
if (Test-Path "tmp/extracted-item-ids.csv") {
    $gearItems = Import-Csv "tmp/extracted-item-ids.csv"
    $missing = $gearItems | Where-Object { -not $iconData.items.PSObject.Properties[$_.itemId] }
    Write-Host "Gear items without icons: $($missing.Count) / $($gearItems.Count)"
    $missing | Select-Object -First 20
}
```

## Looking Up a Specific Item

### From local data
```powershell
$iconData = Get-Content "src/features/loadout-manager/data/itemIcons.json" | ConvertFrom-Json
$itemId = 147237
$iconIndex = $iconData.items.$itemId
$iconName = $iconData.icons[$iconIndex]
$iconUrl = "https://esoicons.uesp.net/esoui/art/icons/$iconName.png"
Write-Host "Item $itemId: $iconName"
Write-Host "URL: $iconUrl"
```

### From live UESP API
```powershell
$response = Invoke-RestMethod "https://esolog.uesp.net/exportJson.php?table=minedItemSummary&id=147237&fields=itemId,icon"
$response.minedItemSummary
```

## Data Format

The `itemIcons.json` file uses an indexed format to minimize file size:

```json
{
  "icons": ["ability_arcanist_001", "icon_item_chest_001", ...],
  "items": {
    "147237": 42,
    "187632": 15
  }
}
```

- `icons` — array of unique icon names (indexed by position)  
- `items` — map of `itemId → index into icons array`

To resolve: `icons[items[itemId]]` gives the icon name, then `https://esoicons.uesp.net/esoui/art/icons/{name}.png` gives the URL.

## When to Update

Run a fresh fetch after:
- A major ESO content patch (new chapter, DLC, or base game update)
- New items appear in-game that show missing icons in the app
- UESP updates their data tables with new item entries

## Icon CDN

Icons are served from: `https://esoicons.uesp.net/esoui/art/icons/{iconName}.png`

This is a UESP-hosted CDN and is referenced directly by the app at runtime — no icons are bundled locally.
