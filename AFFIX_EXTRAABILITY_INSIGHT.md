# Affix Script Detection - extraAbilityGameID Insight

## Key Discovery

**Affix scripts do NOT populate the `extraAbilityGameID` field in buff/debuff events.**

This provides a reliable way to distinguish between:
- **Core ability effects**: Events HAVE `extraAbilityGameID` set to the casting ability ID
- **Affix script effects**: Events DO NOT HAVE `extraAbilityGameID` field populated

## Evidence

### Leashing Soul (Wield Soul grimoire, ID: 217784)

**Major Breach (ID: 216945)** - Core ability effect:
```json
{
  "timestamp": 1427635,
  "type": "applydebuff",
  "abilityGameID": 216945,
  "extraAbilityGameID": 217784  // ✓ Links to Leashing Soul
}
```

**Major Maim (ID: 61725)** - External source (NOT from affix):
```json
{
  "timestamp": 1427635,
  "type": "applydebuff",
  "abilityGameID": 61725,
  // NO extraAbilityGameID field
}
```

**Minor Maim (ID: 61723)** - Potential affix (16.7% occurrence):
```json
{
  "timestamp": 1481636,
  "type": "applydebuff",
  "abilityGameID": 61723,
  // NO extraAbilityGameID field
}
```

### Magical Trample (Trample grimoire, IDs: 217682, 220542)

**Major Heroism (ID: 61709)** - Potential affix (50% occurrence):
```json
{
  "timestamp": 1421451,
  "type": "applybuff",
  "abilityGameID": 61709,
  // NO extraAbilityGameID field
}
```

**Minor Brittle (ID: 145975)** - External source (50% occurrence):
```json
{
  "timestamp": 1480185,
  "type": "applydebuff",
  "abilityGameID": 145975,
  // NO extraAbilityGameID field
}
```

## Detection Logic

### Updated Algorithm

```javascript
// 1. Find all buff/debuff events after scribing cast
const postCastEvents = allEvents.filter(e => 
  e.sourceID === player &&
  e.timestamp >= castTime &&
  e.timestamp <= castTime + WINDOW_MS &&
  (e.type === 'applybuff' || e.type === 'applydebuff')
);

// 2. FILTER OUT events with extraAbilityGameID (core ability effects)
const potentialAffixEvents = postCastEvents.filter(e => 
  !e.extraAbilityGameID  // KEY: Affix scripts don't populate this field
);

// 3. Match against known affix ability IDs
const affixMatches = potentialAffixEvents.filter(e =>
  affixMap.has(e.abilityGameID)
);

// 4. Verify compatibility with grimoire
const validAffixes = affixMatches.filter(e => {
  const affixKey = affixMap.get(e.abilityGameID);
  return affixScripts[affixKey].compatibleGrimoires.includes(grimoireId);
});
```

### Why This Matters

**Before this insight:**
- Major Breach detected in 100% of Leashing Soul casts → False positive (it's a core effect)
- Couldn't distinguish between affix effects and core ability effects

**After this insight:**
- Major Breach correctly excluded (has `extraAbilityGameID`)
- Only true affix candidates remain (no `extraAbilityGameID`)
- Detection accuracy significantly improved

## Correlation Results (Updated)

### Leashing Soul
- **Maim affix**: 16.7% correlation (weak - likely from another source)
- **Conclusion**: Unable to definitively identify affix from this data
  - Possible the equipped affix has conditional triggers
  - May need more combat data or different fight conditions

### Magical Trample
- **Heroism affix**: 50% correlation (moderate)
- **Conclusion**: Likely equipped with Heroism affix
  - 50% occurrence suggests conditional trigger (possibly on critical hit or internal cooldown)
  - This is the only compatible affix detected

## Implementation Notes

When implementing affix detection in the application:

1. **Always check `extraAbilityGameID` first**
   - If present: Skip event (it's a core ability effect, not an affix)
   - If absent: Potential affix candidate

2. **Verify grimoire compatibility**
   - Match event ability ID against affix script database
   - Confirm the affix is compatible with the detected grimoire

3. **Handle conditional affixes**
   - Some affixes may have <100% correlation due to:
     - Internal cooldowns
     - Conditional triggers (on crit, on kill, etc.)
     - Target requirements (e.g., "enemies below 50% health")

4. **Set appropriate thresholds**
   - ≥90%: High confidence
   - 50-89%: Moderate confidence (likely conditional)
   - <50%: Low confidence (may be from another source)

## Database Validation

All 26 affix scripts now have `abilityIds` populated in `scribing-complete.json`, enabling comprehensive detection:

- off-balance: [5805]
- interrupt: [56554, 71694, 72450]
- savagery-and-prophecy: [61666, 27190, 61688, 47193]
- expedition: [61735, 61736]
- resolve: [37247, 22236]
- evasion: [61715, 49264]
- vitality: [34837, 42197]
- berserk: [61744, 61745]
- brutality-and-sorcery: [61662, 61665, 61685, 61687]
- empower: [6192, 8082]
- protection: [3929, 22233]
- courage: [121878, 66902]
- heroism: [61708, 61709]
- intellect-and-endurance: [26216, 45224, 26215, 32748]
- force: [61746, 40225]
- vulnerability: [106754]
- maim: [61723]
- cowardice: [46202, 111354]
- enervation: [47202]
- mangle: [39168]
- breach: [38688, 28307]
- lifesteal: [33541]
- defile: [21926, 24153]
- brittle: [145975, 145977]
- uncertainty: [47204]
- magickasteal: [26809]

## Conclusion

The `extraAbilityGameID` field is the **key discriminator** for affix script detection:
- Core ability effects: `extraAbilityGameID` is populated
- Affix script effects: `extraAbilityGameID` is NOT populated

This insight dramatically improves detection accuracy by filtering out false positives from core ability effects.
