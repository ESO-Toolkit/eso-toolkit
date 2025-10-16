# Affix Detection: Highest Consistency Algorithm

## Change Summary

Updated affix script detection from a **minimum consistency threshold** approach to a **highest consistency** approach.

## Problem with Previous Approach

**Old Logic:**
- Required 90% minimum consistency (appears in 90%+ of casts)
- If no affix met the 90% threshold → **NO DETECTION**
- Binary outcome: either 90%+ or nothing

**Issues:**
1. ❌ Missed affixes with 50-89% consistency
2. ❌ Player might have changed affixes mid-fight
3. ❌ Some affixes might not trigger on every cast (conditionals, cooldowns)
4. ❌ Provided no information when threshold not met

## New Approach

**New Logic:**
- Find the **most correlated** affix (highest consistency)
- Show it with its **actual confidence percentage**
- Minimum threshold: 50% (only filter out random noise)
- Always provides best-guess when data exists

**Benefits:**
1. ✅ Shows partial matches with real confidence levels
2. ✅ Detects affixes even if player changed mid-fight
3. ✅ Works with conditional affixes
4. ✅ Provides actionable information to users

## Code Changes

### Before
```typescript
const MIN_CONSISTENCY = 0.9; // 90% or higher

const consistentBuffs = Array.from(buffCandidates.entries())
  .filter(([_, castSet]) => castSet.size >= casts.length * MIN_CONSISTENCY)
  .sort((a, b) => b[1].size - a[1].size);

if (consistentBuffs.length > 0) {
  const [topBuffId, castSet] = consistentBuffs[0];
  const confidence = Math.min(0.9, castSet.size / casts.length);
  // Create detection...
}
// If consistentBuffs.length === 0, no detection returned
```

### After
```typescript
const MIN_MEANINGFUL_CONSISTENCY = 0.5; // Only show if ≥50% of casts

const allBuffCandidates = Array.from(buffCandidates.entries())
  .map(([id, castSet]) => ({ id, castSet, consistency: castSet.size / casts.length }))
  .filter(candidate => candidate.consistency >= MIN_MEANINGFUL_CONSISTENCY)
  .sort((a, b) => b.consistency - a.consistency);

if (allBuffCandidates.length > 0) {
  const topBuff = allBuffCandidates[0];
  const confidence = topBuff.consistency; // Use actual consistency as confidence
  // Create detection with real confidence...
}
```

## Key Differences

| Aspect | Old Approach | New Approach |
|--------|-------------|--------------|
| Threshold | 90% minimum | 50% minimum |
| Detection | Binary (yes/no) | Graduated (0-100%) |
| Confidence | Capped at 90% | Actual consistency (50-100%) |
| Missing affixes | Silent failure | Shows best match |
| Partial data | Rejected | Accepted with lower confidence |

## Example Scenarios

### Scenario 1: Perfect Consistency
```
6 casts, affix appears 6 times (100%)
Old: ✅ Detects, confidence = 90% (capped)
New: ✅ Detects, confidence = 100% (actual)
```

### Scenario 2: Good Consistency
```
6 casts, affix appears 5 times (83%)
Old: ❌ No detection (below 90%)
New: ✅ Detects, confidence = 83%
```

### Scenario 3: Moderate Consistency
```
6 casts, affix appears 4 times (67%)
Old: ❌ No detection (below 90%)
New: ✅ Detects, confidence = 67%
```

### Scenario 4: Low Consistency
```
6 casts, affix appears 3 times (50%)
Old: ❌ No detection (below 90%)
New: ✅ Detects, confidence = 50% (at threshold)
```

### Scenario 5: Noise
```
6 casts, random buff appears 2 times (33%)
Old: ❌ No detection (below 90%)
New: ❌ No detection (below 50%) ← Still filtered out
```

## UI Impact

### Old UI
```
📜 Signature Script
   🖋️ Gladiator's Tenacity

✨ Affix Scripts
   [Nothing shown if below 90%]
```

### New UI
```
📜 Signature Script
   🖋️ Gladiator's Tenacity

✨ Affix Scripts
   ⚔️ Warrior's Opportunity (67%)
   Low confidence - may have been changed mid-fight
```

## Algorithm Details

### Step 1: Collect Candidates
For each cast, check events within 1000ms window:
- Buffs without `extraAbilityGameID`
- Debuffs without `extraAbilityGameID`
- Damage abilities
- Healing abilities

### Step 2: Calculate Consistency
```typescript
consistency = (number of casts with effect) / (total casts)
```

### Step 3: Filter Noise
Remove effects with <50% consistency (likely random/coincidental)

### Step 4: Sort by Consistency
Order remaining candidates from highest to lowest consistency

### Step 5: Return Top Match
Return the highest consistency match with its actual confidence percentage

## Database Integration

All detected affixes are validated against `VALID_AFFIX_SCRIPT_IDS`:
```typescript
if (VALID_AFFIX_SCRIPT_IDS.has(b.abilityGameID)) {
  // Track this candidate
}
```

Affix names are looked up from the database:
```typescript
const scriptName = AFFIX_SCRIPT_ID_TO_NAME.get(topBuff.id);
```

This ensures we only detect **real affix scripts**, not random abilities.

## Benefits for Users

1. **More Information**: See partial matches instead of silence
2. **Better Debugging**: Understand why detection might be uncertain
3. **Mid-Fight Changes**: Detect when player changed affixes during fight
4. **Conditional Affixes**: Detect affixes that don't trigger every cast
5. **Confidence Levels**: Make informed decisions based on actual data

## Technical Notes

- Minimum 50% threshold prevents false positives from random correlations
- Actual consistency used as confidence (no artificial capping)
- Same 1000ms window and `extraAbilityGameID` filtering still applied
- Database validation still ensures only real affixes detected
- Fallback logic for damage/heal-based affixes simplified

## Testing

✅ All existing tests pass (6/6)
✅ TypeScript compilation successful
✅ No breaking changes to API

## Files Modified

- `src/features/scribing/hooks/useScribingDetection.ts`
  - Updated `detectAffixScripts` function
  - Changed from MIN_CONSISTENCY threshold to MIN_MEANINGFUL_CONSISTENCY
  - Calculate actual consistency for each candidate
  - Return highest consistency match with real confidence
  - Removed complex fallback logic for below-threshold matches

## Date
October 13, 2025
