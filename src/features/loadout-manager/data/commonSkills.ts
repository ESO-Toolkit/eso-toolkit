/**
 * ESO Player Skills for Loadout Manager
 * Complete mapping of player-usable skills extracted from active loadouts
 * All IDs verified against abilities.json and real player usage
 */

export interface SkillData {
  id: number;
  name: string;
  category: string;
  isUltimate?: boolean;
}

/**
 * All player skills organized by category
 * IDs sourced from abilities.json and verified from real player loadouts
 */
export const COMMON_SKILLS: SkillData[] = [
  // Weapon Skills - Dual Wield
  { id: 38906, name: 'Deadly Cloak', category: 'Dual Wield' },
  { id: 38914, name: 'Whirling Blades', category: 'Dual Wield' },
  { id: 38910, name: 'Blood Craze', category: 'Dual Wield' },
  
  // Weapon Skills - Two-Handed
  { id: 38794, name: 'Stampede', category: 'Two-Handed' },
  { id: 38788, name: 'Carve', category: 'Two-Handed' },
  { id: 126582, name: 'Onslaught', category: 'Two-Handed', isUltimate: true },
  
  // Weapon Skills - Bow
  { id: 38685, name: 'Endless Hail', category: 'Bow' },
  { id: 38687, name: 'Arrow Spray', category: 'Bow' },
  { id: 40015, name: 'Poison Injection', category: 'Bow' },
  
  // Weapon Skills - Destruction Staff
  { id: 39011, name: 'Elemental Blockade', category: 'Destruction Staff' },
  { id: 39052, name: 'Unstable Wall of Elements', category: 'Destruction Staff' },
  { id: 46331, name: 'Crystal Weapon', category: 'Destruction Staff' },
  { id: 62618, name: 'Crushing Shock', category: 'Destruction Staff' },
  
  // Weapon Skills - Restoration Staff
  { id: 40126, name: 'Radiating Regeneration', category: 'Restoration Staff' },
  { id: 40130, name: 'Healing Springs', category: 'Restoration Staff' },
  { id: 40158, name: 'Energy Orb', category: 'Restoration Staff' },
  
  // Fighter's Guild
  { id: 40382, name: 'Barbed Trap', category: "Fighter's Guild" },
  { id: 35753, name: 'Ring of Preservation', category: "Fighter's Guild" },
  { id: 40336, name: 'Dawnbreaker of Smiting', category: "Fighter's Guild", isUltimate: true },
  
  // Mage's Guild
  { id: 40465, name: 'Scalding Rune', category: "Mage's Guild" },
  { id: 40470, name: 'Degeneration', category: "Mage's Guild" },
  { id: 16536, name: 'Meteor', category: "Mage's Guild", isUltimate: true },
  
  // Undaunted
  { id: 42198, name: 'Inner Fire', category: 'Undaunted' },
  { id: 42196, name: 'Inner Rage', category: 'Undaunted' },
  
  // Psijic Order
  { id: 103483, name: 'Channeled Acceleration', category: 'Psijic Order' },
  { id: 103503, name: 'Elemental Weapon', category: 'Psijic Order' },
  
  // Alliance War - Assault
  { id: 40223, name: 'Aggressive Horn', category: 'Assault', isUltimate: true },
  { id: 40220, name: 'Sturdy Horn', category: 'Assault', isUltimate: true },
  { id: 38563, name: 'Resolving Vigor', category: 'Assault' },
  { id: 61491, name: 'Echoing Vigor', category: 'Assault' },
  
  // Alliance War - Support
  { id: 38573, name: 'Spell Orb', category: 'Support' },
  { id: 40142, name: 'Mystic Orb', category: 'Support' },
  
  // Dragonknight
  { id: 32853, name: 'Flames of Oblivion', category: 'Dragonknight' },
  { id: 32881, name: 'Molten Whip', category: 'Dragonknight' },
  { id: 32715, name: 'Venomous Claw', category: 'Dragonknight' },
  { id: 32958, name: 'Engulfing Flames', category: 'Dragonknight' },
  { id: 32946, name: 'Eruption', category: 'Dragonknight' },
  { id: 32792, name: 'Standard of Might', category: 'Dragonknight', isUltimate: true },
  
  // Nightblade
  { id: 61902, name: 'Incapacitating Strike', category: 'Nightblade', isUltimate: true },
  { id: 61919, name: 'Soul Harvest', category: 'Nightblade', isUltimate: true },
  { id: 61944, name: 'Surprise Attack', category: 'Nightblade' },
  { id: 61927, name: 'Killers Blade', category: 'Nightblade' },
  
  // Sorcerer
  { id: 23634, name: 'Crystal Fragments', category: 'Sorcerer' },
  { id: 23304, name: 'Daedric Prey', category: 'Sorcerer' },
  { id: 24828, name: 'Lightning Flood', category: 'Sorcerer' },
  { id: 23670, name: 'Greater Storm Atronach', category: 'Sorcerer', isUltimate: true },
  
  // Templar
  { id: 22138, name: 'Puncturing Sweep', category: 'Templar' },
  { id: 22110, name: 'Radiant Glory', category: 'Templar' },
  { id: 22223, name: 'Power of the Light', category: 'Templar' },
  { id: 22161, name: 'Radiant Oppression', category: 'Templar', isUltimate: true },
  
  // Warden
  { id: 86027, name: 'Fetcher Infection', category: 'Warden' },
  { id: 86019, name: 'Growing Swarm', category: 'Warden' },
  { id: 86161, name: 'Screaming Cliff Racer', category: 'Warden' },
  { id: 86109, name: 'Northern Storm', category: 'Warden', isUltimate: true },
  
  // Necromancer
  { id: 118763, name: 'Stalking Blastbones', category: 'Necromancer' },
  { id: 118680, name: 'Avid Boneyard', category: 'Necromancer' },
  { id: 118308, name: 'Detonating Siphon', category: 'Necromancer' },
  { id: 122174, name: 'Pestilent Colossus', category: 'Necromancer', isUltimate: true },
  
  // Arcanist
  { id: 185823, name: 'Fatecarver', category: 'Arcanist' },
  { id: 183122, name: 'Runespite Ward', category: 'Arcanist' },
  { id: 185805, name: 'Inspired Scholarship', category: 'Arcanist' },
  { id: 183207, name: 'The Languid Eye', category: 'Arcanist', isUltimate: true },
];

/**
 * Get skills filtered by category
 */
export function getSkillsByCategory(category: string): SkillData[] {
  return COMMON_SKILLS.filter((skill) => skill.category === category);
}

/**
 * Get all ultimate skills
 */
export function getUltimates(): SkillData[] {
  return COMMON_SKILLS.filter((skill) => skill.isUltimate);
}

/**
 * Get all regular (non-ultimate) skills
 */
export function getRegularSkills(): SkillData[] {
  return COMMON_SKILLS.filter((skill) => !skill.isUltimate);
}

/**
 * Get all unique categories
 */
export function getCategories(): string[] {
  return Array.from(new Set(COMMON_SKILLS.map((skill) => skill.category))).sort();
}

/**
 * Find skill by ID
 */
export function getSkillById(id: number): SkillData | undefined {
  return COMMON_SKILLS.find((skill) => skill.id === id);
}
