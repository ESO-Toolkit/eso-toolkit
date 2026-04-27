-- Fix beam build data: wrong skills (Runeblades/Tentacular Dread), wrong food,
-- missing subclass explanation. Corrected from Skinny Cheeks, Alcast, Hyperioxes,
-- Dottz Gaming guides (2025-2026 meta).

-- Replace the incorrect beam build with corrected version
UPDATE knowledge_docs
SET content = '## Beginner Beam Build (Arcanist Base + Subclasses)

The beam build uses **Arcanist** as the base class (for Fatecarver, Crux, and Herald of the Tome skills) with **Nightblade Assassination** and **Templar Dawn''s Wrath** subclasses. Any race works but High Elf or Dark Elf are optimal.

### Gear Table
| Slot | Set | Trait | Enchant |
|------|-----|-------|---------|
| Head | Any Trial Monster Set or Velothi | Divines | Max Magicka |
| Shoulders | Any Trial Monster Set | Divines | Max Magicka |
| Chest | Perfected Null Arca | Divines | Max Magicka |
| Legs | Perfected Null Arca | Divines | Max Magicka |
| Hands | Perfected Null Arca | Divines | Max Magicka |
| Waist | Perfected Null Arca | Divines | Max Magicka |
| Feet | Perfected Null Arca | Divines | Max Magicka |
| Necklace | Advancing Yokeda or Heartland Conqueror | Bloodthirsty | Weapon Damage |
| Ring 1 | Advancing Yokeda or Heartland Conqueror | Bloodthirsty | Weapon Damage |
| Ring 2 | Velothi Amulet (Mythic) | — | — |
| Front Bar | Advancing Yokeda/Heartland Conqueror Daggers | Nirnhoned + Charged | Flame / Poison |
| Back Bar | Perfected Maelstrom Greatsword | Infused | Weapon Damage (Berserker) |

### Starter Gear (Pre-Trial)
Players without trial gear should start with:
- Body: Mothers Sorrow (overland Deshaan) or Julianos (crafted)
- Weapons + Jewelry: Orders Wrath (crafted, guaranteed crit)
- Mythic: Velothi Amulet (top priority to farm)
- Monster: 1pc Slimecraw (easy to get, gives crit)

### Front Bar Skills (Dual Wield Daggers)
1. **Pragmatic Fatecarver** (Arcanist, Herald of the Tome) — channeled beam, hold full ~2.5s. Provides damage shield (beginner-friendly morph)
2. **Cephaliarch''s Flail** (Arcanist, Herald of the Tome) — Crux builder. Use to reach 3 Crux then beam. Costs Stamina regardless of build
3. **Quick Cloak** (Dual Wield) — procs weapon enchants during Fatecarver channel, buffs damage
4. **Radiant Glory** (Templar subclass, Dawn''s Wrath) — execute below 33% HP, replaces Fatecarver in execute phase
5. **Camouflaged Hunter** (Fighters Guild) — Minor Berserk + passive Fighters Guild crit bonus

### Back Bar Skills (Two-Handed Greatsword)
1. **Stampede** (Two Handed) — gap closer + Maelstrom Greatsword buff + ground DoT
2. **Solar Barrage** (Templar subclass, Dawn''s Wrath) — 22s DoT + 5% class ability damage buff. Main source of Major Sorcery
3. **Inspired Scholarship** (Arcanist, Herald of the Tome) — 30s buff that grants free Crux generation passively
4. **Relentless Focus** (Nightblade subclass, Assassination) — keep active, fire Assassin''s Will proc at 5 stacks
5. **Barbed Trap** (Fighters Guild) — Minor Force source if not using Velothi setup

### Ultimate
- **Incapacitating Strike** (Nightblade subclass, Assassination) — 70 cost, massive damage amp. Use on cooldown after opener
- **The Languid Eye** (Arcanist) — AoE ultimate for trash packs

### Rotation
1. Pre-buff: Inspired Scholarship (30s, refresh when it drops) + Potion
2. Opener: Incapacitating Strike → Solar Barrage → Stampede → Bar Swap
3. Front bar: Cephaliarch''s Flail x1-2 (until 3 Crux) → Quick Cloak → Pragmatic Fatecarver (full channel)
4. After beam ends: Refresh back bar DoTs if needed (Solar Barrage, Stampede), then repeat step 3
5. Below 33% boss HP: Replace Fatecarver with Radiant Glory spam
6. Fire Assassin''s Will (from Relentless Focus) whenever it procs at 5 stacks

### Key Tips
- Mundus: The Thief (critical chance)
- Food: Ghastly Eye Bowl (Max Magicka + Mag Recovery) for sustain, or Thrice-Baked Gorapple Pie (Max Magicka) for parsing
- Potions: Spell Power or Tri-stat
- All 64 attribute points into Magicka (or 64 Stamina if running stam version — Flail always costs Stamina so stam builds have better sustain)
- Always light attack weave between abilities — single most impactful DPS technique
- Fatecarver channels for ~2.5 seconds — do NOT cancel early
- Cephaliarch''s Flail is the Crux builder, NOT Runeblades. Runeblades is for the advanced melee DK build, not the beam build
- The subclass setup (Nightblade Assassination + Templar Dawn''s Wrath) is what makes this build strong — Incapacitating Strike damage amp + Solar Barrage buff + Radiant Glory execute',
source = 'verified'
WHERE title = 'Beginner Beam Build - Full Setup';

-- Update Sorcerer-specific doc to clarify it is an alternative to the meta Arcanist version
UPDATE knowledge_docs
SET content = '### Sorcerer Alternative for Beam Builds

While the meta beam build uses **Arcanist base class** with Nightblade/Templar subclasses, Sorcerer is a viable beginner-friendly alternative due to built-in survivability:

**Sorcerer Advantages:**
- Critical Surge (Storm Calling) heals on every critical hit — essentially permanent self-healing
- Volatile Familiar or Twilight Tormentor pets deal passive damage without rotation input
- Hurricane (Storm Calling) provides Major Resolve + AoE damage on back bar
- Very forgiving if you drop your rotation — pets and Surge keep you alive

**Sorcerer Back Bar Setup:**
1. Stampede (Two Handed) — Maelstrom buff
2. Hurricane (Storm Calling) — Major Resolve + AoE
3. Liquid Lightning (Storm Calling) — ground AoE DoT
4. Critical Surge (Storm Calling) — Major Sorcery + crit healing
5. Camouflaged Hunter or Boundless Storm — flex

**Important:** The Sorcerer version has a lower DPS ceiling than the Arcanist subclass version because it lacks Incapacitating Strike damage amp, Solar Barrage class damage buff, and Radiant Glory execute. However, it is easier to stay alive with and is a good stepping stone before learning the full subclass rotation.

**When to use Sorcerer beam:** If you are brand new to vet trials and dying frequently. Once comfortable with mechanics, transition to the Arcanist subclass version for higher DPS.

**Class comparison for beam builds:**
- Arcanist base (meta): Highest DPS ceiling. Subclass into NB + Templar. Best for experienced players
- Sorcerer: Easiest to survive with. Good starter. Lower DPS ceiling
- Any class works with subclassing — Arcanist Herald of the Tome skills are available to all classes via subclassing',
source = 'verified'
WHERE title = 'Sorcerer Beam Build Specifics';
