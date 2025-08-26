import React from 'react';
import { useSelector } from 'react-redux';

import {
  selectCastEvents,
  selectResourceEvents,
  selectEventPlayers,
} from '../../../store/events_data/selectors';
import { selectMasterData } from '../../../store/master_data/masterDataSelectors';
import { CastEvent, ResourceChangeEvent } from '../../../types/combatlogEvents.d';

import RotationAnalysisPanelView from './RotationAnalysisPanelView';

type PlayerLike = { id?: number | string; displayName?: string; name?: string };

interface RotationAnalysisPanelProps {
  fight: { startTime?: number; endTime?: number };
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

interface RotationAnalysis {
  playerId: string;
  playerName: string;
  abilities: AbilityUsage[];
  averageAPM: number; // Actions per minute
  resourceEfficiency: ResourceEfficiencyData;
  rotationPattern: string[];
}

// Analyzes player skill rotations and resource management from cast and resource events
const RotationAnalysisPanel: React.FC<RotationAnalysisPanelProps> = ({ fight }) => {
  const castEvents = useSelector(selectCastEvents);
  const resourceEvents = useSelector(selectResourceEvents);
  const playersArray = useSelector(selectEventPlayers) as unknown as PlayerLike[];
  const masterData = useSelector(selectMasterData);

  // Convert players array to record for efficient lookup
  const playersById = React.useMemo(() => {
    const result: Record<string, PlayerLike> = {};
    (playersArray ?? []).forEach((player: PlayerLike) => {
      const pid = player?.id;
      if (pid !== undefined && pid !== null) {
        result[String(pid)] = player;
      }
    });
    return result;
  }, [playersArray]);

  const rotationAnalyses = React.useMemo(() => {
    if (!fight?.startTime || !fight?.endTime) return [];

    const fightDuration = (fight.endTime - fight.startTime) / 1000; // seconds
    const analysisMap: Record<string, RotationAnalysis> = {};

    // Process cast events for each player
    (castEvents ?? []).forEach((event) => {
      const castEvent = event as CastEvent;
      const playerId = String(castEvent.sourceID ?? '');
      if (!playerId) return;
      const playerInfo = playersById[playerId] as PlayerLike | undefined;
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
      const abilityId = castEvent.abilityGameID ?? 'unknown';
      const ability = masterData.abilitiesById?.[abilityId as any];
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

    (resourceEvents ?? []).forEach((event) => {
      const resourceEvent = event as ResourceChangeEvent;
      if (resourceEvent.type === 'resourcechange') {
        const playerId = String(resourceEvent.targetID ?? '');
        if (!playerId) return;

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
          const tr = resourceEvent.targetResources;
          if (tr.magicka !== undefined) {
            resourceDataByPlayer[playerId].magickaLevels.push(tr.magicka);
          }
          if (tr.stamina !== undefined) {
            resourceDataByPlayer[playerId].staminaLevels.push(tr.stamina);
          }
        }

        // Track resource waste (when at max and trying to gain more)
        if (resourceEvent.resourceChangeType !== undefined && resourceEvent.resourceChange > 0) {
          const currentResource =
            resourceEvent.targetResources?.magicka ??
            resourceEvent.targetResources?.stamina ??
            0;
          const maxResource = 100; // percentage-based assumption

          if (currentResource >= maxResource) {
            if (resourceEvent.resourceChangeType === 0) {
              resourceDataByPlayer[playerId].magickaWaste += resourceEvent.resourceChange;
            } else if (resourceEvent.resourceChangeType === 6) {
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
          const magickaTotal = data.magickaWaste + data.magickaLevels.reduce((s, l) => s + l, 0);
          analysisMap[playerId].resourceEfficiency.magicka.wastePercentage =
            magickaTotal > 0 ? (data.magickaWaste / magickaTotal) * 100 : 0;
        }

        if (data.staminaLevels.length > 0) {
          analysisMap[playerId].resourceEfficiency.stamina.averageLevel =
            data.staminaLevels.reduce((sum, level) => sum + level, 0) / data.staminaLevels.length;
          analysisMap[playerId].resourceEfficiency.stamina.lowestPoint = Math.min(
            ...data.staminaLevels
          );
          const staminaTotal = data.staminaWaste + data.staminaLevels.reduce((s, l) => s + l, 0);
          analysisMap[playerId].resourceEfficiency.stamina.wastePercentage =
            staminaTotal > 0 ? (data.staminaWaste / staminaTotal) * 100 : 0;
        }
      }
    });

    return Object.values(analysisMap);
  }, [fight?.startTime, fight?.endTime, castEvents, resourceEvents, masterData, playersById]);

  return <RotationAnalysisPanelView rotationAnalyses={rotationAnalyses} fight={fight} />;
};

export default React.memo(RotationAnalysisPanel);
