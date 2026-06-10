import type { SkillLineData } from '../data/types/skill-line-types';

/**
 * Flat set of every ability name in a skill line (base abilities and morphs are
 * already sibling entries in SkillLineData.skills). Used to count how many of a
 * player's slotted abilities belong to a given skill line, without depending on
 * the legacy SkillsetData tree.
 */
export function skillLineAbilityNames(skillLine: SkillLineData): Set<string> {
  const names = new Set<string>();
  for (const skill of skillLine.skills) {
    if (skill?.name) names.add(skill.name);
  }
  return names;
}
