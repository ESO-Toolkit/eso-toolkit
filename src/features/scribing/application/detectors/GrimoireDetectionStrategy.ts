/**
 * Grimoire detection strategy
 * Detects grimoires based on cast patterns and ability IDs
 */

import { IAbilityMappingService } from '../../core/services/AbilityMappingService';
import { DETECTION_CONFIDENCE_THRESHOLDS } from '../../shared/constants';

import { IDetectionStrategy, DetectionContext, DetectionResult } from './IDetectionStrategy';

export class GrimoireDetectionStrategy implements IDetectionStrategy {
  constructor(private abilityMappingService: IAbilityMappingService) {}

  getName(): string {
    return 'GrimoireDetection';
  }

  getConfidenceThreshold(): number {
    return DETECTION_CONFIDENCE_THRESHOLDS.MEDIUM;
  }

  canHandle(context: DetectionContext): boolean {
    return context.fightData.castEvents.length > 0 && this.abilityMappingService.isReady();
  }

  async detect(context: DetectionContext): Promise<DetectionResult> {
    if (!this.abilityMappingService.isReady()) {
      return {
        success: false,
        confidence: 0,
        errors: ['Ability mapping service not initialized'],
      };
    }

    const playerCasts = context.fightData.castEvents.filter(
      (event) => event.sourceID === context.playerId,
    );

    if (playerCasts.length === 0) {
      return {
        success: false,
        confidence: 0,
        errors: ['No cast events found for player'],
      };
    }

    // Group casts by ability ID
    const castCounts = new Map<number, number>();
    for (const cast of playerCasts) {
      const count = castCounts.get(cast.abilityGameID) || 0;
      castCounts.set(cast.abilityGameID, count + 1);
    }

    // Find grimoire abilities
    const grimoireCandidates = new Map<
      string,
      { casts: number; name: string; abilityIds: number[] }
    >();

    for (const [abilityId, casts] of castCounts) {
      const grimoire = this.abilityMappingService.getGrimoireByAbilityId(abilityId);

      if (grimoire) {
        const existing = grimoireCandidates.get(grimoire.grimoireKey) || {
          casts: 0,
          name: grimoire.name,
          abilityIds: [],
        };

        existing.casts += casts;
        existing.abilityIds.push(abilityId);
        grimoireCandidates.set(grimoire.grimoireKey, existing);
      }
    }

    if (grimoireCandidates.size === 0) {
      return {
        success: false,
        confidence: 0,
        errors: ['No grimoire abilities detected'],
      };
    }

    // Find the most frequently cast grimoire
    let bestGrimoire = '';
    let bestCasts = 0;
    let bestName = '';

    for (const [grimoireKey, data] of grimoireCandidates) {
      if (data.casts > bestCasts) {
        bestCasts = data.casts;
        bestGrimoire = grimoireKey;
        bestName = data.name;
      }
    }

    // Calculate confidence based on cast frequency and number of different abilities
    const totalCasts = Array.from(castCounts.values()).reduce((sum, count) => sum + count, 0);
    const grimoireData = grimoireCandidates.get(bestGrimoire)!;

    const frequencyScore = Math.min(bestCasts / totalCasts, 1.0);
    const abilityDiversityScore = Math.min(grimoireData.abilityIds.length / 3, 1.0); // Assume max 3 different abilities per grimoire

    const confidence = frequencyScore * 0.7 + abilityDiversityScore * 0.3;

    return {
      success: confidence >= this.getConfidenceThreshold(),
      confidence,
      detectedComponent: bestName,
      componentKey: bestGrimoire,
      metadata: {
        casts: bestCasts,
        totalCasts,
        abilityIds: grimoireData.abilityIds,
        candidates: Object.fromEntries(grimoireCandidates),
      },
    };
  }
}
