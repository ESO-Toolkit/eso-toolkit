# ESO Scribing System Documentation

This document provides comprehensive information about the ESO Scribing system implementation in the log aggregator, including transformation patterns, ability mappings, and troubleshooting information.

## Unmatched Scribing Transformations

The following scribing transformations do not have matching ability IDs in the abilities.json database. This may indicate that these affix script combinations don't exist in the current game build, or the transformation names need to be corrected.

> **Recent Cleanup**: Database was systematically cleaned to remove 33 invalid affix script combinations that don't exist in the game, improving the overall match rate from 45% to 70%.

**Total Unmatched**: 31 out of 104 total transformations

### By Grimoire

#### Elemental Explosion
**Unmatched Affix Scripts**: 2

- **shock-damage**: "Shocking Explosion"
- **frost-damage**: "Chilling Explosion"

#### Mender's Bond
**Unmatched Affix Scripts**: 1

- **healing**: "Healing Bond"

#### Shield Throw
**Unmatched Affix Scripts**: 2

- **frost-damage**: "Chilling Throw"
- **pull**: "Leashing Throw"

#### Smash
**Unmatched Affix Scripts**: 3

- **poison-damage**: "Venomous Smash"
- **bleed-damage**: "Bloody Smash"
- **taunt**: "Goading Smash"

#### Soul Burst
**Unmatched Affix Scripts**: 4

- **disease-damage**: "Pestilent Burst"
- **bleed-damage**: "Bloody Burst"
- **frost-damage**: "Chilling Burst"
- **flame-damage**: "Fiery Burst"

#### Torchbearer
**Unmatched Affix Scripts**: 2

- **bleed-damage**: "Bloody Torch"
- **frost-damage**: "Chilling Torch"

#### Trample
**Unmatched Affix Scripts**: 3

- **disease-damage**: "Pestilent Trample"
- **frost-damage**: "Chilling Trample"
- **knockback**: "Repelling Trample"

#### Traveling Knife
**Unmatched Affix Scripts**: 3

- **poison-damage**: "Venomous Knife"
- **bleed-damage**: "Bloody Knife"
- **frost-damage**: "Chilling Knife"

#### Ulfsild's Contingency
**Unmatched Affix Scripts**: 3

- **shock-damage**: "Shocking Contingency"
- **frost-damage**: "Chilling Contingency"
- **flame-damage**: "Fiery Contingency"

#### Vault
**Unmatched Affix Scripts**: 3

- **poison-damage**: "Venomous Vault"
- **disease-damage**: "Pestilent Vault"
- **bleed-damage**: "Bloody Vault"

#### Wield Soul
**Unmatched Affix Scripts**: 5

- **disease-damage**: "Pestilent Soul"
- **bleed-damage**: "Bloody Soul"
- **shock-damage**: "Shocking Soul"
- **frost-damage**: "Chilling Soul"
- **flame-damage**: "Fiery Soul"

### By Focus Script Type

#### BLEED DAMAGE
**Affected Grimoires**: 6

- **Smash**: "Bloody Smash"
- **Soul Burst**: "Bloody Burst"
- **Torchbearer**: "Bloody Torch"
- **Traveling Knife**: "Bloody Knife"
- **Vault**: "Bloody Vault"
- **Wield Soul**: "Bloody Soul"

#### DISEASE DAMAGE
**Affected Grimoires**: 4

- **Soul Burst**: "Pestilent Burst"
- **Trample**: "Pestilent Trample"
- **Vault**: "Pestilent Vault"
- **Wield Soul**: "Pestilent Soul"

#### FLAME DAMAGE
**Affected Grimoires**: 3

- **Soul Burst**: "Fiery Burst"
- **Ulfsild's Contingency**: "Fiery Contingency"
- **Wield Soul**: "Fiery Soul"

#### FROST DAMAGE
**Affected Grimoires**: 8

- **Elemental Explosion**: "Chilling Explosion"
- **Shield Throw**: "Chilling Throw"
- **Soul Burst**: "Chilling Burst"
- **Torchbearer**: "Chilling Torch"
- **Trample**: "Chilling Trample"
- **Traveling Knife**: "Chilling Knife"
- **Ulfsild's Contingency**: "Chilling Contingency"
- **Wield Soul**: "Chilling Soul"

#### HEALING
**Affected Grimoires**: 1

- **Mender's Bond**: "Healing Bond"

#### KNOCKBACK
**Affected Grimoires**: 1

- **Trample**: "Repelling Trample"

#### POISON DAMAGE
**Affected Grimoires**: 3

- **Smash**: "Venomous Smash"
- **Traveling Knife**: "Venomous Knife"
- **Vault**: "Venomous Vault"

#### PULL
**Affected Grimoires**: 1

- **Shield Throw**: "Leashing Throw"

#### SHOCK DAMAGE
**Affected Grimoires**: 3

- **Elemental Explosion**: "Shocking Explosion"
- **Ulfsild's Contingency**: "Shocking Contingency"
- **Wield Soul**: "Shocking Soul"

#### TAUNT
**Affected Grimoires**: 1

- **Smash**: "Goading Smash"

### Summary Statistics

- **Total Grimoires with Unmatched**: 11 out of 12
- **Most Problematic Focus Scripts**:
  - FROST DAMAGE: 8 grimoires
  - BLEED DAMAGE: 6 grimoires
  - DISEASE DAMAGE: 4 grimoires
  - SHOCK DAMAGE: 3 grimoires
  - POISON DAMAGE: 3 grimoires
- **Vault**: "Venomous Vault"

#### STUN
**Affected Grimoires**: 3

- **Soul Burst**: "Dazing Burst"
- **Ulfsild's Contingency**: "Dazing Contingency"
- **Vault**: "Dazing Vault"

#### MAGIC DAMAGE
**Affected Grimoires**: 2

- **Torchbearer**: "Magical Torchbearer"
- **Vault**: "Magical Vault"

#### GENERATE ULTIMATE
**Affected Grimoires**: 1

- **Torchbearer**: "Heroic Torchbearer"

#### KNOCKBACK
**Affected Grimoires**: 1

- **Trample**: "Repelling Trample"

#### PHYSICAL DAMAGE
**Affected Grimoires**: 1

- **Ulfsild's Contingency**: "Sundering Contingency"

#### PULL
**Affected Grimoires**: 1

- **Shield Throw**: "Leashing Shield"

#### TAUNT
**Affected Grimoires**: 1

- **Smash**: "Goading Smash"

### Summary Statistics

- **Total Grimoires with Unmatched**: 11 out of 12
- **Most Problematic Focus Scripts**:
  - FROST DAMAGE: 9 grimoires
  - BLEED DAMAGE: 6 grimoires
  - SHOCK DAMAGE: 4 grimoires
  - DISEASE DAMAGE: 4 grimoires
  - POISON DAMAGE: 3 grimoires

---

## Scribing Transformation Patterns

The ESO Scribing system uses consistent naming patterns for transformed abilities based on the affix script applied:

### Damage Affix Scripts
- **Physical Damage**: "Sundering [Skill]" (e.g., "Sundering Banner")
- **Magic Damage**: "Magical [Skill]" (e.g., "Magical Bond")  
- **Shock Damage**: "Shocking [Skill]" (e.g., "Shocking Banner")
- **Flame/Fire Damage**: "Fiery [Skill]" (e.g., "Fiery Explosion")
- **Frost/Ice Damage**: "Chilling [Skill]" (e.g., "Chilling Banner")
- **Poison Damage**: "Venomous [Skill]" (e.g., "Venomous Knife")
- **Disease Damage**: "Pestilent [Skill]" (e.g., "Pestilent Burst")
- **Bleed Damage**: "Bloody [Skill]" (e.g., "Bloody Contingency")

### Effect Affix Scripts
- **Healing**: "Healing [Skill]" (e.g., "Healing Banner")
- **Damage Shield**: "Warding [Skill]" (e.g., "Warding Bond")
- **Knockback**: "Repelling [Skill]" (e.g., "Repelling Explosion")
- **Pull**: "Leashing [Skill]" (e.g., "Leashing Soul")
- **Stun**: "Dazing [Skill]" (e.g., "Dazing Explosion")
- **Immobilize**: "Binding [Skill]" (e.g., "Binding Banner")
- **Dispel**: "Dispelling [Skill]" (e.g., "Dispelling Explosion")
- **Taunt**: "Goading [Skill]" (e.g., "Goading Shield")

### Utility Affix Scripts
- **Generate Ultimate**: "Heroic [Skill]" (e.g., "Heroic Bond")
- **Restore Resources**: "Restorative [Skill]" (e.g., "Restorative Banner")
- **Mitigation**: "Fortifying [Skill]" (e.g., "Fortifying Bond")
- **Multi-Target**: "Shattering [Skill]" (e.g., "Shattering Banner")
- **Trauma**: "Traumatic [Skill]" (e.g., "Traumatic Explosion")

### Skill Name Mappings

Some scribing skills use shortened versions of their full names in transformations:

- **Banner Bearer** → "Banner"
- **Mender's Bond** → "Bond"  
- **Shield Throw** → "Shield"
- **Elemental Explosion** → "Explosion"
- **Soul Burst** → "Burst"
- **Torchbearer** → "Torch"
- **Traveling Knife** → "Knife"
- **Ulfsild's Contingency** → "Contingency"
- **Wield Soul** → "Soul"
- **Trample** → "Trample" (unchanged)
- **Vault** → "Vault" (unchanged)
- **Smash** → "Smash" (unchanged)

---

## File Structure

### Core Data Files
- `data/scribing-complete.json` - Complete scribing database with transformations and ability IDs
- `data/abilities.json` - Complete ESO abilities database with names and metadata
- `scribing-transformations-validation.md` - Generated validation documentation

### Analysis Scripts
- `scripts/generate-scribing-validation.js` - Generates comprehensive validation documentation
- `scripts/generate-unmatched-analysis.js` - Analyzes unmatched transformations
- `scripts/rebuild-all-ability-mappings.js` - Rebuilds all ability ID mappings from scratch

### Pattern Correction Scripts
- `scripts/fix-generate-ultimate.js` - Fixes generate-ultimate pattern to "Heroic XXX"
- `scripts/fix-restore-resources.js` - Fixes restore-resources pattern to "Restorative XXX"
- `scripts/fix-immobilize.js` - Fixes immobilize pattern to "Binding XXX"
- `scripts/fix-healing.js` - Fixes healing pattern to "Healing XXX"
- `scripts/fix-mitigation.js` - Fixes mitigation pattern to "Fortifying XXX"
- `scripts/fix-knockback-dispel-stun.js` - Fixes knockback/dispel/stun patterns
- `scripts/fix-taunt-pull.js` - Fixes taunt/pull patterns to "Goading XXX"/"Leashing XXX"
- `scripts/fix-damage-shield.js` - Fixes damage-shield pattern to "Warding XXX"

### Database Maintenance Scripts
- `scripts/clean-scribing-database.js` - Cleans invalid ability IDs from database
- `scripts/ultra-strict-cleanup.js` - Ultra-strict cleanup using exact matching only
- `scripts/update-*-abilities.js` - Updates abilities.json to match transformation patterns

---

## Usage Instructions

### Regenerating Documentation
```bash
# Generate validation documentation with highlighted unmatched transformations
node scripts/generate-scribing-validation.js

# Generate analysis of unmatched transformations
node scripts/generate-unmatched-analysis.js
```

### Rebuilding Database
```bash
# Remove all ability IDs and rebuild from scratch using exact name matching
node scripts/rebuild-all-ability-mappings.js
```

### Fixing Transformation Patterns
```bash
# Fix specific affix script patterns
node scripts/fix-[pattern-name].js
node scripts/update-[pattern-name]-abilities.js
```

### Database Validation
The system uses exact name matching between `scribing-complete.json` transformations and `abilities.json` entries. Unmatched transformations may indicate:

1. **Non-existent combinations**: Affix script + grimoire combinations that don't exist in the game
2. **Incorrect naming**: Transformation names that don't match the actual ability names
3. **Missing abilities**: Abilities that exist in game but aren't in the abilities database
4. **Pattern errors**: Incorrect application of naming patterns

---

## Troubleshooting

### Common Issues

**Q: Why do some transformations have no ability IDs?**
A: This typically indicates the affix script + grimoire combination doesn't exist in the current game build, or the transformation name pattern is incorrect.

**Q: How do I fix incorrect transformation names?**
A: Use the appropriate pattern correction script, then run the corresponding ability update script, followed by rebuilding the ability mappings.

**Q: Why are there so many unmatched frost/shock damage transformations?**
A: These damage types may not be available for all scribing skills, or the naming patterns may need adjustment.

**Q: How often should the database be rebuilt?**
A: Rebuild after any pattern corrections or when the abilities.json database is updated.

### Validation Workflow

1. Run `generate-scribing-validation.js` to see current state
2. Identify problematic patterns in the unmatched section
3. Apply pattern corrections using fix scripts
4. Update abilities.json with corresponding update scripts  
5. Rebuild ability mappings with `rebuild-all-ability-mappings.js`
6. Regenerate documentation to verify improvements

---

## All Scribing Combinations by Focus Script

Complete listing of all scribing skill combinations organized by focus script type. Combinations marked with ❌ do not have matching ability IDs in the database.

### Bleed Damage
  * ❌ Smash → "Bloody Smash"
  * ❌ Soul Burst → "Bloody Burst"
  * ❌ Torchbearer → "Bloody Torch"
  * ❌ Traveling Knife → "Bloody Knife"
  * ✅ Ulfsild's Contingency → "Bloody Contingency"
  * ❌ Vault → "Bloody Vault"
  * ❌ Wield Soul → "Bloody Soul"

### Damage Shield
  * ✅ Mender's Bond → "Warding Bond"
  * ✅ Smash → "Warding Smash"
  * ✅ Soul Burst → "Warding Burst"
  * ✅ Ulfsild's Contingency → "Warding Contingency"
  * ✅ Wield Soul → "Warding Soul"

### Disease Damage
  * ❌ Soul Burst → "Pestilent Burst"
  * ❌ Trample → "Pestilent Trample"
  * ❌ Vault → "Pestilent Vault"
  * ❌ Wield Soul → "Pestilent Soul"

### Dispel
  * ✅ Elemental Explosion → "Dispelling Explosion"
  * ✅ Trample → "Dispelling Trample"

### Flame Damage
  * ✅ Banner Bearer → "Fiery Banner"
  * ✅ Elemental Explosion → "Fiery Explosion"
  * ❌ Soul Burst → "Fiery Burst"
  * ✅ Torchbearer → "Fiery Torch"
  * ❌ Ulfsild's Contingency → "Fiery Contingency"
  * ✅ Vault → "Fiery Vault"
  * ❌ Wield Soul → "Fiery Soul"

### Frost Damage
  * ❌ Elemental Explosion → "Chilling Explosion"
  * ❌ Shield Throw → "Chilling Throw"
  * ❌ Soul Burst → "Chilling Burst"
  * ❌ Torchbearer → "Chilling Torch"
  * ❌ Trample → "Chilling Trample"
  * ❌ Traveling Knife → "Chilling Knife"
  * ❌ Ulfsild's Contingency → "Chilling Contingency"
  * ❌ Wield Soul → "Chilling Soul"

### Generate Ultimate
  * ✅ Mender's Bond → "Heroic Bond"
  * ✅ Torchbearer → "Heroic Torch"

### Healing
  * ❌ Mender's Bond → "Healing Bond"
  * ✅ Smash → "Healing Smash"
  * ✅ Soul Burst → "Healing Burst"
  * ✅ Torchbearer → "Healing Torch"
  * ✅ Ulfsild's Contingency → "Healing Contingency"
  * ✅ Vault → "Healing Vault"
  * ✅ Wield Soul → "Healing Soul"

### Immobilize
  * ✅ Banner Bearer → "Binding Banner"
  * ✅ Mender's Bond → "Binding Bond"
  * ✅ Shield Throw → "Binding Shield"
  * ✅ Soul Burst → "Binding Burst"
  * ✅ Ulfsild's Contingency → "Binding Contingency"
  * ✅ Vault → "Binding Vault"

### Knockback
  * ✅ Elemental Explosion → "Repelling Explosion"
  * ✅ Shield Throw → "Repelling Shield"
  * ✅ Smash → "Repelling Smash"
  * ✅ Torchbearer → "Repelling Torch"
  * ❌ Trample → "Repelling Trample"
  * ✅ Ulfsild's Contingency → "Repelling Contingency"

### Magic Damage
  * ✅ Banner Bearer → "Magical Banner"
  * ✅ Elemental Explosion → "Magical Explosion"
  * ✅ Mender's Bond → "Magical Bond"
  * ✅ Shield Throw → "Magical Throw"
  * ✅ Smash → "Magical Smash"
  * ✅ Soul Burst → "Magical Burst"
  * ✅ Trample → "Magical Trample"
  * ✅ Traveling Knife → "Magic Knife"
  * ✅ Ulfsild's Contingency → "Magical Contingency"
  * ✅ Wield Soul → "Magical Soul"

### Mitigation
  * ✅ Banner Bearer → "Fortifying Banner"
  * ✅ Mender's Bond → "Fortifying Bond"

### Multi-Target
  * ✅ Banner Bearer → "Shattering Banner"
  * ✅ Shield Throw → "Shattering Throw"
  * ✅ Traveling Knife → "Shattering Knife"

### Physical Damage
  * ✅ Banner Bearer → "Sundering Banner"
  * ✅ Elemental Explosion → "Sundering Explosion"
  * ✅ Shield Throw → "Sundering Throw"
  * ✅ Smash → "Sundering Smash"
  * ✅ Soul Burst → "Sundering Burst"
  * ✅ Torchbearer → "Sundering Torch"
  * ✅ Trample → "Sundering Trample"
  * ✅ Traveling Knife → "Sundering Knife"
  * ✅ Vault → "Sundering Vault"
  * ✅ Wield Soul → "Sundering Soul"

### Poison Damage
  * ❌ Smash → "Venomous Smash"
  * ❌ Traveling Knife → "Venomous Knife"
  * ❌ Vault → "Venomous Vault"

### Pull
  * ❌ Shield Throw → "Leashing Throw"
  * ✅ Soul Burst → "Leashing Burst"
  * ✅ Traveling Knife → "Leashing Knife"
  * ✅ Wield Soul → "Leashing Soul"

### Restore Resources
  * ✅ Banner Bearer → "Restorative Banner"
  * ✅ Mender's Bond → "Restorative Bond"

### Shock Damage
  * ✅ Banner Bearer → "Shocking Banner"
  * ❌ Elemental Explosion → "Shocking Explosion"
  * ✅ Soul Burst → "Shocking Burst"
  * ❌ Ulfsild's Contingency → "Shocking Contingency"
  * ❌ Wield Soul → "Shocking Soul"

### Stun
  * ✅ Elemental Explosion → "Dazing Explosion"
  * ✅ Smash → "Dazing Smash"
  * ✅ Torchbearer → "Dazing Torch"
  * ✅ Trample → "Dazing Trample"
  * ✅ Traveling Knife → "Dazing Knife"
  * ✅ Wield Soul → "Dazing Soul"

### Taunt
  * ✅ Shield Throw → "Goading Shield"
  * ❌ Smash → "Goading Smash"
  * ✅ Vault → "Goading Vault"

### Trauma
  * ✅ Elemental Explosion → "Traumatic Explosion"
  * ✅ Trample → "Traumatic Trample"

### Summary Statistics

- **Total Combinations**: 104
- **Valid Combinations**: 73
- **Missing Combinations**: 31
- **Success Rate**: 70%
- **Focus Script Types**: 21