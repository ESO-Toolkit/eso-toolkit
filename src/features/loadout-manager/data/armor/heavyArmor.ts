import type { SkillData } from '../types';

export const HEAVY_ARMOR_SKILLS: SkillData[] = [
  // Unstoppable
  { id: 29552, name: 'Unstoppable', category: 'Heavy Armor' },
  { id: 29554, name: 'Immovable', category: 'Heavy Armor', baseSkillId: 29552 },
  { id: 29555, name: 'Unstoppable Brute', category: 'Heavy Armor', baseSkillId: 29552 },

  // Passives
  { id: 29773, name: 'Heavy Armor Bonuses', category: 'Heavy Armor' },
  { id: 29774, name: 'Heavy Armor Penalties', category: 'Heavy Armor' },
  { id: 29775, name: 'Resolve', category: 'Heavy Armor' },
  { id: 29780, name: 'Constitution', category: 'Heavy Armor' },
  { id: 29781, name: 'Juggernaut', category: 'Heavy Armor' },
  { id: 29791, name: 'Revitalize', category: 'Heavy Armor' },
  { id: 29795, name: 'Rapid Mending', category: 'Heavy Armor' },
];
