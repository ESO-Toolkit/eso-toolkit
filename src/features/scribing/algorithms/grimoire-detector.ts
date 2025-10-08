/**
 * Grimoire Detection Algorithm
 *
 * This module implements algorithms to identify which ESO scribing grimoire
 * was used by analyzing cast events and matching ability IDs.
 */

import { abilityScribingMapper } from '../data/ability-scribing-mapping';
import { ParsedLogEvent } from '../parsers/eso-log-parser';

export interface GrimoireDetection {
  grimoireKey: string;
  grimoireName: string;
  grimoireId: number;
  detectedAbilityId: number;
  detectionType: 'base-cast' | 'transformation-cast';
  focusScriptType?: string;
  transformedSkillName?: string;
  confidence: number;
  timestamp: number;
  sourcePlayer: number;
  event: ParsedLogEvent;
  supportingEvents?: ParsedLogEvent[];
}

export interface GrimoireDetectionResult {
  detections: GrimoireDetection[];
  totalCasts: number;
  uniqueGrimoires: Set<string>;
  playerGrimoires: Map<number, Set<string>>;
  confidence: number;
  processingTime: number;
  errors: string[];
  warnings: string[];
}

/**
 * Algorithm to detect grimoire usage from cast events
 */
export class GrimoireDetector {
  private scribingMapper: typeof abilityScribingMapper;

  constructor(mapper = abilityScribingMapper) {
    this.scribingMapper = mapper;
  }

  /**
   * Detect grimoire usage from a single cast event
   */
  public async detectGrimoireFromEvent(event: ParsedLogEvent): Promise<GrimoireDetection | null> {
    // Only process cast events
    if (event.type !== 'cast') {
      return null;
    }

    // Check if this ability ID is related to scribing
    const scribingComponents = await this.scribingMapper.getScribingComponent(event.abilityGameID);
    if (!scribingComponents || scribingComponents.length === 0) {
      return null;
    }

    // Look for grimoire or transformation mappings
    for (const component of scribingComponents) {
      if (component.type === 'grimoire') {
        return {
          grimoireKey: component.grimoireKey,
          grimoireName: component.name,
          grimoireId: component.abilityId,
          detectedAbilityId: event.abilityGameID,
          detectionType: 'base-cast',
          confidence: 0.95, // High confidence for base grimoire casts
          timestamp: event.timestamp,
          sourcePlayer: event.sourceID,
          event,
        };
      } else if (component.type === 'transformation') {
        return {
          grimoireKey: component.grimoireKey,
          grimoireName: component.name,
          grimoireId: 0, // We don't have the base ID in this case
          detectedAbilityId: event.abilityGameID,
          detectionType: 'transformation-cast',
          focusScriptType: component.componentKey,
          transformedSkillName: component.name,
          confidence: 0.9, // Slightly lower confidence for transformations
          timestamp: event.timestamp,
          sourcePlayer: event.sourceID,
          event,
        };
      }
    }

    return null;
  }

  /**
   * Detect all grimoire usage from a collection of cast events
   */
  public async detectGrimoiresFromEvents(
    events: ParsedLogEvent[],
  ): Promise<GrimoireDetectionResult> {
    const startTime = Date.now();
    const detections: GrimoireDetection[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const uniqueGrimoires = new Set<string>();
    const playerGrimoires = new Map<number, Set<string>>();

    // Filter to cast events only, ensuring events are valid
    const castEvents = events.filter((event) => event && event.type === 'cast');
    let totalCasts = castEvents.length;

    for (const event of castEvents) {
      try {
        const detection = await this.detectGrimoireFromEvent(event);
        if (detection) {
          detections.push(detection);
          uniqueGrimoires.add(detection.grimoireKey);

          // Track per-player grimoires
          if (!playerGrimoires.has(detection.sourcePlayer)) {
            playerGrimoires.set(detection.sourcePlayer, new Set());
          }
          playerGrimoires.get(detection.sourcePlayer)?.add(detection.grimoireKey);
        }
      } catch (error) {
        errors.push(`Error processing event at ${event.timestamp}: ${error}`);
      }
    }

    // Calculate overall confidence based on detection rate
    const detectionRate = detections.length / Math.max(totalCasts, 1);
    let confidence = 0.5; // Base confidence
    if (detectionRate > 0.1) confidence = 0.7; // Good detection rate
    if (detectionRate > 0.2) confidence = 0.8; // High detection rate
    if (detectionRate > 0.3) confidence = 0.9; // Very high detection rate

    const processingTime = Date.now() - startTime;

    return {
      detections,
      totalCasts,
      uniqueGrimoires,
      playerGrimoires,
      confidence,
      processingTime,
      errors,
      warnings,
    };
  }

  /**
   * Detect grimoires from a specific player's events
   */
  public async detectGrimoiresForPlayer(
    events: ParsedLogEvent[],
    playerId: number,
  ): Promise<GrimoireDetectionResult> {
    const playerEvents = events.filter((event) => event.sourceID === playerId);
    return await this.detectGrimoiresFromEvents(playerEvents);
  }

  /**
   * Get grimoire usage timeline for analysis
   */
  public getGrimoireTimeline(detections: GrimoireDetection[]): GrimoireDetection[] {
    return [...detections].sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Group grimoire detections by player
   */
  public groupDetectionsByPlayer(
    detections: GrimoireDetection[],
  ): Map<number, GrimoireDetection[]> {
    const playerDetections = new Map<number, GrimoireDetection[]>();

    for (const detection of detections) {
      if (!playerDetections.has(detection.sourcePlayer)) {
        playerDetections.set(detection.sourcePlayer, []);
      }
      playerDetections.get(detection.sourcePlayer)?.push(detection);
    }

    return playerDetections;
  }

  /**
   * Find potential scribing skill rotations
   */
  public findScribingRotations(
    detections: GrimoireDetection[],
    playerId: number,
    timeWindowMs: number = 10000,
  ): GrimoireDetection[][] {
    const playerDetections = detections
      .filter((d) => d.sourcePlayer === playerId)
      .sort((a, b) => a.timestamp - b.timestamp);

    const rotations: GrimoireDetection[][] = [];
    let currentRotation: GrimoireDetection[] = [];

    for (let i = 0; i < playerDetections.length; i++) {
      const detection = playerDetections[i];

      if (currentRotation.length === 0) {
        currentRotation = [detection];
      } else {
        const lastDetection = currentRotation[currentRotation.length - 1];
        const timeDiff = detection.timestamp - lastDetection.timestamp;

        if (timeDiff <= timeWindowMs) {
          currentRotation.push(detection);
        } else {
          if (currentRotation.length > 1) {
            rotations.push([...currentRotation]);
          }
          currentRotation = [detection];
        }
      }
    }

    // Add the last rotation if it has multiple skills
    if (currentRotation.length > 1) {
      rotations.push(currentRotation);
    }

    return rotations;
  }

  /**
   * Enhance detections with context from surrounding events
   */
  public enhanceDetectionsWithContext(
    detections: GrimoireDetection[],
    allEvents: ParsedLogEvent[],
    contextWindowMs: number = 3000,
  ): GrimoireDetection[] {
    return detections.map((detection) => {
      // Find events within the context window
      const supportingEvents = allEvents.filter((event) => {
        const timeDiff = Math.abs(event.timestamp - detection.timestamp);
        return (
          timeDiff <= contextWindowMs &&
          event.sourceID === detection.sourcePlayer &&
          event.timestamp !== detection.timestamp // Exclude the detection event itself
        );
      });

      return {
        ...detection,
        supportingEvents: supportingEvents.slice(0, 20), // Limit to prevent excessive data
      };
    });
  }

  /**
   * Validate grimoire detection quality
   */
  public validateDetections(detections: GrimoireDetection[]): {
    valid: GrimoireDetection[];
    questionable: GrimoireDetection[];
    invalid: GrimoireDetection[];
    validationErrors: string[];
  } {
    const valid: GrimoireDetection[] = [];
    const questionable: GrimoireDetection[] = [];
    const invalid: GrimoireDetection[] = [];
    const validationErrors: string[] = [];

    for (const detection of detections) {
      try {
        // High confidence detections are valid
        if (detection.confidence >= 0.9) {
          valid.push(detection);
          continue;
        }

        // Medium confidence detections are questionable
        if (detection.confidence >= 0.7) {
          questionable.push(detection);
          continue;
        }

        // Low confidence detections need further validation
        if (detection.confidence < 0.7) {
          // Check if we have supporting evidence
          if (detection.supportingEvents && detection.supportingEvents.length > 0) {
            questionable.push(detection);
          } else {
            invalid.push(detection);
          }
          continue;
        }
      } catch (error) {
        validationErrors.push(`Validation error for detection at ${detection.timestamp}: ${error}`);
        invalid.push(detection);
      }
    }

    return {
      valid,
      questionable,
      invalid,
      validationErrors,
    };
  }

  /**
   * Get detection statistics
   */
  public getDetectionStatistics(result: GrimoireDetectionResult): {
    totalDetections: number;
    uniqueGrimoires: number;
    uniquePlayers: number;
    averageConfidence: number;
    detectionsByGrimoire: Map<string, number>;
    detectionsByPlayer: Map<number, number>;
    detectionTypes: Map<string, number>;
  } {
    const detectionsByGrimoire = new Map<string, number>();
    const detectionsByPlayer = new Map<number, number>();
    const detectionTypes = new Map<string, number>();
    let totalConfidence = 0;

    for (const detection of result.detections) {
      // Count by grimoire
      const grimoireCount = detectionsByGrimoire.get(detection.grimoireKey) || 0;
      detectionsByGrimoire.set(detection.grimoireKey, grimoireCount + 1);

      // Count by player
      const playerCount = detectionsByPlayer.get(detection.sourcePlayer) || 0;
      detectionsByPlayer.set(detection.sourcePlayer, playerCount + 1);

      // Count by detection type
      const typeCount = detectionTypes.get(detection.detectionType) || 0;
      detectionTypes.set(detection.detectionType, typeCount + 1);

      totalConfidence += detection.confidence;
    }

    return {
      totalDetections: result.detections.length,
      uniqueGrimoires: result.uniqueGrimoires.size,
      uniquePlayers: result.playerGrimoires.size,
      averageConfidence:
        result.detections.length > 0 ? totalConfidence / result.detections.length : 0,
      detectionsByGrimoire,
      detectionsByPlayer,
      detectionTypes,
    };
  }
}

/**
 * Singleton instance for global access
 */
export const grimoireDetector = new GrimoireDetector();
