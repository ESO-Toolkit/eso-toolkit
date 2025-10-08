/**
 * Focus Script Detection Algorithm
 *
 * This module implements algorithms to identify which ESO scribing focus script
 * was used by analyzing the transformed skill names and ability ID combinations.
 */

import { abilityScribingMapper, AbilityScribingMapping } from '../data/ability-scribing-mapping';
import { ParsedLogEvent } from '../parsers/eso-log-parser';

import { GrimoireDetection } from './grimoire-detector';

export interface FocusScriptDetection {
  focusScriptKey: string;
  focusScriptName: string;
  focusScriptCategory: string;
  grimoireKey: string;
  grimoireName: string;
  transformedSkillName: string;
  detectedAbilityId: number;
  confidence: number;
  timestamp: number;
  sourcePlayer: number;
  detectionMethod: 'name-transformation' | 'ability-mapping' | 'pattern-analysis';
  event: ParsedLogEvent;
  grimoireDetection?: GrimoireDetection;
}

export interface FocusScriptDetectionResult {
  detections: FocusScriptDetection[];
  totalAnalyzed: number;
  uniqueFocusScripts: Set<string>;
  playerFocusScripts: Map<number, Set<string>>;
  grimoireFocusScripts: Map<string, Set<string>>;
  confidence: number;
  processingTime: number;
  errors: string[];
  warnings: string[];
}

/**
 * Focus script pattern interface
 */
interface FocusScriptPattern {
  keywords: string[];
  damageType?: string;
  effect?: string;
}

/**
 * Focus script categories and their detection patterns
 */
const FOCUS_SCRIPT_PATTERNS: Record<string, FocusScriptPattern> = {
  'physical-damage': {
    keywords: ['sundering', 'physical', 'cutting', 'piercing'],
    damageType: 'physical',
  },
  'poison-damage': {
    keywords: ['venomous', 'poison', 'toxic'],
    damageType: 'poison',
  },
  'disease-damage': {
    keywords: ['diseased', 'disease', 'plague'],
    damageType: 'disease',
  },
  'bleed-damage': {
    keywords: ['bloody', 'bleed', 'hemorrhaging'],
    damageType: 'bleed',
  },
  'magic-damage': {
    keywords: ['magical', 'arcane', 'mystical'],
    damageType: 'magic',
  },
  'shock-damage': {
    keywords: ['shocking', 'electric', 'lightning'],
    damageType: 'shock',
  },
  'frost-damage': {
    keywords: ['chilling', 'frost', 'frozen', 'ice'],
    damageType: 'frost',
  },
  'flame-damage': {
    keywords: ['burning', 'flame', 'fire', 'igniting'],
    damageType: 'flame',
  },
  trauma: {
    keywords: ['traumatic', 'trauma'],
    effect: 'debuff',
  },
  'multi-target': {
    keywords: ['multi', 'area', 'explosive', 'spreading'],
    effect: 'aoe',
  },
  taunt: {
    keywords: ['taunting', 'provoking'],
    effect: 'taunt',
  },
  knockback: {
    keywords: ['knocking', 'pushing', 'repelling'],
    effect: 'displacement',
  },
  immobilize: {
    keywords: ['binding', 'rooting', 'immobilizing'],
    effect: 'control',
  },
  healing: {
    keywords: ['healing', 'mending', 'restorative'],
    effect: 'heal',
  },
  'restore-resources': {
    keywords: ['restorative', 'energizing', 'restoring'],
    effect: 'resource',
  },
  dispel: {
    keywords: ['dispelling', 'cleansing', 'purifying'],
    effect: 'utility',
  },
};

/**
 * Algorithm to detect focus script usage from grimoire detections
 */
export class FocusScriptDetector {
  private scribingMapper: typeof abilityScribingMapper;

  constructor(mapper = abilityScribingMapper) {
    this.scribingMapper = mapper;
  }

  /**
   * Detect focus script from a grimoire detection
   */
  public async detectFocusScriptFromGrimoire(
    grimoireDetection: GrimoireDetection,
  ): Promise<FocusScriptDetection | null> {
    // Validate input
    if (!grimoireDetection) {
      return null;
    }

    // If the grimoire detection already includes focus script info
    if (grimoireDetection.focusScriptType && grimoireDetection.transformedSkillName) {
      return this.createDetectionFromTransformation(grimoireDetection);
    }

    // Try to detect focus script from the ability ID
    const mapping = await this.scribingMapper.getTransformationByAbilityId(
      grimoireDetection.detectedAbilityId,
    );
    if (mapping) {
      return this.createDetectionFromMapping(grimoireDetection, mapping);
    }

    // Try pattern analysis on skill name if available
    if (grimoireDetection.transformedSkillName) {
      return this.detectFocusScriptByName(grimoireDetection);
    }

    return null;
  }

  /**
   * Detect focus scripts from multiple grimoire detections
   */
  public async detectFocusScriptsFromGrimoires(
    grimoireDetections: GrimoireDetection[],
  ): Promise<FocusScriptDetectionResult> {
    const startTime = Date.now();
    const detections: FocusScriptDetection[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const uniqueFocusScripts = new Set<string>();
    const playerFocusScripts = new Map<number, Set<string>>();
    const grimoireFocusScripts = new Map<string, Set<string>>();

    for (const grimoireDetection of grimoireDetections) {
      try {
        const focusDetection = await this.detectFocusScriptFromGrimoire(grimoireDetection);
        if (focusDetection) {
          detections.push(focusDetection);
          uniqueFocusScripts.add(focusDetection.focusScriptKey);

          // Track per-player focus scripts
          if (!playerFocusScripts.has(focusDetection.sourcePlayer)) {
            playerFocusScripts.set(focusDetection.sourcePlayer, new Set());
          }
          playerFocusScripts.get(focusDetection.sourcePlayer)?.add(focusDetection.focusScriptKey);

          // Track per-grimoire focus scripts
          if (!grimoireFocusScripts.has(focusDetection.grimoireKey)) {
            grimoireFocusScripts.set(focusDetection.grimoireKey, new Set());
          }
          grimoireFocusScripts.get(focusDetection.grimoireKey)?.add(focusDetection.focusScriptKey);
        }
      } catch (error) {
        const timestamp = grimoireDetection?.timestamp || 'unknown';
        errors.push(`Error processing grimoire detection at ${timestamp}: ${error}`);
      }
    }

    // Calculate overall confidence
    const detectionRate = detections.length / Math.max(grimoireDetections.length, 1);
    let confidence = 0.5;
    if (detectionRate > 0.6) confidence = 0.7;
    if (detectionRate > 0.8) confidence = 0.85;
    if (detectionRate > 0.9) confidence = 0.95;

    const processingTime = Date.now() - startTime;

    return {
      detections,
      totalAnalyzed: grimoireDetections.length,
      uniqueFocusScripts,
      playerFocusScripts,
      grimoireFocusScripts,
      confidence,
      processingTime,
      errors,
      warnings,
    };
  }

  /**
   * Create detection from existing transformation info
   */
  private createDetectionFromTransformation(
    grimoireDetection: GrimoireDetection,
  ): FocusScriptDetection {
    const focusScriptInfo = this.getFocusScriptInfo(grimoireDetection.focusScriptType!);

    return {
      focusScriptKey: grimoireDetection.focusScriptType!,
      focusScriptName: focusScriptInfo.name,
      focusScriptCategory: focusScriptInfo.category,
      grimoireKey: grimoireDetection.grimoireKey,
      grimoireName: grimoireDetection.grimoireName,
      transformedSkillName: grimoireDetection.transformedSkillName!,
      detectedAbilityId: grimoireDetection.detectedAbilityId,
      confidence: 0.95, // High confidence from transformation data
      timestamp: grimoireDetection.timestamp,
      sourcePlayer: grimoireDetection.sourcePlayer,
      detectionMethod: 'name-transformation',
      event: grimoireDetection.event,
      grimoireDetection,
    };
  }

  /**
   * Create detection from ability mapping
   */
  private createDetectionFromMapping(
    grimoireDetection: GrimoireDetection,
    mapping: AbilityScribingMapping | null,
  ): FocusScriptDetection | null {
    if (!mapping) {
      return null;
    }

    const focusScriptInfo = this.getFocusScriptInfo(mapping.componentKey);

    return {
      focusScriptKey: mapping.componentKey,
      focusScriptName: focusScriptInfo.name,
      focusScriptCategory: focusScriptInfo.category,
      grimoireKey: grimoireDetection.grimoireKey,
      grimoireName: grimoireDetection.grimoireName,
      transformedSkillName: mapping.name,
      detectedAbilityId: grimoireDetection.detectedAbilityId,
      confidence: 0.9, // High confidence from direct mapping
      timestamp: grimoireDetection.timestamp,
      sourcePlayer: grimoireDetection.sourcePlayer,
      detectionMethod: 'ability-mapping',
      event: grimoireDetection.event,
      grimoireDetection,
    };
  }

  /**
   * Detect focus script by analyzing skill name patterns
   */
  private detectFocusScriptByName(
    grimoireDetection: GrimoireDetection,
  ): FocusScriptDetection | null {
    const skillName = grimoireDetection.transformedSkillName?.toLowerCase() || '';

    for (const [focusKey, pattern] of Object.entries(FOCUS_SCRIPT_PATTERNS)) {
      for (const keyword of pattern.keywords) {
        if (skillName.includes(keyword.toLowerCase())) {
          const focusScriptInfo = this.getFocusScriptInfo(focusKey);

          return {
            focusScriptKey: focusKey,
            focusScriptName: focusScriptInfo.name,
            focusScriptCategory: focusScriptInfo.category,
            grimoireKey: grimoireDetection.grimoireKey,
            grimoireName: grimoireDetection.grimoireName,
            transformedSkillName: grimoireDetection.transformedSkillName!,
            detectedAbilityId: grimoireDetection.detectedAbilityId,
            confidence: 0.75, // Medium confidence from pattern analysis
            timestamp: grimoireDetection.timestamp,
            sourcePlayer: grimoireDetection.sourcePlayer,
            detectionMethod: 'pattern-analysis',
            event: grimoireDetection.event,
            grimoireDetection,
          };
        }
      }
    }

    return null;
  }

  /**
   * Get focus script information by key
   */
  private getFocusScriptInfo(focusKey: string): { name: string; category: string } {
    const pattern = FOCUS_SCRIPT_PATTERNS[focusKey];

    if (pattern) {
      let category = 'damage';
      if (pattern.effect) {
        category =
          pattern.effect === 'heal'
            ? 'healing'
            : pattern.effect === 'resource'
              ? 'utility'
              : pattern.effect === 'debuff'
                ? 'debuff'
                : pattern.effect === 'aoe'
                  ? 'utility'
                  : pattern.effect === 'taunt'
                    ? 'control'
                    : pattern.effect === 'displacement'
                      ? 'control'
                      : pattern.effect === 'control'
                        ? 'control'
                        : pattern.effect === 'utility'
                          ? 'utility'
                          : 'damage';
      }

      return {
        name: this.formatFocusScriptName(focusKey),
        category,
      };
    }

    return {
      name: this.formatFocusScriptName(focusKey),
      category: 'unknown',
    };
  }

  /**
   * Format focus script key to readable name
   */
  private formatFocusScriptName(key: string): string {
    return key
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get focus script usage statistics
   */
  public getFocusScriptStatistics(result: FocusScriptDetectionResult): {
    totalDetections: number;
    uniqueFocusScripts: number;
    focusScriptsByCategory: Map<string, number>;
    focusScriptsByGrimoire: Map<string, Map<string, number>>;
    detectionMethods: Map<string, number>;
    averageConfidence: number;
  } {
    const focusScriptsByCategory = new Map<string, number>();
    const focusScriptsByGrimoire = new Map<string, Map<string, number>>();
    const detectionMethods = new Map<string, number>();
    let totalConfidence = 0;

    for (const detection of result.detections) {
      // Count by category
      const categoryCount = focusScriptsByCategory.get(detection.focusScriptCategory) || 0;
      focusScriptsByCategory.set(detection.focusScriptCategory, categoryCount + 1);

      // Count by grimoire
      if (!focusScriptsByGrimoire.has(detection.grimoireKey)) {
        focusScriptsByGrimoire.set(detection.grimoireKey, new Map());
      }
      const grimoireMap = focusScriptsByGrimoire.get(detection.grimoireKey)!;
      const focusCount = grimoireMap.get(detection.focusScriptKey) || 0;
      grimoireMap.set(detection.focusScriptKey, focusCount + 1);

      // Count by detection method
      const methodCount = detectionMethods.get(detection.detectionMethod) || 0;
      detectionMethods.set(detection.detectionMethod, methodCount + 1);

      totalConfidence += detection.confidence;
    }

    return {
      totalDetections: result.detections.length,
      uniqueFocusScripts: result.uniqueFocusScripts.size,
      focusScriptsByCategory,
      focusScriptsByGrimoire,
      detectionMethods,
      averageConfidence:
        result.detections.length > 0 ? totalConfidence / result.detections.length : 0,
    };
  }

  /**
   * Validate focus script detections
   */
  public validateDetections(detections: FocusScriptDetection[]): {
    valid: FocusScriptDetection[];
    questionable: FocusScriptDetection[];
    invalid: FocusScriptDetection[];
    validationErrors: string[];
  } {
    const valid: FocusScriptDetection[] = [];
    const questionable: FocusScriptDetection[] = [];
    const invalid: FocusScriptDetection[] = [];
    const validationErrors: string[] = [];

    for (const detection of detections) {
      try {
        if (detection.confidence >= 0.9) {
          valid.push(detection);
        } else if (detection.confidence >= 0.7) {
          questionable.push(detection);
        } else if (detection.confidence >= 0.5) {
          // Check if detection method is reliable
          if (
            detection.detectionMethod === 'name-transformation' ||
            detection.detectionMethod === 'ability-mapping'
          ) {
            questionable.push(detection);
          } else {
            invalid.push(detection);
          }
        } else {
          invalid.push(detection);
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
}

/**
 * Singleton instance for global access
 */
export const focusScriptDetector = new FocusScriptDetector();
