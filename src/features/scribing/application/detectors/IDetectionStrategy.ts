/**
 * Base detection strategy interface for scribing component detection
 */

import { DetectedCombination } from '../../shared/types';

export interface CastEvent {
  sourceID: number;
  abilityGameID: number;
  timestamp: number;
}

export interface DamageEvent {
  sourceID: number;
  abilityGameID: number;
  amount?: number;
  timestamp: number;
}

export interface FightEventData {
  castEvents: CastEvent[];
  damageEvents: DamageEvent[];
  buffEvents?: unknown[];
  debuffEvents?: unknown[];
  healEvents?: unknown[];
}

export interface DetectionContext {
  playerId: number;
  playerName: string;
  fightData: FightEventData;
  existingCombinations?: DetectedCombination[];
}

export interface DetectionResult {
  success: boolean;
  confidence: number;
  detectedComponent?: string;
  componentKey?: string;
  metadata?: Record<string, unknown>;
  errors?: string[];
}

/**
 * Base strategy interface for scribing component detection
 */
export interface IDetectionStrategy {
  /**
   * Get the name of this detection strategy
   */
  getName(): string;

  /**
   * Detect scribing components from fight data
   */
  detect(context: DetectionContext): Promise<DetectionResult>;

  /**
   * Get the confidence threshold for this strategy
   */
  getConfidenceThreshold(): number;

  /**
   * Validate if this strategy can handle the given context
   */
  canHandle(context: DetectionContext): boolean;
}
