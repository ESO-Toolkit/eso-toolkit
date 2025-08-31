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
  fight: { startTime?: number; endTime?: number; friendlyPlayers?: (number | null)[] | null };
}

interface RotationAnalysis {
  playerId: string;
  playerName: string;
  abilities: AbilityUsage[];
  averageAPM: number; // Actions per minute
  resourceEfficiency: ResourceEfficiencyData;
  rotationPattern: string[];
  skillPriorities: SkillPriority[];
  spammableSkills: SpammableSkill[];
  generalRotation: GeneralRotation;
}

interface AbilityUsage {
  abilityId: number | string;
  abilityName: string;
  useCount: number;
  averageCastTime: number;
  resourceCost: number;
  averageTimeBetweenCasts: number;
  timestamps: number[]; // Track when each cast occurred
}

interface SkillPriority {
  higherPrioritySkill: string;
  lowerPrioritySkill: string;
  interruptionCount: number; // How many times the higher priority skill interrupted the lower priority one
  confidence: number; // 0-1 confidence score based on frequency
}

interface SpammableSkill {
  abilityName: string;
  averageInterval: number; // Average time between casts in seconds
  burstCount: number; // Number of times cast in quick succession (< 3 seconds apart)
  spammableScore: number; // 0-1 score indicating how spammable this skill is
}

interface GeneralRotation {
  commonSequences: RotationSequence[];
  openerSequence: string[]; // Most common opening sequence
  fillerAbilities: string[]; // Abilities used to fill gaps
}

interface RotationSequence {
  sequence: string[];
  frequency: number;
  averageInterval: number; // Average time between abilities in this sequence
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

// Helper function to analyze skill priorities based on interrupt patterns
const analyzeSkillPriorities = (abilities: AbilityUsage[]): SkillPriority[] => {
  const priorities: SkillPriority[] = [];
  
  // Sort abilities by usage frequency for priority analysis
  const sortedAbilities = [...abilities].sort((a, b) => b.useCount - a.useCount);
  
  // Analyze interruption patterns between abilities
  for (let i = 0; i < sortedAbilities.length - 1; i++) {
    for (let j = i + 1; j < sortedAbilities.length; j++) {
      const higherFreqAbility = sortedAbilities[i];
      const lowerFreqAbility = sortedAbilities[j];
      
      // Calculate interruption count based on timestamp patterns
      let interruptionCount = 0;
      const timeThreshold = 5000; // 5 seconds
      
      higherFreqAbility.timestamps.forEach(timestamp => {
        const nearbyLowerCasts = lowerFreqAbility.timestamps.filter(t => 
          Math.abs(t - timestamp) < timeThreshold && t < timestamp
        );
        interruptionCount += nearbyLowerCasts.length;
      });
      
      if (interruptionCount > 0) {
        const confidence = Math.min(interruptionCount / Math.max(lowerFreqAbility.useCount, 1), 1);
        
        priorities.push({
          higherPrioritySkill: higherFreqAbility.abilityName,
          lowerPrioritySkill: lowerFreqAbility.abilityName,
          interruptionCount,
          confidence,
        });
      }
    }
  }
  
  // Return top 5 most significant priorities
  return priorities
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
};

// Helper function to identify spammable skills
const identifySpammableSkills = (abilities: AbilityUsage[]): SpammableSkill[] => {
  const spammableSkills: SpammableSkill[] = [];
  
  abilities.forEach(ability => {
    if (ability.timestamps.length < 3) return; // Need at least 3 casts to determine spammability
    
    // Calculate intervals between casts
    const intervals: number[] = [];
    let burstCount = 0;
    
    for (let i = 1; i < ability.timestamps.length; i++) {
      const interval = (ability.timestamps[i] - ability.timestamps[i - 1]) / 1000;
      intervals.push(interval);
      
      // Count bursts (casts within 3 seconds of each other)
      if (interval < 3) {
        burstCount++;
      }
    }
    
    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
    // Calculate spammable score based on:
    // - Low average interval (more spammable if cast frequently)
    // - High burst count (more spammable if cast in quick succession)
    // - High usage count (more likely to be a primary rotation ability)
    const frequencyScore = Math.min(ability.useCount / 20, 1); // Normalize to 0-1
    const intervalScore = Math.max(0, 1 - (averageInterval / 10)); // Lower interval = higher score
    const burstScore = Math.min(burstCount / (ability.useCount - 1), 1); // Normalize burst frequency
    
    const spammableScore = (frequencyScore * 0.4) + (intervalScore * 0.4) + (burstScore * 0.2);
    
    // Only include abilities with a significant spammable score
    if (spammableScore > 0.3) {
      spammableSkills.push({
        abilityName: ability.abilityName,
        averageInterval,
        burstCount,
        spammableScore,
      });
    }
  });
  
  // Return top spammable skills sorted by score
  return spammableSkills
    .sort((a, b) => b.spammableScore - a.spammableScore)
    .slice(0, 3);
};

// Helper function to analyze general rotation patterns
const analyzeGeneralRotation = (
  abilities: AbilityUsage[], 
  allCastEvents: UnifiedCastEvent[], 
  playerId: string,
  friendlyPlayerIds: Set<string>
): GeneralRotation => {
  // Filter cast events for this player and other friendly players, sorted by timestamp
  const playerCastEvents = allCastEvents
    .filter(event => 
      String(event.sourceID) === playerId && 
      event.sourceIsFriendly &&
      friendlyPlayerIds.has(String(event.sourceID))
    )
    .sort((a, b) => a.timestamp - b.timestamp);
  
  if (playerCastEvents.length < 5) {
    return {
      commonSequences: [],
      openerSequence: [],
      fillerAbilities: [],
    };
  }
  
  // Find common sequences of 3-5 abilities
  const sequences: { [key: string]: number } = {};
  const sequenceLength = 3;
  
  for (let i = 0; i <= playerCastEvents.length - sequenceLength; i++) {
    const sequence = playerCastEvents
      .slice(i, i + sequenceLength)
      .map(event => {
        const ability = abilities.find(a => a.abilityId === event.abilityGameID);
        return ability?.abilityName || 'Unknown';
      });
    
    const sequenceKey = sequence.join(' → ');
    sequences[sequenceKey] = (sequences[sequenceKey] || 0) + 1;
  }
  
  // Find opener sequence (first 5 abilities used most commonly at fight start)
  const openerSequence = playerCastEvents
    .slice(0, Math.min(5, playerCastEvents.length))
    .map(event => {
      const ability = abilities.find(a => a.abilityId === event.abilityGameID);
      return ability?.abilityName || 'Unknown';
    });
  
  // Identify filler abilities (low-priority abilities used between main rotation)
  const sortedAbilities = [...abilities].sort((a, b) => b.useCount - a.useCount);
  const mainRotationAbilities = sortedAbilities.slice(0, Math.max(3, Math.floor(sortedAbilities.length * 0.6)));
  const fillerAbilities = sortedAbilities
    .slice(mainRotationAbilities.length)
    .filter(ability => ability.averageTimeBetweenCasts > 0 && ability.averageTimeBetweenCasts < 15) // Short cooldowns
    .map(ability => ability.abilityName)
    .slice(0, 3);
  
  // Convert sequences to common sequences with frequency and timing data
  const commonSequences: RotationSequence[] = Object.entries(sequences)
    .filter(([_, frequency]) => frequency >= 2) // Only sequences that occurred multiple times
    .map(([sequenceKey, frequency]) => {
      const abilityNames = sequenceKey.split(' → ');
      
      // Calculate average interval for this sequence
      let totalInterval = 0;
      let intervalCount = 0;
      
      for (let i = 0; i <= playerCastEvents.length - abilityNames.length; i++) {
        const sequenceMatch = playerCastEvents
          .slice(i, i + abilityNames.length)
          .every((event, idx) => {
            const ability = abilities.find(a => a.abilityId === event.abilityGameID);
            return ability?.abilityName === abilityNames[idx];
          });
        
        if (sequenceMatch) {
          const sequenceEvents = playerCastEvents.slice(i, i + abilityNames.length);
          if (sequenceEvents.length > 1) {
            const interval = (sequenceEvents[sequenceEvents.length - 1].timestamp - sequenceEvents[0].timestamp) / 1000;
            totalInterval += interval;
            intervalCount++;
          }
        }
      }
      
      const averageInterval = intervalCount > 0 ? totalInterval / intervalCount : 0;
      
      return {
        sequence: abilityNames,
        frequency,
        averageInterval,
      };
    })
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);
  
  return {
    commonSequences,
    openerSequence,
    fillerAbilities,
  };
};

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

    // Get friendly player IDs for filtering
    const friendlyPlayerIds = new Set(
      (fight.friendlyPlayers || [])
        .filter((id: number | null): id is number => id !== null && id !== undefined)
        .map((id: number) => String(id))
    );

    // Process cast events for each player, filtering to only include friendly players
    castEvents.forEach((castEvent: UnifiedCastEvent) => {
      // Skip if not from a friendly player
      if (!castEvent.sourceIsFriendly) return;
      
      const playerId = String(castEvent.sourceID || '');
      
      // Additional check: ensure this player is in the friendlyPlayers list
      if (!friendlyPlayerIds.has(playerId)) return;
      
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
          skillPriorities: [],
          spammableSkills: [],
          generalRotation: {
            commonSequences: [],
            openerSequence: [],
            fillerAbilities: [],
          },
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
          timestamps: [],
        };
        analysisMap[playerId].abilities.push(abilityUsage);
      }

      abilityUsage.useCount++;
      abilityUsage.timestamps.push(castEvent.timestamp);

      // Add to rotation pattern (keep only the last 10 abilities for pattern recognition)
      analysisMap[playerId].rotationPattern.push(abilityName);
      if (analysisMap[playerId].rotationPattern.length > 10) {
        analysisMap[playerId].rotationPattern.shift();
      }
    });

    // Post-process each player's data for advanced analysis
    Object.values(analysisMap).forEach((analysis) => {
      // Calculate APM (Actions Per Minute)
      const totalCasts = analysis.abilities.reduce((sum, ability) => sum + ability.useCount, 0);
      analysis.averageAPM = (totalCasts / fightDuration) * 60;

      // Analyze skill priorities
      analysis.skillPriorities = analyzeSkillPriorities(analysis.abilities);

      // Identify spammable skills
      analysis.spammableSkills = identifySpammableSkills(analysis.abilities);

      // Generate general rotation analysis
      analysis.generalRotation = analyzeGeneralRotation(analysis.abilities, castEvents, analysis.playerId, friendlyPlayerIds);

      // Calculate average time between casts for each ability
      analysis.abilities.forEach((ability) => {
        if (ability.timestamps.length > 1) {
          const intervals = [];
          for (let i = 1; i < ability.timestamps.length; i++) {
            intervals.push((ability.timestamps[i] - ability.timestamps[i - 1]) / 1000);
          }
          ability.averageTimeBetweenCasts = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        }
      });
    });

    // Process resource events for efficiency analysis (only for friendly players)
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
        
        // Only process resource events for friendly players
        if (!friendlyPlayerIds.has(playerId)) return;

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
