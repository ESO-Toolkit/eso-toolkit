/**
 * Descriptive tooltips for stat source breakdown items.
 * Keyed by item name as it appears in StatItem.name.
 * Purely a UI concern — the engine calculates, this file explains.
 */

/**
 * Look up a description by item name, handling dynamic names like "Light Armor (3pc)".
 */
export function getItemDescription(name: string): string | undefined {
  // Exact match first
  if (STAT_ITEM_DESCRIPTIONS[name]) return STAT_ITEM_DESCRIPTIONS[name];

  // Dynamic armor passive names: "Light Armor (Xpc)" / "Medium Armor (Xpc)"
  if (name.startsWith('Light Armor (')) {
    return 'Concentration passive. Grants 939 Physical and Spell Penetration per Light Armor piece equipped.';
  }
  if (name.startsWith('Medium Armor (')) {
    return 'Dexterity passive. Grants 2% Critical Damage per Medium Armor piece equipped.';
  }

  // Dynamic trait names
  if (name.startsWith('Sharpened (')) {
    return 'Weapon trait. Grants 2752 Physical and Spell Penetration per weapon with the Sharpened trait.';
  }
  if (name.startsWith('Precise (')) {
    return 'Weapon trait. Grants 2295 Critical Rating (~10.5% Critical Chance) per weapon with the Precise trait.';
  }
  if (name.startsWith('Nirnhoned (')) {
    return 'Armor trait. Grants 253 Physical and Spell Resistance per armor piece with the Nirnhoned trait.';
  }
  if (name.startsWith('Defending (')) {
    return 'Weapon trait. Grants 2752 Physical and Spell Resistance per weapon with the Defending trait.';
  }

  // Dynamic Mundus + Divines names
  if (name.startsWith('The Lover (')) {
    return 'Mundus stone. Base 2752 pen, plus ~220 per Divines-traited armor piece.';
  }
  if (name.startsWith('The Shadow (')) {
    return 'Mundus stone. Base 13% Crit Damage, plus ~1% per Divines-traited armor piece.';
  }
  if (name.startsWith('The Thief (')) {
    return 'Mundus stone. Base ~7% Crit Chance, plus ~0.6% per Divines-traited armor piece.';
  }
  if (name.startsWith('The Lady (')) {
    return 'Mundus stone. Base 2752 resistance, plus ~220 per Divines-traited armor piece.';
  }

  return undefined;
}

/** Descriptions for individual stat source items */
const STAT_ITEM_DESCRIPTIONS: Record<string, string> = {
  // ── Penetration: Buffs ──────────────────────────────────────────────────
  'Major Breach':
    'Reduces target resistance by 5948. Applied by tank skills like Pierce Armor, Elemental Drain, or Netch.',
  'Minor Breach':
    'Reduces target resistance by 2974. Applied by skills like Low Slash, Shock Clench, or Shattering Prison.',
  'Crusher Enchant':
    'Weapon glyph proc reducing target resistance by 2108 for 5s. Usually applied by the tank.',
  'Roar of Alkosh':
    'Trial set (Maw of Lorkhaj). Tank applies up to 6000 pen debuff by activating synergies.',
  "Crimson Oath's Rive":
    'Dungeon set (The Cauldron). Tank applies 3541 pen debuff to enemies within 12 meters.',
  Tremorscale: 'Monster set (Volenfell). Applies 2640 pen debuff to the enemy when taunting.',
  'Runic Sunder': 'Arcanist class ability. Applies 2200 pen debuff via Crux consumption.',
  'Crystal Weapon':
    'Sorcerer skill. Next light attack applies 1000 pen debuff to the target. PvP only.',

  // ── Penetration: Race ───────────────────────────────────────────────────
  "Hunter's Eye": 'Wood Elf (Bosmer) racial passive. Grants 950 Physical and Spell Penetration.',

  // ── Penetration: Class ──────────────────────────────────────────────────
  Dismember:
    'Necromancer Grave Lord passive. Grants 3271 Physical and Spell Penetration while a Grave Lord ability is slotted.',
  'Splintered Secrets':
    'Arcanist Herald of the Tome passive. Grants 1240 pen per Crux consumed (shown at 2 stacks).',

  // ── Penetration: Mundus ─────────────────────────────────────────────────
  'The Lover': 'Mundus stone. Grants 2752 pen at base, plus ~220 per Divines trait piece.',

  // ── Penetration: Passive (armor/weapon) ─────────────────────────────────
  'Twin Blade & Blunt (Mace)': 'Dual Wield passive. Each mace increases penetration by 1487.',
  'Heavy Weapons (Maul)': 'Two-Handed passive. Mauls grant 2974 penetration.',

  // ── Penetration: CP ─────────────────────────────────────────────────────
  'CP: Piercing': 'Warfare constellation passive. Grants 350 penetration per stage allocated.',
  'CP: Force of Nature':
    'Warfare slottable star. Grants 220 penetration per status effect on the target.',

  // ── Penetration: Gear (special) ─────────────────────────────────────────
  Anthelmir:
    "Anthelmir's Construct set. Grants penetration equal to your Weapon Damage divided by 2.5.",
  Balorgh:
    'Balorgh monster set. On ultimate cast, grants penetration equal to ultimate cost multiplied by 23.',

  // ── Crit Damage: Buffs ──────────────────────────────────────────────────
  'Minor Force':
    'Increases Critical Damage by 10%. Applied by Barbed Trap, Channeled Acceleration, or similar.',
  'Major Force':
    'Increases Critical Damage by 20%. Applied by Aggressive Horn or Saxhleel Champion set.',
  'Minor Brittle':
    "Target takes 10% more Critical Damage. Applied by Frost Clench, Winter's Revenge, or Chilled status.",
  'Major Brittle':
    'Target takes 20% more Critical Damage. Applied by specific sets or abilities (rare).',
  'Elemental Catalyst':
    'Warden skill. Each status effect on the target grants 5% crit damage, up to 3 stacks (15%).',

  // ── Crit Damage: Gear ───────────────────────────────────────────────────
  'Lucent Echoes': 'Gold Road gear set. Grants 11% Critical Damage when dealing direct damage.',
  "Sul-Xan's Torment": 'Rockgrove trial set. Grants 12% Critical Damage. PvE only.',
  "Harpooner's Wading Kilt":
    'Mythic item. Stacks up to 10% Critical Damage (1% per stack), lost on taking damage.',

  // ── Crit Damage: Race ───────────────────────────────────────────────────
  'Feline Ambush': 'Khajiit racial passive. Grants 12% Critical Damage.',

  // ── Crit Damage: Class ──────────────────────────────────────────────────
  'Fated Fortune': 'Arcanist Herald of the Tome passive. Grants 12% Critical Damage (6% per rank).',
  Hemorrhage: 'Nightblade Assassination passive. Grants 10% Critical Damage (5% per rank).',
  'Piercing Spear': 'Templar Aedric Spear passive. Grants 12% Critical Damage (6% per rank).',
  'Advanced Species':
    'Warden Animal Companions passive. Grants 15% Critical Damage when an Animal Companions ability is slotted.',

  // ── Crit Damage: Passive (armor) ────────────────────────────────────────
  'Twin Blade & Blunt (Axe)': 'Dual Wield passive. Each axe increases Critical Damage by 6%.',
  'Heavy Weapons (Axe)': 'Two-Handed passive. Axes grant 6% Critical Damage.',

  // ── Crit Damage: Mundus ─────────────────────────────────────────────────
  'The Shadow':
    'Mundus stone. Grants 13% Critical Damage at base, plus ~1% per Divines trait piece.',

  // ── Crit Damage: CP ─────────────────────────────────────────────────────
  'CP: Fighting Finesse':
    'Warfare slottable star. Grants 4% Critical Damage per stage (max 2 stages, 8% total).',
  'CP: Backstabber':
    'Warfare slottable star. Grants 2% Critical Damage per stage when attacking from behind or flanking.',

  // ── Crit Chance: Base ───────────────────────────────────────────────────
  'Base Crit Chance': 'Every character starts with 10% base Critical Chance at level 50.',

  // ── Crit Chance: Race ───────────────────────────────────────────────────
  'Lunar Blessings':
    'Khajiit racial passive. Grants 2284 Critical Rating (~10.4% Critical Chance).',

  // ── Crit Chance: Mundus ─────────────────────────────────────────────────
  'The Thief':
    'Mundus stone. Grants ~7% Critical Chance at base, plus ~0.6% per Divines trait piece.',

  // ── Crit Chance: Passive (weapon) ───────────────────────────────────────
  'Twin Blade & Blunt (Dagger)':
    'Dual Wield passive. Each dagger increases Critical Chance by ~7.4% (1612 rating).',

  // ── Crit Chance: CP ─────────────────────────────────────────────────────
  'CP: Precision':
    'Warfare constellation passive. Grants 160 Critical Rating per stage (~0.73% per stage).',

  // ── Armor: Race ─────────────────────────────────────────────────────────
  Stalwart: 'Nord racial passive. Grants 2600 Physical and Spell Resistance.',
  'Imperial Mettle': 'Imperial racial passive. Grants 2000 Physical and Spell Resistance.',
  'Unflinching Rage': 'Orc (Orsimer) racial passive. Grants 2000 Physical and Spell Resistance.',

  // ── Armor: Mundus ───────────────────────────────────────────────────────
  'The Lady': 'Mundus stone. Grants 2752 resistance at base, plus ~220 per Divines trait piece.',

  // ── Crit Damage: Base ───────────────────────────────────────────────────
  'Base Crit Damage': 'Every character starts with 50% base Critical Damage at level 50.',
};

/** Descriptions for source category headers */
export const SOURCE_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  base: 'Innate character stats at level 50, before any gear or passives.',
  race: "Bonuses from your character's racial passive abilities.",
  class:
    'Bonuses from class-specific passive abilities. Requires a skill from that line to be slotted.',
  mundus: 'Bonus from your active Mundus stone. Divines trait on armor amplifies the effect.',
  gear: 'Bonuses from equipped gear sets and mythic items.',
  passive: 'Bonuses from armor weight passives and weapon type passives.',
  cp: 'Bonuses from Champion Point allocations in the Warfare constellation.',
  buff: 'Active buffs and debuffs applied during combat. Toggle in the Buff Toggles section above.',
};
