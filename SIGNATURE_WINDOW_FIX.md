# Signature Detection Window Fix - Gladiator's Tenacity

## Problem
The UI was not detecting Gladiator's Tenacity signature script on Player 7's Healing Contingency, even though the signature buff was present in the combat log.

## Root Cause
**Detection window was too narrow!**

The signature detection system used a **1000ms (1 second)** window to search for signature effects after a cast. However, Gladiator's Tenacity on Ulfsild's Contingency triggers the "Tenacious Contingency" buff at **1083-1217ms** after the cast - which is **OUTSIDE the 1-second window**.

## Timing Analysis

### Player 7's Healing Contingency Casts
- Cast #1: Tenacious Contingency appears at **+1217ms** ❌ (outside 1000ms)
- Cast #2: Tenacious Contingency appears at **+1083ms** ❌ (outside 1000ms)
- Cast #3: Tenacious Contingency appears at **+1116ms** ❌ (outside 1000ms)
- Cast #4: Tenacious Contingency appears at **+1100ms** ❌ (outside 1000ms)
- Cast #5: Tenacious Contingency appears at **+1050ms** ❌ (outside 1000ms)
- Cast #6: Tenacious Contingency appears at **+1035ms** ❌ (outside 1000ms)

**All 6 casts** have the signature buff appearing between 1035-1217ms, averaging around **1100ms**.

## Solution
Increased the signature detection window from **1000ms to 1500ms** (1.5 seconds).

### Code Change
**File**: `src/features/scribing/hooks/useScribingDetection.ts` (line 128)

#### Before
```typescript
const SIGNATURE_WINDOW_MS = 1000; // Signature effects appear within 1 second (tight window to avoid false positives)
```

#### After
```typescript
const SIGNATURE_WINDOW_MS = 1500; // Signature effects appear within 1.5 seconds (some like Gladiator's Tenacity trigger at ~1.2s)
```

## Impact
- ✅ **Gladiator's Tenacity** on Ulfsild's Contingency will now be detected
- ✅ Covers signatures that trigger between 1-1.5 seconds after cast
- ✅ Still tight enough to avoid false positives from unrelated abilities

## Why 1500ms?
- Maximum observed timing: 1217ms
- Added buffer: ~300ms
- Result: 1500ms provides safe margin while remaining tight

## Testing
After restarting the development server, Player 7's Healing Contingency should show:
- **Signature Script**: "Gladiator's Tenacity"
- **Confidence**: 100% (6/6 casts)
- **Detection Method**: Post-Cast Pattern Analysis

## Other Signatures That May Benefit
This fix may also help detect other signatures that have slightly delayed triggers:
- Contingency-based signatures (triggers on condition, not instantly)
- Defensive/reactive signatures
- Signatures with cast-time abilities

## Event Type Confirmation
✅ Tenacious Contingency (217654) appears as **buff event** (applybuff)
✅ Event has `extraAbilityGameID: 240150` linking it to Healing Contingency cast
✅ Appears in Player 7's buff events 24 times (6 casts × 4 group members = 24 applications)

## Related Files
- `src/features/scribing/hooks/useScribingDetection.ts` - Detection logic (MODIFIED)
- `data/scribing-complete.json` - Database with ability IDs (already correct)
- `PLAYER7_GLADIATORS_TENACITY_DISCOVERY.md` - Initial discovery documentation

## Next Steps
1. Restart development server (`npm run dev`)
2. Navigate to report with Player 7's Healing Contingency
3. Verify "Gladiator's Tenacity" is now displayed
