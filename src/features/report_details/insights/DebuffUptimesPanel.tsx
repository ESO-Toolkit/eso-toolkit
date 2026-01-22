import React from 'react';
import { useSelector } from 'react-redux';

import { FightFragment } from '../../../graphql/gql/graphql';
import { useReportMasterData } from '../../../hooks';
import { useDamageEvents } from '../../../hooks/events/useDamageEvents';
import { useWorkerDebuffLookup } from '../../../hooks/events/useDebuffEvents';
import { useSelectedTargetIds } from '../../../hooks/useSelectedTargetIds';
import { useElementalWeaknessStacksTask } from '../../../hooks/workerTasks/useElementalWeaknessStacksTask';
import { useStaggerStacksTask } from '../../../hooks/workerTasks/useStaggerStacksTask';
import { useTouchOfZenStacksTask } from '../../../hooks/workerTasks/useTouchOfZenStacksTask';
import { useSelectedReportAndFight } from '../../../ReportFightContext';
import {
  selectSelectedTargetId,
  selectSelectedFriendlyPlayerId,
} from '../../../store/ui/uiSelectors';
import { KnownAbilities } from '../../../types/abilities';
import type { BuffUptime } from '../../../utils/buffUptimeCalculator';
import {
  computeBuffUptimes,
  computeBuffUptimesWithGroupAverage,
} from '../../../utils/buffUptimeCalculator';
import { calculateElementalWeaknessStacks } from '../../../workers/calculations/CalculateElementalWeaknessStacks';
import { calculateStaggerStacks } from '../../../workers/calculations/CalculateStaggerStacks';
import { calculateTouchOfZenStacks } from '../../../workers/calculations/CalculateTouchOfZenStacks';

import { DebuffUptimesView } from './DebuffUptimesView';
import { EffectUptimeTimelineModal } from './EffectUptimeTimelineModal';
import { buildUptimeTimelineSeries } from './utils/buildUptimeTimeline';

interface DebuffUptimesPanelProps {
  fight: FightFragment;
  selectedPlayerId?: number | null; // Optional: if provided, show per-player uptimes with group average deltas
}

// Define the specific status effect debuff abilities to track
const IMPORTANT_DEBUFF_ABILITIES = new Set([
  KnownAbilities.BURNING,
  KnownAbilities.CRUSHER,
  KnownAbilities.ENGULFING_FLAMES_BUFF,
  KnownAbilities.MAJOR_BREACH,
  KnownAbilities.MAJOR_COWARDICE,
  KnownAbilities.MAJOR_VULNERABILITY,
  KnownAbilities.MINOR_BREACH,
  KnownAbilities.MINOR_BRITTLE,
  KnownAbilities.MINOR_LIFESTEAL,
  KnownAbilities.MINOR_VULNERABILITY,
  KnownAbilities.OFF_BALANCE,
  KnownAbilities.RUNIC_SUNDER_DEBUFF,
  KnownAbilities.STAGGER,
  KnownAbilities.TOUCH_OF_ZEN,
]);

/**
 * DEBUFF SEMANTICS (hostility=1):
 * Debuffs are effects applied BY friendly players TO hostile enemies.
 * In BuffTimeInterval data structure:
 *   - sourceID = Enemy ID (who has the debuff on them)
 *   - targetID = Player ID (who applied the debuff)
 *
 * This is the OPPOSITE of buffs where source = applier and target = receiver.
 *
 * ESO Logs URL format for debuffs:
 *   source={enemyId}&target={playerId}
 *
 * Filtering:
 *   - Target Selector (dropdown at top) → filters by enemy IDs (sourceIds in computeBuffUptimes)
 *   - Player Selector (dropdown at top) → filters by player IDs (targetIds in computeBuffUptimes)
 */
export const DebuffUptimesPanel: React.FC<DebuffUptimesPanelProps> = ({
  fight,
  selectedPlayerId,
}) => {
  const { reportId, fightId } = useSelectedReportAndFight();
  const { result: debuffsLookup, isLoading: isDebuffEventsLoading } = useWorkerDebuffLookup();
  const { reportMasterData, isMasterDataLoading } = useReportMasterData();
  const selectedTargetId = useSelector(selectSelectedTargetId);
  // Selected friendly player to filter debuffs by (shows only debuffs applied BY this player)
  const selectedFriendlyPlayerId = useSelector(selectSelectedFriendlyPlayerId);

  // Damage events for per-player stagger calculation
  const { damageEvents } = useDamageEvents();

  // Touch of Z'en stacks data
  const { touchOfZenStacksData, allDotAbilityIds, isTouchOfZenStacksLoading } =
    useTouchOfZenStacksTask();

  // Stagger stacks data (group aggregate)
  const { staggerStacksData, isStaggerStacksLoading } = useStaggerStacksTask();

  // Elemental Weakness stacks data
  const { elementalWeaknessStacksData, isElementalWeaknessStacksLoading } =
    useElementalWeaknessStacksTask();

  // Note: allDotAbilityIds contains the unique DOT ability IDs used for Touch of Z'en calculation

  // Get selected enemy IDs from target selector (these are the enemies receiving debuffs)
  const realTargetIds = useSelectedTargetIds();

  // State for toggling between important debuffs only and all debuffs
  const [showAllDebuffs, setShowAllDebuffs] = React.useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = React.useState(false);

  // Extract stable fight properties
  const fightStartTime = fight?.startTime;
  const fightEndTime = fight?.endTime;
  const fightDuration = fightEndTime && fightStartTime ? fightEndTime - fightStartTime : 0;

  // Memoize debuff ability IDs extraction separately (expensive but stable)
  const debuffAbilityIds = React.useMemo(() => {
    if (!debuffsLookup) {
      return new Set<number>();
    }

    const abilityIds = new Set<number>();
    Object.keys(debuffsLookup.buffIntervals).forEach((abilityGameIDStr) => {
      const abilityGameID = parseInt(abilityGameIDStr, 10);
      abilityIds.add(abilityGameID);
    });
    return abilityIds;
  }, [debuffsLookup]);

  // Get all player IDs for group average calculation (must be at top level, not inside useMemo)
  const allPlayerIds = React.useMemo(() => {
    if (!debuffsLookup) return new Set<number>();
    const playerIds = new Set<number>();
    Object.values(debuffsLookup.buffIntervals).forEach((intervals) => {
      Object.keys(intervals).forEach((targetIdStr) => {
        playerIds.add(parseInt(targetIdStr, 10));
      });
    });
    return playerIds;
  }, [debuffsLookup]);

  // Calculate per-player stagger stacks when a player is selected
  const staggerStackUptimes = React.useMemo(() => {
    if (!staggerStacksData?.length) return [];

    // Get all friendly player IDs from reportMasterData
    const allFriendlyPlayers = reportMasterData?.actorsById
      ? Object.values(reportMasterData.actorsById)
          .filter((actor) => actor?.type === 'Player')
          .map((actor) => actor.id)
          .filter((id): id is number => typeof id === 'number')
      : [];

    // If a player is selected and we have damage events, calculate per-player stagger
    if (selectedPlayerId && damageEvents && allFriendlyPlayers.length > 0) {
      // Calculate stagger for each player to get group averages
      const playerStaggerResults = allFriendlyPlayers.map((playerId: number) => {
        const playerDamageEvents = damageEvents.filter((event) => event.sourceID === playerId);

        const playerStagger = calculateStaggerStacks({
          damageEvents: playerDamageEvents,
          fightStartTime,
          fightEndTime,
        });

        return {
          playerId,
          stackResults: playerStagger.stackResults,
        };
      });

      // Calculate group averages by stack level
      const groupAveragesByStack = new Map<number, number>();

      // For each stack level (1, 2, 3)
      [1, 2, 3].forEach((stackLevel) => {
        const playerUptimesForStack = playerStaggerResults
          .map(
            (result: {
              playerId: number;
              stackResults: Array<{
                stackLevel: number;
                uptimePercentage: number;
                abilityGameID: string;
              }>;
            }) => {
              const stackData = result.stackResults.find(
                (s: { stackLevel: number }) => s.stackLevel === stackLevel,
              );
              return stackData?.uptimePercentage || 0;
            },
          )
          .filter((uptime: number) => uptime > 0); // Only count players who contributed

        if (playerUptimesForStack.length > 0) {
          const average =
            playerUptimesForStack.reduce((sum: number, val: number) => sum + val, 0) /
            playerUptimesForStack.length;
          groupAveragesByStack.set(stackLevel, average);
        }
      });

      // Get the selected player's stagger data
      const selectedPlayerResult = playerStaggerResults.find(
        (r: {
          playerId: number;
          stackResults: Array<{
            stackLevel: number;
            uptimePercentage: number;
            abilityGameID: string;
          }>;
        }) => r.playerId === selectedPlayerId,
      );

      if (selectedPlayerResult?.stackResults.length) {
        const defaultStack = selectedPlayerResult.stackResults[0];
        const staggerAbility = reportMasterData?.abilitiesById?.[defaultStack.abilityGameID];

        const allStacksData = selectedPlayerResult.stackResults.map((stack) => ({
          stackLevel: stack.stackLevel,
          totalDuration: stack.totalDuration,
          uptime: stack.uptime,
          uptimePercentage: stack.uptimePercentage,
          applications: stack.applications,
          groupAverageUptimePercentage: groupAveragesByStack.get(stack.stackLevel),
        }));

        return [
          {
            abilityGameID: defaultStack.abilityGameID,
            abilityName: 'Stagger',
            icon: staggerAbility?.icon ? String(staggerAbility.icon) : defaultStack.icon,
            totalDuration: defaultStack.totalDuration,
            uptime: defaultStack.uptime,
            uptimePercentage: defaultStack.uptimePercentage,
            applications: defaultStack.applications,
            isDebuff: defaultStack.isDebuff,
            hostilityType: defaultStack.hostilityType,
            uniqueKey: `stagger_grouped`,
            stackLevel: defaultStack.stackLevel,
            maxStacks: 3,
            allStacksData,
            groupAverageUptimePercentage: groupAveragesByStack.get(defaultStack.stackLevel),
          },
        ];
      }

      return [];
    }

    // No player selected - use aggregate stagger data (no group averages)
    const defaultStack = staggerStacksData[0];
    if (!defaultStack) return [];

    const staggerAbility = reportMasterData?.abilitiesById?.[defaultStack.abilityGameID];

    const allStacksData = staggerStacksData.map((stack) => ({
      stackLevel: stack.stackLevel,
      totalDuration: stack.totalDuration,
      uptime: stack.uptime,
      uptimePercentage: stack.uptimePercentage,
      applications: stack.applications,
    }));

    return [
      {
        abilityGameID: defaultStack.abilityGameID,
        abilityName: 'Stagger',
        icon: staggerAbility?.icon ? String(staggerAbility.icon) : defaultStack.icon,
        totalDuration: defaultStack.totalDuration,
        uptime: defaultStack.uptime,
        uptimePercentage: defaultStack.uptimePercentage,
        applications: defaultStack.applications,
        isDebuff: defaultStack.isDebuff,
        hostilityType: defaultStack.hostilityType,
        uniqueKey: `stagger_grouped`,
        stackLevel: defaultStack.stackLevel,
        maxStacks: 3,
        allStacksData,
      },
    ];
  }, [
    staggerStacksData,
    selectedPlayerId,
    damageEvents,
    fightStartTime,
    fightEndTime,
    reportMasterData?.abilitiesById,
    reportMasterData?.actorsById,
  ]);

  // Calculate per-player Touch of Z'en stacks when a player is selected
  const touchOfZenStackUptimesWithGroupAvg = React.useMemo(() => {
    if (!touchOfZenStacksData?.length) return [];

    // Get all friendly player IDs from reportMasterData
    const allFriendlyPlayers = reportMasterData?.actorsById
      ? Object.values(reportMasterData.actorsById)
          .filter((actor) => actor?.type === 'Player')
          .map((actor) => actor.id)
          .filter((id): id is number => typeof id === 'number')
      : [];

    // If a player is selected and we have damage/debuff data, calculate per-player Touch of Z'en
    if (selectedPlayerId && debuffsLookup && damageEvents && fightStartTime && fightEndTime) {
      // Calculate Touch of Z'en stacks for each player
      const playerTouchOfZenResults = allFriendlyPlayers.map((playerId: number) => {
        const playerDebuffsLookup = {
          ...debuffsLookup,
          buffIntervals: Object.keys(debuffsLookup.buffIntervals).reduce(
            (acc, abilityId) => {
              const intervals = debuffsLookup.buffIntervals[abilityId];
              // Filter intervals to only include those from this player
              const playerIntervals = intervals.filter(
                (interval: { sourceID: number }) => interval.sourceID === playerId,
              );
              if (playerIntervals.length > 0) {
                acc[abilityId] = playerIntervals;
              }
              return acc;
            },
            {} as typeof debuffsLookup.buffIntervals,
          ),
        };

        const playerDamageEvents = damageEvents.filter((event) => event.sourceID === playerId);

        const playerTouchOfZen = calculateTouchOfZenStacks({
          debuffsLookup: playerDebuffsLookup,
          damageEvents: playerDamageEvents,
          fightStartTime,
          fightEndTime,
        });

        return {
          playerId,
          stackResults: playerTouchOfZen.stackResults,
        };
      });

      // Calculate group averages by stack level (1-5)
      const groupAveragesByStack = new Map<number, number>();

      [1, 2, 3, 4, 5].forEach((stackLevel) => {
        const playerUptimesForStack = playerTouchOfZenResults
          .map((result) => {
            const stackData = result.stackResults.find((s) => s.stackLevel === stackLevel);
            return stackData?.uptimePercentage || 0;
          })
          .filter((uptime) => uptime > 0);

        if (playerUptimesForStack.length > 0) {
          const average =
            playerUptimesForStack.reduce((sum, val) => sum + val, 0) / playerUptimesForStack.length;
          groupAveragesByStack.set(stackLevel, average);
        }
      });

      // Get the selected player's Touch of Z'en data
      const selectedPlayerResult = playerTouchOfZenResults.find(
        (r) => r.playerId === selectedPlayerId,
      );

      if (selectedPlayerResult?.stackResults.length) {
        const defaultStack = selectedPlayerResult.stackResults[0];
        const touchOfZenAbility = reportMasterData?.abilitiesById?.[defaultStack.abilityGameID];

        const allStacksData = selectedPlayerResult.stackResults.map((stack) => ({
          stackLevel: stack.stackLevel,
          totalDuration: stack.totalDuration,
          uptime: stack.uptime,
          uptimePercentage: stack.uptimePercentage,
          applications: stack.applications,
          groupAverageUptimePercentage: groupAveragesByStack.get(stack.stackLevel),
        }));

        return [
          {
            abilityGameID: defaultStack.abilityGameID,
            abilityName: "Touch of Z'en",
            icon: touchOfZenAbility?.icon ? String(touchOfZenAbility.icon) : defaultStack.icon,
            totalDuration: defaultStack.totalDuration,
            uptime: defaultStack.uptime,
            uptimePercentage: defaultStack.uptimePercentage,
            applications: defaultStack.applications,
            isDebuff: defaultStack.isDebuff,
            hostilityType: defaultStack.hostilityType,
            uniqueKey: `touch_of_zen_grouped`,
            dotAbilityIds: allDotAbilityIds || [],
            stackLevel: defaultStack.stackLevel,
            maxStacks: 5,
            allStacksData,
            groupAverageUptimePercentage: groupAveragesByStack.get(defaultStack.stackLevel),
          },
        ];
      }

      return [];
    }

    // No player selected - use aggregate Touch of Z'en data (no group averages)
    if (!touchOfZenStacksData?.length) return [];

    const defaultStack = touchOfZenStacksData[0];
    const touchOfZenAbility = reportMasterData?.abilitiesById?.[defaultStack.abilityGameID];

    const allStacksData = touchOfZenStacksData.map((stack) => ({
      stackLevel: stack.stackLevel,
      totalDuration: stack.totalDuration,
      uptime: stack.uptime,
      uptimePercentage: stack.uptimePercentage,
      applications: stack.applications,
    }));

    return [
      {
        abilityGameID: defaultStack.abilityGameID,
        abilityName: "Touch of Z'en",
        icon: touchOfZenAbility?.icon ? String(touchOfZenAbility.icon) : defaultStack.icon,
        totalDuration: defaultStack.totalDuration,
        uptime: defaultStack.uptime,
        uptimePercentage: defaultStack.uptimePercentage,
        applications: defaultStack.applications,
        isDebuff: defaultStack.isDebuff,
        hostilityType: defaultStack.hostilityType,
        uniqueKey: `touch_of_zen_grouped`,
        dotAbilityIds: allDotAbilityIds || [],
        stackLevel: defaultStack.stackLevel,
        maxStacks: 5,
        allStacksData,
      },
    ];
  }, [
    touchOfZenStacksData,
    allDotAbilityIds,
    selectedPlayerId,
    debuffsLookup,
    damageEvents,
    fightStartTime,
    fightEndTime,
    reportMasterData?.abilitiesById,
    reportMasterData?.actorsById,
  ]);

  // Calculate per-player Elemental Weakness stacks when a player is selected
  const elementalWeaknessStackUptimesWithGroupAvg = React.useMemo(() => {
    if (!elementalWeaknessStacksData?.length) return [];

    // Get all friendly player IDs from reportMasterData
    const allFriendlyPlayers = reportMasterData?.actorsById
      ? Object.values(reportMasterData.actorsById)
          .filter((actor) => actor?.type === 'Player')
          .map((actor) => actor.id)
          .filter((id): id is number => typeof id === 'number')
      : [];

    // If a player is selected and we have debuff data, calculate per-player Elemental Weakness
    if (selectedPlayerId && debuffsLookup && fightStartTime && fightEndTime) {
      // Calculate Elemental Weakness stacks for each player
      const playerElementalWeaknessResults = allFriendlyPlayers.map((playerId: number) => {
        const playerDebuffsLookup = {
          ...debuffsLookup,
          buffIntervals: Object.keys(debuffsLookup.buffIntervals).reduce(
            (acc, abilityId) => {
              const intervals = debuffsLookup.buffIntervals[abilityId];
              // Filter intervals to only include those from this player
              const playerIntervals = intervals.filter(
                (interval: { sourceID: number }) => interval.sourceID === playerId,
              );
              if (playerIntervals.length > 0) {
                acc[abilityId] = playerIntervals;
              }
              return acc;
            },
            {} as typeof debuffsLookup.buffIntervals,
          ),
        };

        const playerElementalWeakness = calculateElementalWeaknessStacks({
          debuffsLookup: playerDebuffsLookup,
          fightStartTime,
          fightEndTime,
        });

        return {
          playerId,
          stackResults: playerElementalWeakness.stackResults,
        };
      });

      // Calculate group averages by stack level (1-3)
      const groupAveragesByStack = new Map<number, number>();

      [1, 2, 3].forEach((stackLevel) => {
        const playerUptimesForStack = playerElementalWeaknessResults
          .map((result) => {
            const stackData = result.stackResults.find((s) => s.stackLevel === stackLevel);
            return stackData?.uptimePercentage || 0;
          })
          .filter((uptime) => uptime > 0);

        if (playerUptimesForStack.length > 0) {
          const average =
            playerUptimesForStack.reduce((sum, val) => sum + val, 0) / playerUptimesForStack.length;
          groupAveragesByStack.set(stackLevel, average);
        }
      });

      // Get the selected player's Elemental Weakness data
      const selectedPlayerResult = playerElementalWeaknessResults.find(
        (r) => r.playerId === selectedPlayerId,
      );

      if (selectedPlayerResult?.stackResults.length) {
        const defaultStack = selectedPlayerResult.stackResults[0];
        const flameWeaknessAbility = reportMasterData?.abilitiesById?.[defaultStack.abilityGameID];

        const allStacksData = selectedPlayerResult.stackResults.map((stack) => ({
          stackLevel: stack.stackLevel,
          totalDuration: stack.totalDuration,
          uptime: stack.uptime,
          uptimePercentage: stack.uptimePercentage,
          applications: stack.applications,
          groupAverageUptimePercentage: groupAveragesByStack.get(stack.stackLevel),
        }));

        return [
          {
            abilityGameID: defaultStack.abilityGameID,
            abilityName: 'Elemental Weakness',
            icon: flameWeaknessAbility?.icon
              ? String(flameWeaknessAbility.icon)
              : defaultStack.icon,
            totalDuration: defaultStack.totalDuration,
            uptime: defaultStack.uptime,
            uptimePercentage: defaultStack.uptimePercentage,
            applications: defaultStack.applications,
            isDebuff: defaultStack.isDebuff,
            hostilityType: defaultStack.hostilityType,
            uniqueKey: `elemental_weakness_grouped`,
            stackLevel: defaultStack.stackLevel,
            maxStacks: 3,
            allStacksData,
            groupAverageUptimePercentage: groupAveragesByStack.get(defaultStack.stackLevel),
          },
        ];
      }

      return [];
    }

    // No player selected - use aggregate Elemental Weakness data (no group averages)
    if (!elementalWeaknessStacksData?.length) return [];

    const defaultStack = elementalWeaknessStacksData[0];
    const flameWeaknessAbility = reportMasterData?.abilitiesById?.[defaultStack.abilityGameID];

    const allStacksData = elementalWeaknessStacksData.map((stack) => ({
      stackLevel: stack.stackLevel,
      totalDuration: stack.totalDuration,
      uptime: stack.uptime,
      uptimePercentage: stack.uptimePercentage,
      applications: stack.applications,
    }));

    return [
      {
        abilityGameID: defaultStack.abilityGameID,
        abilityName: 'Elemental Weakness',
        icon: flameWeaknessAbility?.icon ? String(flameWeaknessAbility.icon) : defaultStack.icon,
        totalDuration: defaultStack.totalDuration,
        uptime: defaultStack.uptime,
        uptimePercentage: defaultStack.uptimePercentage,
        applications: defaultStack.applications,
        isDebuff: defaultStack.isDebuff,
        hostilityType: defaultStack.hostilityType,
        uniqueKey: `elemental_weakness_grouped`,
        stackLevel: defaultStack.stackLevel,
        maxStacks: 3,
        allStacksData,
      },
    ];
  }, [
    elementalWeaknessStacksData,
    selectedPlayerId,
    debuffsLookup,
    fightStartTime,
    fightEndTime,
    reportMasterData?.abilitiesById,
    reportMasterData?.actorsById,
  ]);

  // Calculate debuff uptimes for selected targets using the utility function
  const allDebuffUptimes = React.useMemo(() => {
    if (
      !debuffsLookup ||
      !fightDuration ||
      !fightStartTime ||
      !fightEndTime ||
      debuffAbilityIds.size === 0
    ) {
      return [];
    }

    // Calculate regular debuff uptimes with minimal processing
    // Note: For debuffs in BuffInterval data (inverted semantics):
    //   - sourceID = Enemy ID (who has debuff on them)
    //   - targetID = Player ID (who applied the debuff)
    // Therefore:
    //   - To filter by enemy: use sourceIds
    //   - To filter by player: use targetIds

    // If a specific player is selected, calculate their uptimes with group average for comparison
    let regularDebuffUptimes: ReturnType<typeof computeBuffUptimes>;
    if (selectedPlayerId) {
      // Analyze ALL debuffs to identify which have inverted sourceID/targetID semantics
      const debuffSemantics = new Map<
        number,
        { name: string; hasEnemySourceIDs: boolean; hasFriendlySourceIDs: boolean }
      >();
      Object.entries(debuffsLookup.buffIntervals).forEach(([abilityIdStr, intervals]) => {
        const abilityId = parseInt(abilityIdStr, 10);
        const ability = reportMasterData?.abilitiesById[abilityId];
        if (!ability) return;

        const sourceIds = new Set(intervals.map((i) => i.sourceID));
        const hasEnemySourceIDs = Array.from(sourceIds).some((id) => realTargetIds.has(id));
        const hasFriendlySourceIDs = Array.from(sourceIds).some((id) => allPlayerIds.has(id));

        debuffSemantics.set(abilityId, {
          name: ability.name ?? '',
          hasEnemySourceIDs,
          hasFriendlySourceIDs,
        });
      });

      // Separate debuffs by semantic type
      const invertedAbilityIds = new Set<number>();
      const normalAbilityIds = new Set<number>();

      debuffSemantics.forEach((data, abilityId) => {
        if (data.hasFriendlySourceIDs && !data.hasEnemySourceIDs) {
          // INVERTED: sourceID=friendly player who applied, targetID=enemy receiving debuff
          invertedAbilityIds.add(abilityId);
        } else if (data.hasEnemySourceIDs) {
          // NORMAL: sourceID=enemy with debuff, targetID=friendly player who applied
          normalAbilityIds.add(abilityId);
        }
      });

      // Calculate uptimes separately for each semantic type, then merge
      let invertedResults: ReturnType<typeof computeBuffUptimesWithGroupAverage> | null = null;
      let normalResults: ReturnType<typeof computeBuffUptimesWithGroupAverage> | null = null;

      // INVERTED debuffs: sourceID=friendly player, targetID=enemy
      // To filter by enemies, we need to use targetIds instead of sourceIds
      if (invertedAbilityIds.size > 0) {
        invertedResults = computeBuffUptimesWithGroupAverage(
          debuffsLookup,
          {
            abilityIds: invertedAbilityIds,
            sourceIds: allPlayerIds, // sourceID is the friendly player applying the debuff
            targetIds: realTargetIds, // targetID is the enemy receiving the debuff (FILTER BY THIS)
            fightStartTime,
            fightEndTime,
            fightDuration,
            abilitiesById: reportMasterData?.abilitiesById || {},
            isDebuff: true,
            hostilityType: 1 as const,
            filterBySourceId: true, // For single player filtering, check sourceID (the player who applied it)
          },
          selectedPlayerId,
        );
      }

      // NORMAL debuffs: sourceID=enemy, targetID=friendly player
      // To filter by enemies, use sourceIds (standard behavior)
      if (normalAbilityIds.size > 0) {
        normalResults = computeBuffUptimesWithGroupAverage(
          debuffsLookup,
          {
            abilityIds: normalAbilityIds,
            sourceIds: realTargetIds, // sourceID is the enemy with the debuff (FILTER BY THIS)
            targetIds: allPlayerIds, // targetID is the friendly player who applied
            fightStartTime,
            fightEndTime,
            fightDuration,
            abilitiesById: reportMasterData?.abilitiesById || {},
            isDebuff: true,
            hostilityType: 1 as const,
          },
          selectedPlayerId,
        );
      }

      // Merge results from both semantic types
      let playerDebuffsWithComparison: BuffUptime[] = [];
      if (invertedResults) {
        playerDebuffsWithComparison.push(...invertedResults);
      }
      if (normalResults) {
        playerDebuffsWithComparison.push(...normalResults);
      }

      // Only show debuffs the player actually contributed to
      regularDebuffUptimes = playerDebuffsWithComparison;
    } else if (selectedFriendlyPlayerId) {
      // Show debuffs applied only by this player (no comparison)
      regularDebuffUptimes = computeBuffUptimes(debuffsLookup, {
        abilityIds: debuffAbilityIds,
        targetIds: realTargetIds,
        fightStartTime,
        fightEndTime,
        fightDuration,
        abilitiesById: reportMasterData?.abilitiesById || {},
        isDebuff: true,
        hostilityType: 1 as const,
      });
    } else {
      // Show group average (no specific player selected) - matches master branch
      regularDebuffUptimes = computeBuffUptimes(debuffsLookup, {
        abilityIds: debuffAbilityIds,
        targetIds: realTargetIds,
        fightStartTime,
        fightEndTime,
        fightDuration,
        abilitiesById: reportMasterData?.abilitiesById || {},
        isDebuff: true,
        hostilityType: 1 as const,
      });
    }

    const mappedDebuffUptimes = regularDebuffUptimes.map((debuff) => ({
      ...debuff,
      uniqueKey: `debuff_${debuff.abilityGameID}`, // Add unique key for regular debuffs
    }));

    // Use pre-calculated Touch of Z'en and Elemental Weakness with group averages
    // These are calculated in separate useMemo hooks above to include per-player group averages
    const touchOfZenStackUptimes = touchOfZenStackUptimesWithGroupAvg;
    const elementalWeaknessStackUptimes = elementalWeaknessStackUptimesWithGroupAvg;

    // Stagger stacks are calculated as a top-level hook (see above)
    // and referenced here to avoid conditional hook calls

    // Combine regular debuffs with Touch of Z'en stacks, Stagger stacks, Elemental Weakness stacks and sort by uptime percentage (descending)
    // When a player is selected, filter stacked debuffs to only include ones the player contributed to
    const stackedDebuffs = [
      ...touchOfZenStackUptimes,
      ...staggerStackUptimes,
      ...elementalWeaknessStackUptimes,
    ];

    // If player is selected, only include stacked debuffs if they appear in the player's regular debuffs
    // (This means the player contributed to that debuff)
    // For stacked debuffs without per-player calculation (Touch of Z'en, Elemental Weakness),
    // set group average to total uptime since all players contribute to the same resource
    // Stagger already has group averages calculated per-stack when a player is selected
    const filteredStackedDebuffs = selectedPlayerId
      ? stackedDebuffs
          .filter((stackedDebuff) => {
            // Check if this stacked debuff ability ID exists in the player's regular debuffs
            const playerContributed = mappedDebuffUptimes.some(
              (regularDebuff) => regularDebuff.abilityGameID === stackedDebuff.abilityGameID,
            );
            return playerContributed;
          })
          .map((stackedDebuff) => {
            // Stagger already has groupAverageUptimePercentage from per-player calculation
            if (
              'groupAverageUptimePercentage' in stackedDebuff &&
              stackedDebuff.groupAverageUptimePercentage !== undefined
            ) {
              return stackedDebuff;
            }
            // For other combined debuffs, group average is the same as total
            return {
              ...stackedDebuff,
              groupAverageUptimePercentage: stackedDebuff.uptimePercentage,
            };
          })
      : stackedDebuffs;

    const combinedDebuffs = [...mappedDebuffUptimes, ...filteredStackedDebuffs];
    return combinedDebuffs.sort((a, b) => b.uptimePercentage - a.uptimePercentage);
  }, [
    debuffsLookup,
    debuffAbilityIds,
    allPlayerIds,
    fightDuration,
    fightStartTime,
    fightEndTime,
    realTargetIds,
    reportMasterData?.abilitiesById,
    touchOfZenStackUptimesWithGroupAvg,
    staggerStackUptimes,
    elementalWeaknessStackUptimesWithGroupAvg,
    selectedFriendlyPlayerId,
    selectedPlayerId,
  ]);

  // Filter debuff uptimes based on showAllDebuffs state
  const debuffUptimes = React.useMemo(() => {
    if (showAllDebuffs) {
      return allDebuffUptimes;
    }

    // Filter to show only important debuffs
    return allDebuffUptimes.filter((debuff) => {
      // Convert ability ID to number for comparison with enum values
      const abilityIdNum = parseInt(debuff.abilityGameID, 10);

      // Check if this ability ID is in our important list
      return IMPORTANT_DEBUFF_ABILITIES.has(abilityIdNum as KnownAbilities);
    });
  }, [allDebuffUptimes, showAllDebuffs]);

  // Enhanced loading check: ensure ALL required data is available and processing is complete
  const isDataLoading = React.useMemo(() => {
    // Still loading if any of the core data sources are loading
    if (
      isMasterDataLoading ||
      isDebuffEventsLoading ||
      isTouchOfZenStacksLoading ||
      isStaggerStacksLoading ||
      isElementalWeaknessStacksLoading
    ) {
      return true;
    }

    // Still loading if we don't have master data (though it's optional for debuffs)
    // Still loading if debuff lookup task hasn't completed yet
    if (!debuffsLookup) {
      return true;
    }

    // Still loading if fight data is not available
    if (!fightDuration || !fightStartTime || !fightEndTime) {
      return true;
    }

    // Still loading if target data is not available
    if (realTargetIds.size === 0) {
      return true;
    }

    // Data is ready
    return false;
  }, [
    isMasterDataLoading,
    isDebuffEventsLoading,
    isTouchOfZenStacksLoading,
    isStaggerStacksLoading,
    isElementalWeaknessStacksLoading,
    debuffsLookup,
    fightDuration,
    fightStartTime,
    fightEndTime,
    realTargetIds,
  ]);

  const prefetchedSeries = React.useMemo(() => {
    if (!debuffsLookup || !fightStartTime || !fightEndTime) {
      return [];
    }

    return buildUptimeTimelineSeries({
      uptimes: debuffUptimes,
      lookup: debuffsLookup,
      fightStartTime,
      fightEndTime,
      targetFilter: realTargetIds.size > 0 ? realTargetIds : null,
    });
  }, [debuffUptimes, debuffsLookup, fightStartTime, fightEndTime, realTargetIds]);

  const canOpenTimeline = prefetchedSeries.length > 0;

  if (isDataLoading) {
    return (
      <DebuffUptimesView
        selectedTargetId={selectedTargetId}
        debuffUptimes={[]}
        isLoading={true}
        showAllDebuffs={showAllDebuffs}
        onToggleShowAll={setShowAllDebuffs}
        reportId={reportId}
        fightId={fightId}
        canOpenTimeline={false}
      />
    );
  }

  return (
    <React.Fragment>
      <DebuffUptimesView
        selectedTargetId={selectedTargetId}
        debuffUptimes={debuffUptimes}
        isLoading={false}
        showAllDebuffs={showAllDebuffs}
        onToggleShowAll={setShowAllDebuffs}
        reportId={reportId}
        fightId={fightId}
        onOpenTimeline={canOpenTimeline ? () => setIsTimelineOpen(true) : undefined}
        canOpenTimeline={canOpenTimeline}
      />
      <EffectUptimeTimelineModal
        open={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        title="Debuff Uptimes Timeline"
        subtitle="Use the legend to toggle specific debuffs."
        category="debuff"
        uptimes={debuffUptimes}
        lookup={debuffsLookup}
        fightStartTime={fightStartTime}
        fightEndTime={fightEndTime}
        targetFilter={realTargetIds.size > 0 ? realTargetIds : null}
        prefetchedSeries={prefetchedSeries}
      />
    </React.Fragment>
  );
};
