/**
 * useSectionProgress
 * Returns a map of sectionId → boolean (completed/not) for nav rail dots.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { BE_TOKENS } from '../theme/buildEditorTokens';
import type { SectionId } from '../theme/buildEditorTokens';

export type SectionProgressMap = Record<SectionId, boolean>;

/** The 6 skill slot indices per bar (5 actives + 1 ultimate). */
const SKILL_SLOT_KEYS = [3, 4, 5, 6, 7, 8];

/** The 14 gear slot indices (apparel + weapons + jewelry). */
const GEAR_SLOT_KEYS = [0, 1, 2, 3, 4, 5, 6, 8, 9, 11, 12, 16, 20, 21];

/** Check if a skill bar has at least one valid ability assigned. */
function hasFilledSkillSlots(bar: Record<number, number> | undefined): boolean {
  if (!bar) return false;
  return SKILL_SLOT_KEYS.some((k) => bar[k] != null && bar[k] > 0);
}

/** Check if any gear slot (by numeric index only, excluding mythic key) is filled. */
function hasFilledGearSlots(gear: Record<number, unknown>): boolean {
  return GEAR_SLOT_KEYS.some((k) => gear[k] != null);
}

export const useSectionProgress = (): SectionProgressMap => {
  const build = useSelector((s: RootState) => s.buildEditor.build);
  const activeSetupIndex = useSelector((s: RootState) => s.buildEditor.activeSetupIndex);

  return useMemo(() => {
    const setup = build.setups[activeSetupIndex];
    if (!setup) {
      return Object.fromEntries(
        BE_TOKENS.sectionIds.map((id) => [id, false]),
      ) as SectionProgressMap;
    }

    return {
      general: build.name.trim().length > 0,
      subclassing: build.classSkillLines.every((line) => line != null),
      character:
        setup.attributes.magicka + setup.attributes.health + setup.attributes.stamina > 0 ||
        setup.mundusStone !== '',
      equipment: hasFilledGearSlots(setup.gear),
      skills: hasFilledSkillSlots(setup.skills[0]) || hasFilledSkillSlots(setup.skills[1]),
      champion:
        setup.cp.warfare.slots.some((s) => s != null) ||
        setup.cp.fitness.slots.some((s) => s != null) ||
        setup.cp.craft.slots.some((s) => s != null),
      consumables: setup.consumables.potions.length > 0 || Boolean(setup.consumables.food.name),
      passives: setup.passives.length > 0,
      stats: true, // always complete — stats are derived, not user-entered
      guide: build.guide.content.trim().length > 0 || setup.screenshots.length > 0,
      settings: true, // always has defaults
    };
  }, [build, activeSetupIndex]);
};
