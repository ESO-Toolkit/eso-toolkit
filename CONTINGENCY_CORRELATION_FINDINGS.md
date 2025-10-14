# Ulfsild's Contingency Correlation Analysis - Fight 11

## Summary

Player 7 cast **Ulfsild's Contingency** (ID: 240150) **6 times** during Fight 11.

## Strongly Correlated Signature & Focus Scripts

Based on buff events that appear after Ulfsild's Contingency casts:

### 1. **Damage Shield** (FOCUS SCRIPT)
- **Appears as**: "Warding Contingency" in combat
- **Ability ID**: 217608
- **Correlation**: Appears in 4 out of 6 casts (66.7%)
- **Total Events**: 24 buff events across all casts
- **Timing**: 1199ms - 2284ms after cast
- **Event Type**: Buff and Healing events
- **Classification**: **FOCUS SCRIPT** - "Damage Shield" (ID: 20)
- **Effect**: Provides damage shields
- **Database Status**: ✓ Found in scribing database (grimoire nameTransformations, key: "damage-shield")

### 2. **Gladiator's Tenacity** (SIGNATURE SCRIPT)
- **Appears as**: "Tenacious Contingency" in combat
- **Ability ID**: 217654
- **Correlation**: Appears consistently (24 buff events total)
- **Timing**: ~1217ms after cast
- **Event Type**: Buff events
- **Classification**: **SIGNATURE SCRIPT** - "Gladiator's Tenacity"
- **Effect**: Adds persistence/endurance effects
- **Database Status**: ✓ Found in scribing database (signatureScripts)
- **Compatible Grimoires**: Ulfsild's Contingency, Torchbearer## Other Strongly Correlated Abilities

### High Correlation (appear in 50%+ of casts):

These abilities consistently appear after Ulfsild's Contingency casts but are NOT scribing scripts:

1. **Reviving Barrier** (appears in most casts)
2. **Reviving Barrier Heal**
3. **Major Prophecy** (buff)
4. **Major Savagery** (buff)
5. **Echoing Vigor**
6. **Illustrious Healing**
7. **Siphoning Attacks**
8. **Minor Lifesteal**

## Analysis Findings

### Key Observations:

1. **Ulfsild's Contingency** (base ID: 222678 in database, but appears as ID: 240150 in combat)
   - This is a **transformation-based scribing skill**
   - It transforms into different variants based on signature and affix scripts

2. **Warding Contingency** is the most common transformation
   - Appears as both buff and healing events
   - Provides damage shields (based on nameTransformations in database)
   - This is the **"Damage Shield" FOCUS SCRIPT** (ID: 20) transformation
   - NOT an affix script - it's a focus script that changes the core effect

3. **Timing Pattern**:
   - The base Ulfsild's Contingency cast appears first
   - ~1-2 seconds later, the transformation effects (Warding/Tenacious Contingency) trigger
   - This suggests it may be a proc-based or delayed effect ability

4. **Player 7's Build**:
   - Player 7 is a healer (using Reviving Barrier, Illustrious Healing, Echoing Vigor)
   - The contingency skill provides additional utility/survivability
   - Most casts occur during healing rotations

## Recommendations for Detection

To properly detect Ulfsild's Contingency signature, focus, and affix scripts:

1. **Track the base cast** (ID: 240150 or 222678)
2. **Look for transformation events** within 1-3 seconds after the cast
3. **Check buff events** for variants like:
   - Warding Contingency (damage shield **FOCUS SCRIPT**)
   - Tenacious Contingency (Gladiator's Tenacity **SIGNATURE SCRIPT**)
   - Other contingency transformation names

4. **Cross-reference** with the scribing database's nameTransformations data
5. **Consider delayed triggers** - transformations don't happen instantly
6. **Understand the three script types**:
   - **Focus Script**: Changes the core effect (e.g., damage → healing → damage shield)
   - **Signature Script**: Adds additional effects (e.g., persistence, potency)
   - **Affix Script**: Adds secondary effects (e.g., status effects, buffs)

## Ability IDs to Track

### Confirmed Scribing Abilities:
- **Base Cast**: 240150 (Healing Contingency transformation), 222285 (also Healing Contingency)
- **Base Grimoire**: 222678 (Ulfsild's Contingency base ID in database)
- **Warding Contingency** (Focus Script - Damage Shield, ID: 20): 217608
- **Gladiator's Tenacity** (Signature Script): 217654 (appears as "Tenacious Contingency")

### Summary Table:

| Ability Name | Ability ID | Type | Category | Correlation |
|--------------|------------|------|----------|-------------|
| Ulfsild's Contingency (cast) | 240150 | Grimoire Cast | Healing transformation | 6 casts |
| Ulfsild's Contingency (buff) | 222285 | Grimoire Buff | Healing transformation | 5 events |
| Warding Contingency | 217608 | **Focus Script** | **Damage Shield (ID: 20)** | 24 events (66.7%) |
| Gladiator's Tenacity | 217654 | Signature Script | Persistence/Endurance | 24 events (100%) |

### Script Type Breakdown:
- **Focus Script**: Damage Shield → Creates "Warding Contingency"
- **Signature Script**: Gladiator's Tenacity → Creates "Tenacious Contingency" 
- **Affix Script**: Not detected in this fight (would add additional effects)

These IDs should be added to the scribing detection system's correlation tracker.
