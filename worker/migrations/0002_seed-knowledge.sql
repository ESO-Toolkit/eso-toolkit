-- Seed initial ESO knowledge base with accurate game data
-- These entries provide foundational knowledge for the AI assistant

-- ─── Weapon Traits ──────────────────────────────────────────────────────────

INSERT INTO knowledge_docs (doc_type, title, content) VALUES
('trait', 'Nirnhoned Weapon Trait', 'Nirnhoned increases Weapon and Spell Damage by a flat amount. It is the highest raw damage trait for weapons and is best-in-slot for most DPS front bar weapons. The damage bonus scales with weapon quality (gold Nirnhoned gives ~350 Weapon/Spell Damage). Requires Potent Nirncrux to craft. Works on all weapon types.'),

('trait', 'Precise Weapon Trait', 'Precise increases Weapon and Spell Critical by a percentage. Strong alternative to Nirnhoned when builds are not at the Critical cap. At gold quality, provides approximately 3.46% extra critical chance. Often used on front bar for builds that need more critical rating to hit the critical damage cap with Shadow mundus.'),

('trait', 'Sharpened Weapon Trait', 'Sharpened increases Physical and Spell Penetration. At gold quality provides ~3,276 penetration. Useful when a group lacks penetration debuffs (like Major Breach or Crusher). In optimized trial groups with full debuffs, Nirnhoned or Precise typically outperform Sharpened since the penetration cap is already reached.'),

('trait', 'Infused Weapon Trait', 'Infused increases weapon enchantment effect by 30% and reduces enchantment cooldown by 50%. Best-in-slot for back bar weapons in almost all PvE DPS builds because it amplifies enchant procs like Berserker (Weapon Damage) or Absorb Magicka. The cooldown reduction means more enchant uptime during back bar abilities.'),

('trait', 'Powered Weapon Trait', 'Powered increases Healing Done by a percentage. Best-in-slot trait for healer weapons (typically on restoration staff). At gold quality provides ~9.7% increased healing done. Also useful on some support-oriented PvP builds.'),

('trait', 'Charged Weapon Trait', 'Charged increases Status Effect chance by a large percentage. At gold quality provides ~480% increased proc chance. Used in builds that rely on status effects like Burning (fire), Concussion (shock), or Poisoned. Niche use in some PvP and dungeon builds but rarely best-in-slot for trial DPS.'),

('trait', 'Defending Weapon Trait', 'Defending increases Physical and Spell Resistance. Best-in-slot trait for tank weapons. At gold quality provides ~3,276 resistance. Tanks typically run Defending on both bars or combine with Infused on one bar for enchantment uptime.'),

('trait', 'Decisive Weapon Trait', 'Decisive gives a chance to gain additional Ultimate when using a Light or Heavy Attack. Niche trait, rarely used in optimized builds. Some tanks use it for faster ultimate generation in dungeons. Not recommended for DPS.'),

('trait', 'Training Weapon Trait', 'Training increases experience gained from kills. Only used for leveling characters. Never used in endgame builds. Stacks with other XP bonuses like Ambrosia and ESO Plus.');

-- ─── Weapon Enchantments ────────────────────────────────────────────────────

INSERT INTO knowledge_docs (doc_type, title, content) VALUES
('enchant', 'Berserker Enchantment (Weapon Damage)', 'The Berserker enchantment (officially "Increase Weapon and Spell Damage") adds Weapon and Spell Damage for 5 seconds on proc. Best-in-slot back bar enchant for almost all DPS builds when combined with Infused trait. At gold quality on a two-handed weapon, provides approximately 452 Weapon/Spell Damage. Procs on weapon swap or ability use. Glyph of Weapon Damage.'),

('enchant', 'Absorb Magicka Enchantment', 'Absorb Magicka enchantment deals Magic damage and restores Magicka on proc. Useful for sustain on Magicka DPS builds. Often used as a front bar enchant for Magicka DPS or on the back bar as an alternative to Berserker when sustain is an issue. Glyph of Absorb Magicka.'),

('enchant', 'Absorb Stamina Enchantment', 'Absorb Stamina enchantment deals Physical damage and restores Stamina on proc. Primary sustain enchant for Stamina DPS builds. Usually placed on the back bar or front bar depending on rotation needs. Glyph of Absorb Stamina.'),

('enchant', 'Crusher Enchantment', 'The Crusher enchantment (officially "Decrease Physical and Spell Resistance") reduces target resistance by ~2,740 at gold quality for 5 seconds. Essential debuff for tanks — typically run on the back bar with Infused trait for maximum uptime. Only one Crusher can be active on a target. Glyph of Crushing.'),

('enchant', 'Weakening Enchantment', 'The Weakening enchantment (officially "Decrease Weapon and Spell Damage") reduces target damage output. Used by tanks and some PvP builds. Good for survivability in dungeons and trials. Typically paired with Infused trait on back bar. Glyph of Weakening.'),

('enchant', 'Hardening Enchantment', 'The Hardening enchantment creates a damage shield on proc. Provides approximately 5,000 damage shield at gold quality. Used by tanks for extra survivability or by some PvP builds. Glyph of Hardening.'),

('enchant', 'Prismatic Defense Enchantment', 'The Prismatic Defense enchantment (jewelry) increases Max Health, Magicka, and Stamina. Best-in-slot jewelry enchant for tanks, providing balanced stat pools. Also used by some PvP builds. Glyph of Prismatic Defense.'),

('enchant', 'Fire Damage Enchantment', 'Fire Damage enchantment deals Flame damage on proc and can apply the Burning status effect. Used on some Magicka DPS builds, especially Dragonknights who benefit from fire damage bonuses. Also used with Charged trait for status effect builds. Glyph of Flame.'),

('enchant', 'Shock Damage Enchantment', 'Shock Damage enchantment deals Shock damage on proc and can apply Concussion, which applies Minor Vulnerability (5% increased damage taken). Useful for group utility when no other source of Concussion is present. Glyph of Shock.'),

('enchant', 'Poison Damage Enchantment', 'Poison Damage enchantment deals Poison damage on proc and can apply the Poisoned status effect, which reduces target healing received. Used in PvP builds and some stamina builds. Glyph of Poison.');

-- ─── Weapon Types and Combos ────────────────────────────────────────────────

INSERT INTO knowledge_docs (doc_type, title, content) VALUES
('weapon', 'Dual Wield Weapons', 'Dual Wield uses two one-handed weapons (daggers, swords, maces, axes). Provides the highest single-target DPS potential due to Twin Blade and Blunt passive (daggers give critical damage, swords give damage, maces give penetration, axes give bleed). Most DPS players use daggers for the critical damage bonus. Key skills: Rapid Strikes (spammable), Deadly Cloak (AoE + damage reduction), Whirling Blades (execute).'),

('weapon', 'Two Handed Weapons', 'Two Handed uses greatswords, battle axes, or mauls. Strong AoE and cleave damage. Key passives: Follow Up (next attack deals more damage after fully-channeled attack), Heavy Weapons (maces ignore armor, axes apply bleed, swords deal more damage). Popular for Stamina DPS in dungeons. Key skills: Brawler (AoE + shield), Stampede (gap closer + DoT), Reverse Slash (execute).'),

('weapon', 'Bow', 'Bow is the dominant back bar weapon for Stamina DPS. Key skills: Endless Hail (Volley morph, massive AoE DoT, 10 seconds), Poison Injection (execute DoT), Ballista (ultimate). Back bar bow with Infused + Berserker enchant is standard for StamDPS. Bow/Bow builds exist but are niche compared to DW/Bow or 2H/Bow.'),

('weapon', 'Destruction Staff', 'Destruction Staff comes in three types: Inferno (fire), Lightning (shock), Ice (frost). Inferno staff is best-in-slot for Magicka DPS single target. Lightning staff is best for AoE. Ice staff is used by some tanks (taunts on heavy attack, blocks with magicka). Key skills: Wall of Elements (AoE DoT, back bar staple), Force Pulse/Crushing Shock (spammable), Elemental Drain (sustain debuff).'),

('weapon', 'Restoration Staff', 'Restoration Staff is the primary healer weapon. Key skills: Healing Springs (AoE HoT), Combat Prayer (buff + heal), Regeneration (HoT). Typically used on front bar for healers with a Destruction Staff (lightning) on back bar for Elemental Blockade and Elemental Drain.'),

('weapon', 'One Hand and Shield', 'One Hand and Shield is the primary tank weapon line. Key skills: Pierce Armor (taunt + Major Breach + Minor Breach), Heroic Slash (Minor Heroism + Minor Maim), Shield Wall (ultimate, massive mitigation). Tanks typically run One Hand and Shield on both bars or with Ice Staff back bar.');

-- ─── Role Guides ────────────────────────────────────────────────────────────

INSERT INTO knowledge_docs (doc_type, title, content) VALUES
('role', 'DPS Build Optimization', 'DPS (damage per second) builds prioritize maximum damage output. Key stats to maximize: Weapon/Spell Damage, Critical Chance, Critical Damage, Penetration. Standard DPS setup: 5-piece body set + 2-piece monster/mythic + front/back bar sets. Always use food (blue bi-stat or Ghastly Eye Bowl for magicka). Mundus: Shadow (crit damage) or Thief (crit chance) depending on build. Light attack weaving between every ability is essential for maximum DPS.'),

('role', 'Tank Build Optimization', 'Tank builds prioritize survivability, resource management, and group buffs/debuffs. Key stats: Max Health (35-45k), Physical/Spell Resistance (at cap: 33,000), block cost reduction. Standard setup: 5-piece support set (Claw of Yolnahkriin, Saxhleel Champion) + 2-piece monster set + back bar support set. Crusher enchant on back bar is essential. Tanks provide Major Breach, Minor Maim, and group synergies. Sustain food: Bewitched Sugar Skulls (tri-stat) or Orzorgas Smoked Bear Haunch.'),

('role', 'Healer Build Optimization', 'Healer builds balance healing output with group buffs. Key stats: Max Magicka, Spell Damage, Magicka Recovery. Standard setup: 5-piece support set (Spell Power Cure, Roaring Opportunist) + 2-piece monster set + back bar support set (Martial Knowledge, Hollowfang). Resto staff front bar (Powered trait), Lightning staff back bar (for Elemental Blockade + Concussion/Off Balance). Key buffs to maintain: Major Courage, Minor Berserk, Combat Prayer.'),

('role', 'Popular DPS Weapon Combos', 'Most common DPS weapon combinations in endgame trials: Dual Wield front / Bow back (StamDPS standard), Dual Wield front / Destruction Staff back (hybrid DPS), Destruction Staff front / Destruction Staff back (MagDPS standard — inferno front, inferno or lightning back). Front bar usually has Nirnhoned or Precise trait. Back bar always has Infused trait with Berserker (Weapon Damage) enchant for the damage buff.');

-- ─── ESO Classes ────────────────────────────────────────────────────────────

INSERT INTO knowledge_docs (doc_type, title, content) VALUES
('class', 'Dragonknight Class', 'Dragonknight excels at tanking and stamina DPS. Skill lines: Ardent Flame (fire damage, DoTs), Draconic Power (defense, Dragon Blood self-heal), Earthen Heart (crowd control, support, Molten Armaments). Dragonknights have the best fire damage synergies. The most popular tank class. Passives enhance fire damage, provide Ultimate generation from poison/fire damage, and improve blocking.'),

('class', 'Sorcerer Class', 'Sorcerer excels at magicka DPS and has strong self-healing through pets. Skill lines: Dark Magic (crowd control, Crystal Fragments proc), Daedric Summoning (pets, shields), Storm Calling (lightning damage, Surge self-heal). Pet Sorcerer is one of the easiest DPS builds to play. Critical Surge provides strong self-healing from critical hits.'),

('class', 'Nightblade Class', 'Nightblade excels at single-target DPS and has excellent sustain through Siphoning passives. Skill lines: Assassination (burst damage, Spectral Bow execute), Shadow (stealth, fear), Siphoning (sustain, DoTs, Swallow Soul spammable). Nightblades have the highest single-target DPS potential in the game. Merciless Resolve/Relentless Focus proc is a key part of the rotation.'),

('class', 'Templar Class', 'Templar excels at healing and has strong DPS. Skill lines: Aedric Spear (damage, Jabs spammable), Dawns Wrath (damage, debuffs, Purifying Light), Restoring Light (healing, cleanse, ritual synergies). Templars have the simplest DPS rotation (Jabs spam). Best healing class for beginners. Ritual of Retribution provides strong ground-based healing and damage.'),

('class', 'Warden Class', 'Warden excels at support roles (healing and tanking) and has versatile DPS. Skill lines: Animal Companions (damage, Betty Netch sustain), Green Balance (healing, Lotus Flower), Winters Embrace (defense, ice damage). Wardens provide Minor Toughness to the group. Subterranean Assault is a powerful burst damage skill. Bears (ultimate) can be left as a passive damage source.'),

('class', 'Necromancer Class', 'Necromancer has strong group utility through corpse-based mechanics. Skill lines: Grave Lord (damage, skeletal abilities), Bone Tyrant (defense, self-healing), Living Death (healing, resurrection). Colossus ultimate provides Major Vulnerability (10% increased damage) to the whole group — essential for trial groups. Blastbones is the signature DPS ability.'),

('class', 'Arcanist Class', 'Arcanist is the newest class, using Apocryphal magic and a unique Crux resource system. Skill lines: Herald of the Tome (damage, beam channeled abilities), Soldier of Apocrypha (defense, shields), Curative Runeforms (healing, runes). The Crux system requires building 3 Crux then spending them for enhanced abilities. Fatecarver (channeled beam) is the signature DPS ability.');

-- ─── General Game Mechanics ─────────────────────────────────────────────────

INSERT INTO knowledge_docs (doc_type, title, content) VALUES
('mechanic', 'Light Attack Weaving', 'Light attack weaving is the practice of inserting a light attack between every ability cast. This is essential for DPS optimization as light attacks deal significant damage and proc enchantments. The technique: Light Attack -> Ability -> Light Attack -> Ability. Animation canceling the light attack with the ability press makes this seamless. A good weave ratio is 0.9+ (measured as light attacks per ability cast). This is the single most impactful DPS technique in ESO.'),

('mechanic', 'Penetration and Resistance', 'In ESO, targets have Physical and Spell Resistance. Bosses in veteran trials have 18,200 resistance. To maximize damage, you need enough penetration to reach 0 effective resistance. Sources of penetration: Major Breach (5,948), Minor Breach (2,974), Crusher enchant (~2,740), Sharpened trait (~3,276), Lover mundus (~4,300), Light Armor passives, CP stars. In optimized groups, DPS players need very little personal penetration because tanks and supports provide debuffs.'),

('mechanic', 'Critical Strike System', 'Critical Chance determines how often attacks critically hit. Critical Damage determines how much extra damage crits deal (base: 50% bonus). Key sources: Shadow mundus (+12.3% crit damage), Minor Force (+10% crit damage, from Barbed Trap or group source), Precise trait (~3.46% crit chance), Thief mundus (~7.8% crit chance). Most DPS builds aim for 60-70% crit chance with maximized crit damage through Shadow mundus and Minor Force.'),

('mechanic', 'Mundus Stones for Builds', 'The Shadow: +12.3% Critical Damage — best for builds with high crit chance (60%+). The Thief: +7.8% Critical Chance — best when below 55% crit. The Warrior: increases Weapon/Spell Damage — niche use. The Lover: increases Penetration — useful in unoptimized groups. The Atronach: increases Magicka Recovery — for healers. The Lord: increases Max Health — for tanks. The Lady: increases Resistance — for tanks. Most DPS use Shadow or Thief.');
