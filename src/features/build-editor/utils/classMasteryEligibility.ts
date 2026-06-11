/**
 * Class Mastery eligibility (U50 game rule).
 *
 * Class Mastery is a passive-only line available ONLY to non-subclassed
 * characters: slotting any other class's skill line disables it entirely.
 * A build is eligible when it has a concrete base class and every filled
 * classSkillLines slot belongs to that class (empty slots are fine).
 */

import { getSkillLineDef } from '../data/esoStaticData';
import type { Build, ESOClass } from '../types/build.types';

/** A player picks 2 of their class's 5 passives via Class Mastery Points. */
export const CLASS_MASTERY_MAX_PICKS = 2;

export type ClassMasteryGate =
  | { eligible: true }
  | { eligible: false; reason: 'no-class' | 'subclassed' };

export function getClassMasteryGate(
  esoClass: ESOClass,
  classSkillLines: Build['classSkillLines'],
): ClassMasteryGate {
  if (esoClass === 'any-class') {
    return { eligible: false, reason: 'no-class' };
  }
  const subclassed = classSkillLines.some(
    (id) => id != null && getSkillLineDef(id)?.ownerClass !== esoClass,
  );
  return subclassed ? { eligible: false, reason: 'subclassed' } : { eligible: true };
}

export const isClassMasteryEligible = (
  esoClass: ESOClass,
  classSkillLines: Build['classSkillLines'],
): boolean => getClassMasteryGate(esoClass, classSkillLines).eligible;
