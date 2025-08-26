import React from 'react';
import { useSelector } from 'react-redux';

import {
  selectCastEvents,
  selectResourceEvents,
  selectEventPlayers,
} from '../../../store/events_data/actions';
import { selectMasterData } from '../../../store/master_data/masterDataSelectors';
import { ResourceChangeEvent, UnifiedCastEvent } from '../../../types/combatlogEvents';

import { RotationAnalysisPanelView } from './RotationAnalysisPanelView';

interface RotationAnalysisPanelProps {
  fight: { startTime?: number; endTime?: number };
}

interface RotationAnalysis {
  playerId: string;
  playerName: string;
  abilities: AbilityUsage[];
  averageAPM: number; // Actions per minute
  resourceEfficiency: ResourceEfficiencyData;
  rotationPattern: string[];
}

interface AbilityUsage {
  abilityId: number | string;
  abilityName: string;
  useCount: number;
  averageCastTime: number;
  resourceCost: number;
  averageTimeBetweenCasts: number;
}

interface ResourceEfficiencyData {
  magicka: {
    averageLevel: number;
    wastePercentage: number;
    lowestPoint: number;
  };
  stamina: {
    averageLevel: number;
    wastePercentage: number;
    lowestPoint: number;
  };
}

/**
 * Analyzes player skill rotations and resource management from cast and resource events
 */
export const RotationAnalysisPanel: React.FC<RotationAnalysisPanelProps> = ({ fight }) => {
  // SIMPLIFIED: Use basic selectors directly instead of complex object-creating selectors
  const castEvents = useSelector(selectCastEvents);
  const resourceEvents = useSelector(selectResourceEvents);
  const playersArray = useSelector(selectEventPlayers);
  const masterData = useSelector(selectMasterData);

  // Convert players array to record for efficient lookup
  const playersById = React.useMemo(() => {
    const result: Record<string, unknown> = {};
    playersArray.forEach((player) => {
      if (player?.id) {
        result[String(player.id)] = player;
      }
    });
    return result;
  }, [playersArray]);

  const rotationAnalyses = React.useMemo(() => {
    if (!fight?.startTime || !fight?.endTime || !castEvents || !resourceEvents) return [];

    const fightDuration = (fight.endTime - fight.startTime) / 1000; // Duration in seconds
    const analysisMap: Record<string, RotationAnalysis> = {};

    // Process cast events for each player
    castEvents.forEach((castEvent: UnifiedCastEvent) => {
      const playerId = String(castEvent.sourceID || '');
      const playerInfo = playersById[playerId] as
        | { displayName?: string; name?: string }
        | undefined;
      const playerName = playerInfo?.displayName || playerInfo?.name || `Player ${playerId}`;

      if (!analysisMap[playerId]) {
        analysisMap[playerId] = {
          playerId,
          playerName,
          abilities: [],
          averageAPM: 0,
          resourceEfficiency: {
            magicka: { averageLevel: 0, wastePercentage: 0, lowestPoint: 100 },
            stamina: { averageLevel: 0, wastePercentage: 0, lowestPoint: 100 },
          },
          rotationPattern: [],
        };
      }

      // Track ability usage
      const abilityId = castEvent.abilityGameID || 'unknown';
      const ability = masterData.abilitiesById[abilityId];
      const abilityName = ability?.name || `Ability ${abilityId}`;

      let abilityUsage = analysisMap[playerId].abilities.find((a) => a.abilityId === abilityId);
      if (!abilityUsage) {
        abilityUsage = {
          abilityId,
          abilityName,
          useCount: 0,
          averageCastTime: 0,
          resourceCost: 0,
          averageTimeBetweenCasts: 0,
        };
        analysisMap[playerId].abilities.push(abilityUsage);
      }

      abilityUsage.useCount++;

      // Add to rotation pattern (keep only the last 10 abilities for pattern recognition)
      analysisMap[playerId].rotationPattern.push(abilityName);
      if (analysisMap[playerId].rotationPattern.length > 10) {
        analysisMap[playerId].rotationPattern.shift();
      }
    });

    // Calculate APM (Actions Per Minute) for each player
    Object.values(analysisMap).forEach((analysis) => {
      const totalCasts = analysis.abilities.reduce((sum, ability) => sum + ability.useCount, 0);
      analysis.averageAPM = (totalCasts / fightDuration) * 60;
    });

    // Process resource events for efficiency analysis
    const resourceDataByPlayer: Record<
      string,
      {
        magickaLevels: number[];
        staminaLevels: number[];
        magickaWaste: number;
        staminaWaste: number;
      }
    > = {};

    resourceEvents.forEach((event: ResourceChangeEvent) => {
      const resourceEvent = event as ResourceChangeEvent;
      if (resourceEvent.type === 'resourcechange') {
        const playerId = String(resourceEvent.targetID || '');

        if (!resourceDataByPlayer[playerId]) {
          resourceDataByPlayer[playerId] = {
            magickaLevels: [],
            staminaLevels: [],
            magickaWaste: 0,
            staminaWaste: 0,
          };
        }

        // Track resource levels over time
        if (resourceEvent.targetResources) {
          if (resourceEvent.targetResources.magicka !== undefined) {
            resourceDataByPlayer[playerId].magickaLevels.push(
              resourceEvent.targetResources.magicka
            );
          }
          if (resourceEvent.targetResources.stamina !== undefined) {
            resourceDataByPlayer[playerId].staminaLevels.push(
              resourceEvent.targetResources.stamina
            );
          }
        }

        // Track resource waste (when at max and trying to gain more)
        if (resourceEvent.resourceChangeType && resourceEvent.resourceChange > 0) {
          const currentResource =
            resourceEvent.targetResources?.magicka || resourceEvent.targetResources?.stamina || 0;
          const maxResource = 100; // Assuming percentage-based resources

          if (currentResource >= maxResource) {
            if (resourceEvent.resourceChangeType === 0) {
              // Magicka
              resourceDataByPlayer[playerId].magickaWaste += resourceEvent.resourceChange;
            } else if (resourceEvent.resourceChangeType === 6) {
              // Stamina
              resourceDataByPlayer[playerId].staminaWaste += resourceEvent.resourceChange;
            }
          }
        }
      }
    });

    // Calculate resource efficiency metrics
    Object.keys(resourceDataByPlayer).forEach((playerId) => {
      if (analysisMap[playerId]) {
        const data = resourceDataByPlayer[playerId];

        if (data.magickaLevels.length > 0) {
          analysisMap[playerId].resourceEfficiency.magicka.averageLevel =
            data.magickaLevels.reduce((sum, level) => sum + level, 0) / data.magickaLevels.length;
          analysisMap[playerId].resourceEfficiency.magicka.lowestPoint = Math.min(
            ...data.magickaLevels
          );
          analysisMap[playerId].resourceEfficiency.magicka.wastePercentage =
            (data.magickaWaste /
              (data.magickaWaste + data.magickaLevels.reduce((sum, l) => sum + l, 0))) *
            100;
        }

        if (data.staminaLevels.length > 0) {
          analysisMap[playerId].resourceEfficiency.stamina.averageLevel =
            data.staminaLevels.reduce((sum, level) => sum + level, 0) / data.staminaLevels.length;
          analysisMap[playerId].resourceEfficiency.stamina.lowestPoint = Math.min(
            ...data.staminaLevels
          );
          analysisMap[playerId].resourceEfficiency.stamina.wastePercentage =
            (data.staminaWaste /
              (data.staminaWaste + data.staminaLevels.reduce((sum, l) => sum + l, 0))) *
            100;
        }
      }
    });

    return Object.values(analysisMap);
  }, [fight, castEvents, resourceEvents, masterData, playersById]);

  return <RotationAnalysisPanelView rotationAnalyses={rotationAnalyses} fight={fight} />;
};

export const MemoizedRotationAnalysisPanel = React.memo(RotationAnalysisPanel);
