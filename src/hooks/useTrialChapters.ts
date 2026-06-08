/**
 * useTrialChapters
 *
 * Resolves the trial's navigable segments (boss encounters + trash) for the
 * currently-loaded fight so the fight-replay chapter rail can let a viewer move
 * through a whole trial run without leaving the replay. Single source of truth
 * for cross-fight navigation: it builds the segment list from the report and
 * locates the active fight within it, exposing both boss-level skips (the
 * primary "jump to boss" targets) and fine segment-level stepping (incl. trash).
 *
 * @module hooks/useTrialChapters
 */

import { useMemo } from 'react';

import {
  buildTrialChapters,
  findRunForFight,
} from '../features/fight_replay/trial_chapters/buildTrialChapters';
import type { TrialChapter, TrialChapterRun } from '../features/fight_replay/trial_chapters/types';

import { useCurrentFight } from './useCurrentFight';
import { useReportData } from './useReportData';
import { useReportFightParams } from './useReportFightParams';

export interface UseTrialChaptersResult {
  /** Every trial run in the report (each with its ordered segments + boss view). */
  runs: TrialChapterRun[];
  /** The run containing the active fight (by membership, else by time span), or null. */
  currentRun: TrialChapterRun | null;
  /** Index of the current run within `runs`, or -1. */
  runIndex: number;
  /** Total number of runs in the report (trials / dungeons). */
  runCount: number;
  /** The next run after the current one (e.g. a second trial in the log), or null. */
  nextRun: TrialChapterRun | null;
  /** All segments (bosses + trash) of the current run, in play order. */
  segments: TrialChapter[];
  /** Boss chapters of the current run — the primary skip targets. */
  bossChapters: TrialChapter[];
  /** The active segment (boss or trash) for the loaded fight, or null. */
  currentSegment: TrialChapter | null;
  /** Index of the active fight within `segments`, or -1. */
  currentSegmentIndex: number;
  /** Index of the active fight within `bossChapters`, or -1 (active fight is trash / not found). */
  currentBossIndex: number;
  /** True when the active fight is a boss encounter. */
  isOnBoss: boolean;
  /** True when the active fight is trash within a run. */
  isOnTrash: boolean;
  /** The next boss to skip to (relative to the active fight, incl. from trash), or null. */
  nextBoss: TrialChapter | null;
  /** The previous boss to skip to (relative to the active fight, incl. from trash), or null. */
  prevBoss: TrialChapter | null;
  /** The next segment (boss or trash) for fine stepping, or null at the run's end. */
  nextSegment: TrialChapter | null;
  /** The previous segment (boss or trash) for fine stepping, or null at the run's start. */
  prevSegment: TrialChapter | null;
  /** True while the underlying report data is still loading. */
  isLoading: boolean;
}

/** Find the first boss whose start time is strictly after `time`. */
function firstBossAfter(bosses: TrialChapter[], time: number): TrialChapter | null {
  for (const boss of bosses) {
    if (boss.startTime > time) return boss;
  }
  return null;
}

/** Find the last boss whose start time is strictly before `time`. */
function lastBossBefore(bosses: TrialChapter[], time: number): TrialChapter | null {
  for (let i = bosses.length - 1; i >= 0; i--) {
    if (bosses[i].startTime < time) return bosses[i];
  }
  return null;
}

/**
 * Hook returning the trial's navigable segments plus the active fight's position
 * within them. Pure derivation over report data (no dispatch), so it's safe to
 * call alongside the replay's heavier worker-task hooks.
 */
export function useTrialChapters(): UseTrialChaptersResult {
  const { reportData, isReportLoading } = useReportData();
  const { fightId } = useReportFightParams();
  const { fight } = useCurrentFight();

  // `fight` can be a fresh object each report render; depend on the stable id + time.
  const fightStartTime = fight?.startTime ?? null;

  return useMemo(() => {
    const runs = buildTrialChapters(reportData?.fights ?? null, reportData);
    const match = findRunForFight(runs, fightId, fightStartTime);

    const currentRun = match?.run ?? null;
    const runIndex = currentRun ? runs.indexOf(currentRun) : -1;
    const nextRun = runIndex >= 0 ? (runs[runIndex + 1] ?? null) : null;
    const segments = currentRun?.segments ?? [];
    const bossChapters = currentRun?.bossChapters ?? [];
    const currentSegmentIndex = match?.segmentIndex ?? -1;
    const currentBossIndex = match?.bossIndex ?? -1;

    const currentSegment =
      currentSegmentIndex >= 0 ? (segments[currentSegmentIndex] ?? null) : null;
    const isOnBoss = currentSegment?.kind === 'boss';
    const isOnTrash = currentSegment?.kind === 'trash';

    // Boss skips: direct neighbours when on a boss; the surrounding bosses by time
    // when on trash (or when the active fight isn't a known segment but the run is
    // resolved by time span).
    let nextBoss: TrialChapter | null = null;
    let prevBoss: TrialChapter | null = null;
    if (isOnBoss && currentBossIndex >= 0) {
      nextBoss = bossChapters[currentBossIndex + 1] ?? null;
      prevBoss = bossChapters[currentBossIndex - 1] ?? null;
    } else {
      // Anchor by the active fight's start time (or the run start when unknown).
      const anchor = currentSegment?.startTime ?? fightStartTime ?? segments[0]?.startTime ?? 0;
      nextBoss = firstBossAfter(bossChapters, anchor);
      prevBoss = lastBossBefore(bossChapters, anchor);
    }

    const nextSegment =
      currentSegmentIndex >= 0 && currentSegmentIndex < segments.length - 1
        ? segments[currentSegmentIndex + 1]
        : null;
    const prevSegment = currentSegmentIndex > 0 ? segments[currentSegmentIndex - 1] : null;

    return {
      runs,
      currentRun,
      runIndex,
      runCount: runs.length,
      nextRun,
      segments,
      bossChapters,
      currentSegment,
      currentSegmentIndex,
      currentBossIndex,
      isOnBoss,
      isOnTrash,
      nextBoss,
      prevBoss,
      nextSegment,
      prevSegment,
      isLoading: isReportLoading,
    };
  }, [reportData, fightId, fightStartTime, isReportLoading]);
}
