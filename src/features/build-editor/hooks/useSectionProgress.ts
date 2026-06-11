/**
 * useSectionProgress
 * Returns a map of sectionId → boolean (completed/not) for nav rail dots.
 *
 * Critical perf pattern: each selector returns a BOOLEAN (not a raw string /
 * array). That way, `useSelector` bails out once the boolean stabilises —
 * e.g. after the user types the first character of the build name,
 * `hasName` stays `true` and this hook (and therefore `BuildEditorLayout`)
 * stops re-rendering on subsequent keystrokes entirely.
 *
 * We also return a cached object reference when every boolean is unchanged,
 * so downstream consumers (`<BuildNavRail>` via `React.memo`) skip
 * re-rendering too.
 */

import { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

import { BE_TOKENS } from '../theme/buildEditorTokens';
import type { SectionId } from '../theme/buildEditorTokens';
import { isClassMasteryEligible } from '../utils/classMasteryEligibility';

export type SectionProgressMap = Record<SectionId, boolean>;

const EMPTY_PROGRESS: SectionProgressMap = Object.fromEntries(
  BE_TOKENS.sectionIds.map((id) => [id, false]),
) as SectionProgressMap;

const shallowEqualProgress = (a: SectionProgressMap, b: SectionProgressMap): boolean => {
  for (const id of BE_TOKENS.sectionIds) {
    if (a[id] !== b[id]) return false;
  }
  return true;
};

// ─── Boolean-only selectors (stable across unrelated edits) ───────────────

const selectHasName = (s: RootState): boolean => s.buildEditor.build.name.trim().length > 0;

const selectAllClassLinesSet = (s: RootState): boolean =>
  s.buildEditor.build.classSkillLines.every((line) => line != null);

// Complete when picks exist — or when the gate is closed (nothing actionable)
const selectClassMasteryDone = (s: RootState): boolean => {
  const { esoClass, classSkillLines, classMasteryPassives } = s.buildEditor.build;
  if (!isClassMasteryEligible(esoClass, classSkillLines)) return true;
  return (classMasteryPassives?.length ?? 0) > 0;
};

const selectHasCharacter = (s: RootState): boolean => {
  const setup = s.buildEditor.build.setups[s.buildEditor.activeSetupIndex];
  if (!setup) return false;
  const attrTotal = setup.attributes.magicka + setup.attributes.health + setup.attributes.stamina;
  return attrTotal > 0 || setup.mundusStone !== '';
};

const selectHasEquipment = (s: RootState): boolean => {
  const setup = s.buildEditor.build.setups[s.buildEditor.activeSetupIndex];
  return setup ? Object.keys(setup.gear).length > 0 : false;
};

const selectHasSkills = (s: RootState): boolean => {
  const setup = s.buildEditor.build.setups[s.buildEditor.activeSetupIndex];
  if (!setup) return false;
  return (
    Object.keys(setup.skills[0] ?? {}).length > 0 || Object.keys(setup.skills[1] ?? {}).length > 0
  );
};

const selectHasChampion = (s: RootState): boolean => {
  const setup = s.buildEditor.build.setups[s.buildEditor.activeSetupIndex];
  if (!setup) return false;
  return (
    setup.cp.warfare.slots.some((slot) => slot != null) ||
    setup.cp.fitness.slots.some((slot) => slot != null) ||
    setup.cp.craft.slots.some((slot) => slot != null)
  );
};

const selectHasConsumables = (s: RootState): boolean => {
  const setup = s.buildEditor.build.setups[s.buildEditor.activeSetupIndex];
  if (!setup) return false;
  return setup.consumables.potions.length > 0 || Boolean(setup.consumables.food.name);
};

const selectHasPassives = (s: RootState): boolean => {
  const setup = s.buildEditor.build.setups[s.buildEditor.activeSetupIndex];
  return setup ? setup.passives.length > 0 : false;
};

const selectHasGuide = (s: RootState): boolean => {
  const setup = s.buildEditor.build.setups[s.buildEditor.activeSetupIndex];
  const guideHasText = s.buildEditor.build.guide.content.trim().length > 0;
  return guideHasText || (setup?.screenshots.length ?? 0) > 0;
};

const selectSetupExists = (s: RootState): boolean =>
  Boolean(s.buildEditor.build.setups[s.buildEditor.activeSetupIndex]);

// ─── Hook ─────────────────────────────────────────────────────────────────

export const useSectionProgress = (): SectionProgressMap => {
  const setupExists = useSelector(selectSetupExists);
  const hasName = useSelector(selectHasName);
  const subclassingComplete = useSelector(selectAllClassLinesSet);
  const classMasteryDone = useSelector(selectClassMasteryDone);
  const hasCharacter = useSelector(selectHasCharacter);
  const hasEquipment = useSelector(selectHasEquipment);
  const hasSkills = useSelector(selectHasSkills);
  const hasChampion = useSelector(selectHasChampion);
  const hasConsumables = useSelector(selectHasConsumables);
  const hasPassives = useSelector(selectHasPassives);
  const hasGuide = useSelector(selectHasGuide);

  const cacheRef = useRef<SectionProgressMap>(EMPTY_PROGRESS);

  return useMemo(() => {
    if (!setupExists) return EMPTY_PROGRESS;

    const next: SectionProgressMap = {
      general: hasName,
      subclassing: subclassingComplete,
      'class-mastery': classMasteryDone,
      character: hasCharacter,
      equipment: hasEquipment,
      skills: hasSkills,
      champion: hasChampion,
      consumables: hasConsumables,
      passives: hasPassives,
      stats: true, // always complete — stats are derived, not user-entered
      guide: hasGuide,
      settings: true, // always has defaults
    };

    if (shallowEqualProgress(cacheRef.current, next)) {
      return cacheRef.current;
    }
    cacheRef.current = next;
    return next;
  }, [
    setupExists,
    hasName,
    subclassingComplete,
    classMasteryDone,
    hasCharacter,
    hasEquipment,
    hasSkills,
    hasChampion,
    hasConsumables,
    hasPassives,
    hasGuide,
  ]);
};
