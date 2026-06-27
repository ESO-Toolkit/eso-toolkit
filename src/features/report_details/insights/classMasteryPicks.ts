/**
 * Class Mastery picks for a report player card.
 *
 * Derives the up-to-2 Class Mastery passives a non-subclassed player chose
 * (U50: 2 of the base class's 5) from the report-side class analysis. This is
 * the SAME plumbing the Extract→Build-Editor transfer uses (PR #1357): the
 * shared `sanitizeClassMasteryPicks` filters the detected ability ids down to
 * the class's own canonical Class Mastery ids, dedupes, and caps at the 2-pick
 * max — so the card can never show more than two, and effect/proc ids that the
 * detection name-matches into the line (but that aren't canonical passive ids)
 * are dropped rather than rendered as phantom picks.
 *
 * Keep this display-only and in lockstep with the transfer: if it shows N
 * picks, Extract Build transfers the same N.
 */

import {
  CLASS_MASTERY_LINE_NAME,
  getClassMasteryLine,
} from '@/data/skill-lines/class/classMastery';
import type { ESOClass } from '@/features/build-editor/types/build.types';
import { sanitizeClassMasteryPicks } from '@/features/build-editor/utils/classMasteryTransfer';
import type { ClassAnalysisResult } from '@/utils/classDetectionUtils';

export interface ClassMasteryPick {
  id: number;
  name: string;
  icon: string;
  description: string;
}

export interface ClassMasteryPicksResult {
  /** Owning class (e.g. "Nightblade"); empty string when there are no picks. */
  className: string;
  /** Up to two resolved Class Mastery passives; empty when none apply. */
  picks: ClassMasteryPick[];
}

const EMPTY: ClassMasteryPicksResult = { className: '', picks: [] };

/**
 * Resolve the Class Mastery passives to surface on a player card. Returns no
 * picks when the player is subclassed or otherwise has no Class Mastery line in
 * the analysis — callers render nothing in that case.
 */
export function getClassMasteryPicks(
  classAnalysis: ClassAnalysisResult | undefined,
): ClassMasteryPicksResult {
  const entry = classAnalysis?.skillLines?.find((sl) => sl.skillLine === CLASS_MASTERY_LINE_NAME);
  if (!entry) return EMPTY;

  const className = entry.className ?? '';
  // sanitizeClassMasteryPicks resolves the line via a case-insensitive class
  // lookup, so the lowercased detection class name is a valid ESOClass key here.
  const esoClass = (className.toLowerCase() || 'any-class') as ESOClass;
  const ids = sanitizeClassMasteryPicks([...entry.skillIds], esoClass);
  if (ids.length === 0) return EMPTY;

  const line = getClassMasteryLine(className);
  const picks = ids
    .map((id) => line?.skills.find((skill) => skill.id === id))
    .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill))
    .map((skill) => ({
      id: skill.id,
      name: skill.name,
      icon: skill.icon ?? '',
      description: skill.description ?? '',
    }));

  if (picks.length === 0) return EMPTY;
  return { className, picks };
}
