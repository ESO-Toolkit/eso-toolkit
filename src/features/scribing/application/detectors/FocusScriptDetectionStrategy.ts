/**
 * Focus Script detection strategy
 * Detects focus scripts based on transformation abilities and damage patterns
 */

import { IAbilityMappingService } from '../../core/services/AbilityMappingService';
import { DETECTION_CONFIDENCE_THRESHOLDS } from '../../shared/constants';

import { IDetectionStrategy, DetectionContext, DetectionResult } from './IDetectionStrategy';

export class FocusScriptDetectionStrategy implements IDetectionStrategy {
  constructor(private abilityMappingService: IAbilityMappingService) {}

  getName(): string {
    return 'FocusScriptDetection';
  }

  getConfidenceThreshold(): number {
    return DETECTION_CONFIDENCE_THRESHOLDS.MEDIUM;
  }

  canHandle(context: DetectionContext): boolean {
    return (
      context.fightData.castEvents.length > 0 &&
      context.fightData.damageEvents.length > 0 &&
      this.abilityMappingService.isReady()
    );
  }

  async detect(context: DetectionContext): Promise<DetectionResult> {
    if (!this.abilityMappingService.isReady()) {
      return {
        success: false,
        confidence: 0,
        errors: ['Ability mapping service not initialized'],
      };
    }

    const playerEvents = {
      casts: context.fightData.castEvents.filter((event) => event.sourceID === context.playerId),
      damage: context.fightData.damageEvents.filter((event) => event.sourceID === context.playerId),
    };

    if (playerEvents.casts.length === 0 && playerEvents.damage.length === 0) {
      return {
        success: false,
        confidence: 0,
        errors: ['No relevant events found for player'],
      };
    }

    // Look for transformation abilities (focus script effects)
    const transformationCandidates = new Map<
      string,
      {
        name: string;
        grimoireKey: string;
        casts: number;
        damage: number;
        abilityIds: number[];
      }
    >();

    // Check cast events for transformations
    for (const cast of playerEvents.casts) {
      const transformation = this.abilityMappingService.getTransformationByAbilityId(
        cast.abilityGameID,
      );

      if (transformation) {
        const key = `${transformation.grimoireKey}-${transformation.componentKey}`;
        const existing = transformationCandidates.get(key) || {
          name: transformation.name,
          grimoireKey: transformation.grimoireKey,
          casts: 0,
          damage: 0,
          abilityIds: [],
        };

        existing.casts += 1;
        existing.abilityIds.push(cast.abilityGameID);
        transformationCandidates.set(key, existing);
      }
    }

    // Check damage events for transformations
    for (const damage of playerEvents.damage) {
      const transformation = this.abilityMappingService.getTransformationByAbilityId(
        damage.abilityGameID,
      );

      if (transformation) {
        const key = `${transformation.grimoireKey}-${transformation.componentKey}`;
        const existing = transformationCandidates.get(key) || {
          name: transformation.name,
          grimoireKey: transformation.grimoireKey,
          casts: 0,
          damage: 0,
          abilityIds: [],
        };

        existing.damage += damage.amount || 0;
        if (!existing.abilityIds.includes(damage.abilityGameID)) {
          existing.abilityIds.push(damage.abilityGameID);
        }
        transformationCandidates.set(key, existing);
      }
    }

    if (transformationCandidates.size === 0) {
      return {
        success: false,
        confidence: 0,
        errors: ['No focus script transformations detected'],
      };
    }

    // Find the best transformation candidate
    let bestTransformation = '';
    let bestScore = 0;
    let bestData = null;

    for (const [key, data] of transformationCandidates) {
      // Score based on activity level (casts + damage presence)
      const castScore = Math.min(data.casts / 10, 1.0); // Normalize cast count
      const damageScore = data.damage > 0 ? 0.5 : 0; // Presence of damage
      const abilityDiversityScore = Math.min(data.abilityIds.length / 2, 1.0); // Multiple related abilities

      const score = castScore * 0.5 + damageScore * 0.3 + abilityDiversityScore * 0.2;

      if (score > bestScore) {
        bestScore = score;
        bestTransformation = key;
        bestData = data;
      }
    }

    if (!bestData) {
      return {
        success: false,
        confidence: 0,
        errors: ['No valid focus script transformation found'],
      };
    }

    // Extract focus script name from transformation name
    // Focus scripts typically modify the transformation name
    const focusScriptName = this.extractFocusScriptFromTransformation(bestData.name);

    return {
      success: bestScore >= this.getConfidenceThreshold(),
      confidence: bestScore,
      detectedComponent: focusScriptName,
      componentKey: bestTransformation,
      metadata: {
        transformationName: bestData.name,
        grimoireKey: bestData.grimoireKey,
        casts: bestData.casts,
        damage: bestData.damage,
        abilityIds: bestData.abilityIds,
        candidates: Object.fromEntries(transformationCandidates),
      },
    };
  }

  private extractFocusScriptFromTransformation(transformationName: string): string {
    // Common focus script patterns in transformation names
    const focusPatterns = [
      { pattern: /class focus/i, name: 'Class Focus' },
      { pattern: /weapon focus/i, name: 'Weapon Focus' },
      { pattern: /guild focus/i, name: 'Guild Focus' },
      { pattern: /destructive/i, name: 'Destructive Focus' },
      { pattern: /restorative/i, name: 'Restorative Focus' },
      { pattern: /vampiric/i, name: 'Vampiric Focus' },
    ];

    for (const { pattern, name } of focusPatterns) {
      if (pattern.test(transformationName)) {
        return name;
      }
    }

    // Fallback to extracting the first word or using the transformation name
    const words = transformationName.split(' ');
    if (words.length > 1) {
      return `${words[0]} Focus`;
    }

    return transformationName;
  }
}
