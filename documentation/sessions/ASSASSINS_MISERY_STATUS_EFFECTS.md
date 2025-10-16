# Assassin's Misery Signature Script - Grimoire-Specific Detection

## Discovery Date
October 14, 2025

## Summary
Discovered that Assassin's Misery signature script applies different status effects depending on which grimoire it's equipped on. Each grimoire has a unique set of status effects that can be detected for scribing identification.

## Key Finding
**Assassin's Misery applies grimoire-specific status effects** rather than using the main ability IDs directly in combat logs.

## Grimoire-Specific Status Effects

### Trample + Assassin's Misery (Verified: 100% correlation)
1. **21487: Concussion** (Shock damage status effect)
2. **148800: Sundered** (Physical penetration status effect)  
3. **148801: Hemorrhaging** (Bleed damage status effect)

**Description**: "Afflicts enemies with Concussion, Sundered, and Hemorrhaging status effects"

### Elemental Explosion + Assassin's Misery (Expected, not yet verified)
1. **145866: Burning** (Flame damage status effect)
2. **149091: Chilled** (Frost damage status effect)
3. **21487: Concussion** (Shock damage status effect)

**Description**: "Afflicts enemies with Burning, Chilled, and Concussion"

### Traveling Knife + Assassin's Misery (Verified: 100% correlation)
- **217353: Misery Knife** (Main ability ID)
- No additional status effects detected

**Description**: "Applies stealth/critical effects"

## Verification Results - Trample

### Test Data: Fight 11, Player 1, Magical Trample
- **Total casts analyzed**: 4 (completed cast events only, excluding begincast)
- **Correlation rate**: 100.0% (4/4 casts)
- **Timing**: Status effects appear 67-735ms after cast completes

### Cast-by-Cast Analysis
```
Cast #1 at 1421451ms
  ✓ Concussion (21487) at +734ms
  ✓ Sundered (148800) at +735ms
  ✓ Hemorrhaging (148801) at +735ms

Cast #2 at 1437701ms
  ✓ Concussion (21487) at +450ms
  ✓ Sundered (148800) at +450ms
  ✓ Hemorrhaging (148801) at +451ms

Cast #3 at 1479785ms
  ✓ Concussion (21487) at +116ms
  ✓ Sundered (148800) at +116ms
  ✓ Hemorrhaging (148801) at +117ms

Cast #4 at 1492118ms
  ✓ Concussion (21487) at +67ms
  ✓ Sundered (148800) at +67ms
  ✓ Hemorrhaging (148801) at +67ms
```

## Detection Strategy

### Pattern
All three status effects must appear within 1 second after cast completion:
- Concussion (21487)
- Sundered (148800)  
- Hemorrhaging (148801)

### Important Note
- Must check **cast events** (not begincast)
- Trample has ~1.5 second cast time
- Status effects trigger on cast completion, not during channel

## Implementation

### Database Structure
Updated `data/scribing-complete.json` with grimoire-specific effects:

```json
"assassins-misery": {
  "id": "assassins-misery",
  "name": "Assassin's Misery",
  "category": "signature",
  "description": "Afflicts enemies with status effects (varies by grimoire)",
  "compatibleGrimoires": [
    "traveling-knife",
    "elemental-explosion",
    "trample"
  ],
  "abilityIds": [
    217353,    // Misery Knife (Traveling Knife)
    217258,    // Misery Explosion (Elemental Explosion)
    217690     // Misery Trample (Trample)
  ],
  "grimoireSpecificEffects": {
    "traveling-knife": {
      "mainAbilityId": 217353,
      "statusEffects": [],
      "description": "Misery Knife - applies stealth/critical effects"
    },
    "elemental-explosion": {
      "mainAbilityId": 217258,
      "statusEffects": [145866, 149091, 21487],
      "statusEffectNames": ["Burning", "Chilled", "Concussion"],
      "description": "Misery Explosion - afflicts enemies with Burning, Chilled, and Concussion"
    },
    "trample": {
      "mainAbilityId": 217690,
      "statusEffects": [21487, 148800, 148801],
      "statusEffectNames": ["Concussion", "Sundered", "Hemorrhaging"],
      "description": "Misery Trample - afflicts enemies with Concussion, Sundered, and Hemorrhaging"
    }
  }
}
```

## Cross-Grimoire Comparison

### Shattering Knife (Traveling Knife)
- Uses ability ID **217353** (Misery Knife)
- 100% correlation (3/3 casts)
- Appears 451-517ms after cast

### Magical Trample (Trample)
- Does NOT use ability ID **217690** (Misery Trample)
- Instead uses status effects: 21487, 148800, 148801
- 100% correlation (4/4 casts)
- Appears 67-735ms after cast

## Detection Logic

For signature detection on any grimoire cast:

1. Identify the grimoire being cast
2. Get cast completion event (type === 'cast')
3. Search 1-second window after cast for ability IDs
4. Get grimoire-specific configuration for the signature
5. Check if all required status effects are present
6. If all present → signature detected

### Example Detection Code

```javascript
function detectSignatureForGrimoire(grimoireKey, detectedAbilityIds, signatureScript) {
  // Check compatibility
  if (!signatureScript.compatibleGrimoires.includes(grimoireKey)) {
    return false;
  }

  // Get grimoire-specific configuration
  const grimoireConfig = signatureScript.grimoireSpecificEffects?.[grimoireKey];
  
  if (!grimoireConfig) {
    // Fallback to basic abilityIds check
    return signatureScript.abilityIds.some(id => detectedAbilityIds.includes(id));
  }

  // Check main ability ID
  if (detectedAbilityIds.includes(grimoireConfig.mainAbilityId)) {
    return true;
  }

  // Check status effects (all must be present)
  if (grimoireConfig.statusEffects && grimoireConfig.statusEffects.length > 0) {
    return grimoireConfig.statusEffects.every(
      effectId => detectedAbilityIds.includes(effectId)
    );
  }

  return false;
}
```

See `test-grimoire-specific-detection.js` for full examples.

## Related Files
- `data/scribing-complete.json` - Updated with status effect IDs
- Analysis scripts:
  - `analyze-trample-details.js`
  - `show-all-correlations.js`
  - `check-all-affix-correlations.js`

## Testing
✅ Detection verified at 100% accuracy on test dataset
✅ All three status effects required for positive identification
✅ Works with cast completion events (not begincast)
