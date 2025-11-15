import type { SkillData } from '../types';
import { FIGHTERS_GUILD_SKILLS } from './fightersGuild';
import { MAGES_GUILD_SKILLS } from './magesGuild';
import { PSIJIC_ORDER_SKILLS } from './psijicOrder';
import { UNDAUNTED_SKILLS } from './undaunted';

export const GUILD_SKILLS: SkillData[] = [
  ...FIGHTERS_GUILD_SKILLS,
  ...MAGES_GUILD_SKILLS,
  ...PSIJIC_ORDER_SKILLS,
  ...UNDAUNTED_SKILLS,
];

export { FIGHTERS_GUILD_SKILLS, MAGES_GUILD_SKILLS, PSIJIC_ORDER_SKILLS, UNDAUNTED_SKILLS };
