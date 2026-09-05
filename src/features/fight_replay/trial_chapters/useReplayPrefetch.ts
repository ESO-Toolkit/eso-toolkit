/**
 * useReplayPrefetch
 *
 * Best-effort warming of the *adjacent* bosses' combat events so skipping to the
 * next / previous boss is as quick as possible.
 *
 * Why only events: the actor-position worker writes to a single shared result
 * slot (computing an adjacent fight there would corrupt the on-screen arena), so
 * positions are intentionally NOT pre-computed — they run on navigation, served
 * instantly from the worker's LRU result cache when the fight was visited before.
 * Combat events, by contrast, are cached per fight context, so prefetching them
 * means the position worker can start immediately on arrival instead of waiting
 * on the network.
 *
 * Prefetch is gated on `enabled` (the current fight being interactive) so it
 * never competes with the data the viewer is actively waiting for.
 *
 * @module features/fight_replay/trial_chapters/useReplayPrefetch
 */

import { useCastEvents } from '../../../hooks/events/useCastEvents';
import { useDamageEvents } from '../../../hooks/events/useDamageEvents';
import { useDeathEvents } from '../../../hooks/events/useDeathEvents';
import { useHealingEvents } from '../../../hooks/events/useHealingEvents';
import { useResourceEvents } from '../../../hooks/events/useResourceEvents';
import { useReportFightParams } from '../../../hooks/useReportFightParams';

import type { TrialChapter } from './types';

// A fight id that never resolves to a real fight, used to make the prefetch hooks
// a no-op (no network) when there is no adjacent boss or prefetch is disabled.
const NO_FIGHT = '__prefetch_none__';

/** Warm the position-input events for one fight context (no-op for the sentinel id). */
function usePrefetchFight(reportCode: string | null, fightId: string): void {
  const context = { reportCode, fightId };
  // Same event set the actor-positions task consumes; results are intentionally ignored.
  useDamageEvents({ context });
  useHealingEvents({ context });
  useDeathEvents({ context });
  useResourceEvents({ context });
  useCastEvents({ context });
}

/**
 * Prefetch the next and previous timeline entries' events.
 *
 * Pass the TRASH-AWARE neighbours (next/prev entries on the filtered timeline), not just
 * bosses: with includeTrash on, the next segment is often trash, and auto-advancing into a
 * cold trash segment would stall on the network. Callers fall back to bosses when there is no
 * timeline (single-fight view).
 *
 * @param nextEntry - The next chapter to warm, or null.
 * @param prevEntry - The previous chapter to warm, or null.
 * @param enabled - Only prefetch once the current fight is interactive.
 */
export function useReplayPrefetch(
  nextEntry: TrialChapter | null,
  prevEntry: TrialChapter | null,
  enabled: boolean,
): void {
  const { reportId } = useReportFightParams();
  const reportCode = reportId ?? null;

  // Hook call order is stable (next then prev); the sentinel keeps them no-op when
  // there's no adjacent entry or prefetch is disabled, satisfying the rules of hooks.
  usePrefetchFight(reportCode, enabled && nextEntry ? nextEntry.fightId : NO_FIGHT);
  usePrefetchFight(reportCode, enabled && prevEntry ? prevEntry.fightId : NO_FIGHT);
}
