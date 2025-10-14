# Scribing Detection Algorithms - Integration Status

## Current Situation

### ✅ What We Have

1. **Database-Driven Detection (Working)**
   - `src/features/scribing/utils/Scribing.ts` - Database utility
   - `getScribingSkillByAbilityId()` - Looks up grimoire + focus script
   - **Status**: ✅ Fully functional
   - **Coverage**: 656 abilities from `scribing-complete.json`

2. **Affix Detection Algorithm (Exists but Not Integrated)**
   - `src/algorithms/affix-detector.ts` - Full affix detection logic
   - Analyzes buff/debuff patterns, combat effects, durations
   - **Status**: 🟡 Code exists but not called from hook
   - **Requires**: Combat log events (buffs, debuffs, damage)

3. **Enhanced Scribing Analysis (Exists but Not Integrated)**
   - `src/utils/enhancedScribingAnalysis.ts` - Comprehensive analysis
   - Includes signature script detection logic
   - **Status**: 🟡 Code exists but not called from hook
   - **Requires**: Full combat log data (all event types)

4. **Unified Scribing Service (Exists but Not Integrated)**
   - `src/features/scribing/algorithms/unified-scribing-service.ts`
   - Coordinates detection across multiple abilities
   - **Status**: 🟡 Code exists but not called from hook
   - **Has TODOs**: Lines 247, 287 for signature/affix detection

### ❌ What's Not Connected

The `useScribingDetection` hook currently:
- ✅ Calls `getScribingSkillByAbilityId()` for grimoire + focus script
- ❌ Does NOT call affix-detector algorithms
- ❌ Does NOT call signature detection algorithms
- ❌ Returns hardcoded "Unknown Signature" and "Unknown Affix" placeholders

## The Integration Challenge

### Hook Design vs Algorithm Requirements

**Current Hook Interface**:
```typescript
useScribingDetection({
  fightId?: string,
  playerId?: number,
  abilityId?: number,
})
```

**What Algorithms Need**:
```typescript
// Affix Detector needs:
- buffEvents: BuffEvent[]
- debuffEvents: DebuffEvent[]
- damageEvents: DamageEvent[]
- castEvents: CastEvent[]
- Duration analysis data

// Signature Detector needs:
- buffEvents: BuffEvent[]
- debuffEvents: DebuffEvent[]
- resourceEvents: ResourceChangeEvent[]
- healEvents: HealEvent[]
- Pattern matching data
```

### Why They're Not Connected

1. **Data Gap**: Hook only has fightId/playerId/abilityId, but algorithms need full combat log events
2. **Architecture Mismatch**: Hook is React-level, algorithms expect raw combat data
3. **Performance**: Loading all combat events for every tooltip would be expensive
4. **Data Source**: Combat log data would need to come from GraphQL or downloaded files

## What Needs to Happen to Connect Them

### Option 1: Add Combat Data to Hook (Simple)
```typescript
useScribingDetection({
  fightId,
  playerId,
  abilityId,
  // Add these:
  combatEvents?: {
    buffs: BuffEvent[],
    debuffs: DebuffEvent[],
    damage: DamageEvent[],
    // ... etc
  }
})
```

Then inside the hook:
```typescript
if (scribingInfo && options.combatEvents) {
  // Call affix-detector.ts
  const affixDetection = await detectAffixScripts(
    scribingInfo, 
    options.combatEvents
  );
  
  // Call signature detector from enhancedScribingAnalysis.ts
  const signatureDetection = await detectSignatureScript(
    scribingInfo,
    options.combatEvents
  );
  
  // Replace placeholders with real data
  scribedData.signatureScript = signatureDetection;
  scribedData.affixScripts = affixDetection;
}
```

### Option 2: Use Unified Service (Complex)
```typescript
// In the hook, call the unified service
const unifiedService = new UnifiedScribingDetectionService();
const result = await unifiedService.detectScribingRecipes(fightId);

// Then extract the specific player/ability data
const playerData = result.players.find(p => p.playerId === playerId);
const combination = playerData?.detectedCombinations.find(c => 
  c.grimoireKey === scribingInfo.grimoire
);
```

### Option 3: Two-Phase Detection (Hybrid)
```typescript
// Phase 1: Database lookup (current - fast)
const scribingInfo = getScribingSkillByAbilityId(abilityId);

// Phase 2: Enhanced detection (lazy - slow)
if (scribingInfo && shouldLoadEnhancedData) {
  const enhancedData = await loadEnhancedScribingData(fightId, playerId, abilityId);
  // Merge enhanced data with database data
}
```

## Current Test Data Gap

For our test data (Player 1, Shattering Knife, Fight m2Y9FqdpMjcaZh4R-11):

**What We Detect Now**:
- ✅ Grimoire: "Traveling Knife" (from database)
- ✅ Focus Script: "Shattering Knife" / "Multi Target" (from database)
- 🟡 Signature: "Unknown Signature" (placeholder)
- 🟡 Affix: "Unknown Affix" (placeholder)

**To Detect Signature & Affix, We Would Need**:
1. Load combat log events for Fight 11
2. Filter events for Player 1
3. Find events related to ability 217340 (Shattering Knife)
4. Run pattern analysis on those events
5. Match patterns against known signature/affix effects

**The Data Probably Exists**:
- In `data-downloads/m2Y9FqdpMjcaZh4R/fight-11/` directory
- Files: `buff-events.json`, `debuff-events.json`, `damage-events.json`, etc.
- Just not loaded into the hook

## Recommendation

To answer your question: **Yes, we have algorithms to detect signature and affix scripts**, but they're not integrated into the `useScribingDetection` hook yet.

### Quick Win Solution:

1. **Add optional combat data parameter to hook**
2. **Call existing detection algorithms when data is available**
3. **Fall back to placeholders when data is not provided**

### Implementation Steps:

```typescript
// 1. Update hook interface
interface UseScribingDetectionOptions {
  fightId?: string;
  playerId?: number;
  abilityId?: number;
  enabled?: boolean;
  combatEvents?: CombatEventData; // NEW
}

// 2. Import existing algorithms
import { detectAffixScripts } from '../../../algorithms/affix-detector';
import { detectSignatureScript } from '../../../utils/enhancedScribingAnalysis';

// 3. Use them when available
if (scribingInfo && options.combatEvents) {
  const affixResults = await detectAffixScripts(/* ... */);
  const signatureResults = await detectSignatureScript(/* ... */);
  
  // Replace placeholders with real detection results
  scribedData.signatureScript = signatureResults;
  scribedData.affixScripts = affixResults;
}
```

This way:
- ✅ Database detection works immediately (current state)
- ✅ Enhanced detection works when combat data is provided
- ✅ Graceful degradation to placeholders when data unavailable
- ✅ No breaking changes to existing code

## Summary

**Question**: "We already have algorithms in our scribing logic to detect these scripts"

**Answer**: **YES, absolutely correct!** The algorithms exist in:
- `src/algorithms/affix-detector.ts` (919 lines of affix detection logic)
- `src/utils/enhancedScribingAnalysis.ts` (signature detection)
- `src/features/scribing/algorithms/unified-scribing-service.ts` (coordination)

They're just not **connected** to the `useScribingDetection` hook yet. The hook currently returns placeholders instead of calling these algorithms. The integration work is needed to wire them together.
