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

export const useSectionProgress = (): SectionProgressMap => {
  const setup = useSelector(
    (s: RootState) => s.buildEditor.build.setups[s.buildEditor.activeSetupIndex],
  );
  const buildName = useSelector((s: RootState) => s.buildEditor.build.name);
  const classSkillLines = useSelector((s: RootState) => s.buildEditor.build.classSkillLines);
  const guideContent = useSelector((s: RootState) => s.buildEditor.build.guide.content);

  return useMemo(() => {
    if (!setup) {
      return Object.fromEntries(
        BE_TOKENS.sectionIds.map((id) => [id, false]),
      ) as SectionProgressMap;
    }

    return {
      general: buildName.trim().length > 0,
      subclassing: classSkillLines.every((line) => line != null),
      character:
        setup.attributes.magicka + setup.attributes.health + setup.attributes.stamina > 0 ||
        setup.mundusStone !== '',
      equipment: Object.keys(setup.gear).length > 0,
      skills:
        Object.keys(setup.skills[0] ?? {}).length > 0 ||
        Object.keys(setup.skills[1] ?? {}).length > 0,
      champion:
        setup.cp.warfare.slots.some((s) => s != null) ||
        setup.cp.fitness.slots.some((s) => s != null) ||
        setup.cp.craft.slots.some((s) => s != null),
      consumables: setup.consumables.potions.length > 0 || Boolean(setup.consumables.food.name),
      passives: setup.passives.length > 0,
      stats: true, // always complete — stats are derived, not user-entered
      guide: guideContent.trim().length > 0 || setup.screenshots.length > 0,
      settings: true, // always has defaults
    };
  }, [setup, buildName, classSkillLines, guideContent]);
};
