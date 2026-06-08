/**
 * Build the trial chapter list consumed by the fight-replay chapter rail.
 *
 * Takes a report's fights and groups the boss encounters into ordered trial
 * runs, reusing the shared trial-classification helpers so the boss-name tables
 * and kill/wipe heuristics stay in one place (see {@link module:utils/trialClassification}).
 *
 * Trash fights are intentionally excluded: chapters are the boss beats a viewer
 * skips between. A new run is started whenever the resolved trial name changes,
 * mirroring the report fight-list grouping.
 *
 * @module features/fight_replay/trial_chapters/buildTrialChapters
 */

import type { FightFragment, ReportFragment } from '../../../graphql/gql/graphql';
import {
  getDifficultyLabel,
  getFightOutcome,
  getTrialNameFromBoss,
} from '../../../utils/trialClassification';

import type { TrialChapterRun } from './types';

/**
 * Group a report's boss fights into ordered trial runs of chapters.
 *
 * @param fights - All fights from the report (boss + trash). Trash is filtered out.
 * @param reportData - The report (used for zone-name fallback in trial resolution).
 * @returns Ordered runs, each with its boss chapters in start-time order.
 */
export function buildTrialChapters(
  fights: ReadonlyArray<FightFragment | null> | null | undefined,
  reportData: ReportFragment | null | undefined,
): TrialChapterRun[] {
  if (!fights || fights.length === 0) {
    return [];
  }

  // Boss fights only (difficulty != null), valid time window, in start order.
  const bossFights = fights
    .filter(
      (fight): fight is FightFragment =>
        fight != null &&
        fight.difficulty != null &&
        fight.startTime != null &&
        fight.endTime != null &&
        fight.endTime > fight.startTime,
    )
    .sort((a, b) => a.startTime - b.startTime);

  const runs: TrialChapterRun[] = [];
  let runNumber = 1;
  let runTrialName: string | null = null;
  let currentRun: TrialChapterRun | null = null;
  // Per-run count of each boss name, so repeated pulls get an attempt number.
  let attemptsByBoss = new Map<string, number>();

  for (const boss of bossFights) {
    const bossName = boss.name || 'Unknown Boss';
    const trialName = getTrialNameFromBoss(bossName, reportData);

    // Start a new run only when the trial actually changes.
    if (runTrialName !== null && runTrialName !== trialName) {
      runNumber += 1;
      currentRun = null;
      attemptsByBoss = new Map<string, number>();
    }
    runTrialName = trialName;

    const runId = `${trialName}-run-${runNumber}`;
    if (!currentRun || currentRun.id !== runId) {
      currentRun = { id: runId, trialName, chapters: [] };
      runs.push(currentRun);
    }

    const attempt = (attemptsByBoss.get(bossName) ?? 0) + 1;
    attemptsByBoss.set(bossName, attempt);

    const outcome = getFightOutcome(boss);

    currentRun.chapters.push({
      fightId: String(boss.id),
      fightNumericId: boss.id,
      name: bossName,
      trialName,
      difficulty: boss.difficulty ?? null,
      difficultyLabel: getDifficultyLabel(boss.difficulty ?? null, trialName),
      isKill: outcome.isKill,
      isWipe: outcome.isWipe,
      bossPercentage: outcome.bossPercentage,
      startTime: boss.startTime,
      endTime: boss.endTime,
      durationMs: boss.endTime - boss.startTime,
      index: currentRun.chapters.length,
      attempt,
    });
  }

  return runs;
}

/**
 * Find the run that owns a given fight: first by chapter membership (the fight is
 * a boss in the run), then by time span (e.g. the current fight is trash that
 * falls within a run's first→last boss window). Returns null when no run matches.
 */
export function findRunForFight(
  runs: TrialChapterRun[],
  fightId: string | undefined,
  fightStartTime: number | null | undefined,
): { run: TrialChapterRun; index: number } | null {
  if (fightId !== undefined) {
    for (const run of runs) {
      const index = run.chapters.findIndex((chapter) => chapter.fightId === fightId);
      if (index !== -1) {
        return { run, index };
      }
    }
  }

  // The active fight isn't a boss chapter (e.g. trash) — locate it by time span.
  if (fightStartTime != null) {
    for (const run of runs) {
      const first = run.chapters[0];
      const last = run.chapters[run.chapters.length - 1];
      if (first && last && fightStartTime >= first.startTime && fightStartTime <= last.endTime) {
        return { run, index: -1 };
      }
    }
  }

  return null;
}
