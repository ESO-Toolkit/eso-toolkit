/**
 * Ordered values used by the compact roster wire format.
 *
 * Index order is part of the persisted protocol. Keep this dependency-free so
 * the frontend contract test can import it without pulling in Worker runtime
 * code.
 */
export const CLASS_SKILL_LINES = [
  'Ardent Flame',
  'Draconic Power',
  'Earthen Heart',
  'Dark Magic',
  'Daedric Summoning',
  'Storm Calling',
  'Assassination',
  'Shadow',
  'Siphoning',
  'Aedric Spear',
  "Dawn's Wrath",
  'Restoring Light',
  'Animal Companions',
  'Green Balance',
  "Winter's Embrace",
  'Grave Lord',
  'Bone Tyrant',
  'Living Death',
  'Herald of the Tome',
  'Soldier of Apocrypha',
  'Curative Runeforms',
] as const;

export const ULTIMATE_LIST = [
  'Aggressive Warhorn',
  'Glacial Colossus',
  'Barrier',
  'Greater Storm Atronach',
] as const;

export const HEALER_BUFF_LIST = ['Enlivening Overflow', 'From the Brink'] as const;

export const CHAMPION_POINT_LIST = ['Enlivening Overflow', 'From the Brink'] as const;

export const JAIL_DD_TYPE_LIST = ['banner', 'zenkosh', 'wm', 'wm-mk', 'mk', 'custom'] as const;

export const DEFAULT_COMPOSITION = { tanks: 2, healers: 2, dps: 8 } as const;

export const COMPOSITION_LIMITS = { tanks: 4, healers: 4, dps: 24 } as const;
