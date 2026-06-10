---
name: mythic-armor-corrections
description: Add or update armor weight corrections for mythic gear items in ARMOR_TYPE_CORRECTIONS in armorUtils.ts. Use this when a new mythic armor set is added to ESO, when a mythic armor weight correction is missing or wrong, or when verifying that all non-light mythic armor items have entries. ESOLogs reports all mythic armor as type=1 (Light) regardless of actual weight — this skill fixes that.
---

You are updating the mythic armor weight correction table in `src/utils/armorUtils.ts`.

## Background

ESOLogs reports **all mythic armor** as `type=1` (Light) regardless of actual weight. This is because mythic items have no armor-weight variants in ESO's game data. The constant `ARMOR_TYPE_CORRECTIONS` in `src/utils/armorUtils.ts` maps each non-light mythic item ID → its correct `ArmorType`, so the app can count armor weights accurately.

Only **non-light** mythic armor pieces need entries. Light mythics (e.g. Cryptcanon Vestments, Mora's Whispers' gloves, Mad God's Dancing Shoes) are already reported correctly by ESOLogs. Jewelry and weapons never have armor weight and are unaffected.

## Data Sources

| Source | Path | Purpose |
|--------|------|---------|
| LibSets item IDs | `tmp/libsets-data/LibSets_Data_SetItemIds.lua` | Maps setId → item ID(s) |
| LibSets set names | `tmp/libsets-data/LibSets_Data_SetNames.lua` | Maps setId → localized name |
| ESO globals | `data/eso-globals-item-set-collections.json` | Maps item ID → `{ slot, weight, category, setId }` |
| Mythic TS definitions | `src/data/Gear Sets/mythics.ts` | All app-known mythic sets |
| Corrections table | `src/utils/armorUtils.ts` | `ARMOR_TYPE_CORRECTIONS` — edit this |
| Tests | `src/utils/armorUtils.test.ts` | Must add a test case for each new correction |

If `tmp/libsets-data/` does not exist or is stale, manually download a fresh LibSets SavedVariables file.

## Step-by-Step: Add a New Mythic Armor Correction

### 1. Find the set ID for the new mythic

Search the LibSets set names file:

```powershell
$content = Get-Content "tmp\libsets-data\LibSets_Data_SetNames.lua" -Raw
$idx = $content.IndexOf("Name of Set")   # replace with actual name fragment
$start = [Math]::Max(0, $idx - 30)
$content.Substring($start, [Math]::Min(200, $content.Length - $start))
```

The output will show `[setId]={...,"en"="<name>"}`. Note the numeric setId.

### 2. Find the item ID(s) for that set

```powershell
$lua = Get-Content "tmp\libsets-data\LibSets_Data_SetItemIds.lua" -Raw
$idx = $lua.IndexOf("[<setId>]")         # replace <setId> with the number from step 1
$lua.Substring($idx, [Math]::Min(120, $lua.Length - $idx))
```

Mythic armor pieces have exactly **one** item ID. The format is `[setId]={[1]=<itemId>}`.

If the entry uses a range string like `"123456,5"`, the first number is the starting item ID and the second is a count — use the first number only for the unique mythic piece.

### 3. Look up the item's slot and weight in the globals data

```powershell
$items = (Get-Content "data/eso-globals-item-set-collections.json" -Raw | ConvertFrom-Json).items
$item = $items.<itemId>      # replace <itemId> with the number from step 2
"slot=$($item.slot) weight=$($item.weight) category=$($item.category)"
```

- If `weight` is `"light"` → **no correction needed**, stop here.
- If `weight` is `"medium"` → add `ArmorType.MEDIUM` correction.
- If `weight` is `"heavy"` → add `ArmorType.HEAVY` correction.
- If the item is not in the globals file → it's a brand-new item not yet in the ESO globals dump. In this case, determine the slot and weight from the item name/description (cross-referencing an in-game or community item source as needed), and add the correction manually.

### 4. Add the correction to armorUtils.ts

Edit `src/utils/armorUtils.ts`. Add a line to `ARMOR_TYPE_CORRECTIONS` in ascending `itemId` order:

```typescript
<itemId>: ArmorType.<MEDIUM|HEAVY>, // <Set Name> (set <setId>) — <weight> <slot>
```

Keep entries sorted by item ID for readability.

### 5. Add a test case to armorUtils.test.ts

In `src/utils/armorUtils.test.ts`, find the `mythicCases` array inside the `resolveArmorType` describe block, and add an entry:

```typescript
{ itemId: <itemId>, name: "<Set Name>", expected: ArmorType.<MEDIUM|HEAVY> },
```

Keep it in the same order as the corrections table.

### 6. Validate

```powershell
cd "D:\code\eso-log-aggregator"   # adjust path if in a worktree
npm run typecheck 2>&1 | Select-Object -Last 5
npm test -- --watchAll=false --testPathPatterns="armorUtils" 2>&1 | Select-Object -Last 15
```

Both must pass with zero errors before committing.

---

## Batch Verification: Audit All Mythic Armor

Run this to check every mythic set in the globals data at once, so you can identify any that are missing a correction:

```powershell
# Known mythic set IDs (update this list when new mythics are added)
$mythicSetIds = @(476,501,503,505,506,513,515,518,519,520,521,575,576,593,594,596,597,
  625,626,627,629,654,655,656,657,658,674,675,676,691,692,693,694,760,761,762,763,
  805,811,812,813,845,846)

$items = (Get-Content "data/eso-globals-item-set-collections.json" -Raw | ConvertFrom-Json).items

# Items in the globals that belong to a mythic set and are non-light armor
$items.PSObject.Properties | ForEach-Object {
  $id   = $_.Name
  $item = $_.Value
  if ($item.category -eq 'armor' -and $item.weight -ne 'light' -and $mythicSetIds -contains $item.setId) {
    [PSCustomObject]@{ itemId=$id; setId=$item.setId; slot=$item.slot; weight=$item.weight }
  }
} | Sort-Object { [int]$_.itemId } | Format-Table -AutoSize
```

Compare the output against `ARMOR_TYPE_CORRECTIONS` in `src/utils/armorUtils.ts` to find any gaps.

---

## Current Non-Light Mythic Armor Entries (as of patch 44, March 2026)

| Item ID | Set ID | Set Name | Slot | Weight |
|---------|--------|----------|------|--------|
| 165879 | 519 | Snow Treaders | feet | medium |
| 165899 | 521 | Bloodlord's Embrace | chest | heavy |
| 175524 | 594 | Harpooner's Wading Kilt | waist | medium |
| 175525 | 593 | Gaze of Sithis | head | heavy |
| 187655 | 655 | Dov-Rha Sabatons | feet | heavy |
| 187656 | 656 | Lefthander's Aegis Belt | waist | medium |
| 190886 | 674 | Faun's Lark Cladding | chest | medium |
| 190888 | 676 | Syrabane's Ward | waist | heavy |
| 194510 | 692 | Esoteric Environment Greaves | legs | heavy |
| 205385 | 760 | Rourken Steamguards | hands | heavy |
| 216236 | 812 | Rakkhat's Voidmantle | shoulders | medium |
| 223189 | 845 | Huntsman's Warmask | head | medium |

**These light mythics are intentionally absent** (ESOLogs reports them correctly as light):
- Cryptcanon Vestments (194509 / set 691) — light chest
- Lefthander's Aegis Belt is medium, not light — already covered above
- Mad God's Dancing Shoes (216235 / set 811) — light feet
- Monomyth Reforged (216237 / set 813) — ring (jewelry, not armor)
- All rings, necklaces, weapons — not armor, unaffected
