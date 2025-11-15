import type { SkillData } from '../types';
import { WEREWOLF_SKILLS } from './werewolf';
import { VAMPIRE_SKILLS } from './vampire';
import { SOUL_MAGIC_SKILLS } from './soulMagic';

export const WORLD_SKILLS: SkillData[] = [
  ...WEREWOLF_SKILLS,
  ...VAMPIRE_SKILLS,
  ...SOUL_MAGIC_SKILLS,
];

export { WEREWOLF_SKILLS, VAMPIRE_SKILLS, SOUL_MAGIC_SKILLS };
