import type { SkillData } from '../types';
import { HEAVY_ARMOR_SKILLS } from './heavyArmor';
import { MEDIUM_ARMOR_SKILLS } from './mediumArmor';
import { LIGHT_ARMOR_SKILLS } from './lightArmor';

export const ARMOR_SKILLS: SkillData[] = [
  ...HEAVY_ARMOR_SKILLS,
  ...MEDIUM_ARMOR_SKILLS,
  ...LIGHT_ARMOR_SKILLS,
];

export { HEAVY_ARMOR_SKILLS, MEDIUM_ARMOR_SKILLS, LIGHT_ARMOR_SKILLS };
