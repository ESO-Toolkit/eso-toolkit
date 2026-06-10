/**
 * useReplayNavigation
 *
 * Navigates between fights *inside* the replay. Because the replay route has no
 * remount key, swapping the `:fightId` segment keeps the `FightReplay` shell (and
 * the chapter rail) mounted while the fight context — events, positions, map —
 * reloads for the new fight. This is what lets a viewer skip between bosses /
 * trash without leaving the replay.
 *
 * @module features/fight_replay/trial_chapters/useReplayNavigation
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useReportFightParams } from '../../../hooks/useReportFightParams';

export interface ReplayNavigationOptions {
  /** Start time (ms into the fight) to seed; omitted/0 starts the new fight from the beginning. */
  time?: number;
  /** Replace the history entry instead of pushing (default: push, so Back returns to the prior fight). */
  replace?: boolean;
}

export interface UseReplayNavigationResult {
  /** Navigate the replay to another fight in the same report. No-op without a report id. */
  goToFight: (fightId: string | number, options?: ReplayNavigationOptions) => void;
  /** True when navigation is possible (a report id is present). */
  canNavigate: boolean;
}

/**
 * Hook returning a `goToFight` action that swaps the active fight within the
 * replay. Drops the `?actorId`/`?time` of the current fight by default — a new
 * fight has different actors and should start from the top — unless an explicit
 * `time` is provided (e.g. resuming a deep link).
 */
export function useReplayNavigation(): UseReplayNavigationResult {
  const navigate = useNavigate();
  const { reportId } = useReportFightParams();

  const goToFight = useCallback(
    (fightId: string | number, options?: ReplayNavigationOptions) => {
      if (!reportId) return;

      const params = new URLSearchParams();
      if (options?.time != null && options.time > 0) {
        params.set('time', String(Math.round(options.time)));
      }
      const query = params.toString();
      const path = `/report/${reportId}/fight/${fightId}/replay${query ? `?${query}` : ''}`;

      navigate(path, { replace: options?.replace ?? false });
    },
    [navigate, reportId],
  );

  return { goToFight, canNavigate: Boolean(reportId) };
}
