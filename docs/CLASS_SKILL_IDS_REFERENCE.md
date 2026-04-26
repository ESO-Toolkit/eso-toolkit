# Class Skill IDs Reference

This file contains all base skill IDs found in abilities.json for class skills.
Use these to replace the `id: 0` placeholders in the skill line files.

## ✅ Found (102 skills)

### Arcanist - Curative Runeforms
- Evolving Runemend: **186189**
- Runic Jolt: **178447**
- Runeguard of Freedom: **186489**
- Runic Defense: **178451**
- Runic Embrace: **186531**

### Arcanist - Herald of the Tome
- Fatecarver: **185805**
- Cephaliarch's Flail: **183006**
- Tome-Bearer's Inspiration: **186452**
- Hideous Clarity: **185240** (passive)

### Arcanist - Soldier of Apocrypha
- Runeblades: **185794**
- Abyssal Impact: **185817**
- The Imperfect Ring: **185836**
- Fulminating Rune: **182988**

### Templar - Aedric Spear
- Radial Sweep: **22138**
- Puncturing Strikes: **26114**
- Piercing Javelin: **26158**
- Spear Shards: **26188**
- Sun Shield: **22178**
- Focused Charge: **13538**

### Templar - Dawn's Wrath
- Nova: **21752**
- Sun Fire: **21726**
- Solar Flare: **22057**
- Backlash: **21761**
- Eclipse: **21776**
- Radiant Destruction: **63029**

### Templar - Restoring Light
- Rite of Passage: **22223**
- Rushed Ceremony: **22250**
- Cleansing Ritual: **22265**
- Rune Focus: **22234**
- Restoring Aura: **26209**
- Radiant Aura: **26807**

### Dragonknight - Ardent Flame
- Dragonknight Standard: **28988**
- Lava Whip: **23806**
- Searing Strike: **20657**
- Fiery Breath: **4771**
- Inferno: **25954**
- Flames of Oblivion: **32853**

### Dragonknight - Draconic Power
- Dragon Leap: **29012**
- Spiked Armor: **20319**
- Dragon Blood: **29004**
- Reflective Scale: **233320**
- Inhale: **31837**
- Iron Skin: **29455** (passive)

### Dragonknight - Earthen Heart
- Magma Armor: **15957**
- Stonefist: **29032**
- Molten Weapons: **29043**
- Obsidian Shield: **29071**
- Petrify: **29037**
- Fossilize: **32685**

### Sorcerer - Daedric Summoning
- Summon Storm Atronach: **23634**
- Summon Unstable Familiar: **23304**
- Daedric Curse: **24326**
- Summon Winged Twilight: **24613**
- Conjured Ward: **28418**
- Bound Armor: **24158**

### Sorcerer - Dark Magic
- Negate Magic: **27706**
- Crystal Shard: **43714**
- Encase: **4737**
- Rune Prison: **24371**
- Dark Exchange: **24584**
- Daedric Mines: **24828**

### Sorcerer - Storm Calling
- Overload: **24785**
- Mages' Fury: **18718**
- Lightning Form: **23210**
- Lightning Splash: **23182**
- Surge: **15469**
- Bolt Escape: **23234**

### Nightblade - Assassination
- Death Stroke: **33398**
- Veiled Strike: **25255**
- Teleport Strike: **18342**
- Assassin's Blade: **33386**
- Mark Target: **33357**
- Grim Focus: **61902**

### Nightblade - Shadow
- Consuming Darkness: **25411**
- Shadow Cloak: **25375**
- Blur: **33375**
- Path of Darkness: **33195**
- Aspect of Terror: **14350**
- Summon Shade: **33211**

### Nightblade - Siphoning
- Soul Shred: **25091**
- Strife: **33291**
- Malevolent Offering: **33308**
- Cripple: **33326**
- Siphoning Strikes: **33319**
- Drain Power: **33316**

### Warden - Animal Companions
- Feral Guardian: **85982**
- Dive: **5441**
- Scorch: **65584**
- Swarm: **73172**
- Betty Netch: **86050**
- Falcon's Swiftness: **86037**

### Warden - Green Balance
- Secluded Grove: **85532**
- Fungal Growth: **85536**
- Healing Seed: **85578**
- Living Vines: **85552**
- Lotus Flower: **85539**
- Nature's Grasp: **56575**

### Warden - Winter's Embrace
- Sleet Storm: **86109**
- Frost Cloak: **86122**
- Impaling Shards: **86161**
- Arctic Wind: **86148**
- Crystallized Shield: **86135**
- Frozen Gate: **86175**

## ❌ Not Found (2 skills)
- Runic Sorcery (Arcanist passive - may not have ability ID)
- Reflective Scale (found as "Reflective Scales" - ID **233320**)

## Notes
- **Total found**: 102/104 base skills
- Morph IDs still need to be looked up individually
- Passives may not all have ability IDs in abilities.json
- Use `baseSkillId` references to link morphs to base skills

## Usage
When updating skill files, replace:
```typescript
{ id: 0, name: 'Skill Name', category: CATEGORY }, // TODO: Find ID
```

With:
```typescript
{ id: XXXXX, name: 'Skill Name', category: CATEGORY },
```

And update baseSkillId references for morphs:
```typescript
{ id: 0, name: 'Morph Name', category: CATEGORY, baseSkillId: XXXXX }, // TODO: Find morph ID
```
