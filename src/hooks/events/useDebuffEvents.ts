import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../../EsoLogsClientContext';
import type { FightFragment } from '../../graphql/gql/graphql';
import type { ReportFightContextInput } from '../../store/contextTypes';
import {
  selectDebuffEventsEntryForContext,
  selectDebuffEventsForContext,
} from '../../store/events_data/debuffEventsSelectors';
import { fetchDebuffEvents } from '../../store/events_data/debuffEventsSlice';
import type { RootState } from '../../store/storeWithHistory';
import { useAppDispatch } from '../../store/useAppDispatch';
import { DebuffEvent } from '../../types/combatlogEvents';
import { BuffLookupData } from '../../utils/BuffLookupUtils';
import { useFightForContext } from '../useFightForContext';
import { useResolvedReportFightContext } from '../useResolvedReportFightContext';
import { useDebuffLookupTask } from '../workerTasks/useDebuffLookupTask';

interface UseDebuffEventsOptions {
  restrictToFightWindow?: boolean;
  context?: ReportFightContextInput;
}

export function useDebuffEvents(options?: UseDebuffEventsOptions): {
  debuffEvents: DebuffEvent[];
  isDebuffEventsLoading: boolean;
  selectedFight: FightFragment | null;
} {
  const client = useEsoLogsClientInstance();
  const dispatch = useAppDispatch();
  const context = useResolvedReportFightContext(options?.context);
  const selectedFight = useFightForContext(context);
  const debuffEvents = useSelector((state: RootState) =>
    selectDebuffEventsForContext(state, context),
  );
  const debuffEntry = useSelector((state: RootState) =>
    selectDebuffEventsEntryForContext(state, context),
  );
  const isDebuffEventsLoading = debuffEntry?.status === 'loading';

  const restrictToFightWindow = options?.restrictToFightWindow ?? true;

  React.useEffect(() => {
    if (context.reportCode && selectedFight) {
      dispatch(
        fetchDebuffEvents({
          reportCode: context.reportCode,
          fight: selectedFight,
          client,
          restrictToFightWindow,
        }),
      );
    }
  }, [dispatch, context.reportCode, context.fightId, selectedFight, client, restrictToFightWindow]);

  return React.useMemo(
    () => ({ debuffEvents, isDebuffEventsLoading, selectedFight }),
    [debuffEvents, isDebuffEventsLoading, selectedFight],
  );
}

/**
 * Worker-based hook for debuff lookup calculation.
 * This is the recommended replacement for useDebuffLookup.
 *
 * Benefits:
 * - Non-blocking UI during heavy calculations
 * - Progress reporting for long-running operations
 * - Proper memoization based on input changes
 * - Multi-threaded computation
 *
 * Usage:
 * ```typescript
 * const { result: debuffsLookup, isLoading } = useWorkerDebuffLookup();
 *
 * if (isLoading) {
 *   return <div>Calculating debuffs...</div>;
 * }
 *
 * // Use debuffsLookup.buffIntervals as before
 * ```
 */
export function useWorkerDebuffLookup(): {
  result: BuffLookupData;
  isLoading: boolean;
} {
  const { debuffLookupData, isDebuffLookupLoading } = useDebuffLookupTask();

  return React.useMemo(
    () => ({
      result: debuffLookupData as BuffLookupData,
      isLoading: isDebuffLookupLoading,
    }),
    [debuffLookupData, isDebuffLookupLoading],
  );
}
