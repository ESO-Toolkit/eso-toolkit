/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../../../EsoLogsClientContext';
import { FightFragment } from '../../../graphql/gql/graphql';
import { DeathAnalysisInput, DeathAnalysisService } from '../../../services/DeathAnalysisService';
import { selectDeathEventsForContext } from '../../../store/events_data/deathEventsSelectors';
import { fetchDeathEvents } from '../../../store/events_data/deathEventsSlice';
import {
  selectAbilitiesByIdForContext,
  selectActorsByIdForContext,
} from '../../../store/master_data/masterDataSelectors';
import { selectReportFights } from '../../../store/report/reportSelectors';
import { RootState } from '../../../store/storeWithHistory';
import { useAppDispatch } from '../../../store/useAppDispatch';
import { DeathEvent } from '../../../types/combatlogEvents';
import { ReportDeathAnalysis } from '../../../types/reportSummaryTypes';

interface UseMultiFightDeathAnalysisReturn {
  deathAnalysis: ReportDeathAnalysis | null;
  isLoading: boolean;
  error: string | null;
  progress: { current: number; total: number } | null;
  fetchAnalysis: () => Promise<void>;
}

/**
 * Hook to fetch death events for all fights in a report and perform comprehensive death analysis
 * using the new multi-fight Redux architecture.
 *
 * This hook:
 * 1. Fetches death events for each fight using Redux (with caching)
 * 2. Retrieves master data (actors, abilities) from Redux
 * 3. Performs comprehensive death analysis across all fights
 *
 * @param reportCode - The report code to analyze
 */
export function useMultiFightDeathAnalysis(reportCode: string): UseMultiFightDeathAnalysisReturn {
  const dispatch = useAppDispatch();
  const client = useEsoLogsClientInstance();
  const fights = useSelector(selectReportFights);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [deathAnalysis, setDeathAnalysis] = useState<ReportDeathAnalysis | null>(null);

  // Use Redux selectors to get cached data for each fight
  const getFightDeathData = useCallback(
    (fight: FightFragment, state: RootState): DeathEvent[] => {
      return selectDeathEventsForContext(state, {
        reportCode,
        fightId: fight.id,
      });
    },
    [reportCode],
  );

  const getFightActors = useCallback(
    (fight: FightFragment, state: RootState) => {
      return selectActorsByIdForContext(state, {
        reportCode,
        fightId: fight.id,
      });
    },
    [reportCode],
  );

  const getFightAbilities = useCallback(
    (fight: FightFragment, state: RootState) => {
      return selectAbilitiesByIdForContext(state, {
        reportCode,
        fightId: fight.id,
      });
    },
    [reportCode],
  );

  const fetchAnalysis = useCallback(async () => {
    if (!client || !fights || fights.length === 0) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const cleanFights = fights.filter((fight): fight is FightFragment => fight !== null);
      setProgress({ current: 0, total: cleanFights.length });

      // Fetch death events for all fights in parallel using Redux
      const fetchPromises = cleanFights.map((fight, index) =>
        dispatch(
          fetchDeathEvents({
            reportCode,
            fight,
            client,
          }),
        )
          .unwrap()
          .then(() => {
            setProgress({ current: index + 1, total: cleanFights.length });
          }),
      );

      await Promise.all(fetchPromises);

      // Now that all events are cached in Redux, retrieve them along with master data
      const state = (dispatch as any).getState() as RootState;

      const fightDeathData: DeathAnalysisInput[] = cleanFights.map((fight) => {
        const deathEvents = getFightDeathData(fight, state);
        const actors = getFightActors(fight, state);
        const abilities = getFightAbilities(fight, state);

        return {
          deathEvents,
          fightId: fight.id,
          fightName: fight.name,
          fightStartTime: fight.startTime,
          fightEndTime: fight.endTime ?? fight.startTime,
          actors,
          abilities,
        };
      });

      // Perform comprehensive death analysis
      const analysis = DeathAnalysisService.analyzeReportDeaths(fightDeathData);
      setDeathAnalysis(analysis);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze death events';
      setError(errorMessage);
      console.error('Death analysis error:', err);
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }, [client, fights, reportCode, dispatch, getFightDeathData, getFightActors, getFightAbilities]);

  // Auto-fetch when component mounts
  useEffect(() => {
    if (reportCode && fights && fights.length > 0) {
      fetchAnalysis();
    }
  }, [reportCode, fights, fetchAnalysis]);

  return {
    deathAnalysis,
    isLoading,
    error,
    progress,
    fetchAnalysis,
  };
}
