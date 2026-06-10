/**
 * Shared types for ESO Player Skills
 */

export interface SkillData {
  id: number;
  name: string;
  category: string;
  icon?: string; // Icon slug (e.g. "ability_dragonknight_006")
  isUltimate?: boolean;
  baseSkillId?: number; // For morphs, references the base skill ID
}

// Re-export the ClassSkillId enum as SkillId for backward compatibility
export { ClassSkillId as SkillId } from './classSkillIds';
