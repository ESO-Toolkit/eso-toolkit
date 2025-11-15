import type { SkillData } from '../types';

export const VAMPIRE_SKILLS: SkillData[] = [
  // Ultimate
  { id: 32624, name: 'Blood Scion', category: 'Vampire', isUltimate: true },
  { id: 38956, name: 'Perfect Scion', category: 'Vampire', isUltimate: true, baseSkillId: 32624 },
  { id: 38963, name: 'Swarming Scion', category: 'Vampire', isUltimate: true, baseSkillId: 32624 },

  // Eviscerate
  { id: 32893, name: 'Eviscerate', category: 'Vampire' },
  { id: 38949, name: 'Arterial Burst', category: 'Vampire', baseSkillId: 32893 },
  { id: 38941, name: 'Blood for Blood', category: 'Vampire', baseSkillId: 32893 },

  // Blood Frenzy
  { id: 27791, name: 'Blood Frenzy', category: 'Vampire' },
  { id: 135841, name: 'Sated Fury', category: 'Vampire', baseSkillId: 27791 },
  { id: 135842, name: 'Simmering Frenzy', category: 'Vampire', baseSkillId: 27791 },

  // Vampiric Drain
  { id: 34911, name: 'Vampiric Drain', category: 'Vampire' },
  { id: 38933, name: 'Drain Vigor', category: 'Vampire', baseSkillId: 34911 },
  { id: 38939, name: 'Exhilarating Drain', category: 'Vampire', baseSkillId: 34911 },

  // Mesmerize
  { id: 128709, name: 'Mesmerize', category: 'Vampire' },
  { id: 128712, name: 'Hypnosis', category: 'Vampire', baseSkillId: 128709 },
  { id: 128713, name: 'Stupefy', category: 'Vampire', baseSkillId: 128709 },

  // Mist Form
  { id: 32986, name: 'Mist Form', category: 'Vampire' },
  { id: 38965, name: 'Blood Mist', category: 'Vampire', baseSkillId: 32986 },
  { id: 38973, name: 'Elusive Mist', category: 'Vampire', baseSkillId: 32986 },

  // Passives
  { id: 33096, name: 'Feed', category: 'Vampire' },
  { id: 33301, name: 'Dark Stalker', category: 'Vampire' },
  { id: 33326, name: 'Strike from the Shadows', category: 'Vampire' },
  { id: 33320, name: 'Blood Ritual', category: 'Vampire' },
  { id: 135397, name: 'Undeath', category: 'Vampire' },
  { id: 135399, name: 'Unnatural Movement', category: 'Vampire' },
];
