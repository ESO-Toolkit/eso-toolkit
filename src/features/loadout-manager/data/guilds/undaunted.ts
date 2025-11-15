import type { SkillData } from '../types';

export const UNDAUNTED_SKILLS: SkillData[] = [
  // Blood Altar
  { id: 39489, name: 'Blood Altar', category: 'Undaunted' },
  { id: 41967, name: 'Overflowing Altar', category: 'Undaunted', baseSkillId: 39489 },
  { id: 41958, name: 'Sanguine Altar', category: 'Undaunted', baseSkillId: 39489 },

  // Trapping Webs
  { id: 39425, name: 'Trapping Webs', category: 'Undaunted' },
  { id: 41990, name: 'Shadow Silk', category: 'Undaunted', baseSkillId: 39425 },
  { id: 41993, name: 'Tangling Webs', category: 'Undaunted', baseSkillId: 39425 },

  // Inner Fire
  { id: 39475, name: 'Inner Fire', category: 'Undaunted' },
  { id: 42056, name: 'Inner Beast', category: 'Undaunted', baseSkillId: 39475 },
  { id: 42060, name: 'Inner Rage', category: 'Undaunted', baseSkillId: 39475 },

  // Bone Shield
  { id: 39369, name: 'Bone Shield', category: 'Undaunted' },
  { id: 42138, name: 'Bone Surge', category: 'Undaunted', baseSkillId: 39369 },
  { id: 42176, name: 'Spiked Bone Shield', category: 'Undaunted', baseSkillId: 39369 },

  // Necrotic Orb
  { id: 39298, name: 'Necrotic Orb', category: 'Undaunted' },
  { id: 42028, name: 'Energy Orb', category: 'Undaunted', baseSkillId: 39298 },
  { id: 42038, name: 'Mystic Orb', category: 'Undaunted', baseSkillId: 39298 },

  // Passives
  { id: 55584, name: 'Undaunted Command', category: 'Undaunted' },
  { id: 55386, name: 'Undaunted Mettle', category: 'Undaunted' },
];
