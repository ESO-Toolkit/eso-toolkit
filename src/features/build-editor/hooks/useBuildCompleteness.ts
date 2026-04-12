/**
 * useBuildCompleteness
 * Computes a 0–100 percentage of how "complete" the current build is.
 * Weights are designed so a typical PvE build reaches ~100% when all
 * key fields are filled. Optional fields (guide, screenshots) have
 * lower weights.
 *
 * Perf note: all selectors below return numbers / booleans (never raw
 * strings or arrays). That way each keystroke in the build name only
 * causes a re-render here when the `hasName` boolean actually flips,
 * not on every character.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

// ─── Narrow boolean / count selectors ────────────────────────────────────

const selectHasName = (s: RootState): boolean =>
  s.buildEditor.build.name.trim().length > 0;

const selectHasRaces = (s: RootState): boolean => s.buildEditor.build.races.length > 0;

const selectHasGuideContent = (s: RootState): boolean =>
  s.buildEditor.build.guide.content.trim().length > 0;

const selectAttrTotal = (s: RootState): number => {
  const setup = s.buildEditor.build.setups[s.buildEditor.activeSetupIndex];
  if (!setup) return 0;
  return setup.attributes.magicka + setup.attributes.health + setup.attributes.stamina;
};

const selectHasMundus = (s: RootState): boolean => {
  const setup = s.buildEditor.build.setups[s.buildEditor.activeSetupIndex];
  return Boolean(setup?.mundusStone);
};

const selectGearCount = (s: RootState): number => {
  const setup = s.buildEditor.build.setups[s.buildEditor.activeSetupIndex];
  return setup ? Object.keys(setup.gear).length : 0;
};

const selectSkillCount = (s: RootState): number => {
  const setup = s.buildEditor.build.setups[s.buildEditor.activeSetupIndex];
  if (!setup) return 0;
  return (
    Object.keys(setup.skills[0] ?? {}).length + Object.keys(setup.skills[1] ?? {}).length
  );
};

const selectHasCP = (s: RootState): boolean => {
  const setup = s.buildEditor.build.setups[s.buildEditor.activeSetupIndex];
  if (!setup) return false;
  return (
    setup.cp.warfare.slots.some((slot) => slot != null) ||
    setup.cp.fitness.slots.some((slot) => slot != null) ||
    setup.cp.craft.slots.some((slot) => slot != null)
  );
};

const selectSetupExists = (s: RootState): boolean =>
  Boolean(s.buildEditor.build.setups[s.buildEditor.activeSetupIndex]);

// ─── Hook ─────────────────────────────────────────────────────────────────

export const useBuildCompleteness = (): number => {
  const setupExists = useSelector(selectSetupExists);
  const hasName = useSelector(selectHasName);
  const hasRaces = useSelector(selectHasRaces);
  const hasGuideContent = useSelector(selectHasGuideContent);
  const attrTotal = useSelector(selectAttrTotal);
  const hasMundus = useSelector(selectHasMundus);
  const gearCount = useSelector(selectGearCount);
  const skillCount = useSelector(selectSkillCount);
  const hasCP = useSelector(selectHasCP);

  return useMemo(() => {
    if (!setupExists) return 0;

    let score = 0;
    let maxScore = 0;

    // Build name (required, weight 10)
    maxScore += 10;
    if (hasName) score += 10;

    // Class (always set, weight 5)
    maxScore += 5;
    score += 5;

    // Role (always set, weight 5)
    maxScore += 5;
    score += 5;

    // Races (weight 5)
    maxScore += 5;
    if (hasRaces) score += 5;

    // Attributes (weight 10 — at least 1 point allocated)
    maxScore += 10;
    if (attrTotal > 0) score += 10;

    // Mundus stone (weight 8)
    maxScore += 8;
    if (hasMundus) score += 8;

    // Equipment (weight 20 — proportional to filled slots out of 14)
    maxScore += 20;
    score += Math.round((gearCount / 14) * 20);

    // Skills (weight 20 — proportional to filled slots out of 12)
    maxScore += 20;
    score += Math.round((skillCount / 12) * 20);

    // Champion points (weight 7 — at least 1 slotted)
    maxScore += 7;
    if (hasCP) score += 7;

    // Guide (weight 5 — has content)
    maxScore += 5;
    if (hasGuideContent) score += 5;

    return Math.round((score / maxScore) * 100);
  }, [setupExists, hasName, hasRaces, hasGuideContent, attrTotal, hasMundus, gearCount, skillCount, hasCP]);
};
