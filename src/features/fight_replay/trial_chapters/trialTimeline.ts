/**
 * Continuous trial timeline.
 *
 * Concatenates a trial run's segments into one virtual, gapless timeline so the
 * replay can present the whole run as a single continuous "video": one global
 * playhead, one scrubber, auto-advance from each fight into the next. Real-world
 * out-of-combat gaps between fights (travel, loading screens — which ESO Logs has
 * no position data for) are intentionally collapsed, so playback flows seamlessly
 * trash → boss → trash without dead air.
 *
 * The model is pure (no React/Redux) and maps between a global trial time and the
 * per-fight (segment + local time) the replay actually loads and plays.
 *
 * @module features/fight_replay/trial_chapters/trialTimeline
 */

import type { TrialChapter } from './types';

/** One segment placed on the continuous timeline. */
export interface TrialTimelineEntry {
  /** The underlying chapter (boss or trash). */
  chapter: TrialChapter;
  /** Cumulative start offset from the run's beginning (ms). */
  globalStart: number;
  /** Cumulative end offset (globalStart + durationMs). */
  globalEnd: number;
  /** Start position as a fraction [0,1] of the total (for proportional layout). */
  startFraction: number;
  /** End position as a fraction [0,1] of the total. */
  endFraction: number;
}

/** A run's segments laid out on one continuous axis. */
export interface TrialTimeline {
  entries: TrialTimelineEntry[];
  totalDurationMs: number;
}

/** A resolved point on the timeline: which fight, and how far into it. */
export interface GlobalPosition {
  entryIndex: number;
  chapter: TrialChapter;
  localMs: number;
}

/**
 * Build the continuous timeline for a run's segments.
 *
 * @param segments - The run's segments (bosses + trash), in play order.
 * @param includeTrash - When false, trash is dropped so playback flows boss→boss.
 */
export function buildTrialTimeline(segments: TrialChapter[], includeTrash: boolean): TrialTimeline {
  const filtered = includeTrash ? segments : segments.filter((s) => s.kind === 'boss');

  let acc = 0;
  const entries: TrialTimelineEntry[] = filtered.map((chapter) => {
    const globalStart = acc;
    const globalEnd = acc + Math.max(0, chapter.durationMs);
    acc = globalEnd;
    return { chapter, globalStart, globalEnd, startFraction: 0, endFraction: 0 };
  });

  const totalDurationMs = acc;
  for (const entry of entries) {
    entry.startFraction = totalDurationMs > 0 ? entry.globalStart / totalDurationMs : 0;
    entry.endFraction = totalDurationMs > 0 ? entry.globalEnd / totalDurationMs : 0;
  }

  return { entries, totalDurationMs };
}

/** The timeline entry + index for a given fight id, or null when absent. */
export function entryForFight(
  timeline: TrialTimeline,
  fightId: string | undefined,
): { entry: TrialTimelineEntry; index: number } | null {
  if (fightId === undefined) return null;
  const index = timeline.entries.findIndex((e) => e.chapter.fightId === fightId);
  return index === -1 ? null : { entry: timeline.entries[index], index };
}

/** Resolve a global trial time to the segment + local time it falls in. */
export function globalToLocal(timeline: TrialTimeline, globalMs: number): GlobalPosition | null {
  const { entries, totalDurationMs } = timeline;
  if (entries.length === 0) return null;

  const clamped = Math.max(0, Math.min(globalMs, totalDurationMs));
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (clamped >= e.globalStart && clamped < e.globalEnd) {
      return { entryIndex: i, chapter: e.chapter, localMs: clamped - e.globalStart };
    }
  }

  // At/after the end → the final frame of the last entry.
  const lastIndex = entries.length - 1;
  const last = entries[lastIndex];
  return { entryIndex: lastIndex, chapter: last.chapter, localMs: last.chapter.durationMs };
}

/**
 * The entry continuous play should flow into AFTER the given fight. When the fight
 * is on the timeline this is simply the following entry; when it is NOT on the
 * timeline (a deep-linked trash blip below the segment threshold, or trash while
 * trash is excluded), fall back to the first entry starting after the fight's
 * real start time — so auto-advance never dead-stops on an excluded fight.
 */
export function nextEntryAfter(
  timeline: TrialTimeline,
  fightId: string | undefined,
  fightStartTime: number,
): TrialTimelineEntry | null {
  const match = entryForFight(timeline, fightId);
  if (match) return timeline.entries[match.index + 1] ?? null;
  return timeline.entries.find((e) => e.chapter.startTime > fightStartTime) ?? null;
}

/**
 * Convert a per-fight position (fight id + local ms) to its global trial time.
 * Returns null when the fight isn't on this timeline (e.g. trash while trash is
 * excluded).
 */
export function localToGlobal(
  timeline: TrialTimeline,
  fightId: string | undefined,
  localMs: number,
): number | null {
  const match = entryForFight(timeline, fightId);
  if (!match) return null;
  const clampedLocal = Math.max(0, Math.min(localMs, match.entry.chapter.durationMs));
  return match.entry.globalStart + clampedLocal;
}
