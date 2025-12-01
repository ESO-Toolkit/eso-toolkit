import type { SkillData } from '../types';

import { SOUL_MAGIC_SKILLS } from './soulMagic';
import { VAMPIRE_SKILLS } from './vampire';
import { WEREWOLF_SKILLS } from './werewolf';

export const WORLD_SKILLS: SkillData[] = [
  ...WEREWOLF_SKILLS,
  ...VAMPIRE_SKILLS,
  ...SOUL_MAGIC_SKILLS,
];

export { WEREWOLF_SKILLS, VAMPIRE_SKILLS, SOUL_MAGIC_SKILLS };
