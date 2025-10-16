# Signature Script Detection Improvements

## Summary
Updated signature script detection to be more accurate and comprehensive by reducing the detection window and expanding event type coverage.

## Changes Made

### 1. Reduced Detection Window (3s → 1s)
**File**: `src/features/scribing/hooks/useScribingDetection.ts`

**Before**: `SIGNATURE_WINDOW_MS = 3000` (3 seconds)
**After**: `SIGNATURE_WINDOW_MS = 1000` (1 second)

**Reason**: 
- Analysis showed signature scripts appear consistently within 450-600ms after cast
- 3-second window was catching false positives from nearby ability casts
- Example: Magical Trample was incorrectly detecting Assassin's Misery at +2467ms, which actually belonged to a Shattering Knife cast
- 1-second window eliminates cross-contamination while still catching all valid signatures

### 2. Expanded Event Type Coverage
**Before**: Only checked `buffs` and `debuffs`
**After**: Now checks all event types:
- ✅ `buffs`
- ✅ `debuffs`
- ✅ `damage`
- ✅ `heals`
- ✅ `resources`
- ✅ `casts`

**Implementation**: 
- Created helper function `checkAndCountSignature()` to reduce code duplication
- Consistently checks both `abilityGameID` and `extraAbilityGameID` for all event types
- Filters signature scripts against `VALID_SIGNATURE_SCRIPT_IDS` from database

**Reason**:
- Future-proofing: Some signature scripts may appear in non-buff/debuff events
- Comprehensive coverage ensures we don't miss any signature script manifestations
- Current test data shows signatures primarily in debuffs (as expected)

## Test Results

### Before Changes (3-second window)
**Shattering Knife (217340)**:
- ✅ Assassin's Misery: 3/3 casts (100%) - CORRECT
- Signature appears at +451-517ms

**Magical Trample (220542)**:
- ❌ Assassin's Misery: 1/8 casts (12.5%) - FALSE POSITIVE
- Signature appeared at +2467ms (actually from nearby Shattering Knife cast)

**Leashing Soul (217784)**:
- ✅ No signature: 0/6 casts (0%) - CORRECT
- Player didn't equip a signature script

### After Changes (1-second window + all event types)
**Shattering Knife (217340)**:
- ✅ Assassin's Misery: 3/3 casts (100%) - STILL CORRECT
- Signature appears at +451-517ms

**Magical Trample (220542)**:
- ✅ No signature: 0/8 casts (0%) - NOW CORRECT
- False positive eliminated

**Leashing Soul (217784)**:
- ✅ No signature: 0/6 casts (0%) - STILL CORRECT
- No change in detection

## Analysis Scripts Created
During investigation, created several analysis scripts (for reference):
- `check-trample-casts.js` - Verified cast counts
- `check-trample-signatures.js` - Checked buff/debuff events
- `check-trample-compatible-signatures.js` - Verified database completeness
- `check-all-event-types.js` - Comprehensive event type analysis
- `check-all-trample-casts.js` - Per-cast signature detection
- `check-ability-217784.js` - Leashing Soul analysis
- `show-all-correlations.js` - **Final correlation analysis tool** (configurable window)

## Benefits

### Accuracy Improvements
1. **Eliminates false positives** from nearby ability casts
2. **More precise timing** (signatures appear 450-600ms, not 0-3000ms)
3. **Cross-contamination prevention** between abilities cast in quick succession

### Future-Proofing
1. **Comprehensive event coverage** catches signature scripts regardless of manifestation type
2. **Consistent filtering** against database ensures only valid signatures detected
3. **Extensible pattern** makes it easy to add new event types if needed

### Performance
1. **Reduced search space** (1/3 the time window)
2. **Efficient helper function** avoids code duplication
3. **No impact on existing functionality** (test still passes)

## Current Detection Thresholds
- **Signature Scripts**: 50% consistency (must appear in ≥50% of casts)
- **Affix Scripts**: 100% consistency (must appear in ALL casts)
- **Detection Window**: 1 second (signature), 10 seconds (affix)

## Database Integration
- **167 signature script ability IDs** loaded from `data/scribing-complete.json`
- **Name lookup maps** provide human-readable names (e.g., "Assassin's Misery" instead of "Debuff 217353")
- **Valid ID filtering** prevents false positives from non-signature effects

## Validation
✅ All tests passing
✅ No TypeScript errors
✅ Detection accuracy improved (false positive eliminated)
✅ Existing correct detections maintained
✅ Compatible with current UI implementation

## Next Steps (Optional)
1. Consider lowering signature threshold from 50% to 10-20% to catch proc-based signatures
2. Add UI messaging to distinguish "no signature detected" from "signature below threshold"
3. Show detection evidence in tooltip (e.g., "Analyzed 8 casts, checked 6 event types")
