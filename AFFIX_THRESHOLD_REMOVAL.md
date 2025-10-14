# Affix Detection: Removed Minimum Threshold

## Change Summary

Removed the 50% minimum consistency threshold from affix detection to always show the highest-correlation affix, regardless of how low the correlation is.

## Previous Behavior

**Old Logic:**
```typescript
const MIN_MEANINGFUL_CONSISTENCY = 0.5; // 50% threshold

const allBuffCandidates = Array.from(buffCandidates.entries())
  .map(([id, castSet]) => ({ id, castSet, consistency: castSet.size / casts.length }))
  .filter(candidate => candidate.consistency >= MIN_MEANINGFUL_CONSISTENCY) // ❌ Filters out <50%
  .sort((a, b) => b.consistency - a.consistency);
```

**Issue:**
- Heroism appears in 2 out of 8 casts (25%)
- Below 50% threshold → Filtered out
- No affix shown to user

## New Behavior

**New Logic:**
```typescript
// Show the best match regardless of consistency threshold

const allBuffCandidates = Array.from(buffCandidates.entries())
  .map(([id, castSet]) => ({ id, castSet, consistency: castSet.size / casts.length }))
  .sort((a, b) => b.consistency - a.consistency); // ✅ No filter, just sort
```

**Improvement:**
- Heroism appears in 2 out of 8 casts (25%)
- No threshold requirement → Included
- User sees: "✨ Heroism (25%)"

## Rationale

### Why Remove the Threshold?

1. **User Wants to See Best Match**
   - Even low correlations provide useful information
   - Users can interpret confidence percentages themselves
   - Better to show 25% than show nothing

2. **Grimoire Filtering Prevents False Positives**
   - Only checks grimoire-compatible affixes
   - For Trample: only 10 affixes checked (not all 40+)
   - Already filtered to relevant options

3. **Confidence Percentage Provides Context**
   - UI shows actual correlation: "Heroism (25%)"
   - Low percentage signals uncertainty
   - Users understand it may not be the equipped affix

4. **Handles Edge Cases**
   - Player changed affix mid-fight
   - Conditional affix (only procs sometimes)
   - Limited sample size (few casts)

## Example Scenarios

### Scenario 1: High Correlation (Previously Worked)
```
8 casts, affix appears 6 times (75%)
Old: ✅ Shows "Affix Name (75%)"
New: ✅ Shows "Affix Name (75%)"
Result: No change
```

### Scenario 2: Moderate Correlation (Now Works!)
```
8 casts, affix appears 4 times (50%)
Old: ✅ Shows "Affix Name (50%)" (exactly at threshold)
New: ✅ Shows "Affix Name (50%)"
Result: No change
```

### Scenario 3: Low Correlation (FIXED!)
```
8 casts, affix appears 2 times (25%)
Old: ❌ No detection (below 50%)
New: ✅ Shows "Affix Name (25%)"
Result: Now provides information
```

### Scenario 4: Very Low Correlation
```
8 casts, affix appears 1 time (13%)
Old: ❌ No detection (below 50%)
New: ✅ Shows "Affix Name (13%)"
Result: Low confidence visible to user
```

## Trade-offs

### Benefits ✅
1. Always provides best-guess information
2. Users can make their own judgments
3. Handles edge cases (conditional procs, mid-fight changes)
4. No silent failures
5. Transparent confidence levels

### Potential Concerns 🤔
1. **Low correlations might confuse users**
   - Mitigated by: Showing clear percentage
   - UI makes uncertainty obvious

2. **May show random coincidences**
   - Mitigated by: Grimoire filtering (only compatible affixes)
   - Mitigated by: 1000ms window (tight correlation)

3. **"Noise" in detection results**
   - Mitigated by: Clear confidence percentage
   - Users see "13%" and understand it's uncertain

## Player 1 Trample Example

### Before This Change:
```
📖 Grimoire: Trample
🧪 Focus Script
   🔄 Magical (Magical Transformation)
📜 Signature Script
   ❓ No signature script detected
🎭 Affix Scripts
   ❓ No affix script detected  ← Nothing shown
```

### After This Change:
```
📖 Grimoire: Trample
🧪 Focus Script
   🔄 Magical (Magical Transformation)
📜 Signature Script
   ❓ No signature script detected
🎭 Affix Scripts
   ✨ Heroism (25%)  ← Now visible with low confidence
```

**User Experience:**
- Sees that Heroism buff correlates 25% with Trample
- Low percentage indicates uncertainty
- Can investigate further if needed
- Better than showing nothing

## Implementation Details

### Files Modified

**`src/features/scribing/hooks/useScribingDetection.ts`**

Removed `MIN_MEANINGFUL_CONSISTENCY` filter from:
1. Buff candidate processing (line ~416)
2. Debuff candidate processing (line ~421)
3. Damage candidate processing (line ~471)
4. Heal candidate processing (line ~476)

### Algorithm Flow

1. **Collect Candidates**
   - Track effects within 1000ms of each cast
   - Filter by grimoire compatibility
   - Exclude effects with `extraAbilityGameID`

2. **Calculate Consistency**
   - `consistency = occurrences / total_casts`
   - Example: 2 out of 8 = 0.25 (25%)

3. **Sort by Consistency** (NEW: No filtering!)
   - Sort highest to lowest
   - Take top candidate
   - Use actual consistency as confidence

4. **Return Detection**
   - Name from database lookup
   - Confidence = actual consistency (not capped)
   - Evidence includes all candidates found

## Testing

✅ All 6 Ulfsild's Contingency tests pass
✅ No TypeScript errors
✅ Grimoire filtering still active
✅ Timestamp filtering still active (>=)

## Expected Behavior

For Player 1's Trample in Fight 11:
- ✅ Heroism will be detected (25% confidence)
- ✅ Brittle will be excluded (not compatible with Trample)
- ✅ UI will show: "✨ Heroism (25%)"
- ✅ User can see it's low confidence

## Date
October 13, 2025
