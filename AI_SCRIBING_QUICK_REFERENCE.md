# Scribing Detection Quick Reference Card

## 🚨 CRITICAL DISCOVERY

**Signature scripts appear in DIFFERENT event types!**

❌ **NOT ALWAYS** in buff/debuff/damage events  
✅ **CHECK ALL EVENT TYPES** including resource events

---

## 📋 Event Types Checklist

When searching for signature scripts, check:

- [ ] **Cast events** - Find main ability casts
- [ ] **Damage events** - Damage-dealing signatures
- [ ] **Healing events** - Healing signatures
- [ ] **Buff events** - Buff-granting signatures
- [ ] **Debuff events** - Debuff-applying signatures
- [ ] **Resource events** ← ⚠️ **CRITICAL** - Resource-granting signatures

---

## 🔍 Detection Algorithm

```
For each ability cast:
  1. Mark cast timestamp
  2. Look 1000ms into the future (detection window)
  3. Find ALL events from same player (sourceID match)
  4. Count occurrences of each ability ID
  5. Calculate: consistency = occurrences / totalCasts
  6. If consistency ≥ 50% → Signature detected!
  7. Confidence = min(95%, consistency)
```

---

## 📊 Key Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `DETECTION_WINDOW_MS` | 1000 | Time after cast to look for effects |
| `MIN_CONSISTENCY` | 0.5 | Minimum 50% occurrence rate |
| `MAX_CONFIDENCE` | 0.95 | Confidence cap at 95% |

---

## 🎯 Real Example: Anchorite's Potency

**What we were looking for**:
- Signature script on Leashing Soul (217784)
- Expected: buffs, damage, or debuffs

**What we found**:
- Ability ID: 216940 (Potent Soul)
- Event type: **resourcechange** ← NOT combat events!
- Effect: +4 ultimate
- Timing: 450-600ms after cast
- Consistency: 6/6 casts (100%)

**Lesson**: Always check resource events!

---

## 📁 Key Files

| File | Purpose | Line Reference |
|------|---------|----------------|
| `useScribingDetection.ts` | Main detection logic | Lines 158-164 (resources) |
| `scribing-complete.json` | Signature ability IDs | Line 6502+ |
| `SkillTooltip.tsx` | UI display | Lines 612-670 |
| `combatlogEvents.ts` | Event type definitions | - |

---

## 🧪 Testing

```bash
# Run all detection tests
npm test -- useScribingDetection.*test.ts

# 38 tests, all passing ✅
```

---

## 🔧 Quick Search Script Template

```javascript
// 1. Load ALL event types
const events = {
  casts: loadJSON('cast-events.json'),
  damage: loadJSON('damage-events.json'),
  healing: loadJSON('healing-events.json'),
  buffs: loadJSON('buff-events.json'),
  debuffs: loadJSON('debuff-events.json'),
  resources: loadJSON('resource-events.json'), // ← Don't forget!
};

// 2. Find casts of target ability
const casts = events.casts.filter(e => 
  e.sourceID === playerId &&
  e.abilityGameID === targetAbilityId
);

// 3. For each cast, check for signature events
casts.forEach(cast => {
  const windowEnd = cast.timestamp + 1000;
  
  // Check ALL event types
  Object.entries(events).forEach(([type, typeEvents]) => {
    const postCastEvents = typeEvents.filter(e =>
      e.sourceID === playerId &&
      e.timestamp > cast.timestamp &&
      e.timestamp <= windowEnd
    );
    // Count occurrences by ability ID
  });
});

// 4. Calculate consistency & identify signatures
```

---

## ⚠️ Common Mistakes

### ❌ Mistake #1: Only Checking Combat Events
```javascript
// WRONG - Missing resource events
const events = [...damage, ...healing, ...buffs, ...debuffs];
```

### ✅ Solution: Check ALL Event Types
```javascript
// RIGHT - Includes resources
const events = [...damage, ...healing, ...buffs, ...debuffs, ...resources];
```

---

### ❌ Mistake #2: No Player Filtering
```javascript
// WRONG - Includes all players
const events = allEvents.filter(e => e.abilityGameID === targetId);
```

### ✅ Solution: Filter by sourceID
```javascript
// RIGHT - Only target player
const events = allEvents.filter(e => 
  e.sourceID === playerId && e.abilityGameID === targetId
);
```

---

### ❌ Mistake #3: No Time Window
```javascript
// WRONG - No timing constraint
const events = allEvents.filter(e => e.sourceID === playerId);
```

### ✅ Solution: Enforce Detection Window
```javascript
// RIGHT - Within 1000ms of cast
const events = allEvents.filter(e =>
  e.sourceID === playerId &&
  e.timestamp > castTime &&
  e.timestamp <= castTime + 1000
);
```

---

## 🗺️ Signature Script Database Lookup

### scribing-complete.json Structure

```json
{
  "signatureScripts": {
    "anchorites-potency": {
      "name": "Anchorite's Potency",
      "compatibleGrimoires": ["soul-burst", "wield-soul"],
      "abilityIds": [216940, 217512]
    }
  }
}
```

### Known Signature Scripts

| Script | Ability IDs | Event Type | Grimoires |
|--------|-------------|------------|-----------|
| Anchorite's Potency | 216940, 217512 | resource | Soul Burst, Wield Soul |
| Gladiator's Tenacity | 217649, 217654 | ? | Ulfsild's Contingency |
| Warrior's Opportunity | 217358 | ? | Multiple |
| Growing Impact | 217655 | ? | Ulfsild's Contingency |

---

## 🎓 Investigation Workflow

### When asked to find a signature script:

1. **Identify grimoire** → Get ability ID from scribing-complete.json
2. **List compatible signatures** → Check signatureScripts section
3. **Get signature ability IDs** → From abilityIds array
4. **Search combat logs**:
   - Load ALL event files
   - Filter by sourceID (player)
   - Check 1000ms window after casts
5. **Count occurrences** → For each signature ability ID
6. **Calculate consistency** → occurrences / totalCasts
7. **Identify pattern** → Which event type? What timing?
8. **Update detection** → Add to SIGNATURE_SCRIPT_ID_TO_NAME if needed

---

## 📈 Evidence Display Format

Tooltip shows:
```
📜 Signature Script
🖋️ Anchorite's Potency
🔍 Evidence: Analyzed 6 casts, Found 1 consistent effects, 
            Top effect: resource ID 216940 (6/6 casts)
```

Key: Evidence string includes **event type** (e.g., "resource")!

---

## 🚀 Quick Start

### To investigate a new signature:

```bash
# 1. Find ability IDs in database
grep -n "signature-name" data/scribing-complete.json

# 2. Search combat log events
node search-signature-script.js

# 3. Run detection tests
npm test -- useScribingDetection
```

---

## 📚 Full Documentation

See `AI_SCRIBING_DETECTION_INSTRUCTIONS.md` for:
- Complete system architecture
- Detailed examples
- Testing strategy
- Database structure
- Common pitfalls

---

## ✅ Status

**Last Updated**: October 13, 2025  
**Tests**: 38/38 passing ✅  
**Key Discovery**: Resource event detection  
**Example Validated**: Anchorite's Potency (Fight 11, Player 1)

---

**Remember**: When in doubt, check **ALL** event types, especially **resource events**!

