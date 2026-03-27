/**
 * useBuildCompleteness
 * Computes a 0–100 percentage of how "complete" the current build is.
 * Weights are designed so a typical PvE build reaches ~100% when all
 * key fields are filled. Optional fields (guide, screenshots) have
 * lower weights.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store/storeWithHistory';

/** The 6 skill slot indices per bar (5 actives + 1 ultimate). */
const SKILL_SLOT_KEYS = [3, 4, 5, 6, 7, 8];

/** The 14 gear slot indices (apparel + weapons + jewelry). */
const GEAR_SLOT_KEYS = [0, 1, 2, 3, 4, 5, 6, 8, 9, 11, 12, 16, 20, 21];

/** Count how many skill slots in a bar have a valid (> 0) ability assigned. */
function countFilledSkillSlots(bar: Record<number, number> | undefined): number {
  if (!bar) return 0;
  return SKILL_SLOT_KEYS.filter((k) => bar[k] != null && bar[k] > 0).length;
}

/** Count how many gear slots have an assigned piece (by numeric slot index only). */
function countFilledGearSlots(gear: Record<number, unknown>): number {
  return GEAR_SLOT_KEYS.filter((k) => gear[k] != null).length;
}

export const useBuildCompleteness = (): number => {
  const build = useSelector((s: RootState) => s.buildEditor.build);
  const activeSetupIndex = useSelector((s: RootState) => s.buildEditor.activeSetupIndex);

  return useMemo(() => {
    const setup = build.setups[activeSetupIndex];
    if (!setup) return 0;

    let score = 0;
    let maxScore = 0;

    // Build name (required, weight 10)
    maxScore += 10;
    if (build.name.trim().length > 0) score += 10;

    // Class (always set, weight 5)
    maxScore += 5;
    score += 5;

    // Role (always set, weight 5)
    maxScore += 5;
    score += 5;

    // Races (weight 5)
    maxScore += 5;
    if (build.races.length > 0) score += 5;

    // Attributes (weight 10 — at least 1 point allocated)
    maxScore += 10;
    const totalAttr = setup.attributes.magicka + setup.attributes.health + setup.attributes.stamina;
    if (totalAttr > 0) score += 10;

    // Mundus stone (weight 8)
    maxScore += 8;
    if (setup.mundusStone) score += 8;

    // Equipment (weight 20 — proportional to filled slots out of 14)
    maxScore += 20;
    const filledSlots = countFilledGearSlots(setup.gear);
    score += Math.round((filledSlots / 14) * 20);

    // Skills (weight 20 — proportional to filled slots out of 12)
    maxScore += 20;
    const frontCount = countFilledSkillSlots(setup.skills[0]);
    const backCount = countFilledSkillSlots(setup.skills[1]);
    score += Math.round(((frontCount + backCount) / 12) * 20);

    // Champion points (weight 7 — at least 1 slotted)
    maxScore += 7;
    const hasCP =
      setup.cp.warfare.slots.some((s) => s != null) ||
      setup.cp.fitness.slots.some((s) => s != null) ||
      setup.cp.craft.slots.some((s) => s != null);
    if (hasCP) score += 7;

    // Guide (weight 5 — has content)
    maxScore += 5;
    if (build.guide.content.trim().length > 0) score += 5;

    return Math.round((score / maxScore) * 100);
  }, [build, activeSetupIndex]);
};
