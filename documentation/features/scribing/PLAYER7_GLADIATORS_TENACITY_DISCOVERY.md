# Player 7 Signature Script Discovery - Gladiator's Tenacity

## Date
October 14, 2025

## Summary
Player 7 has **Gladiator's Tenacity** equipped on their **Healing Contingency** (Ulfsild's Contingency grimoire).

## Detection Method
Direct ability ID detection - **Tenacious Contingency (217654)** appears in combat log.

## Key Finding
When Gladiator's Tenacity signature script is equipped on Ulfsild's Contingency, it creates a buff called **"Tenacious Contingency"** (ability ID 217654). This buff appears immediately after casting Healing Contingency.

## Evidence from Combat Log

### Player 7's Healing Contingency Casts
- **Total casts**: 6
- **Ability ID used**: 240150 (Healing Contingency)
- **Cast times**: 1419635ms, 1432868ms, 1445118ms, 1461118ms, 1475652ms, 1487418ms

### Signature Detection
**Tenacious Contingency (217654)** appears after EVERY cast:
- Cast #1: +1217ms (with extraAbilityGameID: 240150)
- Cast #2: +1083ms (with extraAbilityGameID: 240150)
- Cast #3: +1116ms (with extraAbilityGameID: 240150)
- Cast #4: +1100ms (with extraAbilityGameID: 240150)
- Cast #5: +1050ms (with extraAbilityGameID: 240150)
- Cast #6: +1035ms (with extraAbilityGameID: 240150)

**Correlation**: 6/6 casts (100%)

## Additional Effects
Along with Tenacious Contingency, the following also appear:
- **Warding Contingency (217608)** - Defensive buff component
- **Major Savagery (218015, 61667)** - Weapon Critical buff
- **Major Prophecy (218016, 61689)** - Spell Critical buff

All have `extraAbilityGameID: 240150` linking them to the Healing Contingency cast.

## Database Status
✅ **Already correctly configured** in `data/scribing-complete.json`:

```json
"gladiators-tenacity": {
  "id": "gladiators-tenacity",
  "name": "Gladiator's Tenacity",
  "category": "signature",
  "description": "Adds persistence/endurance effects",
  "compatibleGrimoires": [
    "ulfsilds-contingency",
    "torchbearer"
  ],
  "abilityIds": [
    217649,  // Tenacious Torch (Torchbearer)
    217654   // Tenacious Contingency (Ulfsild's Contingency)
  ]
}
```

## Grimoire-Specific Abilities
- **217649**: Tenacious Torch - appears with Torchbearer grimoire
- **217654**: Tenacious Contingency - appears with Ulfsild's Contingency grimoire

## Detection Logic
Simple and direct:
1. Find Healing Contingency casts (ability ID 240150 for Player 7)
2. Look for ability ID **217654** (Tenacious Contingency) in combat log
3. If found → **Gladiator's Tenacity** is equipped

No correlation analysis needed - the ability name itself is the signature!

## Related Scripts
- `analyze-player7-all-effects.js` - Shows all post-cast effects
- `analyze-player7-within-window.js` - Shows effects within 1s window
- `check-player7-timing.js` - Timing analysis for Savagery & Prophecy

## Conclusion
✅ **Signature Script Identified**: Gladiator's Tenacity  
✅ **Database**: Already configured correctly  
✅ **Detection**: Will work automatically in UI (ability ID 217654 is tracked)  
