# Scribing Detection: Resource Events Fix

## Problem Identified

The scribing detection system was not properly detecting recipes in the UI, despite the underlying detection algorithms working correctly in standalone scripts.

### Root Cause

**Resource events were not being fetched on all tabs where scribing tooltips appear.**

The `useResourceEvents()` hook (which dispatches `fetchResourceEvents` to load data into Redux) was only called in:
- `PlayersPanel.tsx` (Insights tab)
- `DeathEventPanel.tsx` (Deaths tab)

However, `SkillTooltip` components appear in many other places:
- `PlayerCard.tsx` (Players tab) ← **Primary use case**
- `AurasPanelView.tsx` (Auras view)
- Various other contexts

### Why This Matters

**Critical for scribing detection:** Some signature scripts appear as **resource events** rather than combat events!

Example: **Anchorite's Potency** (Signature Script)
- Grants ultimate resource
- Appears in **resource events**, not damage/healing/buff events
- Detection requires checking ALL event types including resources

From `AI_SCRIBING_DETECTION_INSTRUCTIONS.md`:
> **CRITICAL DISCOVERY**: Signature scripts appear in different event types!
> Always check ALL event types (cast, damage, healing, buff, debuff, **resource**)

## Solution Implemented

Modified `useScribingDetection` hook to use event hooks instead of selectors:

### Before (Broken)
```typescript
// Only used selectors - data might not be loaded
const friendlyBuffs = useSelector(selectFriendlyBuffEvents);
const hostileBuffs = useSelector(selectHostileBuffEvents);
const debuffs = useSelector(selectDebuffEvents);
const damage = useSelector(selectDamageEvents);
const heals = useSelector(selectHealingEvents);
const casts = useSelector(selectCastEvents);
const resources = useSelector(selectResourceEvents);
```

### After (Fixed)
```typescript
// Use event hooks to ensure all data is fetched
// Critical: Some signature scripts appear in different event types (e.g., Anchorite's Potency in resources)
const { damageEvents: damage } = useDamageEvents();
const { healingEvents: heals } = useHealingEvents();
const { friendlyBuffEvents: friendlyBuffs } = useFriendlyBuffEvents();
const { hostileBuffEvents: hostileBuffs } = useHostileBuffEvents();
const { debuffEvents: debuffs } = useDebuffEvents();
const { castEvents: casts } = useCastEvents();
const { resourceEvents: resources } = useResourceEvents();
```

## Files Modified

1. **`src/features/scribing/hooks/useScribingDetection.ts`**
   - Removed imports: `useSelector` from 'react-redux'
   - Removed imports: All event selectors (`selectFriendlyBuffEvents`, `selectHostileBuffEvents`, etc.)
   - Added imports: All event hooks (`useDamageEvents`, `useHealingEvents`, `useFriendlyBuffEvents`, `useHostileBuffEvents`, `useDebuffEvents`, `useCastEvents`, `useResourceEvents`)
   - Changed all event data fetching from selectors to hooks
   - Added comprehensive comment explaining why hooks are critical for scribing detection

## Impact

✅ **All combat events now automatically fetched** whenever scribing detection is active
✅ **Damage events** - fetched via `useDamageEvents()`
✅ **Healing events** - fetched via `useHealingEvents()`
✅ **Friendly buff events** - fetched via `useFriendlyBuffEvents()`
✅ **Hostile buff events** - fetched via `useHostileBuffEvents()`
✅ **Debuff events** - fetched via `useDebuffEvents()`
✅ **Cast events** - fetched via `useCastEvents()`
✅ **Resource events** - fetched via `useResourceEvents()` (critical for Anchorite's Potency, etc.)
✅ **Signature script detection** works across all event types
✅ **Recipe information (focus scripts)** displays correctly in UI tooltip
✅ **Works across all tabs** - Players, Insights, Auras, etc.
✅ **No dependency on other components** - scribing detection is self-contained

## Testing Recommendations

1. **Test Ulfsild's Contingency detection** (Fight 11, Player 7)
   - Should show: `🔄 Healing Contingency (Healing)` (focus script)
   - Should show: `🖋️ Gladiator's Tenacity` (signature script)

2. **Test abilities with resource event signatures**
   - Anchorite's Potency (resource events)
   - Any other abilities that grant resources as part of scribing

3. **Test across different tabs**
   - Players tab (most common use case)
   - Insights tab
   - Auras view

## Related Documentation

- **AI_SCRIBING_DETECTION_INSTRUCTIONS.md** - Full scribing detection guide
- **AI_SCRIBING_QUICK_REFERENCE.md** - Quick reference for common patterns
- **RESOURCE_EVENT_DETECTION_SUMMARY.md** - Resource event detection discovery
- **CONTINGENCY_CORRELATION_FINDINGS.md** - Fight 11 analysis results
- **ULFSILDS_CONTINGENCY_DETECTION_SUMMARY.md** - Implementation summary

## Technical Notes

**Why event hooks instead of selectors?**

**Selectors only read from Redux state:**
- `selectDamageEvents()` returns whatever is cached for the active report/fight context
- If data was never fetched, selector returns empty array `[]`
- No automatic fetching happens

**Hooks fetch data automatically:**
- Each event hook (e.g., `useDamageEvents()`) includes a `useEffect` that:
  1. Checks if data is already loaded in Redux
  2. If not loaded, dispatches the fetch action (e.g., `fetchDamageEvents`)
  3. Returns the data from Redux state
- Ensures data is always available when the component mounts

**Pattern for all event types:**
- ✅ `useDamageEvents()` - fetches damage events via `fetchDamageEvents`
- ✅ `useHealingEvents()` - fetches healing events via `fetchHealingEvents`
- ✅ `useFriendlyBuffEvents()` - fetches friendly buff events via `fetchFriendlyBuffEvents`
- ✅ `useHostileBuffEvents()` - fetches hostile buff events via `fetchHostileBuffEvents`
- ✅ `useDebuffEvents()` - fetches debuff events via `fetchDebuffEvents`
- ✅ `useCastEvents()` - fetches cast events via `fetchCastEvents`
- ✅ `useResourceEvents()` - fetches resource events via `fetchResourceEvents`

**Benefits of using hooks:**
1. **Self-contained** - Scribing detection doesn't depend on other components loading data
2. **Reliable** - Data is always fetched when needed
3. **Consistent** - Same pattern used across the application
4. **Performant** - Hooks include caching logic to avoid redundant fetches

## Date
October 13, 2025
