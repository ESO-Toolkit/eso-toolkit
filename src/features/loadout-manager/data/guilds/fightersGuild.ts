import type { SkillData } from '../types';

export const FIGHTERS_GUILD_SKILLS: SkillData[] = [
  // Ultimate
  { id: 35713, name: 'Dawnbreaker', category: 'Fighters Guild', isUltimate: true },
  { id: 40158, name: 'Dawnbreaker of Smiting', category: 'Fighters Guild', isUltimate: true, baseSkillId: 35713 },
  { id: 40161, name: 'Flawless Dawnbreaker', category: 'Fighters Guild', isUltimate: true, baseSkillId: 35713 },

  // Silver Bolts
  { id: 35721, name: 'Silver Bolts', category: 'Fighters Guild' },
  { id: 40338, name: 'Silver Leash', category: 'Fighters Guild', baseSkillId: 35721 },
  { id: 40336, name: 'Silver Shards', category: 'Fighters Guild', baseSkillId: 35721 },

  // Circle of Protection
  { id: 35737, name: 'Circle of Protection', category: 'Fighters Guild' },
  { id: 40181, name: 'Ring of Preservation', category: 'Fighters Guild', baseSkillId: 35737 },
  { id: 40169, name: 'Turn Evil', category: 'Fighters Guild', baseSkillId: 35737 },

  // Expert Hunter
  { id: 35762, name: 'Expert Hunter', category: 'Fighters Guild' },
  { id: 40195, name: 'Camouflaged Hunter', category: 'Fighters Guild', baseSkillId: 35762 },
  { id: 40194, name: 'Evil Hunter', category: 'Fighters Guild', baseSkillId: 35762 },

  // Trap Beast
  { id: 35750, name: 'Trap Beast', category: 'Fighters Guild' },
  { id: 40382, name: 'Barbed Trap', category: 'Fighters Guild', baseSkillId: 35750 },
  { id: 40372, name: 'Lightweight Beast Trap', category: 'Fighters Guild', baseSkillId: 35750 },

  // Passives
  { id: 35800, name: 'Intimidating Presence', category: 'Fighters Guild' },
  { id: 35803, name: 'Slayer', category: 'Fighters Guild' },
  { id: 35806, name: 'Banish the Wicked', category: 'Fighters Guild' },
  { id: 35814, name: 'Skilled Tracker', category: 'Fighters Guild' },
  { id: 35816, name: 'Bounty Hunter', category: 'Fighters Guild' },
];
