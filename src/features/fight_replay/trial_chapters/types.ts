/**
 * Trial chapter model.
 *
 * A "chapter" is a single boss encounter (one `ReportFight`) within a trial run,
 * surfaced to the fight-replay UI so a viewer can skip between bosses — the
 * cross-fight navigation layer that sits above the existing intra-fight timeline
 * markers (phase/death). Modeled after the streaming-player chapter convention
 * (start/end + title + active state) but keyed to a fight id so selecting a
 * chapter loads that fight's replay.
 *
 * @module features/fight_replay/trial_chapters/types
 */

/** A single boss encounter the replay can jump to. */
export interface TrialChapter {
  /** Fight id as a string (matches the `:fightId` route param). */
  fightId: string;
  /** Numeric fight id as stored on the fight fragment. */
  fightNumericId: number;
  /** Boss / encounter display name. */
  name: string;
  /** Trial this boss belongs to (e.g. "Rockgrove"). */
  trialName: string;
  /** Raw ESO Logs difficulty code (e.g. 120/121/122), or null. */
  difficulty: number | null;
  /** Human-readable difficulty label (e.g. "Veteran HM"), or null. */
  difficultyLabel: string | null;
  /** True when the boss was killed (includes false-positive wipes). */
  isKill: boolean;
  /** True when the pull was a genuine wipe. */
  isWipe: boolean;
  /** Boss health % remaining at the end (rounded), or null. */
  bossPercentage: number | null;
  /** Fight start time (report-relative ms). */
  startTime: number;
  /** Fight end time (report-relative ms). */
  endTime: number;
  /** Fight duration in ms (`endTime - startTime`). */
  durationMs: number;
  /** 0-based position of this chapter within its run. */
  index: number;
  /** 1-based occurrence of this boss name within the run (pull number on progression). */
  attempt: number;
}

/**
 * One trial run — an ordered group of boss chapters. A report can contain
 * several runs (e.g. back-to-back trials, or a reset), each with its own
 * chapter list.
 */
export interface TrialChapterRun {
  /** Stable id for the run (`<trialName>-run-<n>`). */
  id: string;
  /** Trial name shared by every chapter in the run. */
  trialName: string;
  /** Ordered boss chapters in the run. */
  chapters: TrialChapter[];
}
