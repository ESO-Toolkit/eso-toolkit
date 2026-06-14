// ESO Calculator — structured tooltip content.
//
// Each calculator buff / set / passive / CP item is described by a typed record
// instead of a freeform HTML string. The upgraded CalculatorTooltip card renders
// these uniformly: an accent bar, a value chip, a one-line mechanical summary, a
// "Source" line (skill line / set / CP star / trait / racial), and an optional
// PvE-vs-PvP note.
//
// IMPORTANT: the numbers shown here are descriptive. The math is driven by the
// `value` / `per` fields on the CalculatorItem in calculator-data.ts and
// armor-resistance-data.ts — never let this content disagree with those, and
// never change those fields from here. Content is verified for Update 50 /
// Season One (June 2026).

export type TooltipAccent =
  | 'penetration'
  | 'crit'
  | 'armor'
  | 'fire'
  | 'frost'
  | 'shock'
  | 'poison'
  | 'disease'
  | 'magic'
  | 'class'
  | 'cp'
  | 'set'
  | 'mythic'
  | 'racial'
  | 'trait'
  | 'neutral';

export interface CalculatorTooltipRecord {
  /** One concise, game-accurate sentence describing the mechanic. */
  summary: string;
  /** Short magnitude label shown in the value chip, e.g. "−5948 Resistance", "+10% Crit Damage". */
  valueLabel: string;
  /** Where it comes from / how to obtain it (skill line + skill, set + acquisition, CP star, racial, trait, enchant). */
  source: string;
  /** PvE-vs-PvP nuance. Empty string when identical in both. */
  modeNote?: string;
  /** Semantic accent used for color-coding the card. */
  accent: TooltipAccent;
}

/**
 * Display metadata for each accent: a human label and the core hue.
 * Hues are chosen to stay legible on both the dark slate (rgba(30,41,59,.9))
 * and the light (rgba(255,255,255,.9)) tooltip surfaces.
 */
export const TOOLTIP_ACCENT_META: Record<TooltipAccent, { label: string; hue: string }> = {
  penetration: { label: 'Penetration', hue: '#fb923c' },
  crit: { label: 'Critical', hue: '#f87171' },
  armor: { label: 'Resistance', hue: '#60a5fa' },
  fire: { label: 'Flame', hue: '#ff7043' },
  frost: { label: 'Frost', hue: '#4fc3f7' },
  shock: { label: 'Shock', hue: '#b388ff' },
  poison: { label: 'Poison', hue: '#9ccc65' },
  disease: { label: 'Disease', hue: '#a3b35a' },
  magic: { label: 'Magic', hue: '#ce93d8' },
  class: { label: 'Class', hue: '#a78bfa' },
  cp: { label: 'Champion Point', hue: '#26c6da' },
  set: { label: 'Set', hue: '#66bb6a' },
  mythic: { label: 'Mythic', hue: '#ffd54f' },
  racial: { label: 'Racial', hue: '#90a4ae' },
  trait: { label: 'Trait', hue: '#80cbc4' },
  neutral: { label: 'Info', hue: '#94a3b8' },
};

// Name-keyed records (verified June 2026). The renderer resolves by
// CalculatorItem.name and falls back to the legacy `tooltip` HTML string only
// when no record exists for an item.
export const CALCULATOR_TOOLTIP_RECORDS: Record<string, CalculatorTooltipRecord> = {
  'Major Breach': {
    summary:
      "A debuff that lowers the target's Physical and Spell Resistance, letting all attackers' damage penetrate further.",
    valueLabel: '−5948 Resistance',
    source:
      'Group debuff applied by many sources: Sundered status effect, Crushing Shock/Force Pulse, Elemental Susceptibility/Drain (Destruction Staff), Pierce Armor (One Hand & Shield), Sun Fire/Reflective Light (Templar), Crystal Weapon, and numerous sets. One of the two most common penetration debuffs in any group.',
    modeNote:
      'Same value in PvE and PvP; PvP builds aim for a higher overall penetration target (~33300) but Major Breach itself is unchanged.',
    accent: 'armor',
  },
  'Minor Breach': {
    summary:
      "A debuff that lowers the target's Physical and Spell Resistance; the weaker, separately-stacking counterpart to Major Breach.",
    valueLabel: '−2974 Resistance',
    source:
      "Group debuff from sources such as Templar Sun Fire morphs, Frost Reach/Reach morphs, Druid's Braid mythic, and several support sets; stacks additively with Major Breach for −8922 total.",
    modeNote: 'Same value in PvE and PvP.',
    accent: 'armor',
  },
  'Roar of Alkosh': {
    summary:
      'On synergy activation, sends a shockwave that deals Physical damage and reduces the Armor of all enemies hit by an amount equal to your Weapon Damage, up to a cap.',
    valueLabel: '−6000 Armor (cap)',
    source:
      "Trial set from Maw of Lorkhaj (Reaper's March). 5-piece bonus; the synergy is created by your damage and any group member can activate it. Armor reduction scales with your Weapon Damage and caps at 6000.",
    modeNote:
      'PvE-focused support set; the 6000 figure is the at-cap value, which a tank built for Weapon Damage reliably reaches in PvE.',
    accent: 'armor',
  },
  "Crimson Oath's Rive": {
    summary:
      'When you apply a Major or Minor buff to yourself or an ally, it sends out a wave that reduces the Armor of nearby enemies within 12m for 15s, once every 12s.',
    valueLabel: '−3541 Armor',
    source:
      'Dungeon set from The Dread Cellar. 5-piece bonus. Note: the trigger is applying a Major/Minor BUFF to yourself/an ally (not applying Breach to an enemy) — a popular off-balance / no-Crusher penetration source for tanks.',
    modeNote: 'Same value in PvE and PvP.',
    accent: 'armor',
  },
  Tremorscale: {
    summary:
      'Activating a taunt on an enemy summons a duneripper that bursts after 1s, dealing Physical damage in a small area and reducing the Armor of enemies hit for 15s, once every 10s.',
    valueLabel: '−2640 Armor (at resistance cap)',
    source:
      'Monster set from Volenfell (helm + shoulder). The Armor reduction is 8% of your own Resistance, so it scales with your gear; the base in-game tooltip shows a flat 880, but at the 33000 Resistance cap it delivers ~2640.',
    modeNote:
      'PvE tank set; in PvP, reaching the resistance cap is harder, so the effective reduction is typically below 2640.',
    accent: 'armor',
  },
  'Champion Point: Piercing': {
    summary:
      'A passive Champion Point star in the Warfare tree that flatly increases your Physical and Spell Penetration.',
    valueLabel: '+350 Pen / stage (max +700)',
    source:
      'Champion Points — Warfare constellation, Piercing passive star. Two stages unlocked at 10 and 20 points invested, granting 350 each for 700 total. Always-on once slotted.',
    modeNote: 'Same value in PvE and PvP.',
    accent: 'penetration',
  },
  'Champion Point: Force of Nature': {
    summary:
      'A passive Champion Point star that grants Offensive Penetration for each unique status effect currently active on your target.',
    valueLabel: '+660 Pen / status effect',
    source:
      'Champion Points — Warfare constellation, Force of Nature passive star (fully invested). Counts each distinct damage status effect on the enemy (Burning, Chill, Concussion, Diseased, Hemorrhaging, Overcharged, Poisoned, Sundered).',
    modeNote:
      'Same per-status value in PvE and PvP; total benefit depends on how many status effects you can keep applied.',
    accent: 'penetration',
  },
  'Legendary Infused Crusher Enchant': {
    summary:
      'Applies the Crusher debuff to the closest enemy you damage, lowering their Physical and Spell Resistance; only one target can be affected at a time and the value reflects gold quality plus the Infused trait multiplier.',
    valueLabel: '−2108 Resistance',
    source:
      'Weapon glyph: Glyph of Crushing (Crusher), crafted via Enchanting from the Hakeijo + Oko/Deni runes; value shown is Legendary quality on an Infused weapon (Infused boosts enchant strength ~30%). Standard tank backbar proc (Elemental Blockade reapplies it).',
    accent: 'armor',
  },
  'Runic Sunder': {
    summary:
      'Arcanist rune that deals Physical Damage, steals 2200 Armor from the enemy while granting it to you, applies Minor Maim, can taunt for 15s, and generates Crux.',
    valueLabel: '−2200 Armor',
    source:
      'Arcanist class skill, Soldier of Apocrypha line (morph of Runespite Ward). Core tank/group penetration tool; 22m range.',
    accent: 'class',
  },
  'Crystal Weapon': {
    summary:
      "Sorcerer buff whose next two Light/Heavy Attacks deal bonus Physical Damage and reduce the target's Armor by 1000 for 5 seconds.",
    valueLabel: '−1000 Armor',
    source:
      'Sorcerer class skill, Dark Magic line (morph of Crystal Shard). Self-cast 6s window; mostly a PvP/stamina-DPS penetration source.',
    modeNote:
      'More common in PvP and solo builds than organized PvE, where tank debuffs cover penetration.',
    accent: 'class',
  },
  "Velothi Ur-Mage's Amulet": {
    summary:
      'Mythic neck that adds 1650 Offensive Penetration, grants Minor Force (+10% Critical Damage) at all times and +15% damage to monsters, but reduces your Light and Heavy Attack damage by 99%.',
    valueLabel: '+1650 Penetration',
    source:
      'Mythic item (neck) from Antiquities; leads found in Telvanni Peninsula (Necrom chapter). One mythic equippable at a time.',
    modeNote:
      'Penetration is unchanged in PvP, but its Minor Force is halved by Battle Spirit and the +15% monster damage does nothing vs players.',
    accent: 'mythic',
  },
  'Shattered Fate': {
    summary:
      'Five-piece set bonus that grants a flat 7918 Offensive Penetration at all times (not a stacking effect).',
    valueLabel: '+7918 Penetration',
    source:
      "Crafted set (5 traits) at the Artisan's Hermitage in Apocrypha; requires the Necrom DLC. 10pc adds Weapon/Spell Damage, 12pc adds Critical Chance.",
    accent: 'set',
  },
  'Armor Set Penetration Bonus': {
    summary:
      "Generic slot for the flat Offensive Penetration granted by certain armor sets (e.g. Tide-born Wildstalker, Ansuul's Torment), stackable up to two such sets.",
    valueLabel: '+1487 Pen / set (max 2)',
    source:
      "Five-piece always-on penetration set bonuses; 1487 is a typical per-set value. Examples: Tide-born Wildstalker (overland, West Weald) and Ansuul's Torment (Sanity's Edge trial). Exact penetration varies by set.",
    accent: 'set',
  },
  "Spriggan's Thorns": {
    summary: 'Five-piece set bonus granting a flat, always-on 3460 Offensive Penetration.',
    valueLabel: '+3460 Penetration',
    source:
      'Overland set, Bangkorai (quest rewards and named-mob drops). Popular budget penetration set for stamina/PvP builds.',
    accent: 'set',
  },
  'Sharpened (1H Trait)': {
    summary:
      'Weapon trait that increases your Physical and Spell Penetration; a one-handed weapon contributes half the two-handed amount.',
    valueLabel: '+1638 Penetration',
    source:
      'Weapon trait (Sharpened) at Legendary quality on a one-handed weapon. Researched/applied via Blacksmithing/Woodworking; stacks per one-handed weapon equipped.',
    accent: 'trait',
  },
  'Sharpened (2H Trait)': {
    summary:
      'Weapon trait that increases your Physical and Spell Penetration; a two-handed weapon grants double the one-handed value.',
    valueLabel: '+3276 Penetration',
    source:
      'Weapon trait (Sharpened) at Legendary quality on a two-handed weapon (greatsword, battle axe, maul, bow, staff). Exactly 2x the one-handed value (1638).',
    accent: 'trait',
  },
  'Arena 1-piece Bonus': {
    summary:
      'Single-piece bonus on a Perfected arena weapon that adds 1190 Physical/Spell Penetration.',
    valueLabel: '+1190 Penetration',
    source:
      'Perfected arena weapons from Veteran Maelstrom Arena and Vateshran Hollows; the 1190 penetration is the one-piece (perfected) weapon bonus at CP160.',
    accent: 'set',
  },
  Anthelmir: {
    summary:
      "Anthelmir's Construct: a fully-charged Heavy Attack throws an axe that deals damage (scaling with Weapon/Spell Damage) and reduces the target's Armor by a flat 400 for 5s, once every 10s.",
    valueLabel: '−400 Armor',
    source:
      "2-piece monster set from Oathsworn Pit (Scions of Ithelia DLC); head from veteran, shoulder from the Undaunted chest. The axe's damage scales with your higher of Weapon/Spell Damage, but the Armor reduction is a flat 400.",
    accent: 'set',
  },
  Balorgh: {
    summary:
      'Monster set that, on Ultimate use, grants Weapon/Spell Damage and Physical/Spell Penetration equal to 23 times the amount of Ultimate spent, for 12 seconds.',
    valueLabel: '+23 Pen / Ultimate spent',
    source:
      "Monster set (head/shoulder) from March of Sacrifices dungeon (Wolfhunter DLC) and Undaunted shoulders. The per-value scales with the Ultimate's cost actually consumed (e.g. 250-cost ult → 5750 penetration).",
    accent: 'set',
  },
  "Wood Elf Passive: Hunter's Eye": {
    summary:
      'Wood Elf racial passive granting flat Physical and Spell Penetration, plus increased Movement Speed and Stealth Detection radius, while always active on a Bosmer character.',
    valueLabel: '+950 Pen (flat)',
    source:
      "Racial skill line (Wood Elf), passive Hunter's Eye at Rank III (max). Innate to Bosmer characters — no slotting required.",
    modeNote: 'Identical in PvE and PvP; flat penetration applies in both.',
    accent: 'racial',
  },
  'Grave Lord Passive: Dismember': {
    summary:
      'Necromancer Grave Lord passive that adds flat Physical and Spell Penetration whenever any Grave Lord ability is slotted/active on your bar.',
    valueLabel: '+3271 Pen (flat, conditional)',
    source:
      'Necromancer class, Grave Lord skill line, passive Dismember at Rank II (max). Conditional: requires a Grave Lord ability slotted to be active.',
    modeNote: 'Identical in PvE and PvP; flat penetration applies in both.',
    accent: 'class',
  },
  'Herald of the Tome: Splintered Secrets': {
    summary:
      'Arcanist Herald of the Tome passive that grants Physical and Spell Penetration per Herald of the Tome ability slotted on your active bar.',
    valueLabel: '+1240 Pen / Herald ability slotted (max 5)',
    source:
      'Arcanist class, Herald of the Tome skill line, passive Splintered Secrets at Rank II (max). Scales with number of Herald abilities slotted on the active bar.',
    modeNote: 'Identical in PvE and PvP; flat penetration applies in both.',
    accent: 'class',
  },
  'Light Armor Passive: Concentration': {
    summary:
      'Light Armor passive that grants Physical and Spell Penetration for each piece of Light Armor worn, scaling up to a 7-piece setup.',
    valueLabel: '+939 Pen / Light Armor piece (max 7)',
    source:
      'Light Armor skill line, passive Concentration at Rank II (max). Scales per equipped Light Armor piece (max 7 = 6573 total).',
    modeNote: 'Identical in PvE and PvP; flat penetration applies in both.',
    accent: 'armor',
  },
  'Dual Wield: Twin Blade and Blunt (Mace)': {
    summary:
      'Dual Wield passive where each one-handed mace equipped grants flat Offensive Penetration (axes give crit damage, swords give weapon/spell damage, daggers give crit chance instead).',
    valueLabel: '+1487 Pen / mace (max 2)',
    source:
      'Dual Wield weapon skill line, passive Twin Blade and Blunt at Rank II (max). Requires one-handed mace(s) equipped; up to 2 (main + off hand).',
    modeNote:
      "Identical in PvE and PvP; the mace branch is flat penetration (only the axe branch's crit damage would be PvP-reduced).",
    accent: 'trait',
  },
  'Two Handed: Heavy Weapons (Maul)': {
    summary:
      "Two Handed passive where an equipped maul (the two-handed mace) grants flat Offensive Penetration — double a one-handed mace's value since it occupies both weapon slots.",
    valueLabel: '+2974 Pen (flat, maul equipped)',
    source:
      "Two Handed weapon skill line, passive Heavy Weapons at Rank II (max). Requires a Maul (2H) equipped; equals 2x the 1H mace's 1487.",
    modeNote:
      "Identical in PvE and PvP; the maul branch is flat penetration (only the battle-axe branch's crit damage would be PvP-reduced).",
    accent: 'trait',
  },
  'Base Character Critical Damage': {
    summary:
      'Every critical hit deals 50% more damage than a normal hit before any bonuses, so an unmodified crit lands at 150% of the base hit.',
    valueLabel: '+50% Crit Damage (base)',
    source:
      'Innate game baseline applied to every character; not from any skill, set, or CP. Additional crit-damage modifiers stack additively on top, up to the 125% crit-damage hard cap (225% total crit hit).',
    modeNote:
      "Identical base in PvE and PvP, but in PvP a target's Critical Resistance subtracts from your total crit damage (effective bonus ≈ total − critRes/66), so the realized value drops against defended players.",
    accent: 'crit',
  },
  'Minor Force': {
    summary: 'Grants the player Minor Force, increasing Critical Damage by 10% for the duration.',
    valueLabel: '+10% Crit Damage',
    source:
      'Buff (self/group). Common sources: Sorcerer Power Stone/Channeled Acceleration morphs, Vampire Blood Ritual line, Bound Armaments, Camouflaged Hunter, food (e.g. Lava Foot Soup), and several sets/potions. Standard Minor-tier crit-damage buff.',
    modeNote:
      "Same 10% value applied in PvE and PvP; in PvP the bonus is folded into your total crit damage and can be reduced by the target's Critical Resistance rather than halved by Battle Spirit.",
    accent: 'crit',
  },
  'Major Force': {
    summary: 'Grants the player Major Force, increasing Critical Damage by 20% for the duration.',
    valueLabel: '+20% Crit Damage',
    source:
      "Buff (self/group). Sources include Saxhleel Champion (5pc), Sul-Xan's Torment, Aggressive Horn / War Horn ultimate, and a U50 Class Mastery passive that grants Major Force after large healing. The strongest Major-tier crit-damage buff.",
    modeNote:
      "Same 20% value in PvE and PvP; not auto-halved by Battle Spirit, but the target's Critical Resistance can subtract from your total crit damage in PvP.",
    accent: 'crit',
  },
  'Minor Brittle': {
    summary:
      'Debuffs the enemy with Minor Brittle, causing them to take 10% more Critical Damage from all attackers.',
    valueLabel: '+10% Crit Damage taken (enemy debuff)',
    source:
      'Target debuff. Applied by the Chilled status effect when wielding a Frost Staff, Warden Gripping Shards/Frost morphs, Glacial Presence, and certain sets. A Minor-tier offensive debuff that benefits the whole group.',
    modeNote:
      "Same 10% in PvE and PvP; as an enemy-side crit-damage-taken increase it applies to the defender's incoming crits and, in PvP, stacks into the attacker-vs-CritResistance calculation rather than being halved by Battle Spirit.",
    accent: 'frost',
  },
  'Major Brittle': {
    summary:
      'Debuffs the enemy with Major Brittle, causing them to take 20% more Critical Damage from all attackers.',
    valueLabel: '+20% Crit Damage taken (enemy debuff)',
    source:
      "Target debuff. Sources include Warden Tundra's Maw / Frozen Gate line and the U50 change letting Chilled apply Major Brittle, plus sets such as Frozen Watcher. The strongest crit-damage-taken debuff; very limited sources.",
    modeNote:
      "Same 20% in PvE and PvP; applies to the defending target's incoming crits and feeds the attacker's total crit damage versus the target's Critical Resistance in PvP (not halved by Battle Spirit).",
    accent: 'frost',
  },
  'Elemental Catalyst': {
    summary:
      'Dealing Flame, Frost, or Shock damage applies the matching Elemental Weakness to the enemy, each increasing their Critical Damage taken by 5%, up to 15% with all three active.',
    valueLabel: '+5% Crit Damage taken / weakness (max +15%)',
    source:
      '5-piece bonus of the Elemental Catalyst LIGHT armor SET (dungeon drop from Stone Garden, Stonethorn DLC). One stack each of Flame/Frost/Shock Weakness can coexist for the 15% max. This is a GEAR SET, not a Champion Point.',
    modeNote:
      "Same +5% per stack (max +15%) in PvE and PvP; the weakness stacks raise the target's crit-damage-taken and fold into the attacker-vs-Critical-Resistance math in PvP. Reliably maintaining all three elements is far easier in PvE group play.",
    accent: 'magic',
  },
  'Lucent Echoes': {
    summary:
      'While you are above 50% Health, increases the Critical Damage and Critical Healing of nearby group members (not wearing this set) within 28 meters; below 50% Health it instead grants you 20% monster damage reduction.',
    valueLabel: '+11% Crit Damage (group)',
    source:
      "5-piece set bonus from the Lucent Citadel trial (Gold Road DLC); a perfected version drops from the same trial's veteran final boss. Tank set worn to buff the group.",
    modeNote:
      'PvE only in practice — it is a trial group-support tank set, and Battle Spirit halves Critical Damage bonuses against players in PvP.',
    accent: 'crit',
  },
  "Sul-Xan's Torment": {
    summary:
      'When an enemy you recently damaged dies it leaves a vengeful soul (one at a time); touching it grants you Critical Chance and Critical Damage for 30 seconds.',
    valueLabel: '+12% Crit Damage (+2160 Crit Chance)',
    source:
      '5-piece set bonus from the Rockgrove trial (Blackwood DLC); a perfected version drops on veteran. The soul buff also grants Critical Chance; only its +12% Critical Damage is counted here.',
    modeNote:
      'Strong in PvE where adds die to feed souls; far weaker in PvP (single-target, no reliable kills) and the +12% Crit Damage is halved by Battle Spirit against players.',
    accent: 'crit',
  },
  "Mora Scribe's Thesis": {
    summary:
      'Grants Critical Damage done per Minor Buff active on you (up to 12%), plus a separate Critical Chance bonus per Major Buff active (up to 1536 Critical Chance).',
    valueLabel: '+1% Crit Damage / Minor Buff (max +12%)',
    source:
      '5-piece set bonus from the Lucent Citadel trial (Gold Road DLC); a perfected version drops from the same trial. Counted here is the Critical Damage line (1% per Minor Buff, cap 12%); the per-Major-Buff portion grants Critical Chance instead.',
    modeNote:
      'Reaches the 12% cap most easily in buff-rich PvE group play; achievable but harder to sustain solo/PvP, and the Crit Damage portion is halved by Battle Spirit against players.',
    accent: 'crit',
  },
  "Harpooner's Wading Kilt": {
    summary:
      "Dealing direct damage builds Hunter's Focus stacks (max 10, one per second); each stack grants both Critical Chance and Critical Damage, and taking direct damage strips 5 stacks.",
    valueLabel: '+1% Crit Damage / stack (max +10%)',
    source:
      "Mythic medium legs obtained via Antiquities (scrying/excavation of 5 leads), introduced in Greymoor. Each Hunter's Focus stack grants both +110 Critical Chance and +1% Critical Damage; the +1%/stack (max +10%) Critical Damage is counted here.",
    modeNote:
      'Reliable in PvE where you avoid much incoming hits and keep 10 stacks; in PvP taking direct damage repeatedly knocks off 5 stacks at a time, so the bonus is unreliable, and the Crit Damage portion is halved by Battle Spirit.',
    accent: 'mythic',
  },
  'Herald of the Tome: Fated Fortune': {
    summary:
      'When you generate or consume Crux, you gain a 7-second buff that increases your Critical Damage and Critical Healing.',
    valueLabel: '+12% Crit Damage',
    source:
      'Arcanist class skill line Herald of the Tome, passive (rank 2). Unlocked by leveling the line; auto-applies whenever Crux is generated or spent.',
    modeNote:
      "Crit-damage cap (125% PvE / same in PvP) and Battle Spirit's flat 50% damage reduction apply in PvP as for any crit-damage source; the passive itself lists no separate PvP value.",
    accent: 'crit',
  },
  'Assassination: Hemorrhage': {
    summary:
      'Increases your Critical Damage, and dealing Critical Damage grants you and your group Minor Savagery (increased Weapon Critical rating) for 10 seconds.',
    valueLabel: '+10% Crit Damage',
    source:
      'Nightblade class skill line Assassination, passive (rank 2). Always-on crit-damage; the Minor Savagery proc fires on any critical hit.',
    modeNote:
      'Crit-damage value is identical in PvE and PvP; no Battle Spirit-specific reduction on this passive.',
    accent: 'crit',
  },
  'Aedric Spear: Piercing Spear': {
    summary: 'Increases your Critical Damage and increases your damage done to blocking players.',
    valueLabel: '+12% Crit Damage',
    source:
      'Templar class skill line Aedric Spear, passive (rank 2). Always-on once the line is leveled.',
    modeNote:
      'Crit-damage 12% applies in both modes; the secondary +12% damage-to-blocking-players rider is a PvP/anti-block effect only.',
    accent: 'crit',
  },
  'Earthen Heart: Blessing at the Peak': {
    summary:
      'Increases your Critical Damage, and casting or dealing damage with an Earthen Heart ability in combat generates 3 Ultimate (once every 6 seconds).',
    valueLabel: '+10% Crit Damage',
    source:
      'Dragonknight class skill line Earthen Heart, passive (rank 2). Crit-damage portion is always-on; Ultimate-gen requires an Earthen Heart ability.',
    modeNote: 'Identical crit-damage value PvE and PvP.',
    accent: 'crit',
  },
  'Medium Armor: Dexterity': {
    summary:
      'Increases your Critical Damage and Critical Healing for every piece of Medium Armor equipped.',
    valueLabel: '+2% Crit Damage / Medium piece',
    source:
      'Medium Armor skill line, passive (rank 3). Scales with worn Medium pieces, up to 7 (14% max).',
    modeNote:
      "Same value PvE and PvP; the 'max 7' reflects the 7-slot armor cap, not a separate PvP rule.",
    accent: 'crit',
  },
  'Animal Companions: Advanced Species': {
    summary:
      'Increases your Critical Damage for each Animal Companions ability slotted on your active bars.',
    valueLabel: '+5% Crit Damage / slotted ability',
    source:
      'Warden class skill line Animal Companions, passive (rank 2). Counts Animal Companions abilities slotted; commonly 3 = 15%.',
    modeNote: 'Same value PvE and PvP. Affects Critical Damage only (not Critical Healing).',
    accent: 'crit',
  },
  'Class Mastery: Above and Beyond': {
    summary:
      'Increases your Critical Damage and Healing, and additionally raises your maximum Critical Damage and Healing cap by 30% (raising the 125% cap toward 155%).',
    valueLabel: '+25% Crit Damage (PvE) / +5% (vs players)',
    source:
      'Nightblade Class Mastery passive (Update 50, June 2026). Available only to non-subclassed Nightblades via Class Mastery Points; one of 2-of-5 selectable.',
    modeNote:
      'PvP value differs sharply: +25% crit dmg/healing in PvE is reduced to +5% against targets with Battle Spirit. The +30% cap increase applies regardless of mode.',
    accent: 'mythic',
  },
  'Dual Wield: Twin Blade and Blunt (Axe)': {
    summary:
      'Each equipped axe increases your overall Critical Damage (a character-wide bonus, not limited to axe attacks).',
    valueLabel: '+6% Crit Damage / axe',
    source:
      'Dual Wield weapon skill line Twin Blade and Blunt, passive (rank 2). Active per axe in the dual-wield set; 2 axes = 12%.',
    modeNote: 'Same value PvE and PvP.',
    accent: 'crit',
  },
  'Two Handed: Heavy Weapons (Axe)': {
    summary:
      'Equipping a two-handed battle axe increases your overall Critical Damage (character-wide, not limited to axe attacks).',
    valueLabel: '+12% Crit Damage (battle axe)',
    source:
      'Two Handed weapon skill line, Heavy Weapons passive (rank 2). Requires a two-handed Battle Axe equipped.',
    modeNote: 'Same value PvE and PvP.',
    accent: 'crit',
  },
  'Khajiit Passive: Feline Ambush': {
    summary:
      'Increases your Critical Damage and Critical Healing and reduces your detection radius while in Stealth.',
    valueLabel: '+12% Crit Damage',
    source:
      'Khajiit racial passive (rank 3). Always-on for Khajiit characters; also grants -3m stealth detection radius.',
    modeNote: 'Same crit value PvE and PvP.',
    accent: 'racial',
  },
  'Fighting Finesse': {
    summary:
      'Slotted Warfare Champion Point star that increases your Critical Damage and Critical Healing Done by a flat 4% per stage, unconditionally, while equipped.',
    valueLabel: '+4% Crit Damage / stage (max +8%)',
    source:
      'Champion Points: Warfare constellation, Fighting Finesse slottable star (4 active slots). Reaches 2 stages at 0/25/50 points invested; requires the Precision star as a prerequisite. Affects both Critical Damage and Critical Healing Done.',
    modeNote:
      'PvP value differs: Battle Spirit halves all critical-damage bonuses above the 50% base, so the effective gain is roughly half in Cyrodiil/Imperial City/Battlegrounds. Unconditional in both modes (no positional or target requirement).',
    accent: 'crit',
  },
  Backstabber: {
    summary:
      'Slotted Warfare Champion Point star that increases your Critical Damage by 2% per stage, but only against enemies you are flanking (attacking from the rear/side arc).',
    valueLabel: '+2% Crit Damage / stage (max +10%)',
    source:
      'Champion Points: Warfare constellation, Backstabber slottable star (4 active slots). Reaches 5 stages at 50 points (10 points/stage); requires the Precision star as a prerequisite. Conditional Critical Damage only — does not affect critical healing.',
    modeNote:
      'Conditional: the bonus only applies while flanking (roughly the rear ~180-degree+ arc, not directly facing the target). A flat +10% assumes constant flanking — reliable in PvE (boss faces the tank, DPS hit from behind) but situational. PvP value differs: harder to maintain due to latency/facing desync, AND crit-damage bonuses are additionally halved by Battle Spirit.',
    accent: 'crit',
  },
  'Major Resolve': {
    summary:
      'Increases Physical and Spell Resistance, the major-tier armor buff most builds get from a slotted ability, set, or potion.',
    valueLabel: '+5948 Resistance',
    source:
      'Group/self buff (Major Resolve). Common sources: tank/support skills (e.g. Pierce Armor morph self-buff), Heroic Slash, sets, and Armor potions. Stacks additively with Minor Resolve.',
    accent: 'armor',
  },
  'Minor Resolve': {
    summary:
      'Increases Physical and Spell Resistance, the minor-tier armor buff that stacks on top of Major Resolve.',
    valueLabel: '+2974 Resistance',
    source:
      'Group/self buff (Minor Resolve). Common sources: class skills, support sets, and various slotted abilities. Stacks with Major Resolve for 8922 total.',
    accent: 'armor',
  },
  'Dragonknight Passive': {
    summary:
      'Passive Heart of Stone increases your Armor (Physical and Spell Resistance) at max rank, an always-on flat bonus for Dragonknights.',
    valueLabel: '+2974 Resistance',
    source:
      'Dragonknight class passive Heart of Stone, Earthen Heart skill line (Rank 2). Always-on for Dragonknights.',
    accent: 'class',
  },
  'Warden Passive Per Skill': {
    summary:
      "Passive Frozen Armor grants Physical and Spell Resistance for each Winter's Embrace ability slotted, scaling with how many you run.",
    valueLabel: "+1240 Resistance / slotted Winter's Embrace ability",
    source:
      "Warden class passive Frozen Armor, Winter's Embrace skill line (Rank 2). 1240 per slotted Winter's Embrace ability, up to ~6 across both bars.",
    accent: 'class',
  },
  'Templar Passive': {
    summary:
      'Passive Balanced Warrior grants a flat 1320 Physical and Spell Resistance plus 6% Weapon and Spell Damage; only the flat resistance part feeds this armor calculator.',
    valueLabel: '+1320 Resistance',
    source:
      'Templar class passive Balanced Warrior, Aedric Spear skill line (Rank 2). The passive also grants +6% Weapon and Spell Damage; only the flat Resistance is counted here.',
    accent: 'class',
  },
  'Arcanist Passive': {
    summary:
      'Passive Aegis of the Unseen increases your Armor while any beneficial Soldier of Apocrypha ability is active on you.',
    valueLabel: '+3271 Resistance',
    source:
      'Arcanist class passive Aegis of the Unseen, Soldier of Apocrypha skill line (Rank 2). Conditional: requires a beneficial Soldier of Apocrypha effect active on you.',
    accent: 'class',
  },
  'Nord Passive': {
    summary:
      'Racial passive Rugged grants always-on Physical and Spell Resistance, part of what makes Nords premier tanks.',
    valueLabel: '+2600 Resistance',
    source: 'Nord racial passive Rugged (Rank 3). Always active for Nord characters, no condition.',
    accent: 'racial',
  },
  'Breton Passive': {
    summary:
      'Racial passive Spell Attunement grants Spell Resistance only, doubled while you are afflicted with Burning, Chilled, or Concussed.',
    valueLabel: '+2310 Spell Resistance (doubled if Burning/Chilled/Concussed)',
    source:
      'Breton racial passive Spell Attunement (Rank 3). Grants Spell Resistance only (not Physical); doubles to 4620 while you are Burning, Chilled, or Concussed.',
    accent: 'racial',
  },
  'Armor Potions': {
    summary:
      "The Increase Armor alchemy effect raises your Physical Resistance by 5280 for the potion's duration; pairing it with the separate Increase Spell Resist effect adds 5280 Spell Resistance on the same potion.",
    valueLabel: '+5280 Resistance',
    source:
      'Alchemy: the Increase Armor potion effect (Beetle Scuttle / Imp Stool / Mountain Flower / Mudcrab Chitin), 45s cooldown; does NOT grant the Major Resolve buff, it is a distinct flat 5280 effect.',
    accent: 'neutral',
  },
  'Lord Warden': {
    summary:
      'On taking damage, has a 50% chance to summon a shadow orb that increases the Physical and Spell Resistance of you and nearby group members by 3180 for 10 seconds.',
    valueLabel: '+3180 Resistance',
    source:
      'Lord Warden Dusk monster set 2-piece bonus (Imperial City DLC): head from vet Imperial City Prison, shoulders from Undaunted chest. Proc-driven group resist.',
    accent: 'set',
  },
  Ozezans: {
    summary:
      'Overhealing yourself or an ally grants the healed target 4272 Armor for 1.1 seconds (plus Minor Vitality), so the bonus is a short proc on overheal rather than a permanent flat resist.',
    valueLabel: '+4272 Armor (overheal proc)',
    source:
      "Ozezan the Inferno monster helm set 2-piece bonus (head from vet Scrivener's Hall, shoulders from Undaunted chest); not craftable. A healer-oriented proc that grants Armor to the overhealed target.",
    accent: 'set',
  },
  'Markyn Ring of Majesty': {
    summary:
      'Grants 100 Weapon and Spell Damage and 1157 Armor for every set you are wearing 3 or more pieces of, so the resist scales with how many qualifying multi-piece sets you run.',
    valueLabel: '+1157 Armor / qualifying set',
    source:
      'Mythic ring (Bloodthirsty trait) from the Antiquities system, Deadlands DLC. The 1157 Armor is per set you have 3+ pieces of, not a single flat bonus.',
    accent: 'mythic',
  },
  'Defending Trait': {
    summary:
      'The Defending weapon trait increases your Physical and Spell Resistance by 1638 at Legendary quality (two-handed weapons grant double, 2752).',
    valueLabel: '+1638 Resistance (1H gold)',
    source:
      'Weapon trait (applied with Turquoise), Legendary quality. Defending is a weapon-only trait — the jewelry resistance trait is Protective.',
    accent: 'trait',
  },
  'Armor Line Bonus': {
    summary:
      "The standard 'Adds Armor' set line-bonus, granting 1487 Physical and Spell Resistance per qualifying set bonus step (many sets give it at both 2- and 4-piece).",
    valueLabel: '+1487 Resistance / bonus',
    source:
      "Generic gold-quality 'Adds 1487 Armor' set bonus step found on many sets (e.g. Crimson Oath's Rive 2-pc and 4-pc, Armor Master 3-pc/4-pc); stack up to ~6 such steps across your sets.",
    accent: 'set',
  },
  'Armor Master': {
    summary:
      'Armor Master (crafted set): using an Armor ability while in combat grants you +5940 Physical & Spell Resistance for 10 seconds — a conditional proc, not an always-on bonus.',
    valueLabel: '+5940 Resistance (proc)',
    source:
      'Crafted set (9 traits) with stations in Imperial City. 5-piece proc; also gives Max Health and Armor at 2–4 pieces. Note: there is no Champion Point star named "Armor Master" — this is the gear set.',
    accent: 'set',
  },
  Fortified: {
    summary:
      'Passive Champion Point star that grants 34.6 Armor per stage, reaching 1731 Physical and Spell Resistance when fully invested at 50 stages.',
    valueLabel: '+1731 Resistance (50 stages)',
    source:
      'Champion Point passive star in the Fitness constellation (34.6 Armor/stage x 50 = ~1730); always-on once points are invested.',
    accent: 'cp',
  },
  Bulwark: {
    summary:
      'Slottable Champion Point star that increases your Physical and Spell Resistance by 1900 while you have a Shield or Frost Staff equipped.',
    valueLabel: '+1900 Resistance',
    source:
      'Champion Point slottable star in the Warfare constellation (Staving Death cluster); conditional on a Shield or Frost Staff being equipped.',
    accent: 'cp',
  },
  'Heavy Armor Passive': {
    summary:
      'The Resolve passive grants 343 Physical and Spell Resistance for each piece of Heavy Armor equipped, up to 2401 with a full 7-piece setup.',
    valueLabel: '+343 Resistance / piece',
    source:
      "Heavy Armor skill line passive 'Resolve' (rank 2). Available to every class; scales per equipped Heavy Armor piece.",
    accent: 'armor',
  },
  'Light Armor Passive': {
    summary:
      'The Spell Warding passive grants 726 Spell Resistance (not Physical) for each piece of Light Armor equipped, up to 5082 with a full 7-piece setup.',
    valueLabel: '+726 Spell Resistance / piece',
    source:
      "Light Armor skill line passive 'Spell Warding' (rank 2); universal to all classes. Grants Spell Resistance only, unlike Heavy Resolve which grants both.",
    accent: 'magic',
  },
};
