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
import { computeStatCoaching, type CoachingInsight } from './esotkCompanionCoaching';
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
  /** Stat-aware coaching insights (self penetration + crit chance, point-in-time). */
  coaching: CoachingInsight[];
  /** Final sheet stats captured by the add-on. */
  stats?: CompanionSnapshot['stats'];
  /** Long-term/self effects captured by the add-on (food, mundus, potion clusters). */
  effects?: CompanionSnapshot['effects'];
  /** Scribed skills captured authoritatively from the local action bars. */
  scribing?: CompanionSnapshot['scribing'];
  /** The snapshot this was built from (raw stats/effects/scribing available for detail views). */
  snapshot: CompanionSnapshot;
  /** The fight the snapshot best matched, if any. */
  fightId?: number | string;
  /**
   * How far (ms) the matched snapshot sits outside the report/fight window — 0 when the
   * capture is inside it. A large value means the build was borrowed from an adjacent pull,
   * so the UI can flag it as approximate ("nearest capture, N min away").
   */
  distanceMs: number;
}

export interface BuildCompanionBuildsOptions {
  /** Current report fight id. When supplied, picks snapshots nearest to that fight. */
  targetFightId?: number | string;
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
      coaching: computeStatCoaching(match.snapshot.stats),
      stats: match.snapshot.stats,
      effects: match.snapshot.effects,
      scribing: match.snapshot.scribing,
      snapshot: match.snapshot,
      fightId: match.fightId,
      distanceMs: match.distanceMs,
    });
  }
  return out;
}
