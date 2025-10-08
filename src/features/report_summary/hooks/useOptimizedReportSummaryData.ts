import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../../../EsoLogsClientContext';
import { FightFragment } from '../../../graphql/generated';
import { useReportData } from '../../../hooks';
import { selectReportFights } from '../../../store/report/reportSelectors';
import { useAppDispatch } from '../../../store/useAppDispatch';
import { fetchDamageEvents } from '../../../store/events_data/damageEventsSlice';
import { fetchDeathEvents } from '../../../store/events_data/deathEventsSlice';
import { fetchHealingEvents } from '../../../store/events_data/healingEventsSlice';
import { 
  ReportSummaryData,
  FetchReportSummaryParams,
  ReportInfo,
  AggregatedFightData,
} from '../../../types/reportSummaryTypes';

interface UseOptimizedReportSummaryDataReturn {
  reportSummaryData: ReportSummaryData | null;
  isLoading: boolean;
  progress: { current: number; total: number; currentTask: string } | null;
  error: string | null;
  fetchData: (params: FetchReportSummaryParams) => Promise<void>;
}

/**
 * Optimized version that fetches events in parallel for better performance
 */
export function useOptimizedReportSummaryData(reportCode: string): UseOptimizedReportSummaryDataReturn {
  const dispatch = useAppDispatch();
  const client = useEsoLogsClientInstance();
  const fights = useSelector(selectReportFights);
  
  const [isLoading, setIsLoading] = React.useState(false);
  const [progress, setProgress] = React.useState<{ current: number; total: number; currentTask: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reportSummaryData, setReportSummaryData] = React.useState<ReportSummaryData | null>(null);

  const fetchData = React.useCallback(async (params: FetchReportSummaryParams) => {
    if (!client || !fights) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const cleanFights = fights.filter((fight): fight is FightFragment => fight !== null);
      const totalTasks = cleanFights.length * 3 + 2; // 3 event types per fight + analysis tasks
      
      setProgress({
        current: 0,
        total: totalTasks,
        currentTask: 'Starting optimized data fetch...',
      });

      // **OPTIMIZATION 1: Parallel Fight Processing**
      // Instead of processing fights sequentially, create all promises upfront
      const fightPromises = cleanFights.map(async (fight, fightIndex) => {
        const baseFightProgress = fightIndex * 3;
        
        // Fetch all event types for this fight in parallel
        const [damageEvents, deathEvents, healingEvents] = await Promise.all([
          dispatch(fetchDamageEvents({
            reportCode,
            fight,
            client,
          })).unwrap().then((result) => {
            setProgress({
              current: baseFightProgress + 1,
              total: totalTasks,
              currentTask: `Completed damage events for ${fight.name}`,
            });
            return result;
          }),
          
          dispatch(fetchDeathEvents({
            reportCode,
            fight,
            client,
          })).unwrap().then((result) => {
            setProgress({
              current: baseFightProgress + 2,
              total: totalTasks,
              currentTask: `Completed death events for ${fight.name}`,
            });
            return result;
          }),
          
          dispatch(fetchHealingEvents({
            reportCode,
            fight,
            client,
          })).unwrap().then((result) => {
            setProgress({
              current: baseFightProgress + 3,
              total: totalTasks,
              currentTask: `Completed healing events for ${fight.name}`,
            });
            return result;
          })
        ]);

        return {
          fight,
          damageEvents,
          deathEvents,
          healingEvents,
        };
      });

      // Wait for all fights to complete
      setProgress({
        current: cleanFights.length * 3,
        total: totalTasks,
        currentTask: 'Processing all fight data...',
      });
      
      const aggregatedData = await Promise.all(fightPromises);

      // Continue with analysis...
      setProgress({
        current: totalTasks - 1,
        total: totalTasks,
        currentTask: 'Finalizing summary data...',
      });

      // TODO: Add analysis logic here
      const mockReportInfo: ReportInfo = {
        reportId: reportCode,
        title: 'Report Title',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: Date.now() - Date.now(),
        zoneName: 'Zone Name',
        ownerName: 'Owner Name',
      };

      const summaryData: ReportSummaryData = {
        reportInfo: mockReportInfo,
        fights: cleanFights,
        damageBreakdown: {
          totalDamage: 0,
          dps: 0,
          playerBreakdown: [],
          abilityTypeBreakdown: [],
          targetBreakdown: [],
        },
        deathAnalysis: {
          totalDeaths: 0,
          playerDeaths: [],
          mechanicDeaths: [],
          fightDeaths: [],
          deathPatterns: [],
        },
        loadingStates: {
          isLoading: false,
          fightDataLoading: {},
          damageEventsLoading: false,
          deathEventsLoading: false,
          playerDataLoading: false,
          masterDataLoading: false,
        },
        errors: {
          generalErrors: [],
          fightErrors: {},
          fetchErrors: {},
        },
      };

      setReportSummaryData(summaryData);
      setProgress({
        current: totalTasks,
        total: totalTasks,
        currentTask: 'Complete!',
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, client, fights, reportCode]);

  return {
    reportSummaryData,
    isLoading,
    progress,
    error,
    fetchData,
  };
}