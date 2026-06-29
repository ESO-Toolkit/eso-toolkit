/**
 * Report adapter — composes the companion pipeline into per-player render props.
 *
 * Given the snapshots parsed from an uploaded `ESOTKCompanionSV` file and an ESO Logs
 * report, this matches each snapshot to a report actor and produces exactly the shape
 * `PlayerCard`'s `companionBuild` prop expects: the champion-point view-model + the
 * stat-aware coaching insights. This is the only wiring the report UI needs — upload a
 * file, call this, hand each player their entry.
 *
 * Pure and dependency-free (no Redux/UI), so the whole match→render mapping is testable
 * without the running app.
 */

import {
  buildChampionPointsViewModel,
  type ChampionPointsViewModel,
} from './esotkCompanionChampionPoints';
import {
  computeStatCoaching,
  type CoachingInsight,
  type CoachingOptions,
} from './esotkCompanionCoaching';
import {
  matchCompanionSnapshots,
  type MatchableActor,
  type MatchableReport,
} from './esotkCompanionMatcher';
import type { CompanionSnapshot } from './esotkCompanionParser';

/** Render-ready companion build for one matched player. */
export interface CompanionBuildForPlayer {
  /** Champion-point view-model, or null when none was captured. */
  championPoints: ChampionPointsViewModel | null;
  /** Stat-aware coaching insights (penetration vs cap, crit caps, …). */
  coaching: CoachingInsight[];
  /** The snapshot this was built from (raw stats/effects available for detail views). */
  snapshot: CompanionSnapshot;
  /** The fight the snapshot best matched, if any. */
  fightId?: number | string;
}

export interface BuildCompanionBuildsOptions {
  /** Current report fight id. When supplied, picks snapshots nearest to that fight. */
  targetFightId?: number | string;
  /** Coaching options (penetration target, assumed group pen, …). */
  coaching?: CoachingOptions;
}

/**
 * Match companion snapshots to a report and build per-actor render props.
 * Returns a map keyed by actor id; only actors with a matched snapshot appear.
 */
export function buildCompanionBuildsForReport(
  snapshots: CompanionSnapshot[],
  report: MatchableReport,
  opts: BuildCompanionBuildsOptions = {},
): Map<MatchableActor['id'], CompanionBuildForPlayer> {
  const out = new Map<MatchableActor['id'], CompanionBuildForPlayer>();
  if (snapshots.length === 0 || report.actors.length === 0) return out;

  const { matches } = matchCompanionSnapshots(snapshots, report, {
    targetFightId: opts.targetFightId,
  });
  for (const [actorId, match] of matches) {
    out.set(actorId, {
      championPoints: buildChampionPointsViewModel(match.snapshot.championPoints),
      coaching: computeStatCoaching(match.snapshot.stats, opts.coaching),
      snapshot: match.snapshot,
      fightId: match.fightId,
    });
  }
  return out;
}
