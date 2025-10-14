# Investigation Summary: Scribing UI Not Reflecting Detection

## User's Concern
> "our scripts seem to detect the correct recipe for the scribing skills, but the UI isn't reflecting that detection"

## Investigation Process

### 1. Verified Backend Detection Works
✅ Confirmed `getScribingSkillByAbilityId(240150)` returns correct data:
- Grimoire: "Ulfsild's Contingency"
- Transformation: "Healing Contingency"  
- Type: "Healing"

### 2. Traced Data Flow
✅ Confirmed the hook creates correct recipe object:
```typescript
recipe: {
  grimoire: scribingInfo.grimoire,
  transformation: scribingInfo.transformation,
  transformationType: scribingInfo.transformationType,
  confidence: 1.0,
  matchMethod: 'Database Lookup',
  recipeSummary: `📖 ${scribingInfo.grimoire} + 🔄 ${scribingInfo.transformation}`,
  tooltipInfo: `Detected from scribing database with 100% confidence`,
}
```

### 3. Verified UI Rendering Logic
✅ Confirmed SkillTooltip component has correct conditionals:
- Checks `finalScribedData.recipe` exists
- Renders focus script section when recipe present
- Display format: `🔄 {transformation} ({transformationType})`

### 4. Discovered Root Cause
❌ **Resource events were not being loaded!**

The scribing detection algorithm checks ALL event types:
- ✅ buffs
- ✅ debuffs
- ✅ damage
- ✅ healing
- ✅ casts
- ❌ **resources** ← NOT LOADED

## The Problem

**Resource events were only fetched on specific tabs:**
- PlayersPanel (Insights tab)
- DeathEventPanel (Deaths tab)

**But SkillTooltip appears in many places:**
- PlayerCard (Players tab) ← **Primary usage**
- AurasPanelView (Auras)
- Various other contexts

**Impact:**
When viewing tooltips on tabs where resource events weren't loaded, the `useScribingDetection` hook would call:
```typescript
const resources = useSelector(selectResourceEvents); // Returns []
```

This returned an empty array because the events were never fetched!

**Critical for detection:** Some signature scripts like **Anchorite's Potency** appear as resource events, not combat events. Without resource events, detection fails.

## The Fix

Modified `src/features/scribing/hooks/useScribingDetection.ts`:

### Changed from selectors to hooks for ALL event types:
```typescript
// OLD: Only read from Redux (data might not exist)
const friendlyBuffs = useSelector(selectFriendlyBuffEvents);
const hostileBuffs = useSelector(selectHostileBuffEvents);
const debuffs = useSelector(selectDebuffEvents);
const damage = useSelector(selectDamageEvents);
const heals = useSelector(selectHealingEvents);
const casts = useSelector(selectCastEvents);
const resources = useSelector(selectResourceEvents);

// NEW: Use hooks that fetch data if needed
const { damageEvents: damage } = useDamageEvents();
const { healingEvents: heals } = useHealingEvents();
const { friendlyBuffEvents: friendlyBuffs } = useFriendlyBuffEvents();
const { hostileBuffEvents: hostileBuffs } = useHostileBuffEvents();
const { debuffEvents: debuffs } = useDebuffEvents();
const { castEvents: casts } = useCastEvents();
const { resourceEvents: resources } = useResourceEvents();
```

### Why this works:
- Each event hook includes a `useEffect` that dispatches its respective fetch action
- Ensures ALL event data is loaded whenever scribing detection is active
- Makes scribing detection self-contained and independent of other components
- Works across all tabs automatically

## Testing Results

✅ All 6 Ulfsild's Contingency tests passing
✅ TypeScript compilation successful (for scribing code)
✅ Resource events now fetched automatically

## Files Modified

1. **`src/features/scribing/hooks/useScribingDetection.ts`**
   - Removed: `import { useSelector } from 'react-redux';`
   - Removed: All event selector imports from `store/selectors/eventsSelectors`
   - Added: All event hook imports (`useDamageEvents`, `useHealingEvents`, `useFriendlyBuffEvents`, `useHostileBuffEvents`, `useDebuffEvents`, `useCastEvents`, `useResourceEvents`)
   - Changed: All 7 event types now use hooks instead of selectors
   - Added: Comprehensive comment explaining hook usage

## Expected Outcome

When viewing Ulfsild's Contingency tooltip (ability ID 240150):

### Before Fix:
- ❌ No recipe information shown
- ❌ Event arrays might be empty (damage, healing, buffs, debuffs, casts, resources)
- ❌ Signature scripts using any event type might not be detected
- ❌ Detection only worked if user visited specific tabs first

### After Fix:
- ✅ Recipe displays: "🔄 Healing Contingency (Healing)"
- ✅ All 7 event types loaded automatically (damage, healing, friendly buffs, hostile buffs, debuffs, casts, resources)
- ✅ Signature scripts detected across all event types
- ✅ Signature scripts like Anchorite's Potency (resource events) will be detected
- ✅ Works immediately on all tabs (Players, Insights, Auras, etc.)
- ✅ Self-contained - no dependency on other components loading data first

## Related Documentation

- **SCRIBING_RESOURCE_EVENTS_FIX.md** - Detailed fix documentation
- **AI_SCRIBING_DETECTION_INSTRUCTIONS.md** - Full detection guide
- **AI_SCRIBING_QUICK_REFERENCE.md** - Quick reference
- **CONTINGENCY_CORRELATION_FINDINGS.md** - Fight 11 analysis

## Lessons Learned

1. **Always use hooks, not selectors, for data fetching** - Selectors only read state, hooks ensure data is fetched
2. **Don't assume data is already loaded** - Components in different tabs may not have triggered fetches
3. **Make components self-contained** - Don't rely on other components to load your dependencies
4. **All event types matter** - Not just buffs/debuffs, but also damage, healing, casts, and especially resources
5. **Test across contexts** - A component may work in one tab but fail in another
6. **Backend vs Frontend** - Just because detection works in scripts doesn't mean UI has access to the data

## Date
October 13, 2025
