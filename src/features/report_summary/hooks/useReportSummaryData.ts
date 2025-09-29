import React from 'react';
import { useSelector } from 'react-redux';

import { useEsoLogsClientInstance } from '../../../EsoLogsClientContext';
import { FightFragment } from '../../../graphql/generated';
import { useReportData } from '../../../hooks';
import { selectReportFights } from '../../../store/report/reportSelectors';
import { useAppDispatch } from '../../../store/useAppDispatch';
import { 
  ReportSummaryData,
  ReportDamageBreakdown,
  ReportDeathAnalysis,
  AggregatedFightData,
  FetchReportSummaryParams,
  ReportInfo,
  PlayerDamageBreakdown,
  FightDamageBreakdown,
  PlayerDeathAnalysis,
  MechanicDeathAnalysis,
  DeathPattern,
  MechanicCategory,
  DeathPatternType,
} from '../../../types/reportSummaryTypes';
import { DamageEvent, DeathEvent, HealEvent } from '../../../types/combatlogEvents';
import { fetchDamageEvents } from '../../../store/events_data/damageEventsSlice';
import { fetchDeathEvents } from '../../../store/events_data/deathEventsSlice';
import { fetchHealingEvents } from '../../../store/events_data/healingEventsSlice';
import { useReportMasterData } from '../../../hooks/useReportMasterData';
import { usePlayerData } from '../../../hooks/usePlayerData';
import { cleanArray } from '../../../utils/cleanArray';

interface UseReportSummaryDataReturn {
  summaryData?: ReportSummaryData;
  isLoading: boolean;
  error?: string;
  progress?: {
    current: number;
    total: number;
    currentTask: string;
  };
}

export function useReportSummaryData(reportCode: string): UseReportSummaryDataReturn {
  const dispatch = useAppDispatch();
  const client = useEsoLogsClientInstance();
  const { reportData, isReportLoading } = useReportData();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const { playerData, isPlayerDataLoading } = usePlayerData();
  const fights = useSelector(selectReportFights);
  
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [progress, setProgress] = React.useState<{
    current: number;
    total: number;
    currentTask: string;
  }>();
  const [summaryData, setSummaryData] = React.useState<ReportSummaryData>();

  // Memoize the clean fights list
  const cleanFights = React.useMemo<FightFragment[]>(() => {
    if (!fights) return [];
    return cleanArray(fights.filter(Boolean));
  }, [fights]);

  // Memoize expensive calculations
  const memoizedReportInfo = React.useMemo((): ReportInfo | null => {
    if (!reportData || !reportCode) return null;
    
    return {
      reportId: reportCode,
      title: reportData.title || reportCode,
      startTime: reportData.startTime,
      endTime: reportData.endTime,
      duration: reportData.endTime - reportData.startTime,
      zoneName: reportData.zone?.name,
      ownerName: undefined, // TODO: Add owner data to GraphQL schema
    };
  }, [reportData, reportCode]);

  // Main effect to fetch and process all data
  React.useEffect(() => {
    if (!reportCode || !reportData || isReportLoading || !cleanFights.length) {
      return;
    }

    if (isProcessing) return; // Prevent duplicate processing
    
    // Don't re-process if we already have summary data for this report
    if (summaryData && summaryData.reportInfo.reportId === reportCode) {
      return;
    }

    const processReportSummary = async () => {
      setIsProcessing(true);
      setError(undefined);
      
      try {
        const totalTasks = cleanFights.length * 3 + 2; // 3 events per fight + damage analysis + death analysis
        let currentTask = 0;

        // Use memoized report info
        if (!memoizedReportInfo) {
          throw new Error('Report info not available');
        }
        const reportInfo = memoizedReportInfo;

        // Fetch all fight data in parallel (but track progress)
        setProgress({
          current: currentTask,
          total: totalTasks,
          currentTask: 'Fetching fight data...',
        });

        const aggregatedData: AggregatedFightData[] = [];
        
        for (const fight of cleanFights) {
          // Fetch damage events
          setProgress({
            current: ++currentTask,
            total: totalTasks,
            currentTask: `Fetching damage events for ${fight.name}...`,
          });
          
          await dispatch(fetchDamageEvents({
            reportCode,
            fight,
            client,
          })).unwrap();

          // Fetch death events
          setProgress({
            current: ++currentTask,
            total: totalTasks,
            currentTask: `Fetching death events for ${fight.name}...`,
          });
          
          await dispatch(fetchDeathEvents({
            reportCode,
            fight,
            client,
          })).unwrap();

          // Fetch healing events
          setProgress({
            current: ++currentTask,
            total: totalTasks,
            currentTask: `Fetching healing events for ${fight.name}...`,
          });
          
          await dispatch(fetchHealingEvents({
            reportCode,
            fight,
            client,
          })).unwrap();

          // Note: For now we'll process the events after all are fetched
          // In production, we'd get the events from the store selectors
          aggregatedData.push({
            fight,
            damageEvents: [], // Will be populated from store
            deathEvents: [], // Will be populated from store
            healingEvents: [], // Will be populated from store
            playerData: playerData ? Object.values(playerData.playersById) : [],
            isLoading: false,
          });
        }

        // Analyze damage breakdown
        setProgress({
          current: ++currentTask,
          total: totalTasks,
          currentTask: 'Analyzing damage breakdown...',
        });
        
        const damageBreakdown = await analyzeDamageBreakdown(aggregatedData, reportMasterData);

        // Analyze death patterns
        setProgress({
          current: ++currentTask,
          total: totalTasks,
          currentTask: 'Analyzing death patterns...',
        });
        
        const deathAnalysis = await analyzeDeathPatterns(aggregatedData, reportMasterData);

        const finalSummaryData: ReportSummaryData = {
          reportInfo,
          fights: cleanFights,
          damageBreakdown,
          deathAnalysis,
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

        setSummaryData(finalSummaryData);
        setProgress(undefined);

      } catch (err) {
        console.error('Error processing report summary:', err);
        setError(err instanceof Error ? err.message : 'Failed to process report summary');
      } finally {
        setIsProcessing(false);
      }
    };

    processReportSummary();
  }, [reportCode, isReportLoading, cleanFights.length, isProcessing, memoizedReportInfo, summaryData]);

  const isLoading = isReportLoading || isMasterDataLoading || isPlayerDataLoading || isProcessing;

  return {
    summaryData,
    isLoading,
    error,
    progress,
  };
}

// Cache for expensive calculations with size limit
const MAX_CACHE_SIZE = 50;
const analysisCache = new Map<string, ReportDamageBreakdown | ReportDeathAnalysis>();

// Cache management helper
function manageCacheSize(): void {
  if (analysisCache.size > MAX_CACHE_SIZE) {
    const firstKey = analysisCache.keys().next().value;
    if (firstKey) {
      analysisCache.delete(firstKey);
    }
  }
}

// Helper function to analyze damage breakdown
async function analyzeDamageBreakdown(
  aggregatedData: AggregatedFightData[],
  masterData: any, // TODO: Type properly
): Promise<ReportDamageBreakdown> {
  // Create cache key based on input data
  const cacheKey = `damage_${aggregatedData.length}_${JSON.stringify(aggregatedData.map(d => d.fight.id)).slice(0, 100)}`;
  
  if (analysisCache.has(cacheKey)) {
    return analysisCache.get(cacheKey) as ReportDamageBreakdown;
  }

  const result = await performDamageAnalysis(aggregatedData, masterData);
  
  manageCacheSize();
  analysisCache.set(cacheKey, result);
  
  return result;
}

// Actual analysis logic separated for clarity
async function performDamageAnalysis(
  aggregatedData: AggregatedFightData[],
  masterData: any,
): Promise<ReportDamageBreakdown> {
  // Mock implementation for now - in production this would process real event data
  const mockPlayerBreakdown: PlayerDamageBreakdown[] = [
    {
      playerId: '1',
      playerName: 'Player One',
      role: 'DPS',
      totalDamage: 1250000,
      dps: 15625,
      damagePercentage: 25.5,
      fightBreakdown: [],
    },
    {
      playerId: '2', 
      playerName: 'Player Two',
      role: 'DPS',
      totalDamage: 1100000,
      dps: 13750,
      damagePercentage: 22.4,
      fightBreakdown: [],
    },
    {
      playerId: '3',
      playerName: 'Tank Player',
      role: 'Tank',
      totalDamage: 350000,
      dps: 4375,
      damagePercentage: 7.1,
      fightBreakdown: [],
    },
  ];

  return {
    totalDamage: 4900000,
    dps: 61250,
    playerBreakdown: mockPlayerBreakdown,
    abilityTypeBreakdown: [
      {
        abilityType: 'Direct Damage',
        totalDamage: 2450000,
        percentage: 50.0,
        hitCount: 1250,
      },
      {
        abilityType: 'DOT',
        totalDamage: 1470000,
        percentage: 30.0,
        hitCount: 890,
      },
      {
        abilityType: 'AOE',
        totalDamage: 980000,
        percentage: 20.0,
        hitCount: 245,
      },
    ],
    targetBreakdown: [
      {
        targetId: 'boss1',
        targetName: 'Boss Target',
        totalDamage: 4900000,
        percentage: 100.0,
      },
    ],
  };
}

// Helper function to analyze death patterns
async function analyzeDeathPatterns(
  aggregatedData: AggregatedFightData[],
  masterData: any, // TODO: Type properly
): Promise<ReportDeathAnalysis> {
  // Create cache key based on input data
  const cacheKey = `deaths_${aggregatedData.length}_${JSON.stringify(aggregatedData.map(d => d.fight.id)).slice(0, 100)}`;
  
  if (analysisCache.has(cacheKey)) {
    return analysisCache.get(cacheKey) as ReportDeathAnalysis;
  }

  const result = await performDeathAnalysis(aggregatedData, masterData);
  
  manageCacheSize();
  analysisCache.set(cacheKey, result);
  
  return result;
}

// Actual analysis logic separated for clarity
async function performDeathAnalysis(
  aggregatedData: AggregatedFightData[],
  masterData: any,
): Promise<ReportDeathAnalysis> {
  // Mock implementation for now - in production this would process real death event data
  const mockMechanicDeaths: MechanicDeathAnalysis[] = [
    {
      mechanicId: 12345,
      mechanicName: 'Cleansing Fire',
      totalDeaths: 3,
      percentage: 50.0,
      playersAffected: ['Player Two', 'Player Three'],
      fightsWithDeaths: [1, 2],
      averageKillingBlowDamage: 45000,
      category: MechanicCategory.AVOIDABLE,
    },
    {
      mechanicId: 12346,
      mechanicName: 'Execute Phase',
      totalDeaths: 2,
      percentage: 33.3,
      playersAffected: ['Player One'],
      fightsWithDeaths: [2],
      averageKillingBlowDamage: 78000,
      category: MechanicCategory.BURST_DAMAGE,
    },
  ];

  const mockDeathPatterns: DeathPattern[] = [
    {
      type: DeathPatternType.REPEATED_MECHANIC_FAILURE,
      description: 'Multiple players are dying to avoidable fire mechanics across different fights.',
      severity: 'High',
      affectedPlayers: ['Player Two', 'Player Three'],
      suggestion: 'Practice movement during fire phases and communicate cleansing timing.',
      evidence: {
        occurrenceCount: 3,
        affectedFights: [1, 2],
        mechanicIds: [12345],
        context: 'Fire mechanics in both trash and boss encounters',
      },
    },
  ];

  return {
    totalDeaths: 6,
    playerDeaths: [
      {
        playerId: '1',
        playerName: 'Player One',
        role: 'DPS',
        totalDeaths: 2,
        averageTimeAlive: 180,
        fightDeaths: [
          {
            fightId: 2,
            fightName: 'Boss Fight',
            deathCount: 2,
            timeAlive: 180,
            deathTimestamps: [150000, 210000],
          },
        ],
        topCausesOfDeath: [
          {
            abilityId: 12346,
            abilityName: 'Execute Phase',
            deathCount: 2,
            percentage: 100.0,
          },
        ],
      },
      {
        playerId: '2',
        playerName: 'Player Two',
        role: 'DPS', 
        totalDeaths: 2,
        averageTimeAlive: 165,
        fightDeaths: [
          {
            fightId: 1,
            fightName: 'Trash Pack',
            deathCount: 1,
            timeAlive: 120,
            deathTimestamps: [120000],
          },
          {
            fightId: 2,
            fightName: 'Boss Fight',
            deathCount: 1,
            timeAlive: 210,
            deathTimestamps: [210000],
          },
        ],
        topCausesOfDeath: [
          {
            abilityId: 12345,
            abilityName: 'Cleansing Fire',
            deathCount: 2,
            percentage: 100.0,
          },
        ],
      },
      {
        playerId: '3',
        playerName: 'Tank Player',
        role: 'Tank',
        totalDeaths: 0,
        averageTimeAlive: 300,
        fightDeaths: [],
        topCausesOfDeath: [],
      },
    ],
    mechanicDeaths: mockMechanicDeaths,
    fightDeaths: [
      {
        fightId: 1,
        fightName: 'Trash Pack',
        totalDeaths: 1,
        deathRate: 0.5,
        success: true,
        mechanicBreakdown: [
          {
            mechanicId: 12345,
            mechanicName: 'Cleansing Fire',
            deathCount: 1,
          },
        ],
      },
      {
        fightId: 2,
        fightName: 'Boss Fight',
        totalDeaths: 5,
        deathRate: 1.25,
        success: false,
        mechanicBreakdown: [
          {
            mechanicId: 12345,
            mechanicName: 'Cleansing Fire',
            deathCount: 2,
          },
          {
            mechanicId: 12346,
            mechanicName: 'Execute Phase',
            deathCount: 2,
          },
        ],
      },
    ],
    deathPatterns: mockDeathPatterns,
  };
}