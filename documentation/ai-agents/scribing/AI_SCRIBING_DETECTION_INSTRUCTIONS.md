# AI Agent Instructions - Scribing Detection System

## Overview

This document provides instructions for AI agents working on the ESO Log Aggregator scribing detection system. It explains how signature and affix scripts are detected from combat logs.

---

## Table of Contents

1. [Key Discovery: Resource Event Detection](#key-discovery-resource-event-detection)
2. [System Architecture](#system-architecture)
3. [Detection Algorithm](#detection-algorithm)
4. [Event Types Checked](#event-types-checked)
5. [Working with the Codebase](#working-with-the-codebase)
6. [Testing Strategy](#testing-strategy)
7. [Common Pitfalls](#common-pitfalls)
8. [Real-World Examples](#real-world-examples)
9. [Database Structure](#database-structure)
10. [Quick Reference](#quick-reference)

---

## Key Discovery: Resource Event Detection

### Critical Learning from October 13, 2025

**IMPORTANT**: Signature scripts do NOT always appear as buffs, debuffs, or damage events!

**Example - Anchorite's Potency**:
- Player casts Leashing Soul (ability 217784)
- ~450-600ms later, Potent Soul (ability 216940) triggers
- This appears as a **resourcechange event** granting +4 ultimate
- NOT found in buff/debuff/damage/healing events

**Lesson**: Always check **ALL event types** including resource events when searching for signature scripts.

---

## System Architecture

### Core Files

#### Detection Hook
**File**: `src/features/scribing/hooks/useScribingDetection.ts`
- Main detection logic
- Lines 158-164: Resource event checking
- Lines 100-180: Post-cast analysis window
- Returns: `SignatureScriptDetectionResult` with confidence and evidence

#### Database
**File**: `data/scribing-complete.json`
- Line 6502+: `signatureScripts` section with ability IDs
- Maps ability IDs to signature script names
- Example: `216940` → "Anchorite's Potency"

#### UI Display
**File**: `src/components/SkillTooltip.tsx`
- Lines 612-670: Signature script section rendering
- Displays name, confidence, and evidence
- Format: "📜 Signature Script" with evidence details

### Data Flow

```
Combat Log Events
       ↓
useScribingDetection Hook
       ↓
detectSignatureScript()
  - Filters events within 1000ms window
  - Counts occurrences by ability ID
  - Calculates consistency
       ↓
SIGNATURE_SCRIPT_ID_TO_NAME lookup
       ↓
Returns detection result
       ↓
SkillTooltip displays result
```

---

## Detection Algorithm

### Post-Cast Analysis Window

The algorithm analyzes events that occur **within 1000ms after each ability cast**:

```typescript
// For each cast of the scribed ability:
const windowEnd = cast.timestamp + 1000; // 1000ms detection window

// Check ALL event types within this window:
1. Buff events (applied to player)
2. Debuff events (applied to targets)
3. Damage events (dealt by player)
4. Healing events (by player)
5. Resource events (granted to player) ← CRITICAL
6. Cast events (triggered by player)
```

### Consistency Calculation

```typescript
const MIN_CONSISTENCY = 0.5; // 50% threshold

// For each unique ability ID found:
consistency = occurrences / totalCasts

// Example: Anchorite's Potency
// - Ability 216940 appears in 6/6 casts
// - Consistency: 6/6 = 1.0 (100%)
// - Confidence: min(0.95, 1.0) = 0.95 (95%, capped)
```

### Detection Requirements

| Requirement | Value | Notes |
|-------------|-------|-------|
| Detection Window | 1000ms | After each cast |
| Min Consistency | 50% | Must appear in ≥50% of casts |
| Max Confidence | 95% | Capped even at 100% consistency |
| Player Filtering | sourceID match | Only events from casting player |

---

## Event Types Checked

### Complete List

| Event Type | File | Purpose | Critical For |
|------------|------|---------|--------------|
| **cast** | cast-events.json | Ability casts | Finding main ability usage |
| **damage** | damage-events.json | Damage dealt | Damage-based signatures |
| **healing** | healing-events.json | Healing done | Healing-based signatures |
| **buff** | buff-events.json | Buffs applied | Buff-based signatures |
| **debuff** | debuff-events.json | Debuffs applied | Debuff-based signatures |
| **resource** | resource-events.json | Resources granted | **Resource-based signatures** ✅ |
| death | death-events.json | Death events | (not currently used) |
| combatantinfo | combatant-info-events.json | Player gear/stats | (not currently used) |

### Event Structure Examples

#### Resource Event (Anchorite's Potency)
```typescript
{
  timestamp: 1450,
  type: 'resourcechange',
  sourceID: 1,
  sourceIsFriendly: true,
  targetID: 1,
  targetIsFriendly: true,
  abilityGameID: 216940, // Potent Soul
  fight: 11,
  resourceChange: 4, // +4 ultimate
  resourceChangeType: 0,
  otherResourceChange: 0,
  maxResourceAmount: 500,
  waste: 0,
  castTrackID: 1,
  sourceResources: { /* ... */ },
  targetResources: { /* ... */ }
}
```

#### Cast Event
```typescript
{
  timestamp: 1000,
  type: 'cast',
  sourceID: 1,
  sourceIsFriendly: true,
  targetID: 2,
  targetIsFriendly: false,
  abilityGameID: 217784, // Leashing Soul
  fight: 11
}
```

---

## Working with the Codebase

### When Searching for Signature Scripts

❌ **DON'T**:
```javascript
// Only checking combat events
const events = [
  ...damageEvents,
  ...healingEvents,
  ...buffEvents,
  ...debuffEvents
];
```

✅ **DO**:
```javascript
// Check ALL event types including resources
const events = [
  ...damageEvents,
  ...healingEvents,
  ...buffEvents,
  ...debuffEvents,
  ...resourceEvents, // ← Critical!
  ...castEvents
];
```

### Redux Selectors

The hook uses these Redux selectors to get combat data:

```typescript
// src/features/scribing/hooks/useScribingDetection.ts
const allBuffs = useSelector(selectBuffsByFight);
const debuffs = useSelector(selectDebuffsByFight);
const damage = useSelector(selectDamageByFight);
const casts = useSelector(selectCastsByFight);
const heals = useSelector(selectHealsByFight);
const resources = useSelector(selectResourceEvents); // ← Added for resource detection
```

### Database Lookups

#### Finding Signature Script by Ability ID

```typescript
// SIGNATURE_SCRIPT_ID_TO_NAME is built from scribing-complete.json
const scriptName = SIGNATURE_SCRIPT_ID_TO_NAME.get(abilityId);

// Example:
SIGNATURE_SCRIPT_ID_TO_NAME.get(216940) // → "Anchorite's Potency"
SIGNATURE_SCRIPT_ID_TO_NAME.get(217512) // → "Anchorite's Potency"
```

#### Finding Signature Scripts for a Grimoire

```json
// data/scribing-complete.json
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

---

## Testing Strategy

### Test Files

1. **`useScribingDetection.resource-events.test.ts`** (21 tests)
   - Core detection logic
   - Real-world scenarios
   - Edge cases

2. **`useScribingDetection.integration.test.ts`** (17 tests)
   - Hook integration
   - UI display
   - Redux selectors

### Running Tests

```bash
# All scribing detection tests
npm test -- useScribingDetection.*test.ts

# Specific suite
npm test -- useScribingDetection.resource-events.test.ts

# Watch mode
npm run test:watch -- useScribingDetection
```

### Test Coverage

✅ 38 tests total, all passing  
✅ 0 type errors  
✅ 0 lint errors  
✅ Full coverage of resource event detection  

---

## Common Pitfalls

### ❌ Pitfall #1: Only Checking Combat Events

**Problem**: Missing resource-based signatures like Anchorite's Potency

**Solution**: Always include resource events in searches

```javascript
// Add resource events to your search
const resourceMatches = resourceEvents.filter(e => 
  e.sourceID === playerId &&
  e.timestamp > castTime &&
  e.timestamp <= castTime + 1000
);
```

### ❌ Pitfall #2: Wrong Data Structure

**Problem**: Assuming events are in `data.data` array

**Solution**: Check actual file structure first

```javascript
// Check structure
const fileData = JSON.parse(fs.readFileSync(filePath));
const events = Array.isArray(fileData) ? fileData : fileData.data;
```

### ❌ Pitfall #3: Ignoring Player Filtering

**Problem**: Counting events from all players

**Solution**: Filter by sourceID

```javascript
const playerEvents = events.filter(e => e.sourceID === targetPlayerId);
```

### ❌ Pitfall #4: Not Checking Detection Window

**Problem**: Including events far after the cast

**Solution**: Enforce 1000ms window

```javascript
const DETECTION_WINDOW = 1000;
const validEvents = events.filter(e =>
  e.timestamp > cast.timestamp &&
  e.timestamp <= cast.timestamp + DETECTION_WINDOW
);
```

---

## Real-World Examples

### Example 1: Anchorite's Potency (Resource-based)

**Fight**: 11  
**Player**: 1  
**Ability**: Leashing Soul (217784)  
**Signature**: Anchorite's Potency  

**Detection Pattern**:
```
Cast #1: Leashing Soul @ 1000ms
  → Resource event: Potent Soul (216940) @ 1450ms (+450ms)
  → Grants +4 ultimate

Cast #2: Leashing Soul @ 2000ms
  → Resource event: Potent Soul (216940) @ 2550ms (+550ms)
  → Grants +4 ultimate

Cast #3: Leashing Soul @ 3000ms
  → Resource event: Potent Soul (216940) @ 3600ms (+600ms)
  → Grants +4 ultimate

Consistency: 3/3 = 100%
Confidence: 95% (capped)
```

**Search Script**: `test-signature-detection-algorithm.js`

### Example 2: Gladiator's Tenacity (Unknown Pattern)

**Grimoire**: Ulfsild's Contingency  
**Signature**: Gladiator's Tenacity  
**Ability IDs**: 217649, 217654  

**To Investigate**:
1. Find players casting Ulfsild's Contingency
2. Check ALL event types for abilities 217649, 217654
3. Look for events within 1000ms of casts
4. Calculate consistency across multiple casts

---

## Database Structure

### scribing-complete.json Organization

```json
{
  "grimoires": {
    "soul-burst": {
      "id": 217784,
      "name": "Soul Burst",
      "nameTransformations": {
        "magic-damage": {
          "name": "Wield Soul",
          "abilityIds": [217784]
        }
      }
    }
  },
  "signatureScripts": {
    "anchorites-potency": {
      "id": "anchorites-potency",
      "name": "Anchorite's Potency",
      "category": "signature",
      "description": "Enhances Soul Magic potency",
      "compatibleGrimoires": ["soul-burst", "wield-soul"],
      "abilityIds": [216940, 217512]
    }
  },
  "affixScripts": {
    "off-balance": {
      "id": "off-balance",
      "name": "Off Balance",
      "category": "affix",
      "compatibleGrimoires": [...],
      "abilityIds": [5805]
    }
  }
}
```

### Ability ID Mappings

Key signature script ability IDs to know:

| Signature Script | Ability IDs | Event Type | Effect |
|-----------------|-------------|------------|--------|
| Anchorite's Potency | 216940, 217512 | **resource** | +4 ultimate |
| Gladiator's Tenacity | 217649, 217654 | ? | Unknown |
| Warrior's Opportunity | 217358 | ? | Unknown |
| Growing Impact | 217655 | ? | Unknown |

---

## Quick Reference

### File Locations

```
src/
  features/
    scribing/
      hooks/
        useScribingDetection.ts          ← Main detection logic
        useScribingDetection.resource-events.test.ts  ← Tests
        useScribingDetection.integration.test.ts      ← Integration tests
      types/
        scribing-schemas.ts              ← Type definitions
  components/
    SkillTooltip.tsx                     ← UI display
  types/
    combatlogEvents.ts                   ← Event type definitions
data/
  scribing-complete.json                 ← Signature/affix database
data-downloads/
  7zj1ma8kD9xn4cTq/
    fight-11/
      events/
        cast-events.json                 ← Combat log data
        resource-events.json             ← Resource events
        damage-events.json               ← Damage events
        (etc.)
```

### Key Functions

```typescript
// Detection
detectSignatureScript(
  abilityId: number,
  playerId: number,
  combatEvents: CombatEvents
): SignatureScriptResult | null

// Hook usage
const { scribedSkillData, loading, error } = useSkillScribingData(
  fightId,
  playerId,
  abilityId
);

// Database lookup
getScribingSkillByAbilityId(abilityId: number)
SIGNATURE_SCRIPT_ID_TO_NAME.get(abilityId)
```

### Constants

```typescript
const DETECTION_WINDOW_MS = 1000;      // Post-cast analysis window
const MIN_CONSISTENCY = 0.5;           // 50% threshold
const MAX_CONFIDENCE = 0.95;           // 95% cap
```

---

## Action Items for Next Agent

### If Investigating New Signature Scripts:

1. **Find the grimoire ability ID** in scribing-complete.json
2. **List all signature scripts** compatible with that grimoire
3. **Get signature ability IDs** from the signatureScripts section
4. **Search ALL event types**:
   - Cast events (to find casts of main ability)
   - Resource events (for resource-granting signatures)
   - Buff events (for buff-granting signatures)
   - Damage events (for damage-dealing signatures)
   - Healing events (for healing signatures)
   - Debuff events (for debuff signatures)
5. **Check timing**: Events within 1000ms after cast
6. **Calculate consistency**: occurrences / totalCasts
7. **Update SIGNATURE_SCRIPT_ID_TO_NAME** if needed

### If Adding New Event Type Checks:

1. Update `useScribingDetection.ts` detection logic
2. Add Redux selector if needed
3. Update type definitions in `combatlogEvents.ts`
4. Add tests in `useScribingDetection.resource-events.test.ts`
5. Update this documentation

### If Debugging Detection Issues:

1. Run existing test scripts:
   - `test-signature-detection-algorithm.js`
   - `analyze-potent-soul-correlation.js`
2. Check ALL event types, not just combat events
3. Verify player sourceID filtering
4. Check detection window (1000ms)
5. Verify ability ID is in SIGNATURE_SCRIPT_ID_TO_NAME map

---

## Documentation References

- **RESOURCE_EVENT_DETECTION_SUMMARY.md**: Technical overview and verification results
- **TEST_COVERAGE_RESOURCE_EVENTS.md**: Test suite documentation
- **TEST_IMPLEMENTATION_SUMMARY.md**: Quick test reference
- **AGENTS.md**: General project documentation for AI agents

---

## Version History

**October 13, 2025**: Initial documentation created
- Documented resource event detection discovery
- Added Anchorite's Potency example
- Comprehensive testing strategy
- Common pitfalls and solutions

---

## Contact Context

This system detects scribing customizations from ESO combat logs:
- **Focus Scripts**: Determine damage type/main effect
- **Signature Scripts**: Add secondary effects (THIS DOCUMENT)
- **Affix Scripts**: Add tertiary effects/modifiers

The key insight is that signature scripts manifest in **different event types** depending on their effect:
- Resource-granting → **resource events**
- Buff-applying → buff events
- Damage-dealing → damage events
- Healing → healing events

**Always check ALL event types when investigating new signature scripts!**

---

*Last Updated: October 13, 2025*  
*Status: ✅ Resource event detection fully tested and documented*  
*Tests: 38/38 passing*
