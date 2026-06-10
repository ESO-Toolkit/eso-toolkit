/**
 * Build the trial chapter list consumed by the fight-replay chapter rail.
 *
 * Groups a report's fights into ordered trial runs of navigable segments — boss
 * encounters plus the trash between them — reusing the shared trial-classification
 * helpers so the boss-name tables and kill/wipe heuristics stay in one place
 * (see {@link module:utils/trialClassification}).
 *
 * Bosses are the primary skip targets; trash segments are included so a viewer
 * can follow the run-up into a boss and see the map transitions along the way.
 * A new run starts whenever the resolved trial name changes (mirroring the
 * report fight-list grouping). Trash that precedes a run's first boss is folded
 * into that run as its lead-in; trash with no following boss becomes a
 * standalone trash run so it stays navigable.
 *
 * @module features/fight_replay/trial_chapters/buildTrialChapters
 */

import type { FightFragment, ReportFragment } from '../../../graphql/gql/graphql';
import {
  getDifficultyLabel,
  getFightOutcome,
  getTrialNameFromBoss,
} from '../../../utils/trialClassification';

import type { TrialChapter, TrialChapterRun, TrialSegmentKind } from './types';

/**
 * Trash pulls shorter than this are dropped from the chapter model entirely.
 * ESO Logs records lots of sub-second / few-second "fights" (a single stray add
 * dying mid-run) that render as useless "Cleared 0:00" stops on the rail and
 * flash-through segments during continuous play. Bosses are never filtered —
 * even a 3-second wipe is a real pull worth navigating to.
 */
export const MIN_TRASH_SEGMENT_MS = 5000;

/** Result of locating a fight within the built runs. */
export interface RunMatch {
  /** The run that owns the fight. */
  run: TrialChapterRun;
  /** Index of the fight within `run.segments`, or -1 when matched only by time span. */
  segmentIndex: number;
  /** Index of the fight within `run.bossChapters`, or -1 when the fight is trash. */
  bossIndex: number;
}

/** Append a fight to a run as a segment, keeping `segments` and `bossChapters` in sync. */
function pushSegment(
  run: TrialChapterRun,
  fight: FightFragment,
  kind: TrialSegmentKind,
  trialName: string,
  attempt: number,
): void {
  const outcome = getFightOutcome(fight);
  const chapter: TrialChapter = {
    fightId: String(fight.id),
    fightNumericId: fight.id,
    name: fight.name || (kind === 'boss' ? 'Unknown Boss' : 'Trash'),
    kind,
    trialName,
    difficulty: fight.difficulty ?? null,
    difficultyLabel:
      kind === 'boss' ? getDifficultyLabel(fight.difficulty ?? null, trialName) : null,
    isKill: outcome.isKill,
    isWipe: outcome.isWipe,
    bossPercentage: outcome.bossPercentage,
    startTime: fight.startTime,
    endTime: fight.endTime,
    durationMs: fight.endTime - fight.startTime,
    index: run.segments.length,
    bossIndex: kind === 'boss' ? run.bossChapters.length : -1,
    attempt,
  };
  run.segments.push(chapter);
  if (kind === 'boss') {
    run.bossChapters.push(chapter);
  }
}

/**
 * Group a report's fights into ordered trial runs of segments (bosses + trash).
 *
 * @param fights - All fights from the report. Null entries and zero-length fights are skipped.
 * @param reportData - The report (used for zone-name fallback in trial resolution).
 * @returns Ordered runs, each with its segments (and a boss-only view) in start-time order.
 */
export function buildTrialChapters(
  fights: ReadonlyArray<FightFragment | null> | null | undefined,
  reportData: ReportFragment | null | undefined,
): TrialChapterRun[] {
  if (!fights || fights.length === 0) {
    return [];
  }

  // Every renderable fight (boss + trash), with a valid time window, in play order.
  // Degenerate trash blips (< MIN_TRASH_SEGMENT_MS) are dropped here so they never
  // become rail stops or timeline segments; bosses always survive the filter.
  const validFights = fights
    .filter(
      (fight): fight is FightFragment =>
        fight != null &&
        fight.startTime != null &&
        fight.endTime != null &&
        fight.endTime > fight.startTime &&
        (fight.difficulty != null || fight.endTime - fight.startTime >= MIN_TRASH_SEGMENT_MS),
    )
    .sort((a, b) => a.startTime - b.startTime);

  const runs: TrialChapterRun[] = [];
  let runNumber = 0;
  let runTrialName: string | null = null;
  let currentRun: TrialChapterRun | null = null;
  let attemptsByBoss = new Map<string, number>();
  // Trash seen before the current run's first boss — folded in as the lead-in once
  // the boss (and thus the trial name) is known.
  let leadingTrash: FightFragment[] = [];

  for (const fight of validFights) {
    const isBoss = fight.difficulty != null;

    if (isBoss) {
      const bossName = fight.name || 'Unknown Boss';
      const trialName = getTrialNameFromBoss(bossName, reportData);

      // Start a new run when there is no run yet, or the trial actually changes.
      if (currentRun === null || runTrialName !== trialName) {
        runNumber += 1;
        runTrialName = trialName;
        attemptsByBoss = new Map<string, number>();
        currentRun = {
          id: `${trialName}-run-${runNumber}`,
          trialName,
          segments: [],
          bossChapters: [],
        };
        runs.push(currentRun);
        // The buffered trash was this boss's run-up — attach it as the lead-in.
        for (const trash of leadingTrash) {
          pushSegment(currentRun, trash, 'trash', trialName, 1);
        }
        leadingTrash = [];
      }

      const attempt = (attemptsByBoss.get(bossName) ?? 0) + 1;
      attemptsByBoss.set(bossName, attempt);
      pushSegment(currentRun, fight, 'boss', trialName, attempt);
    } else if (currentRun === null) {
      // Trash before any boss — buffer it until the next boss reveals the trial.
      leadingTrash.push(fight);
    } else {
      // Trash within / after a run — belongs to the currently-active run.
      pushSegment(currentRun, fight, 'trash', currentRun.trialName, 1);
    }
  }

  // Trailing trash with no following boss (e.g. a trash-only log) — keep it
  // navigable as a standalone run so the replay still has a chapter context.
  if (leadingTrash.length > 0) {
    runNumber += 1;
    const trialName = reportData?.zone?.name || 'Trash';
    const run: TrialChapterRun = {
      id: `Trash-run-${runNumber}`,
      trialName,
      segments: [],
      bossChapters: [],
    };
    for (const trash of leadingTrash) {
      pushSegment(run, trash, 'trash', trialName, 1);
    }
    runs.push(run);
  }

  return runs;
}

/**
 * Locate the run that owns a fight: first by segment membership (the exact fight
 * is in the run), then by time span (e.g. a fight that wasn't grouped but falls
 * within a run's window). Returns null when nothing matches.
 */
export function findRunForFight(
  runs: TrialChapterRun[],
  fightId: string | undefined,
  fightStartTime: number | null | undefined,
): RunMatch | null {
  if (fightId !== undefined) {
    for (const run of runs) {
      const segmentIndex = run.segments.findIndex((segment) => segment.fightId === fightId);
      if (segmentIndex !== -1) {
        return { run, segmentIndex, bossIndex: run.segments[segmentIndex].bossIndex };
      }
    }
  }

  // The active fight isn't a known segment — locate it by time span.
  if (fightStartTime != null) {
    for (const run of runs) {
      const first = run.segments[0];
      const last = run.segments[run.segments.length - 1];
      if (first && last && fightStartTime >= first.startTime && fightStartTime <= last.endTime) {
        return { run, segmentIndex: -1, bossIndex: -1 };
      }
    }
  }

  return null;
}
