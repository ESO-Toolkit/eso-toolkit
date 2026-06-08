/**
 * useTrialChapters
 *
 * Resolves the trial's boss chapters for the currently-loaded fight so the
 * fight-replay chapter rail can let a viewer skip between bosses without leaving
 * the replay. Single source of truth for cross-fight navigation: it builds the
 * chapter list from the report and locates the active fight within it.
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
  /** Every trial run in the report (each with its ordered boss chapters). */
  runs: TrialChapterRun[];
  /** The run containing the active fight (by membership, else by time span), or null. */
  currentRun: TrialChapterRun | null;
  /** Boss chapters for the current run (empty when none resolved). */
  chapters: TrialChapter[];
  /** Index of the active fight within `chapters`, or -1 (e.g. the active fight is trash). */
  currentIndex: number;
  /** The active chapter, or null when the active fight isn't a boss chapter. */
  currentChapter: TrialChapter | null;
  /** The next boss chapter to skip to, or null at the end of the run. */
  nextChapter: TrialChapter | null;
  /** The previous boss chapter to skip to, or null at the start of the run. */
  prevChapter: TrialChapter | null;
  /** True while the underlying report data is still loading. */
  isLoading: boolean;
}

/**
 * Hook returning the trial chapter list plus the active fight's position within
 * it. Pure derivation over report data — no dispatch — so it's safe to call
 * alongside the replay's heavier worker-task hooks.
 */
export function useTrialChapters(): UseTrialChaptersResult {
  const { reportData, isReportLoading } = useReportData();
  const { fightId } = useReportFightParams();
  const { fight } = useCurrentFight();

  return useMemo(() => {
    const runs = buildTrialChapters(reportData?.fights ?? null, reportData);
    const match = findRunForFight(runs, fightId, fight?.startTime ?? null);

    const currentRun = match?.run ?? null;
    const chapters = currentRun?.chapters ?? [];
    const currentIndex = match?.index ?? -1;

    const currentChapter = currentIndex >= 0 ? (chapters[currentIndex] ?? null) : null;
    const nextChapter =
      currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;
    const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;

    return {
      runs,
      currentRun,
      chapters,
      currentIndex,
      currentChapter,
      nextChapter,
      prevChapter,
      isLoading: isReportLoading,
    };
  }, [reportData, fightId, fight?.startTime, isReportLoading]);
}
