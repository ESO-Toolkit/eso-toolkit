# Gear Slot Validation Issue - Technical Analysis

## Problem Summary

**CRITICAL**: Only **2.7%** of items in our database have slot information (3,054 out of 112,203 items).

This creates a **high risk of generating invalid Wizards Wardrobe files** if users select items without known slot assignments.

## Root Cause

### LibSets Data Limitations

The LibSets addon data (our primary source) has two categories of items:

1. **Monster Sets** (~2,731 items with slots)
   - These have `veteran` metadata tables specifying EQUIP_TYPE constants
   - We can reliably extract slot information (head/shoulders)
   - Example: Spawn of Mephala, Kjalnar's Nightmare, etc.

2. **Regular Gear Sets** (~109,000+ items WITHOUT slots)
   - LibSets only provides generic "Gear" entries
   - No equipment type information in the metadata
   - Cannot determine if an item is a helmet, chest piece, ring, etc.

### Example from LibSets Data

```lua
-- Monster Set (HAS slot info)
[162] = {
  veteran={[EQUIP_TYPE_HEAD]=true, [EQUIP_TYPE_SHOULDERS]=true},
  setType=LIBSETS_SETTYPE_MONSTER,
  ...
}

-- Regular Set (NO slot info)
[500] = {
  setType=LIBSETS_SETTYPE_OVERLAND,
  isCraftable=false,
  ...
  -- No equipment type information!
}
```

### WizardsWardrobe Real Data

We extract slot data from actual equipped gear in `WizardsWardrobe.lua`, but this only covers:
- **352 items** from your personal character saves
- Items you've actually equipped and saved in loadouts
- Not comprehensive enough for general use

## Why This Is Critical

### Invalid Wizards Wardrobe Files

ESO's Wizards Wardrobe addon expects specific slot indices:

```lua
gear = {
  [0] = { id = "12345" },  -- MUST be a head item
  [2] = { id = "67890" },  -- MUST be a chest item
  [11] = { id = "11111" }, -- MUST be a ring
  ...
}
```

If we place a ring in the head slot, the loadout will:
- ❌ Fail to load in-game
- ❌ Potentially corrupt the saved variables file
- ❌ Cause addon errors

## Current State

### Coverage Statistics

```
Total Items:           112,203
Items with Slots:        3,054
Coverage:                 2.7%

By Source:
- Monster Sets:         2,731 items (from LibSets metadata)
- Real Equipment:         323 items (from WizardsWardrobe.lua)
```

### Slot Distribution

```
head:       458 items
shoulders:  458 items
chest:       23 items
neck:        15 items
ring:        89 items
weapon:      45 items
offhand:     12 items
feet:        24 items
legs:        23 items
waist:       23 items
hand:        23 items
```

**Notice**: Heavy bias toward monster set items (head/shoulders)

## Solutions

### 1. ✅ Implemented: Validation System

Created `itemSlotValidator.ts` with:
- `validateGearConfig()` - Validates complete loadouts before export
- `hasKnownSlot()` - Quick check for individual items
- `getItemsBySlot()` - Filtered lists for UI dropdowns
- `canExportLoadout()` - Export safety check

### 2. ✅ Required: UI Changes

**GearSelector Component** needs to:
- ✅ Only show items with known slots in dropdowns
- ✅ Display warning badges for items without slots
- ✅ Prevent export of loadouts with invalid items
- ❌ Show coverage percentage per slot

**LoadoutExporter** needs to:
- ✅ Run validation before export
- ✅ Display detailed error messages
- ✅ Block export if validation fails
- ✅ Show warnings for missing slot info

### 3. 🔄 Future: Enhanced Data Sources

#### Option A: ESO API Integration
- Query official ESO API for item data
- Requires API key and rate limiting
- Would provide complete slot information
- **Status**: Not yet implemented

#### Option B: UESP Database Scraping
- Parse UESP.net item database
- Public data, but requires web scraping
- Legal/ethical considerations
- **Status**: Not yet explored

#### Option C: Community Data Collection
- Aggregate WizardsWardrobe.lua files from multiple users
- Crowdsourced slot information
- Requires privacy considerations
- **Status**: Not yet implemented

#### Option D: LibSets Enhancement Request
- Request LibSets addon to include equipment types for all sets
- Would solve problem at the source
- Requires addon author cooperation
- **Status**: Could file GitHub issue

### 4. ✅ Recommended: Conservative Approach

**Until we have comprehensive slot data:**

1. **Restrict Item Selection**
   ```typescript
   // Only show items with known slots
   const validItems = getItemsBySlot(targetSlot);
   ```

2. **Clear User Communication**
   ```
   ⚠️ Limited Item Database
   Only items with confirmed slot information are shown.
   Currently: 3,054 / 112,203 items (2.7% coverage)
   ```

3. **Safe Defaults**
   ```typescript
   // Don't allow export if validation fails
   if (!canExportLoadout(gear)) {
     showError("Cannot export: Some items missing slot info");
     return;
   }
   ```

## Testing Strategy

### Validation Tests

```typescript
describe('itemSlotValidator', () => {
  it('rejects items without slot info', () => {
    const gear = createGearConfig();
    gear[0] = { id: '12345' }; // Item with no slot
    
    const result = validateGearConfig(gear);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('has no slot information');
  });
  
  it('accepts items with correct slots', () => {
    const gear = createGearConfig();
    gear[0] = { id: '59380' }; // Spawn of Mephala Head
    
    const result = validateGearConfig(gear);
    expect(result.isValid).toBe(true);
  });
  
  it('detects slot mismatches', () => {
    const gear = createGearConfig();
    gear[0] = { id: '58430' }; // Ring item in head slot!
    
    const result = validateGearConfig(gear);
    expect(result.errors).toContain('is for slot "ring"');
  });
});
```

### Integration Tests

1. **Load WizardsWardrobe file** → Validate all gear
2. **Create new loadout** → Only allow valid items
3. **Export loadout** → Verify all slots have valid items
4. **Import to game** → Test actual functionality (manual)

## Action Items

### Immediate (Before Next Release)

- [x] Create `itemSlotValidator.ts` utility
- [ ] Update `GearSelector` to filter by slot
- [ ] Add validation to export flow
- [ ] Update documentation
- [ ] Add user-facing warnings

### Short Term

- [ ] Add comprehensive validation tests
- [ ] Create slot coverage dashboard
- [ ] Document known-good item IDs
- [ ] Add "Import from equipped gear" feature

### Long Term

- [ ] Investigate ESO API integration
- [ ] Explore UESP database integration
- [ ] Consider LibSets enhancement request
- [ ] Build community data collection system

## References

- **LibSets GitHub**: https://github.com/Baertram/LibSets
- **ESO API**: https://www.elderscrollsonline.com/en-us/api
- **UESP Item Database**: https://en.uesp.net/wiki/Online:Sets
- **Wizards Wardrobe**: https://www.esoui.com/downloads/info2798-WizardsWardrobe.html

## Related Files

- `src/features/loadout-manager/data/itemIdMap.ts` - Item database (112K items)
- `src/features/loadout-manager/utils/itemSlotValidator.ts` - Validation logic
- `scripts/parse-libsets-data.ts` - Data generation script
- `scripts/parse-wizards-wardrobe-slots.ts` - Slot extraction script
- `tmp/wizards-wardrobe-slot-mappings.json` - Legacy slot sample from Wizards Wardrobe (no longer imported)

---

**Last Updated**: November 17, 2025  
**Issue Status**: ⚠️ **CRITICAL** - Blocks reliable loadout export feature
