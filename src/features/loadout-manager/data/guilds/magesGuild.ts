import type { SkillData } from '../types';

export const MAGES_GUILD_SKILLS: SkillData[] = [
  // Ultimate
  { id: 16536, name: 'Meteor', category: 'Mages Guild', isUltimate: true },
  { id: 40489, name: 'Ice Comet', category: 'Mages Guild', isUltimate: true, baseSkillId: 16536 },
  { id: 40493, name: 'Shooting Star', category: 'Mages Guild', isUltimate: true, baseSkillId: 16536 },

  // Ulfsild's Contingency (new skill)
  { id: 217528, name: "Ulfsild's Contingency", category: 'Mages Guild' },
  { id: 217583, name: "Ulfsild's Preservation", category: 'Mages Guild', baseSkillId: 217528 },
  { id: 217582, name: "Ulfsild's Contingent", category: 'Mages Guild', baseSkillId: 217528 },

  // Magelight
  { id: 30920, name: 'Magelight', category: 'Mages Guild' },
  { id: 40478, name: 'Inner Light', category: 'Mages Guild', baseSkillId: 30920 },
  { id: 40487, name: 'Radiant Magelight', category: 'Mages Guild', baseSkillId: 30920 },

  // Entropy
  { id: 28567, name: 'Entropy', category: 'Mages Guild' },
  { id: 40457, name: 'Degeneration', category: 'Mages Guild', baseSkillId: 28567 },
  { id: 40452, name: 'Structured Entropy', category: 'Mages Guild', baseSkillId: 28567 },

  // Fire Rune
  { id: 31632, name: 'Fire Rune', category: 'Mages Guild' },
  { id: 40465, name: 'Scalding Rune', category: 'Mages Guild', baseSkillId: 31632 },
  { id: 40470, name: 'Volcanic Rune', category: 'Mages Guild', baseSkillId: 31632 },

  // Equilibrium
  { id: 31642, name: 'Equilibrium', category: 'Mages Guild' },
  { id: 40442, name: 'Balance', category: 'Mages Guild', baseSkillId: 31642 },
  { id: 40445, name: 'Spell Symmetry', category: 'Mages Guild', baseSkillId: 31642 },

  // Passives
  { id: 30923, name: 'Persuasive Will', category: 'Mages Guild' },
  { id: 30925, name: 'Mage Adept', category: 'Mages Guild' },
  { id: 30931, name: 'Everlasting Magic', category: 'Mages Guild' },
  { id: 31676, name: 'Magicka Controller', category: 'Mages Guild' },
  { id: 31680, name: 'Might of the Guild', category: 'Mages Guild' },
];
