/**
 * Composite Detection Service
 * Orchestrates multiple detection strategies to provide comprehensive scribing detection
 */

import { IAbilityMappingService } from '../../core/services/AbilityMappingService';
import { DETECTION_CONFIDENCE_THRESHOLDS } from '../../shared/constants';
import { ScribingDetectionResult, DetectedCombination } from '../../shared/types';
import { FocusScriptDetectionStrategy } from '../detectors/FocusScriptDetectionStrategy';
import { GrimoireDetectionStrategy } from '../detectors/GrimoireDetectionStrategy';
import { IDetectionStrategy, DetectionContext } from '../detectors/IDetectionStrategy';

export interface IScribingDetectionService {
  /**
   * Perform comprehensive scribing detection for a player
   */
  detectScribingCombinations(context: DetectionContext): Promise<ScribingDetectionResult>;

  /**
   * Register a custom detection strategy
   */
  registerStrategy(strategy: IDetectionStrategy): void;

  /**
   * Get all registered strategies
   */
  getStrategies(): IDetectionStrategy[];
}

export class ScribingDetectionService implements IScribingDetectionService {
  private strategies: IDetectionStrategy[] = [];

  constructor(abilityMappingService: IAbilityMappingService) {
    // Register default strategies
    this.strategies.push(
      new GrimoireDetectionStrategy(abilityMappingService),
      new FocusScriptDetectionStrategy(abilityMappingService),
    );
  }

  registerStrategy(strategy: IDetectionStrategy): void {
    this.strategies.push(strategy);
  }

  getStrategies(): IDetectionStrategy[] {
    return [...this.strategies];
  }

  async detectScribingCombinations(context: DetectionContext): Promise<ScribingDetectionResult> {
    const detectedCombination: DetectedCombination = {
      grimoire: '',
      grimoireKey: '',
      casts: 0,
      focus: '',
      focusKey: '',
      signature: '',
      signatureKey: '',
      affix: '',
      affixKey: '',
      confidence: {
        focus: 0,
        signature: 0,
        affix: 0,
        overall: 0,
      },
      events: {
        casts: context.fightData.castEvents.filter((event) => event.sourceID === context.playerId)
          .length,
        buffs: 0,
        debuffs: 0,
        damage: context.fightData.damageEvents.filter(
          (event) => event.sourceID === context.playerId,
        ).length,
        heals: 0,
      },
    };

    let totalConfidence = 0;
    let strategiesRun = 0;

    // Run all applicable strategies
    for (const strategy of this.strategies) {
      if (!strategy.canHandle(context)) {
        continue;
      }

      try {
        const result = await strategy.detect(context);
        strategiesRun++;

        if (result.success) {
          const strategyName = strategy.getName();

          // Map strategy results to combination properties
          if (strategyName === 'GrimoireDetection') {
            detectedCombination.grimoire = result.detectedComponent || '';
            detectedCombination.grimoireKey = result.componentKey || '';
            detectedCombination.casts = (result.metadata?.casts as number) || 0;
          } else if (strategyName === 'FocusScriptDetection') {
            detectedCombination.focus = result.detectedComponent || '';
            detectedCombination.focusKey = result.componentKey || '';
            if (detectedCombination.confidence) {
              detectedCombination.confidence.focus = result.confidence;
            }
          } else if (strategyName === 'SignatureScriptDetection') {
            detectedCombination.signature = result.detectedComponent || '';
            detectedCombination.signatureKey = result.componentKey || '';
            if (detectedCombination.confidence) {
              detectedCombination.confidence.signature = result.confidence;
            }
          } else if (strategyName === 'AffixScriptDetection') {
            detectedCombination.affix = result.detectedComponent || '';
            detectedCombination.affixKey = result.componentKey || '';
            if (detectedCombination.confidence) {
              detectedCombination.confidence.affix = result.confidence;
            }
          }

          totalConfidence += result.confidence;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Strategy ${strategy.getName()} failed:`, error);
      }
    }

    // Calculate overall confidence
    const overallConfidence = strategiesRun > 0 ? totalConfidence / strategiesRun : 0;
    if (detectedCombination.confidence) {
      detectedCombination.confidence.overall = overallConfidence;
    }

    // Fill in missing components with defaults
    if (!detectedCombination.signature) {
      detectedCombination.signature = 'Unknown Signature';
    }
    if (!detectedCombination.affix) {
      detectedCombination.affix = 'Unknown Affix';
    }

    // Determine if we have a valid detection
    const hasValidDetection =
      detectedCombination.grimoire && overallConfidence >= DETECTION_CONFIDENCE_THRESHOLDS.LOW;

    return {
      playerId: context.playerId,
      playerName: context.playerName,
      detectedCombinations: hasValidDetection ? [detectedCombination] : [],
      confidence: overallConfidence,
      analysisTimestamp: Date.now(),
    };
  }

  /**
   * Detect scribing for multiple players
   */
  async detectForMultiplePlayers(
    playersData: Array<{
      playerId: number;
      playerName: string;
      fightData: DetectionContext['fightData'];
    }>,
  ): Promise<ScribingDetectionResult[]> {
    const results: ScribingDetectionResult[] = [];

    for (const playerData of playersData) {
      const context: DetectionContext = {
        playerId: playerData.playerId,
        playerName: playerData.playerName,
        fightData: playerData.fightData,
      };

      try {
        const result = await this.detectScribingCombinations(context);
        results.push(result);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Detection failed for player ${playerData.playerName}:`, error);

        // Add empty result for failed detection
        results.push({
          playerId: playerData.playerId,
          playerName: playerData.playerName,
          detectedCombinations: [],
          confidence: 0,
          analysisTimestamp: Date.now(),
        });
      }
    }

    return results;
  }

  /**
   * Get detection statistics
   */
  getDetectionStats(): {
    totalStrategies: number;
    strategyNames: string[];
    averageConfidenceThreshold: number;
  } {
    const thresholds = this.strategies.map((s) => s.getConfidenceThreshold());
    const averageThreshold =
      thresholds.length > 0 ? thresholds.reduce((sum, t) => sum + t, 0) / thresholds.length : 0;

    return {
      totalStrategies: this.strategies.length,
      strategyNames: this.strategies.map((s) => s.getName()),
      averageConfidenceThreshold: averageThreshold,
    };
  }
}
