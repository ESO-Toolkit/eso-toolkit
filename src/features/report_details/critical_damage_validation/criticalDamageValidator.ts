import { FightFragment } from '../../../graphql/generated';
import { PlayerDetailsWithRole } from '../../../store/player_data/playerDataSlice';
import { DamageEvent, HitType, CombatantInfoEvent } from '../../../types/combatlogEvents';
import { createBuffLookup, createDebuffLookup, BuffLookupData } from '../../../utils/BuffLookupUtils';
import { calculateCriticalDamageAtTimestamp } from '../../../utils/CritDamageUtils';

export interface DamageComparison {
  timestamp: number;
  abilityId: number;
  abilityName: string;
  actualCriticalDamage: number;
  actualNormalDamage: number;
  expectedCriticalMultiplier: number;
  actualCriticalMultiplier: number;
  calculatedCriticalDamage: number;
  discrepancyPercent: number;
  discrepancyAbsolute: number;
}

export interface PlayerValidationResult {
  playerId: number;
  playerName: string;
  comparisons: DamageComparison[];
  averageDiscrepancy: number;
  standardDeviation: number;
  confidenceInterval: number;
  accuracyPercentage: number;
  totalPairs: number;
  validPairs: number;
}

export interface CriticalDamageValidationResult {
  fightId: number;
  playerResults: PlayerValidationResult[];
  overallAccuracy: number;
  overallDiscrepancy: number;
  totalComparisons: number;
  validComparisons: number;
  confidenceLevel: 'high' | 'medium' | 'low';
}

/**
 * Validates critical damage calculations by comparing actual damage events
 * with our calculated expected critical damage multipliers.
 */
export function validateCriticalDamage(
  eventData: {
    damageEvents?: DamageEvent[];
    buffEvents?: Array<any>;
    debuffEvents?: Array<any>;
    combatantInfoEvents?: Array<any>;
  },
  playerData: { playersById: Record<number, PlayerDetailsWithRole> },
  masterData: { abilitiesById: Record<string | number, { name?: string; icon?: string }> },
  fight: FightFragment
): CriticalDamageValidationResult {
  const damageEvents = eventData.damageEvents as DamageEvent[];
  const buffEvents = eventData.buffEvents || [];
  const debuffEvents = eventData.debuffEvents || [];
  const combatantInfoEvents = eventData.combatantInfoEvents || [];
  
  if (!damageEvents?.length) {
    throw new Error('No damage events found for validation');
  }

  // Create lookups for efficient buff/debuff queries
  const buffLookup = createBuffLookup(buffEvents);
  const debuffLookup = createDebuffLookup(debuffEvents);

  const playerResults: PlayerValidationResult[] = [];

  // Process each player
  Object.values(playerData.playersById).forEach((player) => {
    const combatantInfo = combatantInfoEvents.find(
      (info: CombatantInfoEvent) => info.sourceID === player.id
    );

    if (!combatantInfo) {
      return; // Skip players without combatant info
    }

    const playerDamageEvents = damageEvents.filter(
      (event) => event.sourceID === player.id && event.sourceIsFriendly
    );

    if (playerDamageEvents.length === 0) {
      return; // Skip players with no damage events
    }

    const comparisons = findCriticalDamagePairs(
      playerDamageEvents,
      buffLookup,
      debuffLookup,
      combatantInfo,
      player,
      masterData
    );

    if (comparisons.length === 0) {
      return; // Skip players with no valid comparisons
    }

    // Calculate statistics
    const discrepancies = comparisons.map((c) => c.discrepancyPercent);
    const averageDiscrepancy = discrepancies.reduce((sum, d) => sum + d, 0) / discrepancies.length;
    const variance = discrepancies.reduce((sum, d) => sum + Math.pow(d - averageDiscrepancy, 2), 0) / discrepancies.length;
    const standardDeviation = Math.sqrt(variance);
    const confidenceInterval = 1.96 * standardDeviation / Math.sqrt(discrepancies.length); // 95% CI
    
    const accurateComparisons = comparisons.filter(c => Math.abs(c.discrepancyPercent) <= 5).length;
    const accuracyPercentage = (accurateComparisons / comparisons.length) * 100;

    playerResults.push({
      playerId: player.id,
      playerName: player.name || player.displayName || 'Unknown',
      comparisons,
      averageDiscrepancy,
      standardDeviation,
      confidenceInterval,
      accuracyPercentage,
      totalPairs: comparisons.length,
      validPairs: accurateComparisons,
    });
  });

  // Calculate overall statistics
  const allComparisons = playerResults.flatMap(p => p.comparisons);
  const overallAccurateComparisons = allComparisons.filter(c => Math.abs(c.discrepancyPercent) <= 5).length;
  const overallAccuracy = allComparisons.length > 0 ? (overallAccurateComparisons / allComparisons.length) * 100 : 0;
  
  const overallDiscrepancy = allComparisons.length > 0 ? 
    allComparisons.reduce((sum, c) => sum + Math.abs(c.discrepancyPercent), 0) / allComparisons.length : 0;

  const confidenceLevel: 'high' | 'medium' | 'low' = 
    overallAccuracy >= 95 ? 'high' : 
    overallAccuracy >= 85 ? 'medium' : 'low';

  return {
    fightId: fight.id,
    playerResults,
    overallAccuracy,
    overallDiscrepancy,
    totalComparisons: allComparisons.length,
    validComparisons: overallAccurateComparisons,
    confidenceLevel,
  };
}

/**
 * Finds pairs of normal and critical hits for the same ability to compare damage multipliers.
 */
function findCriticalDamagePairs(
  damageEvents: DamageEvent[],
  buffLookup: BuffLookupData,
  debuffLookup: BuffLookupData,
  combatantInfo: CombatantInfoEvent,
  player: PlayerDetailsWithRole,
  masterData: { abilitiesById: Record<string | number, { name?: string; icon?: string }> }
): DamageComparison[] {
  const comparisons: DamageComparison[] = [];
  
  // Group events by ability and target
  const eventGroups = new Map<string, DamageEvent[]>();
  
  damageEvents.forEach((event) => {
    const key = `${event.abilityGameID}_${event.targetID}`;
    if (!eventGroups.has(key)) {
      eventGroups.set(key, []);
    }
    const group = eventGroups.get(key);
    if (group) {
      group.push(event);
    }
  });

  // Process each group to find critical/normal pairs
  eventGroups.forEach((events, key) => {
    const [abilityId] = key.split('_').map(Number);
    const ability = masterData.abilitiesById[abilityId];
    const abilityName = ability?.name || `Unknown (${abilityId})`;

    // Sort events by timestamp
    const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
    
    // Look for critical hits with nearby normal hits (within reasonable time window)
    for (let i = 0; i < sortedEvents.length; i++) {
      const criticalEvent = sortedEvents[i];
      
      if (criticalEvent.hitType !== HitType.Critical) {
        continue;
      }

      // Look for a normal hit of the same ability within ±30 seconds
      const timeWindow = 30 * 1000; // 30 seconds in milliseconds
      
      for (let j = 0; j < sortedEvents.length; j++) {
        const normalEvent = sortedEvents[j];
        
        if (normalEvent.hitType !== HitType.Normal) {
          continue;
        }

        const timeDiff = Math.abs(criticalEvent.timestamp - normalEvent.timestamp);
        if (timeDiff > timeWindow) {
          continue;
        }

        // We found a pair! Calculate the comparison
        const calculatedCritDamage = calculateCriticalDamageAtTimestamp(
          buffLookup,
          debuffLookup,
          combatantInfo,
          player,
          criticalEvent.timestamp
        );

        const expectedMultiplier = (100 + calculatedCritDamage) / 100;
        const actualMultiplier = criticalEvent.amount / normalEvent.amount;
        
        const expectedCriticalDamage = normalEvent.amount * expectedMultiplier;
        const discrepancyAbsolute = criticalEvent.amount - expectedCriticalDamage;
        const discrepancyPercent = (discrepancyAbsolute / expectedCriticalDamage) * 100;

        comparisons.push({
          timestamp: criticalEvent.timestamp,
          abilityId,
          abilityName,
          actualCriticalDamage: criticalEvent.amount,
          actualNormalDamage: normalEvent.amount,
          expectedCriticalMultiplier: expectedMultiplier,
          actualCriticalMultiplier: actualMultiplier,
          calculatedCriticalDamage: calculatedCritDamage,
          discrepancyPercent,
          discrepancyAbsolute,
        });

        // Only use each normal hit once
        break;
      }
    }
  });

  return comparisons;
}

/**
 * Calculate confidence interval for a set of discrepancy values
 */
export function calculateConfidenceInterval(
  discrepancies: number[],
  confidenceLevel = 0.95
): { lower: number; upper: number; margin: number } {
  if (discrepancies.length === 0) {
    return { lower: 0, upper: 0, margin: 0 };
  }

  const mean = discrepancies.reduce((sum, d) => sum + d, 0) / discrepancies.length;
  const variance = discrepancies.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / discrepancies.length;
  const standardError = Math.sqrt(variance / discrepancies.length);
  
  // For 95% confidence level, z-score is approximately 1.96
  const zScore = confidenceLevel === 0.95 ? 1.96 : 2.576; // 99% = 2.576
  const margin = zScore * standardError;
  
  return {
    lower: mean - margin,
    upper: mean + margin,
    margin,
  };
}

/**
 * Categorize validation result based on accuracy metrics
 */
export function categorizeValidationResult(accuracy: number): {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  color: 'success' | 'info' | 'warning' | 'error';
  description: string;
} {
  if (accuracy >= 95) {
    return {
      level: 'excellent',
      color: 'success',
      description: 'Calculations are highly accurate with minimal discrepancies',
    };
  } else if (accuracy >= 85) {
    return {
      level: 'good',
      color: 'info',
      description: 'Calculations are generally accurate with some minor discrepancies',
    };
  } else if (accuracy >= 70) {
    return {
      level: 'fair',
      color: 'warning',
      description: 'Calculations show moderate discrepancies that may need investigation',
    };
  } else {
    return {
      level: 'poor',
      color: 'error',
      description: 'Significant discrepancies detected - calculations may need major revision',
    };
  }
}
