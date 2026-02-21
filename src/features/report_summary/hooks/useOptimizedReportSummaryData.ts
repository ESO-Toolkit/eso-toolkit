import React from 'react';
import { useSelector, useStore } from 'react-redux';

import { useEsoLogsClientInstance } from '../../../EsoLogsClientContext';
import { FightFragment } from '../../../graphql/gql/graphql';
import { DeathAnalysisInput, DeathAnalysisService } from '../../../services/DeathAnalysisService';
import { selectDamageEventsForContext } from '../../../store/events_data/damageEventsSelectors';
import { fetchDamageEvents } from '../../../store/events_data/damageEventsSlice';
import { selectDeathEventsForContext } from '../../../store/events_data/deathEventsSelectors';
import { fetchDeathEvents } from '../../../store/events_data/deathEventsSlice';
import { fetchHealingEvents } from '../../../store/events_data/healingEventsSlice';
import {
  selectAbilitiesByIdForContext,
  selectActorsByIdForContext,
} from '../../../store/master_data/masterDataSelectors';
import { selectReportFights } from '../../../store/report/reportSelectors';
import { RootState } from '../../../store/storeWithHistory';
import { useAppDispatch } from '../../../store/useAppDispatch';
import {
  ReportSummaryData,
  FetchReportSummaryParams,
  ReportInfo,
  PlayerDamageBreakdown,
  AbilityTypeDamageBreakdown,
  FightDamageBreakdown,
} from '../../../types/reportSummaryTypes';

interface UseOptimizedReportSummaryDataReturn {
  reportSummaryData: ReportSummaryData | null;
  isLoading: boolean;
  progress: { current: number; total: number; currentTask: string } | null;
  error: string | null;
  fetchData: (params: FetchReportSummaryParams) => Promise<void>;
}

/**
 * Optimized version that fetches events in batches with rate limiting to avoid
 * overwhelming the ESO Logs API. Processes fights in small batches (3 at a time)
 * with delays between batches to stay within API rate limits.
 */
export function useOptimizedReportSummaryData(
  reportCode: string,
): UseOptimizedReportSummaryDataReturn {
  const dispatch = useAppDispatch();
  const client = useEsoLogsClientInstance();
  const fights = useSelector(selectReportFights);
  const store = useStore<RootState>();

  const [isLoading, setIsLoading] = React.useState(false);
  const [progress, setProgress] = React.useState<{
    current: number;
    total: number;
    currentTask: string;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reportSummaryData, setReportSummaryData] = React.useState<ReportSummaryData | null>(null);

  const fetchData = React.useCallback(
    async (_params: FetchReportSummaryParams) => {
      if (!client || !fights) return;

      try {
        setIsLoading(true);
        setError(null);

        // Filter fights same as report fight selector - exclude invalid timestamps/zero duration
        const cleanFights = fights
          .filter((fight): fight is FightFragment => fight !== null)
          .filter((fight) => fight.startTime && fight.endTime && fight.endTime > fight.startTime);
        const totalTasks = cleanFights.length * 3 + 2; // 3 event types per fight + analysis tasks

        setProgress({
          current: 0,
          total: totalTasks,
          currentTask: 'Starting optimized data fetch...',
        });

        // **RATE-LIMITED BATCH PROCESSING**
        // Process fights in batches to avoid overwhelming the API
        const BATCH_SIZE = 3; // Process 3 fights at a time
        const BATCH_DELAY_MS = 500; // Wait 500ms between batches

        let completedTasks = 0;

        for (let i = 0; i < cleanFights.length; i += BATCH_SIZE) {
          const batch = cleanFights.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(cleanFights.length / BATCH_SIZE);

          setProgress({
            current: completedTasks,
            total: totalTasks,
            currentTask: `Processing batch ${batchNum}/${totalBatches} (${batch.length} fights)...`,
          });

          // Process this batch of fights in parallel
          const batchPromises = batch.map(async (fight, batchIndex) => {
            const fightIndex = i + batchIndex;
            const _baseFightProgress = fightIndex * 3;

            // Fetch all event types for this fight in parallel
            const [damageEvents, deathEvents, healingEvents] = await Promise.all([
              dispatch(
                fetchDamageEvents({
                  reportCode,
                  fight,
                  client,
                }),
              )
                .unwrap()
                .then((result) => {
                  completedTasks++;
                  setProgress({
                    current: completedTasks,
                    total: totalTasks,
                    currentTask: `Completed damage events for ${fight.name}`,
                  });
                  return result;
                }),

              dispatch(
                fetchDeathEvents({
                  reportCode,
                  fight,
                  client,
                }),
              )
                .unwrap()
                .then((result) => {
                  completedTasks++;
                  setProgress({
                    current: completedTasks,
                    total: totalTasks,
                    currentTask: `Completed death events for ${fight.name}`,
                  });
                  return result;
                }),

              dispatch(
                fetchHealingEvents({
                  reportCode,
                  fight,
                  client,
                }),
              )
                .unwrap()
                .then((result) => {
                  completedTasks++;
                  setProgress({
                    current: completedTasks,
                    total: totalTasks,
                    currentTask: `Completed healing events for ${fight.name}`,
                  });
                  return result;
                }),
            ]);

            return {
              fight,
              damageEvents,
              deathEvents,
              healingEvents,
            };
          });

          // Wait for this batch to complete
          await Promise.all(batchPromises);

          // Add delay between batches (except for the last batch)
          if (i + BATCH_SIZE < cleanFights.length) {
            await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
          }
        }

        // All fights processed
        setProgress({
          current: cleanFights.length * 3,
          total: totalTasks,
          currentTask: 'Analyzing death patterns...',
        });

        // Now that all events are cached in Redux, retrieve them for analysis
        const state = store.getState();

        // Perform death analysis using Redux-cached data
        setProgress({
          current: totalTasks - 1,
          total: totalTasks,
          currentTask: 'Analyzing death patterns...',
        });

        const fightDeathData: DeathAnalysisInput[] = cleanFights.map((fight) => {
          const deathEvents = selectDeathEventsForContext(state, {
            reportCode,
            fightId: fight.id,
          });
          const actors = selectActorsByIdForContext(state, {
            reportCode,
            fightId: fight.id,
          });
          const abilities = selectAbilitiesByIdForContext(state, {
            reportCode,
            fightId: fight.id,
          });

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
        const deathAnalysis = DeathAnalysisService.analyzeReportDeaths(fightDeathData);

        // Calculate comprehensive damage breakdown
        const totalDuration = cleanFights.reduce(
          (sum, fight) => sum + ((fight.endTime ?? fight.startTime) - fight.startTime),
          0,
        );

        // Build player damage breakdown
        const playerDamageMap = new Map<
          string,
          {
            name: string;
            totalDamage: number;
            fightData: Map<number, { damage: number; duration: number; fightName: string }>;
          }
        >();

        cleanFights.forEach((fight) => {
          const damageEvents = selectDamageEventsForContext(state, {
            reportCode,
            fightId: fight.id,
          });
          const actors = selectActorsByIdForContext(state, {
            reportCode,
            fightId: fight.id,
          });

          const fightDuration = (fight.endTime ?? fight.startTime) - fight.startTime;

          damageEvents.forEach((event) => {
            const sourceId = event.sourceID?.toString() || 'unknown';
            const actor = actors[event.sourceID];
            const actorName = actor?.name || `Actor ${sourceId}`;

            if (!playerDamageMap.has(sourceId)) {
              playerDamageMap.set(sourceId, {
                name: actorName,
                totalDamage: 0,
                fightData: new Map(),
              });
            }

            const playerData = playerDamageMap.get(sourceId)!;
            playerData.totalDamage += event.amount || 0;

            if (!playerData.fightData.has(fight.id)) {
              playerData.fightData.set(fight.id, {
                damage: 0,
                duration: fightDuration,
                fightName: fight.name,
              });
            }

            const fightData = playerData.fightData.get(fight.id)!;
            fightData.damage += event.amount || 0;
          });
        });

        const totalDamage = Array.from(playerDamageMap.values()).reduce(
          (sum, player) => sum + player.totalDamage,
          0,
        );
        const dps = totalDuration > 0 ? (totalDamage / totalDuration) * 1000 : 0;

        // Convert to PlayerDamageBreakdown array - filter to only actual players
        const playerBreakdown: PlayerDamageBreakdown[] = Array.from(playerDamageMap.entries())
          .filter(([playerId]) => {
            // Get actor from any fight to check if it's a player
            const actorId = parseInt(playerId, 10);
            const firstFight = cleanFights[0];
            if (!firstFight) return false;

            const actors = selectActorsByIdForContext(state, {
              reportCode,
              fightId: firstFight.id,
            });
            const actor = actors[actorId];

            // Only include if type is 'player' (exclude NPCs and pets)
            return actor?.type?.toLowerCase() === 'player';
          })
          .map(([playerId, data]) => {
            const playerDps = totalDuration > 0 ? (data.totalDamage / totalDuration) * 1000 : 0;
            const damagePercentage = totalDamage > 0 ? (data.totalDamage / totalDamage) * 100 : 0;

            const fightBreakdown: FightDamageBreakdown[] = Array.from(data.fightData.entries()).map(
              ([fightId, fightData]) => ({
                fightId,
                fightName: fightData.fightName,
                damage: fightData.damage,
                dps: fightData.duration > 0 ? (fightData.damage / fightData.duration) * 1000 : 0,
                duration: fightData.duration,
              }),
            );

            return {
              playerId,
              playerName: data.name,
              totalDamage: data.totalDamage,
              dps: playerDps,
              damagePercentage,
              fightBreakdown,
            };
          })
          .sort((a, b) => b.totalDamage - a.totalDamage);

        // Build ability type breakdown using same categorization as insights panel
        // Define damage type constants (matching insights panel logic)
        const MAGIC_DAMAGE_TYPES = new Set(['64', '4', '16', '512']); // Magic, Fire, Frost, Shock
        const MARTIAL_DAMAGE_TYPES = new Set(['1', '2', '8', '256']); // Physical, Bleed, Poison, Disease
        const AOE_ABILITY_IDS = new Set([
          126633, 75752, 133494, 227072, 172672, 102136, 183123, 186370, 189869, 185407, 191078,
          183006, 32711, 32714, 32948, 20252, 20930, 98438, 32792, 32794, 115572, 117809, 117854,
          117715, 118011, 123082, 118766, 122392, 118314, 143944, 143946, 118720, 23202, 23667,
          29809, 29806, 23232, 23214, 23196, 23208, 24329, 77186, 94424, 181331, 88802, 100218,
          26869, 80172, 26794, 44432, 26879, 26871, 108936, 62912, 62951, 62990, 85127, 40267,
          40252, 61502, 62547, 62529, 38891, 38792, 126474, 38745, 42029, 85432, 41990, 80107,
          126720, 41839, 217348, 217459, 222678, 40161, 38690, 63474, 63471, 40469, 215779,
        ]);
        const STATUS_EFFECT_ABILITY_IDS = new Set([
          18084, 95136, 95134, 178127, 148801, 178118, 21929, 178123,
        ]);
        const RAPID_STRIKES_ID = 18429; // Known ability that should count as direct despite being tick=true

        // Track different damage categories
        const damageCategories = {
          magic: { damage: 0, hitCount: 0 },
          martial: { damage: 0, hitCount: 0 },
          direct: { damage: 0, hitCount: 0 },
          poison: { damage: 0, hitCount: 0 },
          dot: { damage: 0, hitCount: 0 },
          aoe: { damage: 0, hitCount: 0 },
          statusEffects: { damage: 0, hitCount: 0 },
          fire: { damage: 0, hitCount: 0 },
        };

        cleanFights.forEach((fight) => {
          const damageEvents = selectDamageEventsForContext(state, {
            reportCode,
            fightId: fight.id,
          });
          const abilities = selectAbilitiesByIdForContext(state, {
            reportCode,
            fightId: fight.id,
          });

          damageEvents.forEach((event) => {
            // Only count friendly damage to hostile targets
            if (event.sourceIsFriendly !== true || event.targetIsFriendly) {
              return;
            }

            const ability = abilities[event.abilityGameID];
            const amount = event.amount || 0;
            const isDirectDamage = event.tick !== true || event.abilityGameID === RAPID_STRIKES_ID;

            // Direct damage
            if (isDirectDamage) {
              damageCategories.direct.damage += amount;
              damageCategories.direct.hitCount += 1;
            }

            // DOT damage
            if (event.tick === true) {
              damageCategories.dot.damage += amount;
              damageCategories.dot.hitCount += 1;
            }

            // Poison damage (type 8 or 256)
            if (ability?.type === '8' || ability?.type === '256') {
              damageCategories.poison.damage += amount;
              damageCategories.poison.hitCount += 1;
            }

            // Fire damage (type 4)
            if (ability?.type === '4') {
              damageCategories.fire.damage += amount;
              damageCategories.fire.hitCount += 1;
            }

            // AOE damage
            if (AOE_ABILITY_IDS.has(event.abilityGameID)) {
              damageCategories.aoe.damage += amount;
              damageCategories.aoe.hitCount += 1;
            }

            // Status effects
            if (STATUS_EFFECT_ABILITY_IDS.has(event.abilityGameID)) {
              damageCategories.statusEffects.damage += amount;
              damageCategories.statusEffects.hitCount += 1;
            }

            // Magic damage (combines Magic, Fire, Frost, Shock)
            if (ability?.type && MAGIC_DAMAGE_TYPES.has(ability.type)) {
              damageCategories.magic.damage += amount;
              damageCategories.magic.hitCount += 1;
            }

            // Martial damage (combines Physical, Bleed, Poison, Disease)
            if (ability?.type && MARTIAL_DAMAGE_TYPES.has(ability.type)) {
              damageCategories.martial.damage += amount;
              damageCategories.martial.hitCount += 1;
            }
          });
        });

        // Build breakdown array from categories
        const abilityTypeBreakdown: AbilityTypeDamageBreakdown[] = [];

        if (damageCategories.magic.damage > 0) {
          abilityTypeBreakdown.push({
            abilityType: 'Magic',
            totalDamage: damageCategories.magic.damage,
            percentage: (damageCategories.magic.damage / totalDamage) * 100,
            hitCount: damageCategories.magic.hitCount,
          });
        }

        if (damageCategories.martial.damage > 0) {
          abilityTypeBreakdown.push({
            abilityType: 'Martial',
            totalDamage: damageCategories.martial.damage,
            percentage: (damageCategories.martial.damage / totalDamage) * 100,
            hitCount: damageCategories.martial.hitCount,
          });
        }

        if (damageCategories.direct.damage > 0) {
          abilityTypeBreakdown.push({
            abilityType: 'Direct',
            totalDamage: damageCategories.direct.damage,
            percentage: (damageCategories.direct.damage / totalDamage) * 100,
            hitCount: damageCategories.direct.hitCount,
          });
        }

        if (damageCategories.poison.damage > 0) {
          abilityTypeBreakdown.push({
            abilityType: 'Poison',
            totalDamage: damageCategories.poison.damage,
            percentage: (damageCategories.poison.damage / totalDamage) * 100,
            hitCount: damageCategories.poison.hitCount,
          });
        }

        if (damageCategories.dot.damage > 0) {
          abilityTypeBreakdown.push({
            abilityType: 'Damage over Time',
            totalDamage: damageCategories.dot.damage,
            percentage: (damageCategories.dot.damage / totalDamage) * 100,
            hitCount: damageCategories.dot.hitCount,
          });
        }

        if (damageCategories.aoe.damage > 0) {
          abilityTypeBreakdown.push({
            abilityType: 'Area of Effect',
            totalDamage: damageCategories.aoe.damage,
            percentage: (damageCategories.aoe.damage / totalDamage) * 100,
            hitCount: damageCategories.aoe.hitCount,
          });
        }

        if (damageCategories.statusEffects.damage > 0) {
          abilityTypeBreakdown.push({
            abilityType: 'Status Effects',
            totalDamage: damageCategories.statusEffects.damage,
            percentage: (damageCategories.statusEffects.damage / totalDamage) * 100,
            hitCount: damageCategories.statusEffects.hitCount,
          });
        }

        if (damageCategories.fire.damage > 0) {
          abilityTypeBreakdown.push({
            abilityType: 'Fire',
            totalDamage: damageCategories.fire.damage,
            percentage: (damageCategories.fire.damage / totalDamage) * 100,
            hitCount: damageCategories.fire.hitCount,
          });
        }

        // Sort by damage descending
        const _sortedAbilityTypeBreakdown: AbilityTypeDamageBreakdown[] = abilityTypeBreakdown.sort(
          (a, b) => b.totalDamage - a.totalDamage,
        );

        // Get actual report metadata from Redux store
        const reportData = state.report.data;
        const reportInfo: ReportInfo = {
          reportId: reportCode,
          title: reportData?.title || 'Report',
          startTime: cleanFights[0]?.startTime ?? Date.now(),
          endTime: cleanFights[cleanFights.length - 1]?.endTime ?? Date.now(),
          duration: totalDuration,
          zoneName: reportData?.zone?.name || 'Unknown Zone',
          ownerName: 'Report Owner', // Owner info not available in ReportFragment
        };

        const summaryData: ReportSummaryData = {
          reportInfo,
          fights: cleanFights,
          damageBreakdown: {
            totalDamage,
            dps,
            playerBreakdown,
            abilityTypeBreakdown,
            targetBreakdown: [], // Target breakdown can be added later if needed
          },
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
    },
    [dispatch, client, fights, reportCode, store],
  );

  // Auto-fetch data when dependencies are ready
  React.useEffect(() => {
    if (reportCode && client && fights && fights.length > 0) {
      fetchData({ reportCode });
    }
  }, [reportCode, client, fights, fetchData]);

  return {
    reportSummaryData,
    isLoading,
    progress,
    error,
    fetchData,
  };
}
