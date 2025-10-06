/**
 * Signature Script Detection Algorithm
 * 
 * This module implements algorithms to identify which ESO scribing signature script
 * was used by analyzing secondary ability casts, buffs, and debuffs applied after
 * the main scribing skill cast.
 */

import { abilityScribingMapper } from '../data/ability-scribing-mapping';
import { ParsedLogEvent } from '../parsers/eso-log-parser';

import { GrimoireDetection } from './grimoire-detector';

export interface SignatureScriptDetection {
  signatureScriptKey: string;
  signatureScriptName: string;
  signatureScriptDescription: string;
  grimoireKey: string;
  grimoireName: string;
  detectedAbilityIds: number[];
  confidence: number;
  timestamp: number;
  sourcePlayer: number;
  detectionMethod: 'direct-ability' | 'buff-analysis' | 'debuff-analysis' | 'damage-pattern' | 'timing-analysis';
  triggeringEvent: ParsedLogEvent;
  supportingEvents: ParsedLogEvent[];
  grimoireDetection?: GrimoireDetection;
  timingDelay: number; // milliseconds between grimoire cast and signature effect
}

export interface SignatureScriptDetectionResult {
  detections: SignatureScriptDetection[];
  totalAnalyzed: number;
  uniqueSignatureScripts: Set<string>;
  playerSignatureScripts: Map<number, Set<string>>;
  grimoireSignatureScripts: Map<string, Set<string>>;
  confidence: number;
  processingTime: number;
  errors: string[];
  warnings: string[];
}

/**
 * Known signature script patterns and their detection criteria
 */
const SIGNATURE_SCRIPT_PATTERNS = {
  'lingering-torment': {
    name: 'Lingering Torment',
    description: 'Adds damage over time effect',
    detectionCriteria: {
      buffTypes: ['damage-over-time', 'dot'],
      debuffTypes: ['poison', 'disease', 'bleed'],
      timingWindow: 3000, // 3 seconds
      expectedEvents: ['applydebuff', 'damage'],
    },
  },
  'hunters-snare': {
    name: "Hunter's Snare",
    description: 'Adds snare/immobilize effect',
    detectionCriteria: {
      debuffTypes: ['immobilize', 'snare', 'root'],
      timingWindow: 2000,
      expectedEvents: ['applydebuff'],
    },
  },
  'breach-momentum': {
    name: 'Breach Momentum',
    description: 'Reduces enemy armor',
    detectionCriteria: {
      debuffTypes: ['armor-reduction', 'breach'],
      buffTypes: ['major-breach', 'minor-breach'],
      timingWindow: 2500,
      expectedEvents: ['applydebuff'],
    },
  },
  'taunt': {
    name: 'Taunt',
    description: 'Forces enemy to attack caster',
    detectionCriteria: {
      debuffTypes: ['taunt'],
      timingWindow: 1500,
      expectedEvents: ['applydebuff'],
    },
  },
  'generate-ultimate': {
    name: 'Generate Ultimate',
    description: 'Generates Ultimate for the caster',
    detectionCriteria: {
      resourceTypes: ['ultimate'],
      timingWindow: 2000,
      expectedEvents: ['resource'],
    },
  },
  'class-script': {
    name: 'Class Script',
    description: 'Grants class-specific benefits',
    detectionCriteria: {
      buffTypes: ['class-specific'],
      timingWindow: 2500,
      expectedEvents: ['applybuff'],
    },
  },
};

/**
 * Algorithm to detect signature script usage
 */
export class SignatureScriptDetector {
  private scribingMapper: typeof abilityScribingMapper;
  private readonly ANALYSIS_WINDOW_MS = 5000; // 5 seconds after grimoire cast
  private readonly MIN_TIMING_DELAY = 100; // Minimum delay to consider as signature effect

  constructor(mapper = abilityScribingMapper) {
    this.scribingMapper = mapper;
  }

  /**
   * Ensure mapper is ready before detection operations
   */
  private async ensureMapperReady(): Promise<void> {
    if (this.scribingMapper && typeof this.scribingMapper.isReady === 'function') {
      const isReady = await this.scribingMapper.isReady();
      if (!isReady) {
        throw new Error('Scribing mapper not initialized. Detection cannot proceed.');
      }
    }
  }

  /**
   * Detect signature script from a grimoire detection and surrounding events
   */
  public async detectSignatureScriptFromGrimoire(
    grimoireDetection: GrimoireDetection,
    allEvents: ParsedLogEvent[],
  ): Promise<SignatureScriptDetection[]> {
    await this.ensureMapperReady();
    const detections: SignatureScriptDetection[] = [];

    // Get events within analysis window after the grimoire cast
    const relevantEvents = this.getEventsAfterGrimoire(grimoireDetection, allEvents);

    // Try enhanced direct ability ID mapping with grimoire validation
    const directDetection = await this.detectByEnhancedAbilityMapping(grimoireDetection, relevantEvents);
    if (directDetection) {
      detections.push(directDetection);
    }

    // Try direct ability ID mapping (fallback)
    const fallbackDirectDetection = await this.detectByDirectAbilityMapping(grimoireDetection, relevantEvents);
    if (fallbackDirectDetection && !detections.some(d => d.signatureScriptKey === fallbackDirectDetection.signatureScriptKey)) {
      detections.push(fallbackDirectDetection);
    }

    // Analyze buff/debuff patterns
    const patternDetections = this.detectByEventPatterns(grimoireDetection, relevantEvents);
    detections.push(...patternDetections);

    // Analyze timing patterns for known signature effects
    const timingDetections = this.detectByTimingAnalysis(grimoireDetection, relevantEvents);
    detections.push(...timingDetections);

    return detections;
  }

  /**
   * Detect signature scripts from multiple grimoire detections
   */
  public async detectSignatureScriptsFromGrimoires(
    grimoireDetections: GrimoireDetection[],
    allEvents: ParsedLogEvent[],
  ): Promise<SignatureScriptDetectionResult> {
    const startTime = Date.now();
    const detections: SignatureScriptDetection[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const uniqueSignatureScripts = new Set<string>();
    const playerSignatureScripts = new Map<number, Set<string>>();
    const grimoireSignatureScripts = new Map<string, Set<string>>();

    for (const grimoireDetection of grimoireDetections) {
      try {
        const signatureDetections = await this.detectSignatureScriptFromGrimoire(grimoireDetection, allEvents);
        
        for (const detection of signatureDetections) {
          detections.push(detection);
          uniqueSignatureScripts.add(detection.signatureScriptKey);

          // Track per-player signature scripts
          if (!playerSignatureScripts.has(detection.sourcePlayer)) {
            playerSignatureScripts.set(detection.sourcePlayer, new Set());
          }
          playerSignatureScripts.get(detection.sourcePlayer)?.add(detection.signatureScriptKey);

          // Track per-grimoire signature scripts
          if (!grimoireSignatureScripts.has(detection.grimoireKey)) {
            grimoireSignatureScripts.set(detection.grimoireKey, new Set());
          }
          grimoireSignatureScripts.get(detection.grimoireKey)?.add(detection.signatureScriptKey);
        }
      } catch (error) {
        errors.push(`Error processing grimoire detection at ${grimoireDetection.timestamp}: ${error}`);
      }
    }

    // Calculate overall confidence
    const detectionRate = detections.length / Math.max(grimoireDetections.length, 1);
    let confidence = 0.3; // Base confidence (lower than other detectors as signatures are optional)
    if (detectionRate > 0.2) confidence = 0.5;
    if (detectionRate > 0.4) confidence = 0.7;
    if (detectionRate > 0.6) confidence = 0.8;

    const processingTime = Date.now() - startTime;

    return {
      detections,
      totalAnalyzed: grimoireDetections.length,
      uniqueSignatureScripts,
      playerSignatureScripts,
      grimoireSignatureScripts,
      confidence,
      processingTime,
      errors,
      warnings,
    };
  }

  /**
   * Get events that occur after a grimoire cast within the analysis window
   */
  private getEventsAfterGrimoire(
    grimoireDetection: GrimoireDetection,
    allEvents: ParsedLogEvent[],
  ): ParsedLogEvent[] {
    const startTime = grimoireDetection.timestamp + this.MIN_TIMING_DELAY;
    const endTime = grimoireDetection.timestamp + this.ANALYSIS_WINDOW_MS;

    return allEvents.filter(event => 
      event.sourceID === grimoireDetection.sourcePlayer &&
      event.timestamp >= startTime &&
      event.timestamp <= endTime &&
      event.timestamp !== grimoireDetection.timestamp, // Exclude the original cast
    );
  }

  /**
   * Enhanced signature detection using ability IDs with grimoire context validation
   */
  private async detectByEnhancedAbilityMapping(
    grimoireDetection: GrimoireDetection,
    events: ParsedLogEvent[],
  ): Promise<SignatureScriptDetection | null> {
    // Look for signature abilities specifically for this grimoire
    const signatureAbilityIds = this.getKnownSignatureAbilityIds(grimoireDetection.grimoireKey);
    
    for (const event of events) {
      // Check if this ability ID is a known signature for this grimoire
      if (signatureAbilityIds.has(event.abilityGameID)) {
        const signatureMapping = await this.scribingMapper.getSignatureByAbilityId(event.abilityGameID);
        
        if (signatureMapping && signatureMapping.grimoireKey === grimoireDetection.grimoireKey) {
          // Validate timing - signature effects should occur shortly after grimoire cast
          const timingDelay = event.timestamp - grimoireDetection.timestamp;
          if (timingDelay >= this.MIN_TIMING_DELAY && timingDelay <= this.ANALYSIS_WINDOW_MS) {
            
            // Higher confidence for well-timed signature events
            let confidence = 0.90;
            if (timingDelay < 2000) confidence = 0.95; // Very quick signature effects are most reliable

            return {
              signatureScriptKey: signatureMapping.componentKey,
              signatureScriptName: signatureMapping.name,
              signatureScriptDescription: signatureMapping.description || '',
              grimoireKey: grimoireDetection.grimoireKey,
              grimoireName: grimoireDetection.grimoireName,
              detectedAbilityIds: [event.abilityGameID],
              confidence,
              timestamp: event.timestamp,
              sourcePlayer: event.sourceID,
              detectionMethod: 'direct-ability',
              triggeringEvent: event,
              supportingEvents: [],
              grimoireDetection,
              timingDelay,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Get known signature ability IDs for a specific grimoire
   */
  private getKnownSignatureAbilityIds(grimoireKey: string): Set<number> {
    const abilityIds = new Set<number>();
    
    // This would ideally come from the scribing data, but for now use known mappings
    // Based on the signature scripts data structure
    const knownSignatureIds: Record<string, number[]> = {
      'traveling-knife': [214982, 214986, 214988, 214991, 214993], // Common signature IDs
      'vault': [216833, 217243], // Vault signature IDs
      'smash': [217095, 217188], // Smash signature IDs  
      'shield-throw': [217241, 217471], // Shield Throw signature IDs
      'elemental-explosion': [217461, 217621], // Elemental Explosion signature IDs
      'soul-burst': [217638, 217688], // Soul Burst signature IDs
      // Add more as needed
    };

    const ids = knownSignatureIds[grimoireKey] || [];
    ids.forEach(id => abilityIds.add(id));

    return abilityIds;
  }

  /**
   * Detect signature scripts by direct ability ID mapping
   */
  private async detectByDirectAbilityMapping(
    grimoireDetection: GrimoireDetection,
    events: ParsedLogEvent[],
  ): Promise<SignatureScriptDetection | null> {
    for (const event of events) {
      const signatureMapping = await this.scribingMapper.getSignatureByAbilityId(event.abilityGameID);
      
      if (signatureMapping && signatureMapping.grimoireKey === grimoireDetection.grimoireKey) {
        return {
          signatureScriptKey: signatureMapping.componentKey,
          signatureScriptName: signatureMapping.name,
          signatureScriptDescription: signatureMapping.description || '',
          grimoireKey: grimoireDetection.grimoireKey,
          grimoireName: grimoireDetection.grimoireName,
          detectedAbilityIds: [event.abilityGameID],
          confidence: 0.95, // High confidence for direct mapping
          timestamp: event.timestamp,
          sourcePlayer: event.sourceID,
          detectionMethod: 'direct-ability',
          triggeringEvent: event,
          supportingEvents: [],
          grimoireDetection,
          timingDelay: event.timestamp - grimoireDetection.timestamp,
        };
      }
    }

    return null;
  }

  /**
   * Detect signature scripts by analyzing event patterns
   */
  private detectByEventPatterns(
    grimoireDetection: GrimoireDetection,
    events: ParsedLogEvent[],
  ): SignatureScriptDetection[] {
    const detections: SignatureScriptDetection[] = [];

    for (const [signatureKey, pattern] of Object.entries(SIGNATURE_SCRIPT_PATTERNS)) {
      const detection = this.matchEventPattern(grimoireDetection, events, signatureKey, pattern);
      if (detection) {
        detections.push(detection);
      }
    }

    return detections;
  }

  /**
   * Match events against a specific signature script pattern
   */
  private matchEventPattern(
    grimoireDetection: GrimoireDetection,
    events: ParsedLogEvent[],
    signatureKey: string,
    pattern: any,
  ): SignatureScriptDetection | null {
    const criteria = pattern.detectionCriteria;
    const relevantEvents: ParsedLogEvent[] = [];
    let matchScore = 0;
    let triggeringEvent: ParsedLogEvent | null = null;

    // Look for events that match the expected pattern
    for (const event of events) {
      const timeDiff = event.timestamp - grimoireDetection.timestamp;
      
      if (timeDiff > criteria.timingWindow) continue;

      // Check if event type matches expected events
      if (criteria.expectedEvents?.includes(event.type)) {
        relevantEvents.push(event);
        matchScore += 1;
        
        if (!triggeringEvent || event.timestamp < triggeringEvent.timestamp) {
          triggeringEvent = event;
        }
      }

      // Additional pattern matching could be added here based on:
      // - Event ability IDs
      // - Buff/debuff types
      // - Damage patterns
      // - Resource changes
    }

    // Calculate confidence based on match score and timing
    if (matchScore > 0 && triggeringEvent) {
      const confidence = Math.min(0.8, 0.4 + (matchScore * 0.15));
      
      return {
        signatureScriptKey: signatureKey,
        signatureScriptName: pattern.name,
        signatureScriptDescription: pattern.description,
        grimoireKey: grimoireDetection.grimoireKey,
        grimoireName: grimoireDetection.grimoireName,
        detectedAbilityIds: relevantEvents.map(e => e.abilityGameID),
        confidence,
        timestamp: triggeringEvent.timestamp,
        sourcePlayer: triggeringEvent.sourceID,
        detectionMethod: triggeringEvent.type.includes('buff') ? 'buff-analysis' : 
                       triggeringEvent.type.includes('debuff') ? 'debuff-analysis' : 'damage-pattern',
        triggeringEvent,
        supportingEvents: relevantEvents.slice(1), // Exclude the triggering event
        grimoireDetection,
        timingDelay: triggeringEvent.timestamp - grimoireDetection.timestamp,
      };
    }

    return null;
  }

  /**
   * Detect signature scripts by analyzing timing patterns
   */
  private detectByTimingAnalysis(
    grimoireDetection: GrimoireDetection,
    events: ParsedLogEvent[],
  ): SignatureScriptDetection[] {
    const detections: SignatureScriptDetection[] = [];
    
    // Group events by timing windows
    const timeWindows = this.groupEventsByTiming(grimoireDetection, events);
    
    for (const [windowStart, windowEvents] of timeWindows.entries()) {
      // Look for consistent patterns that might indicate signature scripts
      const patternDetection = this.analyzeTimingPattern(grimoireDetection, windowStart, windowEvents);
      if (patternDetection) {
        detections.push(patternDetection);
      }
    }

    return detections;
  }

  /**
   * Group events by timing windows for pattern analysis
   */
  private groupEventsByTiming(
    grimoireDetection: GrimoireDetection,
    events: ParsedLogEvent[],
  ): Map<number, ParsedLogEvent[]> {
    const windows = new Map<number, ParsedLogEvent[]>();
    const windowSize = 1000; // 1 second windows

    for (const event of events) {
      const relativeTime = event.timestamp - grimoireDetection.timestamp;
      const windowStart = Math.floor(relativeTime / windowSize) * windowSize;
      
      if (!windows.has(windowStart)) {
        windows.set(windowStart, []);
      }
      windows.get(windowStart)?.push(event);
    }

    return windows;
  }

  /**
   * Analyze timing patterns within a window
   */
  private analyzeTimingPattern(
    grimoireDetection: GrimoireDetection,
    windowStart: number,
    events: ParsedLogEvent[],
  ): SignatureScriptDetection | null {
    // This is a simplified pattern analysis
    // In a real implementation, this would use more sophisticated pattern recognition
    
    if (events.length >= 2) {
      // Look for buff/debuff applications that might be signature effects
      const buffDebuffEvents = events.filter(e => 
        e.type === 'applybuff' || e.type === 'applydebuff',
      );

      if (buffDebuffEvents.length > 0) {
        const firstEvent = buffDebuffEvents[0];
        
        return {
          signatureScriptKey: 'unknown-signature',
          signatureScriptName: 'Unknown Signature Effect',
          signatureScriptDescription: 'Detected signature script effect based on timing analysis',
          grimoireKey: grimoireDetection.grimoireKey,
          grimoireName: grimoireDetection.grimoireName,
          detectedAbilityIds: buffDebuffEvents.map(e => e.abilityGameID),
          confidence: 0.4, // Lower confidence for timing-based detection
          timestamp: firstEvent.timestamp,
          sourcePlayer: firstEvent.sourceID,
          detectionMethod: 'timing-analysis',
          triggeringEvent: firstEvent,
          supportingEvents: buffDebuffEvents.slice(1),
          grimoireDetection,
          timingDelay: firstEvent.timestamp - grimoireDetection.timestamp,
        };
      }
    }

    return null;
  }

  /**
   * Get signature script detection statistics
   */
  public getSignatureScriptStatistics(result: SignatureScriptDetectionResult): {
    totalDetections: number;
    uniqueSignatureScripts: number;
    detectionsByMethod: Map<string, number>;
    averageTimingDelay: number;
    averageConfidence: number;
    signatureScriptsByGrimoire: Map<string, Set<string>>;
  } {
    const detectionsByMethod = new Map<string, number>();
    const signatureScriptsByGrimoire = new Map<string, Set<string>>();
    let totalTimingDelay = 0;
    let totalConfidence = 0;

    for (const detection of result.detections) {
      // Count by detection method
      const methodCount = detectionsByMethod.get(detection.detectionMethod) || 0;
      detectionsByMethod.set(detection.detectionMethod, methodCount + 1);

      // Track by grimoire
      if (!signatureScriptsByGrimoire.has(detection.grimoireKey)) {
        signatureScriptsByGrimoire.set(detection.grimoireKey, new Set());
      }
      signatureScriptsByGrimoire.get(detection.grimoireKey)?.add(detection.signatureScriptKey);

      totalTimingDelay += detection.timingDelay;
      totalConfidence += detection.confidence;
    }

    return {
      totalDetections: result.detections.length,
      uniqueSignatureScripts: result.uniqueSignatureScripts.size,
      detectionsByMethod,
      averageTimingDelay: result.detections.length > 0 ? totalTimingDelay / result.detections.length : 0,
      averageConfidence: result.detections.length > 0 ? totalConfidence / result.detections.length : 0,
      signatureScriptsByGrimoire,
    };
  }
}

/**
 * Singleton instance for global access
 */
export const signatureScriptDetector = new SignatureScriptDetector();

export default SignatureScriptDetector;