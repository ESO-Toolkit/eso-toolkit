/**
 * Class Mastery transfer helpers (U50).
 *
 * Class Mastery picks live on the TOP-LEVEL `build.classMasteryPassives` field,
 * separate from per-setup `setup.passives`. The real Caro's Skill Point Saver
 * addon (v6.1.6+) stores Class Mastery passives inside `werte.pass` as plain
 * `abilityId:1` pairs — mixed in with every other passive, with no dedicated
 * field. So any flat passive-id list crossing the CSPS boundary (SavedVariables
 * `werte.pass` plus the export-code formats) must be split back out into regular
 * passives vs Class Mastery picks on the way in, and the picks must be folded
 * back into the passive list on the way out.
 *
 * These helpers are the single source of truth for that split + validation, so
 * the CSPS import/export paths and the URL-share encoding all behave identically.
 */

import {
  CLASS_MASTERY_LINES,
  CLASS_MASTERY_SKILL_IDS,
  getClassMasteryLine,
} from '@/data/skill-lines/class/classMastery';

import type { Build, ESOClass } from '../types/build.types';

import { CLASS_MASTERY_MAX_PICKS } from './classMasteryEligibility';

/**
 * The ESOClass that owns a given Class Mastery passive ability id, or undefined
 * if the id is not a Class Mastery passive. Each of the 35 ids belongs to
 * exactly one class, so the id alone identifies its class.
 */
export function classOfClassMasteryId(id: number): ESOClass | undefined {
  for (const line of CLASS_MASTERY_LINES) {
    if (line.skills.some((skill) => skill.id === id)) {
      // SkillLineData.class ("Dragonknight") lowercases to the ESOClass key.
      return line.class.toLowerCase() as ESOClass;
    }
  }
  return undefined;
}

/**
 * Keep only the class's own Class Mastery passive ids, deduped and capped at the
 * 2-pick max. Mirrors the rule the picker enforces so a corrupt/foreign payload
 * can't soft-lock the Class Mastery section. Shared by the CSPS importers and
 * the URL-share decoder.
 */
export function sanitizeClassMasteryPicks(ids: number[] | undefined, esoClass: ESOClass): number[] {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const valid = new Set(getClassMasteryLine(esoClass)?.skills.map((skill) => skill.id) ?? []);
  return [...new Set(ids)].filter((id) => valid.has(id)).slice(0, CLASS_MASTERY_MAX_PICKS);
}

/**
 * Best-guess base class implied by the Class Mastery passive ids present in a
 * flat id list — the class owning the most CM ids. Non-CM ids are ignored.
 * Used to recover the class on import when active-skill detection is
 * inconclusive (a real character's CM ids are all its single base class, so
 * they are a reliable signal).
 *
 * Returns undefined when the top owner is TIED across classes — a real
 * character can only ever have its own base class's CM ids, so a tie means
 * stale/foreign (corrupt) data. Deferring to active-skill detection there
 * avoids a stale id silently overriding the real base class and stripping the
 * legitimate picks as "foreign".
 */
export function classFromMasteryIds(ids: number[]): ESOClass | undefined {
  const counts = new Map<ESOClass, number>();
  for (const id of ids) {
    const owner = classOfClassMasteryId(id);
    if (owner) counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  let best: ESOClass | undefined;
  let bestCount = 0;
  let tied = false;
  for (const [cls, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = cls;
      tied = false;
    } else if (count === bestCount) {
      tied = true;
    }
  }
  return tied ? undefined : best;
}

/** Remove every Class Mastery passive id from a flat passive-id list. */
export function stripClassMasteryIds(ids: number[]): number[] {
  return ids.filter((id) => !CLASS_MASTERY_SKILL_IDS.has(id));
}

/**
 * Split a flat passive-id list (e.g. CSPS `werte.pass`) into regular passives
 * and Class Mastery picks. Class Mastery ids are removed from `passives`
 * regardless of class so they never leak into the regular Passives section, and
 * the returned picks are validated to `esoClass` (capped at the 2-pick max).
 */
export function partitionClassMasteryPicks(
  passiveIds: number[],
  esoClass: ESOClass,
): { passives: number[]; classMasteryPassives: number[] } {
  const passives: number[] = [];
  const masteryIds: number[] = [];
  for (const id of passiveIds) {
    if (CLASS_MASTERY_SKILL_IDS.has(id)) {
      masteryIds.push(id);
    } else {
      passives.push(id);
    }
  }
  return { passives, classMasteryPassives: sanitizeClassMasteryPicks(masteryIds, esoClass) };
}

/**
 * Reclaim Class Mastery picks that older builds (saved/shared before the
 * build-level split, or imported by pre-split code) left inside `setup.passives`.
 * Runs when a build enters the editor: if the build-level field is empty it
 * lifts the leaked picks into it (making them visible in the Class Mastery
 * section), and it always strips Class Mastery ids out of every setup's regular
 * passives. After this, the editor is WYSIWYG — what the CM section shows is what
 * exports — so the export path no longer needs to recover hidden ids. Mutates in
 * place (safe for both an Immer draft and a freshly-decoded plain build).
 */
export function migrateLeakedClassMasteryPicks(
  build: Pick<Build, 'esoClass' | 'classMasteryPassives' | 'setups'>,
): void {
  const hasExisting =
    Array.isArray(build.classMasteryPassives) && build.classMasteryPassives.length > 0;
  if (!hasExisting) {
    const leaked = build.setups.flatMap((setup) => setup.passives ?? []);
    const recovered = sanitizeClassMasteryPicks(leaked, build.esoClass);
    if (recovered.length > 0) build.classMasteryPassives = recovered;
  }
  for (const setup of build.setups) {
    if (Array.isArray(setup.passives)) {
      setup.passives = stripClassMasteryIds(setup.passives);
    }
  }
}
