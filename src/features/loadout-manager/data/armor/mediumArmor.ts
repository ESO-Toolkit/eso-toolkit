import type { SkillData } from '../types';

export const MEDIUM_ARMOR_SKILLS: SkillData[] = [
  // Evasion
  { id: 29556, name: 'Evasion', category: 'Medium Armor' },
  { id: 29557, name: 'Elude', category: 'Medium Armor', baseSkillId: 29556 },
  { id: 29558, name: 'Shuffle', category: 'Medium Armor', baseSkillId: 29556 },

  // Passives
  { id: 29798, name: 'Medium Armor Bonuses', category: 'Medium Armor' },
  { id: 29799, name: 'Dexterity', category: 'Medium Armor' },
  { id: 29800, name: 'Wind Walker', category: 'Medium Armor' },
  { id: 29803, name: 'Improved Sneak', category: 'Medium Armor' },
  { id: 29805, name: 'Agility', category: 'Medium Armor' },
  { id: 29806, name: 'Athletics', category: 'Medium Armor' },
];
