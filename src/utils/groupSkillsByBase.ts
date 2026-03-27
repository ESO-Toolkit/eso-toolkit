/**
 * groupSkillsByBase — Groups a flat list of skills into base + morph groups.
 *
 * Shared by SkillBarPicker and SpecificSkillsPicker to de-duplicate the
 * grouping logic. Each group has one base skill and its morphs.
 */
import type { SkillData } from '../data/types/skill-line-types';

export interface SkillGroup {
  base: SkillData;
  morphs: SkillData[];
}

export function groupSkillsByBase(skills: SkillData[]): SkillGroup[] {
  const map = new Map<number, { base?: SkillData; morphs: SkillData[] }>();
  for (const skill of skills) {
    const baseId = skill.baseSkillId ?? skill.baseAbilityId ?? skill.id;
    if (!map.has(baseId)) map.set(baseId, { morphs: [] });
    const g = map.get(baseId)!;
    if (skill.id === baseId) g.base = skill;
    else g.morphs.push(skill);
  }
  const result: SkillGroup[] = [];
  for (const g of map.values()) {
    if (g.base) result.push({ base: g.base, morphs: g.morphs });
    else if (g.morphs.length > 0) result.push({ base: g.morphs[0], morphs: g.morphs.slice(1) });
  }
  return result;
}
