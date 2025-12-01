import type { SkillData } from '../types';

import { HEAVY_ARMOR_SKILLS } from './heavyArmor';
import { LIGHT_ARMOR_SKILLS } from './lightArmor';
import { MEDIUM_ARMOR_SKILLS } from './mediumArmor';

export const ARMOR_SKILLS: SkillData[] = [
  ...HEAVY_ARMOR_SKILLS,
  ...MEDIUM_ARMOR_SKILLS,
  ...LIGHT_ARMOR_SKILLS,
];

export { HEAVY_ARMOR_SKILLS, MEDIUM_ARMOR_SKILLS, LIGHT_ARMOR_SKILLS };
