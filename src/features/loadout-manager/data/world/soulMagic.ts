import type { SkillData } from '../types';

export const SOUL_MAGIC_SKILLS: SkillData[] = [
  // Ultimate
  { id: 39270, name: 'Soul Strike', category: 'Soul Magic', isUltimate: true },
  { id: 40414, name: 'Shatter Soul', category: 'Soul Magic', isUltimate: true, baseSkillId: 39270 },
  { id: 40420, name: 'Soul Assault', category: 'Soul Magic', isUltimate: true, baseSkillId: 39270 },

  // Quest Skills (non-morphable)
  { id: 19801, name: 'Soul Burst', category: 'Soul Magic' },
  { id: 19760, name: 'Wield Soul', category: 'Soul Magic' },

  // Soul Trap
  { id: 3674, name: 'Soul Trap', category: 'Soul Magic' },
  { id: 40328, name: 'Consuming Trap', category: 'Soul Magic', baseSkillId: 3674 },
  { id: 40317, name: 'Soul Splitting Trap', category: 'Soul Magic', baseSkillId: 3674 },

  // Passives
  { id: 39263, name: 'Soul Shatter', category: 'Soul Magic' },
  { id: 39266, name: 'Soul Summons', category: 'Soul Magic' },
  { id: 39269, name: 'Soul Lock', category: 'Soul Magic' },
];
