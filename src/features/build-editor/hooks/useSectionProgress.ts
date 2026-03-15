/**
 * useSectionProgress
 * Returns a map of sectionId → boolean (completed/not) for nav rail dots.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import type { SectionId } from '../theme/buildEditorTokens';

export type SectionProgressMap = Record<SectionId, boolean>;

export const useSectionProgress = (): SectionProgressMap => {
  const build = useSelector((s: RootState) => s.buildEditor.build);
  const activeSetupIndex = useSelector((s: RootState) => s.buildEditor.activeSetupIndex);

  return useMemo(() => {
    const setup = build.setups[activeSetupIndex];
    if (!setup) {
      return {
        general: false,
        character: false,
        equipment: false,
        skills: false,
        champion: false,
        consumables: false,
        passives: false,
        guide: false,
        screenshots: false,
        settings: false,
      };
    }

    return {
      general: build.name.trim().length > 0,
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
      guide: build.guide.content.trim().length > 0,
      screenshots: setup.screenshots.length > 0,
      settings: true, // always has defaults
    };
  }, [build, activeSetupIndex]);
};
