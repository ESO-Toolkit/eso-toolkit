/**
 * Trial chapter model.
 *
 * The fight-replay "trial" layer lets a viewer move through a whole trial run —
 * boss encounters *and* the trash between them — without leaving the replay. It
 * sits above the existing intra-fight timeline markers (phase/death): the rail
 * navigates between fights, the markers navigate within one.
 *
 * A {@link TrialChapter} is one navigable fight (a `ReportFight`). Bosses are the
 * primary skip targets (named, with a kill/wipe checkmark); trash segments are
 * the connective fights that carry the map transitions between bosses. A
 * {@link TrialChapterRun} groups one trial attempt's segments in play order.
 *
 * Modeled after the streaming-player chapter convention (start/end + title +
 * active state) but keyed to a fight id, so selecting a chapter loads that
 * fight's replay.
 *
 * @module features/fight_replay/trial_chapters/types
 */

/** Whether a segment is a boss encounter or the trash between bosses. */
export type TrialSegmentKind = 'boss' | 'trash';

/** A single navigable fight within a trial run (boss or trash). */
export interface TrialChapter {
  /** Fight id as a string (matches the `:fightId` route param). */
  fightId: string;
  /** Numeric fight id as stored on the fight fragment. */
  fightNumericId: number;
  /** Boss / encounter display name (or the trash fight's name). */
  name: string;
  /** Whether this segment is a boss encounter or trash. */
  kind: TrialSegmentKind;
  /** Trial this segment belongs to (e.g. "Rockgrove"). */
  trialName: string;
  /** Raw ESO Logs difficulty code (e.g. 120/121/122), or null for trash. */
  difficulty: number | null;
  /** Human-readable difficulty label (e.g. "Veteran HM"), or null for trash. */
  difficultyLabel: string | null;
  /** True when the boss was killed / trash was cleared (includes false-positive wipes). */
  isKill: boolean;
  /** True when the pull was a genuine wipe. */
  isWipe: boolean;
  /** Boss health % remaining at the end (rounded), or null for trash / unknown. */
  bossPercentage: number | null;
  /** Fight start time (report-relative ms). */
  startTime: number;
  /** Fight end time (report-relative ms). */
  endTime: number;
  /** Fight duration in ms (`endTime - startTime`). */
  durationMs: number;
  /** 0-based position within the run's full segment list (bosses + trash). */
  index: number;
  /** 0-based position within the run's boss list, or -1 for trash. */
  bossIndex: number;
  /** 1-based occurrence of this boss name within the run (pull # on progression); 1 for trash. */
  attempt: number;
}

/**
 * One trial run — an ordered group of segments (bosses + trash). A report can
 * contain several runs (e.g. back-to-back trials, or a reset), each with its own
 * segment list.
 */
export interface TrialChapterRun {
  /** Stable id for the run (`<trialName>-run-<n>`). */
  id: string;
  /** Trial name shared by the run (e.g. "Rockgrove"). */
  trialName: string;
  /** Every fight in the run (bosses + trash), in start-time order. */
  segments: TrialChapter[];
  /** Boss-only view of `segments` (the primary skip targets), in order. */
  bossChapters: TrialChapter[];
}
