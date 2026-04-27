import type { ExtractedIntent } from '../types';

const WEAPON_PATTERNS: Record<string, string[]> = {
  'dual wield': ['dual wield', 'dw', 'dual-wield', 'daggers'],
  'two handed': ['two handed', '2h', 'two-handed', 'greatsword', 'maul', 'battle axe'],
  'one hand and shield': ['one hand', 'sword and board', 'sword and shield', 's&b', '1h', 'sns'],
  bow: ['bow'],
  'destruction staff': [
    'destro',
    'destruction staff',
    'inferno staff',
    'lightning staff',
    'ice staff',
    'frost staff',
    'fire staff',
  ],
  'restoration staff': ['resto', 'restoration staff', 'healing staff'],
};

const TRAIT_PATTERNS: Record<string, string[]> = {
  nirnhoned: ['nirnhoned', 'nirn'],
  precise: ['precise'],
  sharpened: ['sharpened', 'sharp'],
  powered: ['powered'],
  infused: ['infused'],
  defending: ['defending'],
  charged: ['charged'],
  'training': ['training'],
  decisive: ['decisive'],
};

const ENCHANT_PATTERNS: Record<string, string[]> = {
  'weapon damage': ['weapon damage enchant', 'berserker'],
  'spell damage': ['spell damage enchant'],
  'absorb magicka': ['absorb magicka', 'mag absorb'],
  'absorb stamina': ['absorb stamina', 'stam absorb'],
  'fire damage': ['fire enchant', 'flame enchant', 'fire damage enchant'],
  'shock damage': ['shock enchant', 'lightning enchant', 'shock damage enchant'],
  'poison damage': ['poison enchant', 'poison damage enchant'],
  'disease damage': ['disease enchant', 'disease damage enchant'],
  'prismatic defense': ['prismatic', 'prismatic defense'],
  hardening: ['hardening'],
  weakening: ['weakening'],
  crusher: ['crusher'],
  'absorb health': ['absorb health', 'drain health'],
};

const ROLE_PATTERNS: Record<string, string[]> = {
  tank: ['tank', 'tanking'],
  healer: ['healer', 'healing', 'heal'],
  'magicka dps': ['magicka dps', 'mag dps', 'magdps', 'magdd'],
  'stamina dps': ['stamina dps', 'stam dps', 'stamdps', 'stamdd'],
  dps: ['dps', 'damage dealer', 'dd'],
};

const CLASS_PATTERNS: Record<string, string[]> = {
  dragonknight: ['dragonknight', 'dk'],
  sorcerer: ['sorcerer', 'sorc'],
  nightblade: ['nightblade', 'nb'],
  templar: ['templar', 'temp', 'plar'],
  warden: ['warden'],
  necromancer: ['necromancer', 'necro'],
  arcanist: ['arcanist', 'arc'],
};

const matchPatterns = (text: string, patterns: Record<string, string[]>): string[] => {
  const matches: string[] = [];
  for (const [canonical, aliases] of Object.entries(patterns)) {
    for (const alias of aliases) {
      if (text.includes(alias)) {
        matches.push(canonical);
        break;
      }
    }
  }
  return matches;
};

export const extractIntent = (message: string): ExtractedIntent => {
  const lower = message.toLowerCase();

  return {
    weapons: matchPatterns(lower, WEAPON_PATTERNS),
    traits: matchPatterns(lower, TRAIT_PATTERNS),
    enchants: matchPatterns(lower, ENCHANT_PATTERNS),
    roles: matchPatterns(lower, ROLE_PATTERNS),
    classes: matchPatterns(lower, CLASS_PATTERNS),
    keywords: extractKeywords(lower),
  };
};

const extractKeywords = (text: string): string[] => {
  const gameTerms = [
    'parse',
    'trial',
    'arena',
    'dungeon',
    'pvp',
    'pve',
    'overland',
    'vet',
    'veteran',
    'normal',
    'hardmode',
    'score',
    'dps check',
    'sustain',
    'penetration',
    'critical',
    'crit',
    'buff',
    'debuff',
    'rotation',
    'light attack',
    'weaving',
    'animation cancel',
    'bar swap',
    'back bar',
    'front bar',
    'mundus',
    'champion points',
    'cp',
    'gear',
    'set bonus',
    'monster set',
    'mythic',
  ];
  return gameTerms.filter((term) => text.includes(term));
};
