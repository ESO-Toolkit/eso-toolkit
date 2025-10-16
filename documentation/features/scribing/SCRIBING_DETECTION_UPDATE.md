# Scribing Detection Architecture Update

## Changes Made

### Key Insight Implemented
**Affix scripts do NOT populate the `extraAbilityGameID` field in buff/debuff events.**

This provides a reliable way to distinguish:
- **Core ability effects**: Have `extraAbilityGameID` populated
- **Affix script effects**: Do NOT have `extraAbilityGameID` populated

### Updated Logic in `useScribingDetection.ts`

#### 1. **Affix Detection Window**
- **Changed from:** 10,000ms (10 seconds)
- **Changed to:** 1,000ms (1 second)
- **Reason:** Affixes trigger immediately or shortly after cast; shorter window reduces false positives

#### 2. **extraAbilityGameID Filtering**
Added filtering to EXCLUDE events with `extraAbilityGameID` when detecting affixes:

```typescript
// Before
const windowBuffs = combatEvents.buffs.filter(b =>
  b.sourceID === playerId &&
  b.timestamp > windowStart &&
  b.timestamp <= windowEnd
);

// After
const windowBuffs = combatEvents.buffs.filter(b =>
  b.sourceID === playerId &&
  b.timestamp > windowStart &&
  b.timestamp <= windowEnd &&
  !('extraAbilityGameID' in b && b.extraAbilityGameID) // Filter out core ability effects
);
```

#### 3. **Per-Cast Correlation Tracking**
- **Changed from:** Counting total event occurrences (could exceed 100%)
- **Changed to:** Tracking which casts had each effect (using Sets)
- **Reason:** Prevents >100% correlations from multi-target abilities

```typescript
// Before
const buffCandidates = new Map<number, number>(); // effectId -> count
buffCandidates.set(id, (buffCandidates.get(id) || 0) + 1);

// After
const buffCandidates = new Map<number, Set<number>>(); // effectId -> Set of cast indices
if (!buffCandidates.has(id)) {
  buffCandidates.set(id, new Set());
}
buffCandidates.get(id)!.add(castIndex);
```

#### 4. **Consistency Threshold**
- **Changed from:** 100% (MIN_CONSISTENCY = 1.0)
- **Changed to:** 90% (MIN_CONSISTENCY = 0.9)
- **Reason:** Allows for edge cases while maintaining high confidence

#### 5. **Removed extraAbilityGameID Checking**
- **Before:** Checked both `abilityGameID` and `extraAbilityGameID` for affix matches
- **After:** Only check `abilityGameID` (since we filtered out events with `extraAbilityGameID`)
- **Reason:** Simplified logic; `extraAbilityGameID` indicates core ability effects, not affixes

### Impact on Detection Accuracy

#### Before Changes:
- **Leashing Soul**: Detected Major Breach (100%) - FALSE POSITIVE (core ability effect)
- **Magical Trample**: Detected Heroism (50%) and Brittle (50%) - couldn't distinguish

#### After Changes:
- **Leashing Soul**: Detects Maim (100%) - CORRECT (affix script)
- **Magical Trample**: Detects Heroism (25% with 1s window) - CORRECT but may need adjustment
- **Shattering Knife**: Detects Maim (100%) - CORRECT

### Database Update
Added Major Maim (61725) to the Maim affix script:
```json
"maim": {
  "abilityIds": [
    61723,  // Minor Maim
    61725   // Major Maim (ADDED)
  ]
}
```

## Testing Results

### Player 1 - Leashing Soul
- ✅ **100% Maim correlation** (Major Maim 61725)
- ✅ Major Breach correctly excluded (has `extraAbilityGameID: 217784`)

### Player 1 - Magical Trample
- ⚠️ **25% Heroism correlation** (may need wider window for delayed affixes)

### Player 1 - Shattering Knife
- ✅ **100% Maim correlation** (Minor Maim 61723)

### Player 9 - Leashing Soul
- ❌ **No detection** (Brutality/Sorcery triggers outside 1s window)
- 💡 Suggests some affixes may have conditional or delayed triggers

## Recommendations

1. **Consider adaptive window sizing:**
   - 1s for immediate effects (Maim, Breach, etc.)
   - 2-3s for buffing affixes that may have slight delays

2. **Add confidence levels:**
   - 90-100%: High confidence (immediate effect affix)
   - 50-89%: Moderate confidence (conditional or delayed affix)
   - <50%: Low confidence (may be from another source)

3. **Track timing patterns:**
   - Store average delay between cast and affix application
   - Use this to improve future detection windows

## Documentation
- Detection method now shows "(No extraAbilityGameID)" to clarify filtering
- Updated consistency threshold descriptions (90% instead of 100%)
- Added comments explaining the key insight about `extraAbilityGameID`

## Files Changed
1. `src/features/scribing/hooks/useScribingDetection.ts` - Core detection logic
2. `data/scribing-complete.json` - Added Major Maim ID to Maim affix
3. `AFFIX_EXTRAABILITY_INSIGHT.md` - Comprehensive documentation of findings
