# Affix Script Detection Fix - Heroism

## Issue Summary

**Problem**: Affix script detection was working for some abilities but not others.
- ✅ **Working**: Shattering Knife → Assassin's Misery
- ❌ **Not Working**: Magical Trample → Heroism

## Root Cause

The affix script detection system relies on mapping buff/debuff IDs to affix script names using the `scribing-complete.json` database. The detection hook (`useScribingDetection.ts`) builds a lookup map like this:

```typescript
const AFFIX_SCRIPT_ID_TO_NAME = new Map<number, string>();
Object.values(scribingData.affixScripts).forEach((script: any) => {
  if (script.abilityIds) {  // ← Only processes scripts WITH abilityIds
    script.abilityIds.forEach((id: number) => {
      AFFIX_SCRIPT_ID_TO_NAME.set(id, script.name);
    });
  }
});
```

### The Problem

Out of 26 affix scripts in the database, only 2 had `abilityIds` defined:
- ✅ Vulnerability: [106754]
- ✅ Maim: [61723]
- ❌ **Heroism: MISSING** ← This was the problem!
- ❌ 23 other affix scripts also missing

When Magical Trample applied the Heroism buff (ability IDs 61708 or 61709), the detection system couldn't map these IDs to the "Heroism" affix script name because the mapping didn't exist.

### Why Assassin's Misery Worked

Assassin's Misery is a **signature script**, not an affix script. Signature scripts had their `abilityIds` properly defined in the database, so the detection worked correctly.

## Solution

Added `abilityIds` to the most commonly used affix scripts in `data/scribing-complete.json`:

### 1. Heroism (The Main Fix)
```json
"heroism": {
  "id": "heroism",
  "name": "Heroism",
  "category": "affix",
  "description": "Provides Heroism (ultimate generation) buff",
  "compatibleGrimoires": [...],
  "abilityIds": [
    61708,  // Minor Heroism
    61709   // Major Heroism
  ]
}
```

### 2. Additional Common Affix Scripts Fixed

Also added `abilityIds` for these frequently used affix scripts:

- **Savagery and Prophecy**: [61666, 27190, 61688, 47193] (Minor/Major Savagery, Minor/Major Prophecy)
- **Expedition**: [61735, 61736] (Minor/Major Expedition)
- **Berserk**: [61744, 61745] (Minor/Major Berserk)
- **Brutality and Sorcery**: [61662, 61665, 61685, 61687] (Minor/Major Brutality, Minor/Major Sorcery)

## Verification

After the fix:
- ✅ 7 affix scripts now have `abilityIds` (was 2)
- ✅ Heroism buffs (61708, 61709) now map to "Heroism"
- ✅ Detection should work for Magical Trample → Heroism

## Testing

To verify the fix works:

1. **Restart the dev server**: `npm run dev`
2. **Navigate to the test fight**: http://localhost:3000/#/report/m2Y9FqdpMjcaZh4R/fight/11/players
3. **View Player 1's Magical Trample tooltip**
4. **Expected result**: Should show "🎭 Heroism" as a detected affix script

## Files Modified

- `data/scribing-complete.json` - Added `abilityIds` to 5 affix scripts

## Future Improvements

The remaining 19 affix scripts still don't have `abilityIds` defined:
- Off Balance
- Interrupt
- Resolve
- Evasion
- Vitality
- Empower
- Protection
- Courage
- Intellect and Endurance
- Force
- Cowardice
- Enervation
- Mangle
- Breach
- Lifesteal
- Defile
- Brittle
- Uncertainty
- Magickasteal

These should be added as needed when detection issues are reported for specific abilities.

## Technical Details

### Buff ID Research

Buff IDs were found by searching `data/abilities.json` for standard buff names:
- Minor Heroism → Multiple IDs, most common: 61708
- Major Heroism → Multiple IDs, most common: 61709

Each buff can have multiple IDs because different abilities may apply the same buff with slightly different implementations, but the "standard" IDs (61708, 61709) are the most commonly used across ESO abilities.

### Detection Flow

1. Player casts Magical Trample (ability ID: 220542)
2. Within 2 seconds, a buff is applied (ability ID: 61708 or 61709)
3. Detection system checks if buff ID exists in `AFFIX_SCRIPT_ID_TO_NAME` map
4. Map returns "Heroism" ✅
5. Tooltip displays "🎭 Heroism" with appropriate confidence and evidence

## Related Files

- Detection Hook: `src/features/scribing/hooks/useScribingDetection.ts`
- Database: `data/scribing-complete.json`
- Test Scripts:
  - `analyze-affix-abilityIds.js` - Lists which affixes have IDs
  - `find-affix-buff-ids.js` - Finds buff IDs from abilities.json
  - `test-heroism-detection.js` - Verifies the fix

---

**Date**: October 13, 2025
**Branch**: feature/scribing-fix
**Status**: ✅ FIXED - Ready for testing
