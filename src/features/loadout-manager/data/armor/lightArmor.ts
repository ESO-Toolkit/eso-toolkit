import type { SkillData } from '../types';

export const LIGHT_ARMOR_SKILLS: SkillData[] = [
  // Annulment
  { id: 29338, name: 'Annulment', category: 'Light Armor' },
  { id: 29339, name: 'Dampen Magic', category: 'Light Armor', baseSkillId: 29338 },
  { id: 29340, name: 'Harness Magicka', category: 'Light Armor', baseSkillId: 29338 },

  // Passives
  { id: 29757, name: 'Light Armor Bonuses', category: 'Light Armor' },
  { id: 29758, name: 'Light Armor Penalties', category: 'Light Armor' },
  { id: 29759, name: 'Grace', category: 'Light Armor' },
  { id: 29761, name: 'Evocation', category: 'Light Armor' },
  { id: 29763, name: 'Spell Warding', category: 'Light Armor' },
  { id: 29764, name: 'Prodigy', category: 'Light Armor' },
  { id: 29766, name: 'Concentration', category: 'Light Armor' },
];
