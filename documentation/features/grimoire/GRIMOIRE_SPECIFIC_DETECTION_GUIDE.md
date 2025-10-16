# Grimoire-Specific Signature Detection - Quick Reference

## Why Grimoire-Specific?

Some signature scripts (like Assassin's Misery) apply **different effects** depending on which grimoire they're equipped on. To accurately detect these signatures, we need to check for grimoire-specific ability IDs.

## Data Structure

### Before (Flat List - Ambiguous)
```json
"abilityIds": [217353, 217258, 217690, 21487, 148800, 148801]
```
**Problem**: Can't tell which IDs apply to which grimoire.

### After (Grimoire-Specific - Precise)
```json
"grimoireSpecificEffects": {
  "trample": {
    "mainAbilityId": 217690,
    "statusEffects": [21487, 148800, 148801]
  },
  "elemental-explosion": {
    "mainAbilityId": 217258,
    "statusEffects": [145866, 149091, 21487]
  }
}
```
**Benefit**: Clear separation prevents false positives.

## Detection Algorithm

### Step 1: Identify Grimoire
```javascript
const grimoireKey = identifyGrimoire(castAbilityId); // e.g., "trample"
```

### Step 2: Get Grimoire Config
```javascript
const config = signatureScript.grimoireSpecificEffects[grimoireKey];
```

### Step 3: Check Status Effects
```javascript
const allPresent = config.statusEffects.every(id => 
  detectedAbilityIds.includes(id)
);
```

### Step 4: Return Detection Result
```javascript
return allPresent; // true = signature detected
```

## Example: Assassin's Misery

### Trample + Assassin's Misery
**Required Effects (ALL must be present):**
- 21487 (Concussion)
- 148800 (Sundered)
- 148801 (Hemorrhaging)

**Detection Window**: 1 second after cast completion

### Elemental Explosion + Assassin's Misery
**Required Effects (ALL must be present):**
- 145866 (Burning)
- 149091 (Chilled)
- 21487 (Concussion)

**Detection Window**: 1 second after cast completion

## Key Benefits

1. **Accuracy**: No cross-grimoire false positives
2. **Maintainability**: Easy to add new grimoire-specific effects
3. **Clarity**: Each grimoire's effects are explicitly defined
4. **Flexibility**: Can handle different numbers of status effects per grimoire

## Testing

Run `node test-grimoire-specific-detection.js` to verify the detection logic.

## Related Documentation

- `ASSASSINS_MISERY_STATUS_EFFECTS.md` - Full analysis and verification
- `data/scribing-complete.json` - Database with grimoire-specific effects
- `test-grimoire-specific-detection.js` - Example detection implementation
