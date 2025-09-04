import { OnProgressCallback } from '../Utils';

import { PlayerDetailsWithRole } from '@/store/player_data/playerDataSlice';
import { CombatantInfoEvent } from '@/types/combatlogEvents';
import { isBuffActiveOnTarget, BuffLookupData } from '@/utils/BuffLookupUtils';
import {
  calculateDynamicDamageReductionAtTimestamp,
  calculateStaticResistanceValue,
  DAMAGE_REDUCTION_SOURCES,
  DamageReductionSourceWithActiveState,
  getResistanceFromComputedSource,
  isComputedSourceActive,
  resistanceToDamageReduction,
} from '@/utils/damageReductionUtils';

export interface DamageReductionDataPoint {
  timestamp: number;
  damageReduction: number;
  totalResistance: number;
  staticResistance: number;
  dynamicResistance: number;
  relativeTime: number;
}

export interface PlayerDamageReductionData {
  playerId: number;
  playerName: string;
  dataPoints: Array<DamageReductionDataPoint>;
  damageReductionSources: Array<{
    source: string;
    name: string;
    isActive: boolean;
    resistanceValue: number;
  }>;
  staticResistance: number;
  maxDynamicResistance: number;
  averageDynamicResistance: number;
}

export interface DamageReductionCalculationTask {
  fight: {
    startTime: number;
    endTime: number;
  };
  players: Record<number, PlayerDetailsWithRole>;
  combatantInfoRecord: Record<number, CombatantInfoEvent>;
  friendlyBuffsLookup: BuffLookupData;
  debuffsLookup: BuffLookupData;
}

export function calculateDamageReductionData(
  data: DamageReductionCalculationTask,
  onProgress?: OnProgressCallback,
): Record<number, PlayerDamageReductionData> {
  const { fight, players, combatantInfoRecord, friendlyBuffsLookup, debuffsLookup } = data;

  // BuffLookupData is now a POJO, no deserialization needed
  const deserializedFriendlyBuffsLookup = friendlyBuffsLookup;
  const deserializedDebuffsLookup = debuffsLookup;

  onProgress?.(0);

  const fightStart = fight.startTime;
  const fightEnd = fight.endTime;

  // Build the final result record
  const playerDataMap: Record<number, PlayerDamageReductionData> = {};

  // Process each player
  for (let playerIndex = 0; playerIndex < Object.keys(players).length; playerIndex++) {
    const key = Number(Object.keys(players)[playerIndex]);
    const player = players[key];

    if (!player) {
      continue;
    }

    const combatantInfo = combatantInfoRecord[player.id];

    if (!combatantInfo) {
      continue;
    }

    // Calculate static damage reduction (gear, passives, etc.)
    const staticResistances = calculateStaticResistanceValue(combatantInfo, player);

    // Get all damage reduction sources with their active states
    const allSources: DamageReductionSourceWithActiveState[] = DAMAGE_REDUCTION_SOURCES.map(
      (source) => {
        let isActive = false;

        switch (source.source) {
          case 'aura':
            // Auras are typically always active if present
            if ('ability' in source && combatantInfo.auras) {
              isActive = combatantInfo.auras.some((aura) => aura.ability === source.ability);
            }
            break;
          case 'gear':
            // Check if gear set requirements are met
            if ('set' in source && 'numberOfPieces' in source && combatantInfo.gear) {
              let gearCount = 0;
              for (const gearPiece of combatantInfo.gear) {
                if (gearPiece && gearPiece.setID === source.set) {
                  gearCount++;
                }
              }
              isActive = gearCount >= source.numberOfPieces;
            }
            break;
          case 'computed':
            // For computed sources, use the proper function to check if they would be active
            if ('key' in source) {
              isActive = isComputedSourceActive(combatantInfo, source, player);
            }
            break;
          case 'buff':
          case 'debuff':
            // Dynamic sources - check if they were active for this specific player during any part of the fight
            const lookup =
              source.source === 'buff'
                ? deserializedFriendlyBuffsLookup
                : deserializedDebuffsLookup;
            // Check if this buff/debuff was ever active for this player during the fight
            isActive = isBuffActiveOnTarget(lookup, source.ability, undefined, player.id);
            break;
        }

        return {
          ...source,
          isActive,
        };
      },
    );

    // Calculate damage reduction over time for this player using new methods
    const fightDurationMs = fightEnd - fightStart;
    const fightDurationSeconds = Math.ceil(fightDurationMs / 1000);

    const dataPoints: DamageReductionDataPoint[] = [];
    let maxDamageReduction = 0;

    // Calculate damage reduction at each timestamp
    for (let i = 0; i <= fightDurationSeconds; i++) {
      const timestamp = fightStart + i * 1000;

      // Calculate dynamic resistance at this timestamp
      const dynamicResistance = calculateDynamicDamageReductionAtTimestamp(
        deserializedFriendlyBuffsLookup,
        deserializedDebuffsLookup,
        timestamp,
        player.id,
      );

      const totalResistance = staticResistances + dynamicResistance;
      const damageReductionPercent = resistanceToDamageReduction(totalResistance);

      dataPoints.push({
        timestamp,
        damageReduction: damageReductionPercent,
        totalResistance,
        staticResistance: staticResistances,
        dynamicResistance,
        relativeTime: i,
      });

      // Update statistics
      maxDamageReduction = Math.max(maxDamageReduction, damageReductionPercent);
    }

    // Calculate dynamic resistance statistics
    const dynamicResistanceValues = dataPoints.map((point) => point.dynamicResistance);
    const maxDynamicResistance = Math.max(...dynamicResistanceValues);
    const averageDynamicResistance =
      dynamicResistanceValues.length > 0
        ? dynamicResistanceValues.reduce((sum, val) => sum + val, 0) /
          dynamicResistanceValues.length
        : 0;

    // Transform complex source objects into simple display objects for the dumb component
    // Calculate resistance values here in the smart component
    const displaySources = allSources.map((source) => {
      let resistanceValue = 0;

      if ('resistanceValue' in source) {
        // For sources with direct resistance values (buffs, debuffs, gear, auras)
        resistanceValue = source.resistanceValue;
      } else if (source.source === 'computed' && 'key' in source) {
        // For computed sources, calculate the actual resistance
        resistanceValue = getResistanceFromComputedSource(source, combatantInfo, player);
      }

      return {
        source: source.source,
        name: source.name,
        isActive: source.isActive,
        resistanceValue,
      };
    });

    playerDataMap[player.id] = {
      playerId: player.id,
      playerName: player.name,
      dataPoints,
      damageReductionSources: displaySources,
      staticResistance: staticResistances,
      maxDynamicResistance,
      averageDynamicResistance,
    };

    // Report progress for completed players

    onProgress?.(playerIndex + 1 / Object.keys(players).length);
  }

  onProgress?.(1);

  return playerDataMap;
}
