# Grimoire-Filtered Affix Detection Fix

## Issue
Player 1's Trample signature and affix scripts were not showing up correctly. Analysis revealed that the detection was finding **Brittle** affix, which is **NOT compatible with the Trample grimoire**.

## Root Cause
The affix detection algorithm was checking **all affix scripts** in the database, not just those compatible with the specific grimoire being used. This allowed incompatible affixes to be detected if their ability IDs appeared in combat logs.

### Example Problem
- **Brittle** affix (Minor Brittle ID: 145975, Major Brittle ID: 145977)
  - Compatible grimoires: `menders-bond`, `elemental-explosion`
  - **NOT compatible** with `trample`
  - But was being detected because Minor Brittle appeared in 2 out of 8 Trample casts

- **Heroism** affix (Minor Heroism ID: 61708, Major Heroism ID: 61709)
  - Compatible grimoires: `menders-bond`, `torchbearer`, **`trample`**, `banner-bearer`
  - **Compatible** with `trample`
  - Should be detected (appeared in 4 out of 8 casts)

## Solution

### 1. Added `grimoireKey` to ScribingSkillInfo Interface
**File**: `src/features/scribing/utils/Scribing.ts`

```typescript
export interface ScribingSkillInfo {
  grimoire: string;
  grimoireKey: string; // NEW: The key used in the database (e.g., "trample", "wield-soul")
  transformation: string;
  transformationType: string;
  abilityId: number;
  grimoireId?: number;
}
```

Updated `getScribingSkillByAbilityId()` to return `grimoireKey`.

### 2. Modified `detectAffixScripts()` Function Signature
**File**: `src/features/scribing/hooks/useScribingDetection.ts`

```typescript
async function detectAffixScripts(
  abilityId: number,
  playerId: number,
  combatEvents: CombatEventData,
  grimoireKey?: string, // NEW: Optional grimoire key for filtering
): Promise<Array<...>> {
```

### 3. Added Grimoire-Based Filtering Logic
**File**: `src/features/scribing/hooks/useScribingDetection.ts`

```typescript
// Filter affix scripts by grimoire compatibility
// Only check affixes that are compatible with this specific grimoire
const GRIMOIRE_COMPATIBLE_AFFIX_IDS = new Set<number>();
if (grimoireKey) {
  Object.entries(scribingData.affixScripts).forEach(([key, script]: [string, any]) => {
    if (script.compatibleGrimoires && script.compatibleGrimoires.includes(grimoireKey)) {
      if (script.abilityIds) {
        script.abilityIds.forEach((id: number) => {
          GRIMOIRE_COMPATIBLE_AFFIX_IDS.add(id);
        });
      }
    }
  });
} else {
  // Fallback: if no grimoire provided, use all affix scripts (backward compatibility)
  VALID_AFFIX_SCRIPT_IDS.forEach(id => GRIMOIRE_COMPATIBLE_AFFIX_IDS.add(id));
}
```

### 4. Updated All Validation Checks
Replaced all instances of `VALID_AFFIX_SCRIPT_IDS.has()` with `GRIMOIRE_COMPATIBLE_AFFIX_IDS.has()`:

```typescript
// OLD: windowBuffs.forEach(b => {
//   if (b.abilityGameID !== abilityId && VALID_AFFIX_SCRIPT_IDS.has(b.abilityGameID)) {

// NEW:
windowBuffs.forEach(b => {
  if (b.abilityGameID !== abilityId && GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(b.abilityGameID)) {
```

Applied to:
- Buff candidate tracking
- Debuff candidate tracking
- Damage candidate tracking
- Heal candidate tracking

### 5. Updated Call Site
**File**: `src/features/scribing/hooks/useScribingDetection.ts`

```typescript
const affixResults = await detectAffixScripts(
  abilityId,
  playerId,
  combatEvents,
  scribingInfo.grimoireKey // Pass the grimoire key for filtering
);
```

## Testing

### Unit Tests
✅ All existing tests pass (22 tests, 3 test suites)

### Manual Verification
Created `test-trample-affix-filtering.js` to verify logic:

```
✅ Found 26 ability IDs compatible with Trample

Test Case 1: Heroism Affix
  - ID 61708 (Minor Heroism): ✅ INCLUDED
  - ID 61709 (Major Heroism): ✅ INCLUDED

Test Case 2: Brittle Affix
  - ID 145975 (Minor Brittle): ✅ CORRECTLY EXCLUDED
  - ID 145977 (Major Brittle): ✅ CORRECTLY EXCLUDED
```

### Trample-Compatible Affixes
The following 10 affixes are compatible with Trample:
1. Off Balance
2. Savagery and Prophecy
3. Expedition
4. Brutality and Sorcery
5. Protection
6. **Heroism** ← Should be detected for Player 1
7. Vulnerability
8. Cowardice
9. Mangle
10. Defile

## Impact

### Before Fix
- ❌ Brittle (incompatible) could be detected
- ❌ False positives from unrelated grimoires
- ❌ Confusing results for users

### After Fix
- ✅ Only grimoire-compatible affixes checked
- ✅ Accurate detection based on ESO game rules
- ✅ Brittle correctly ignored for Trample
- ✅ Heroism correctly detected for Trample
- ✅ Backward compatible (works without grimoireKey parameter)

## Player 1 Trample Analysis

### Combat Log Data (Fight 11)
- **8 Trample casts** by Player 1
- **Heroism** (Major Heroism ID: 61709): Appeared in **4 out of 8 casts** (50% consistency)
- **Brittle** (Minor Brittle ID: 145975): Appeared in **2 out of 8 casts** (25% consistency)

### Expected Detection Results
With grimoire filtering enabled:
- ✅ **Heroism** should be detected with 50% confidence
- ✅ **Brittle** should be ignored (not compatible)

### Why Brittle Appeared
Brittle appeared in the combat logs because:
1. It may have been applied by another ability or player
2. It's a common debuff in group content
3. Without filtering, the algorithm incorrectly attributed it to Trample

## Files Modified

1. `src/features/scribing/utils/Scribing.ts`
   - Added `grimoireKey` to `ScribingSkillInfo` interface
   - Updated `getScribingSkillByAbilityId()` to return grimoire key

2. `src/features/scribing/hooks/useScribingDetection.ts`
   - Added `grimoireKey` parameter to `detectAffixScripts()`
   - Implemented grimoire-based filtering logic
   - Replaced all `VALID_AFFIX_SCRIPT_IDS` checks with `GRIMOIRE_COMPATIBLE_AFFIX_IDS`
   - Updated call site to pass grimoire key

3. `test-trample-affix-filtering.js` (new)
   - Test script to verify filtering logic

## Technical Notes

- **Performance**: Filtering happens once per detection call, minimal overhead
- **Memory**: Creates a new Set for each detection, but Set is small (typically 10-30 IDs)
- **Backward Compatibility**: If `grimoireKey` is not provided, falls back to checking all affixes
- **Database Structure**: Relies on `compatibleGrimoires` array in `data/scribing-complete.json`

## References

- ESO Scribing System Documentation
- `data/scribing-complete.json` - Complete scribing database
- Combat Log Analysis Scripts: `analyze-trample-details.js`, `check-all-trample-casts.js`

## Date
October 13, 2025
