/**
 * Per-player crit-damage evidence from ESOTK Companion snapshots.
 *
 * The /critical-damage graph assumes Fighting Finesse (+8%) and Backstabber (+10%) for
 * every player because those champion stars emit no event or aura and can't be seen in the
 * log. When a companion snapshot matched a player, this derives whether each star is
 * actually slotted so the graph can gate them per-player. Reuses the same matcher and
 * targetFightId path as `buildCompanionBuildsForReport`, so the graph and the Players-tab
 * companion panel always agree on which snapshot each actor got. Output is a POJO of
 * booleans — structured-clone safe for the worker.
 */

import { ChampionPointAbilityId } from '@/types/champion-points';
import type { CompanionCritEvidence } from '@/utils/CritDamageUtils';

import {
  matchCompanionSnapshots,
  type MatchableReport,
  type MatchCompanionSnapshotsOptions,
} from './esotkCompanionMatcher';
import type { CompanionSnapshot } from './esotkCompanionParser';

/** Champion-skill id of Fighting Finesse (verified). */
const FIGHTING_FINESSE_SKILL_ID = ChampionPointAbilityId.FightingFinesse;
/** Champion-skill id of Backstabber (from DynamicCP data, cross-checked). */
const BACKSTABBER_SKILL_ID = ChampionPointAbilityId.Backstabber;

function normalizeStarName(name: string | undefined): string {
  return (name ?? '').trim().toLowerCase();
}

/**
 * Derive crit evidence from a single snapshot's slotted champion stars. Detection is by
 * champion-skill id (primary) with the snapshot's captured localized star names as a
 * fallback. Returns undefined when the snapshot carries no slotted data — a missing entry
 * means "no evidence" downstream (assume-active), the correct default; emitting
 * `{ false, false }` would wrongly zero a star we simply failed to capture.
 *
 * NOTE: gating is on the 12 *slotted* slots, not merely allocated points — both stars only
 * grant their bonus while slotted, so `championPoints.slotted` is the correct signal.
 */
export function critEvidenceFromSnapshot(
  snapshot: CompanionSnapshot,
): CompanionCritEvidence | undefined {
  const cp = snapshot.championPoints;
  const slotted = cp?.slotted;
  if (!slotted) return undefined;

  const slottedIds = Object.values(slotted);
  if (slottedIds.length === 0) return undefined;

  const slottedIdSet = new Set(slottedIds);
  const names = cp?.names;
  const slottedNames = new Set(slottedIds.map((id) => normalizeStarName(names?.[id])));

  return {
    fightingFinesseSlotted:
      slottedIdSet.has(FIGHTING_FINESSE_SKILL_ID) || slottedNames.has('fighting finesse'),
    backstabberSlotted: slottedIdSet.has(BACKSTABBER_SKILL_ID) || slottedNames.has('backstabber'),
  };
}

/**
 * Match snapshots to a report and produce the per-player crit-evidence map keyed by numeric
 * actor id (== player id). Actors with no match, or with a matched snapshot that carries no
 * slotted data, are omitted so the worker treats them as "no evidence" (byte-identical to
 * the pre-companion behaviour).
 */
export function buildCompanionCritEvidence(
  snapshots: CompanionSnapshot[],
  report: MatchableReport,
  opts: MatchCompanionSnapshotsOptions = {},
): Record<number, CompanionCritEvidence> {
  const out: Record<number, CompanionCritEvidence> = {};
  if (snapshots.length === 0 || report.actors.length === 0) return out;

  const { matches } = matchCompanionSnapshots(snapshots, report, {
    targetFightId: opts.targetFightId,
  });
  for (const [actorId, match] of matches) {
    const evidence = critEvidenceFromSnapshot(match.snapshot);
    const id = Number(actorId);
    if (evidence && Number.isFinite(id)) {
      out[id] = evidence;
    }
  }
  return out;
}
