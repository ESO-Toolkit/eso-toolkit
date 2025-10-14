# UI Detection Fix - Assassin's Misery on Trample

## Problem
The UI was showing "Unknown Signature" for Trample even though Assassin's Misery signature script was equipped and the database had been updated with the status effect ability IDs.

## Root Cause
The `useScribingDetection.ts` hook was only loading ability IDs from the `abilityIds` array in the signature script definitions. It was not loading the grimoire-specific status effects from the new `grimoireSpecificEffects` structure.

## Solution
Updated the initialization code in `useScribingDetection.ts` (lines 28-52) to also load grimoire-specific status effects:

### Before
```typescript
Object.values(scribingData.signatureScripts).forEach((script: any) => {
  if (script.abilityIds) {
    script.abilityIds.forEach((id: number) => {
      VALID_SIGNATURE_SCRIPT_IDS.add(id);
      SIGNATURE_SCRIPT_ID_TO_NAME.set(id, script.name);
    });
  }
});
```

### After
```typescript
Object.values(scribingData.signatureScripts).forEach((script: any) => {
  if (script.abilityIds) {
    script.abilityIds.forEach((id: number) => {
      VALID_SIGNATURE_SCRIPT_IDS.add(id);
      SIGNATURE_SCRIPT_ID_TO_NAME.set(id, script.name);
    });
  }
  
  // Also include grimoire-specific status effects
  if (script.grimoireSpecificEffects) {
    Object.values(script.grimoireSpecificEffects).forEach((grimoireConfig: any) => {
      if (grimoireConfig.mainAbilityId) {
        VALID_SIGNATURE_SCRIPT_IDS.add(grimoireConfig.mainAbilityId);
        SIGNATURE_SCRIPT_ID_TO_NAME.set(grimoireConfig.mainAbilityId, script.name);
      }
      if (grimoireConfig.statusEffects) {
        grimoireConfig.statusEffects.forEach((id: number) => {
          VALID_SIGNATURE_SCRIPT_IDS.add(id);
          SIGNATURE_SCRIPT_ID_TO_NAME.set(id, script.name);
        });
      }
    });
  }
});
```

## Impact
The UI now recognizes the following ability IDs as part of Assassin's Misery:
- 21487 (Concussion)
- 148800 (Sundered)
- 148801 (Hemorrhaging)

When all three status effects appear consistently (100% correlation in 4/4 casts), the UI will detect and display:
- **Signature Script**: "Assassin's Misery"
- **Confidence**: 95%
- **Detection Method**: Post-Cast Pattern Analysis

## Verification
Run `node test-ui-detection-simulation.js` to verify the detection logic works correctly.

## Testing
1. Restart the development server (`npm run dev`)
2. Navigate to a report with Trample casts
3. Check the skill tooltip - should now show "Assassin's Misery" instead of "Unknown Signature"

## Files Modified
- `src/features/scribing/hooks/useScribingDetection.ts` - Added grimoire-specific effects loading

## Files Created (Testing/Documentation)
- `test-ui-detection-simulation.js` - Simulation of UI detection logic
- `UI_DETECTION_FIX.md` - This documentation file

## Related Documentation
- `ASSASSINS_MISERY_STATUS_EFFECTS.md` - Full analysis of status effects
- `GRIMOIRE_SPECIFIC_DETECTION_GUIDE.md` - Guide for grimoire-specific detection
- `data/scribing-complete.json` - Database with grimoire-specific effects
