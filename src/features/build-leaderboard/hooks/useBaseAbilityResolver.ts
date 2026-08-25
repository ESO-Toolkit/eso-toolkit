/**
 * Memoized abilityId → baseAbilityId resolver for morph partial credit.
 *
 * Built once from the skill-line registry — the same source of truth
 * `groupSkillsByBase` uses (`baseSkillId ?? baseAbilityId`), so a morph maps to
 * the base skill its siblings share and `barDistance` can award partial credit
 * between opposite morphs of the same ability.
 *
 * The identity must stay stable across renders: `useBuildClusters` keys its
 * result cache partly on resolver identity, so a fresh closure every render
 * would silently discard every cached clustering.
 */

import { useMemo } from 'react';

import { ALL_SKILL_LINES } from '../../../utils/skillLinesRegistry';

export type BaseAbilityResolver = (abilityId: number) => number | undefined;

export function useBaseAbilityResolver(): BaseAbilityResolver {
  return useMemo<BaseAbilityResolver>(() => {
    const baseById = new Map<number, number>();

    for (const skillLine of ALL_SKILL_LINES) {
      for (const skill of skillLine.skills ?? []) {
        // Same precedence groupSkillsByBase applies: loadout-manager data
        // carries baseSkillId, skill-lines data carries baseAbilityId.
        const base = skill.baseSkillId ?? skill.baseAbilityId;
        if (typeof base === 'number' && base !== skill.id) {
          baseById.set(skill.id, base);
        }
      }
    }

    return (abilityId: number) => baseById.get(abilityId);
  }, []);
}
