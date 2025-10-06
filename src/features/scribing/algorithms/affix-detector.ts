/**
 * Affix Script Detection Algorithm
 * 
 * This module implements algorithms to identify which ESO scribing affix script
 * was used by analyzing persistent buffs, debuffs, and combat effects applied
 * by the scribing skill.
 */

import { abilityScribingMapper } from '../data/ability-scribing-mapping';
import { getAffixScriptByEffectId } from '../data/affix-script-buff-mappings';
import { ParsedLogEvent } from '../parsers/eso-log-parser';

import { GrimoireDetection } from './grimoire-detector';


export interface AffixScriptDetection {
  affixScriptKey: string;
  affixScriptName: string;
  affixScriptDescription: string;
  grimoireKey: string;
  grimoireName: string;
  detectedEffects: AffixEffect[];
  confidence: number;
  timestamp: number;
  sourcePlayer: number;
  detectionMethod: 'direct-ability' | 'buff-pattern' | 'debuff-pattern' | 'combat-effect' | 'duration-analysis';
  triggeringEvent: ParsedLogEvent;
  supportingEvents: ParsedLogEvent[];
  grimoireDetection?: GrimoireDetection;
  effectDuration: number; // milliseconds the effect was active
}

export interface AffixEffect {
  type: 'buff' | 'debuff' | 'passive';
  name: string;
  abilityId: number;
  startTime: number;
  endTime?: number;
  duration?: number;
  stacks?: number;
}

export interface AffixScriptDetectionResult {
  detections: AffixScriptDetection[];
  totalAnalyzed: number;
  uniqueAffixScripts: Set<string>;
  playerAffixScripts: Map<number, Set<string>>;
  grimoireAffixScripts: Map<string, Set<string>>;
  confidence: number;
  processingTime: number;
  errors: string[];
  warnings: string[];
}

/**
 * Known affix script patterns and their detection criteria
 */
const AFFIX_SCRIPT_PATTERNS = {
  'off-balance': {
    name: 'Off Balance',
    description: 'Applies Off Balance debuff to enemies',
    detectionCriteria: {
      debuffTypes: ['off-balance'],
      duration: { min: 5000, max: 15000 }, // 5-15 seconds
      targetType: 'enemy',
      expectedEvents: ['applydebuff'],
    },
  },
  'interrupt': {
    name: 'Interrupt',
    description: 'Interrupts enemy casting',
    detectionCriteria: {
      effectTypes: ['interrupt'],
      duration: { min: 0, max: 1000 }, // Instant effect
      targetType: 'enemy',
      expectedEvents: ['interrupt'],
    },
  },
  'savagery-and-prophecy': {
    name: 'Savagery and Prophecy',
    description: 'Provides Major Savagery and Major Prophecy buffs',
    detectionCriteria: {
      buffTypes: ['major-savagery', 'major-prophecy'],
      duration: { min: 15000, max: 45000 }, // 15-45 seconds
      targetType: 'self',
      expectedEvents: ['applybuff'],
    },
  },
  'expedition': {
    name: 'Expedition',
    description: 'Provides Major Expedition (movement speed) buff',
    detectionCriteria: {
      buffTypes: ['major-expedition'],
      duration: { min: 10000, max: 30000 }, // 10-30 seconds
      targetType: 'self',
      expectedEvents: ['applybuff'],
    },
  },
  'berserk': {
    name: 'Berserk',
    description: 'Provides Major Berserk (damage increase) buff',
    detectionCriteria: {
      buffTypes: ['major-berserk'],
      duration: { min: 8000, max: 25000 }, // 8-25 seconds
      targetType: 'self',
      expectedEvents: ['applybuff'],
    },
  },
  'brutality-and-sorcery': {
    name: 'Brutality and Sorcery',
    description: 'Provides Major Brutality and Major Sorcery buffs',
    detectionCriteria: {
      buffTypes: ['major-brutality', 'major-sorcery'],
      duration: { min: 15000, max: 45000 }, // 15-45 seconds
      targetType: 'self',
      expectedEvents: ['applybuff'],
    },
  },
  'heroism': {
    name: 'Heroism',
    description: 'Provides Major Heroism (ultimate generation) buff',
    detectionCriteria: {
      buffTypes: ['major-heroism'],
      duration: { min: 10000, max: 30000 }, // 10-30 seconds
      targetType: 'self',
      expectedEvents: ['applybuff'],
    },
  },
  'lifesteal': {
    name: 'Lifesteal',
    description: 'Heals caster when dealing damage',
    detectionCriteria: {
      effectTypes: ['healing-on-damage'],
      duration: { min: 5000, max: 20000 }, // 5-20 seconds
      targetType: 'self',
      expectedEvents: ['heal', 'applybuff'],
    },
  },
};

/**
 * Major/Minor buff and debuff ability ID mappings
 */
const KNOWN_EFFECT_IDS = {
  // Major Buffs - expanded with more comprehensive ESO ability IDs
  'major-savagery': [61687, 61693, 20301, 20302], // Major Savagery (Weapon Crit)
  'major-prophecy': [61687, 61693, 20297, 20298], // Major Prophecy (Spell Crit) 
  'major-expedition': [61693, 61694, 7938, 7959], // Major Expedition (Speed)
  'major-berserk': [61691, 61692, 155150], // Major Berserk (Damage)
  'major-brutality': [61685, 61686, 20232, 20233], // Major Brutality (Weapon Damage)
  'major-sorcery': [61685, 61686, 20229, 20230], // Major Sorcery (Spell Damage)
  'major-heroism': [61697, 61698, 40224], // Major Heroism (Ultimate Gen)
  'major-intellect': [20200, 20201], // Major Intellect (Magicka)
  'major-endurance': [20203, 20204], // Major Endurance (Stamina)
  'major-fortitude': [20206, 20207], // Major Fortitude (Health)
  
  // Major Debuffs
  'off-balance': [61723, 61724, 134599], // Off Balance
  'major-breach': [61710, 61711, 20313, 20314], // Major Breach (Spell Resist)
  'major-fracture': [20309, 20310], // Major Fracture (Physical Resist)
  'major-vulnerability': [20236, 20237], // Major Vulnerability (All Damage)
  'major-maim': [20240, 20241], // Major Maim (Damage Done)
  'major-defile': [20244, 20245], // Major Defile (Healing Received)
  
  // Minor effects
  'minor-savagery': [20304, 20305], // Minor Savagery
  'minor-prophecy': [20300, 20301], // Minor Prophecy
  'minor-expedition': [20336, 20337], // Minor Expedition
  'minor-berserk': [186706], // Minor Berserk
  'minor-breach': [20316, 20317], // Minor Breach
  'minor-vulnerability': [20238, 20239], // Minor Vulnerability
};

/**
 * Algorithm to detect affix script usage
 */
export class AffixScriptDetector {
  private scribingMapper: typeof abilityScribingMapper;
  private readonly ANALYSIS_WINDOW_MS = 10000; // 10 seconds after grimoire cast
  private readonly MIN_EFFECT_DURATION = 1000; // Minimum duration to consider as persistent effect

  constructor(mapper = abilityScribingMapper) {
    this.scribingMapper = mapper;
  }

  /**
   * Detect affix script from a grimoire detection and surrounding events
   */
  public async detectAffixScriptFromGrimoire(
    grimoireDetection: GrimoireDetection,
    allEvents: ParsedLogEvent[],
  ): Promise<AffixScriptDetection[]> {
    const allDetections: AffixScriptDetection[] = [];

    // Get events within analysis window after the grimoire cast
    const relevantEvents = this.getEventsAfterGrimoire(grimoireDetection, allEvents);

    // Try direct ability ID mapping first (though affix scripts typically don't have direct IDs)
    const directDetection = await this.detectByDirectAbilityMapping(grimoireDetection, relevantEvents);
    if (directDetection) {
      allDetections.push(directDetection);
    }
    
    // Try buff/debuff ID mapping (primary detection method for affix scripts)
    const buffDetections = this.detectByBuffDebuffIds(grimoireDetection, relevantEvents);
    allDetections.push(...buffDetections);

    // Use enhanced effect pattern detection (most reliable)
    const effectPatternDetections = this.detectAffixByEffectPattern(grimoireDetection, relevantEvents);
    allDetections.push(...effectPatternDetections);

    // Analyze buff/debuff patterns (fallback)
    const patternDetections = this.detectByBuffDebuffPatterns(grimoireDetection, relevantEvents);
    allDetections.push(...patternDetections);

    // Analyze persistent effects (additional validation)
    const persistentDetections = this.detectByPersistentEffects(grimoireDetection, allEvents);
    allDetections.push(...persistentDetections);

    // Ensure only one affix script per player/grimoire combination by selecting the highest confidence
    if (allDetections.length === 0) {
      return [];
    }

    if (allDetections.length === 1) {
      return allDetections;
    }

    // Multiple detections found - keep only the highest confidence one
    const bestDetection = allDetections.reduce((best, current) => 
      current.confidence > best.confidence ? current : best,
    );

    return [bestDetection];
  }

  /**
   * Detect affix scripts from multiple grimoire detections
   */
  public async detectAffixScriptsFromGrimoires(
    grimoireDetections: GrimoireDetection[],
    allEvents: ParsedLogEvent[],
  ): Promise<AffixScriptDetectionResult> {
    const startTime = Date.now();
    const detections: AffixScriptDetection[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const uniqueAffixScripts = new Set<string>();
    const playerAffixScripts = new Map<number, Set<string>>();
    const grimoireAffixScripts = new Map<string, Set<string>>();

    // Map to ensure only one affix script per player/grimoire combination
    const playerGrimoireDetections = new Map<string, AffixScriptDetection>();

    for (const grimoireDetection of grimoireDetections) {
      try {
        const affixDetections = await this.detectAffixScriptFromGrimoire(grimoireDetection, allEvents);
        
        for (const detection of affixDetections) {
          const playerGrimoireKey = `${detection.sourcePlayer}-${detection.grimoireKey}`;
          
          // Only keep the highest confidence detection per player/grimoire combination
          const existing = playerGrimoireDetections.get(playerGrimoireKey);
          if (!existing || detection.confidence > existing.confidence) {
            if (existing) {
              warnings.push(`Multiple affix scripts detected for player ${detection.sourcePlayer} with ${detection.grimoireKey}, keeping highest confidence: ${detection.affixScriptName}`);
            }
            playerGrimoireDetections.set(playerGrimoireKey, detection);
          }
        }
      } catch (error) {
        errors.push(`Error processing grimoire detection at ${grimoireDetection.timestamp}: ${error}`);
      }
    }

    // Convert to final detections array and update tracking
    for (const detection of playerGrimoireDetections.values()) {
      detections.push(detection);
      uniqueAffixScripts.add(detection.affixScriptKey);

      // Track per-player affix scripts
      if (!playerAffixScripts.has(detection.sourcePlayer)) {
        playerAffixScripts.set(detection.sourcePlayer, new Set());
      }
      playerAffixScripts.get(detection.sourcePlayer)?.add(detection.affixScriptKey);

      // Track per-grimoire affix scripts
      if (!grimoireAffixScripts.has(detection.grimoireKey)) {
        grimoireAffixScripts.set(detection.grimoireKey, new Set());
      }
      grimoireAffixScripts.get(detection.grimoireKey)?.add(detection.affixScriptKey);
    }

    // Calculate overall confidence (affix scripts are optional, so lower base confidence)
    const detectionRate = detections.length / Math.max(grimoireDetections.length, 1);
    let confidence = 0.3; // Base confidence
    if (detectionRate > 0.1) confidence = 0.4;
    if (detectionRate > 0.3) confidence = 0.6;
    if (detectionRate > 0.5) confidence = 0.75;

    const processingTime = Date.now() - startTime;

    return {
      detections,
      totalAnalyzed: grimoireDetections.length,
      uniqueAffixScripts,
      playerAffixScripts,
      grimoireAffixScripts,
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
    const startTime = grimoireDetection.timestamp;
    const endTime = grimoireDetection.timestamp + this.ANALYSIS_WINDOW_MS;

    return allEvents.filter(event => 
      event.sourceID === grimoireDetection.sourcePlayer &&
      event.timestamp >= startTime &&
      event.timestamp <= endTime,
    );
  }

  /**
   * Detect affix scripts by direct ability ID mapping
   */
  private async detectByDirectAbilityMapping(
    grimoireDetection: GrimoireDetection,
    events: ParsedLogEvent[],
  ): Promise<AffixScriptDetection | null> {
    for (const event of events) {
      const affixMapping = await this.scribingMapper.getAffixByAbilityId(event.abilityGameID);
      
      if (affixMapping && affixMapping.grimoireKey === grimoireDetection.grimoireKey) {
        const effect: AffixEffect = {
          type: event.type.includes('buff') ? 'buff' : event.type.includes('debuff') ? 'debuff' : 'passive',
          name: affixMapping.name,
          abilityId: event.abilityGameID,
          startTime: event.timestamp,
        };

        return {
          affixScriptKey: affixMapping.componentKey,
          affixScriptName: affixMapping.name,
          affixScriptDescription: affixMapping.description || '',
          grimoireKey: grimoireDetection.grimoireKey,
          grimoireName: grimoireDetection.grimoireName,
          detectedEffects: [effect],
          confidence: 0.95, // High confidence for direct mapping
          timestamp: event.timestamp,
          sourcePlayer: event.sourceID,
          detectionMethod: 'direct-ability',
          triggeringEvent: event,
          supportingEvents: [],
          grimoireDetection,
          effectDuration: 0, // Would need to be calculated from remove events
        };
      }
    }

    return null;
  }

  /**
   * Detect affix scripts by buff/debuff IDs (primary detection method)
   */
  private detectByBuffDebuffIds(
    grimoireDetection: GrimoireDetection,
    events: ParsedLogEvent[],
  ): AffixScriptDetection[] {
    const detections: AffixScriptDetection[] = [];
    const buffEvents = events.filter(e => e.type === 'applybuff');
    const debuffEvents = events.filter(e => e.type === 'applydebuff');
    const allEffectEvents = [...buffEvents, ...debuffEvents];

    // Keep track of detected affix scripts to ensure only one per player/grimoire
    const playerGrimoireAffixes = new Map<string, AffixScriptDetection>();

    // Check each effect event for affix script matches
    for (const event of allEffectEvents) {
      const affixMapping = getAffixScriptByEffectId(event.abilityGameID);
      
      if (affixMapping && affixMapping.compatibleGrimoires.includes(grimoireDetection.grimoireKey)) {
        const playerGrimoireKey = `${event.sourceID}-${grimoireDetection.grimoireKey}`;
        
        const effect: AffixEffect = {
          type: event.type === 'applybuff' ? 'buff' : 'debuff',
          name: affixMapping.name,
          abilityId: event.abilityGameID,
          startTime: event.timestamp,
        };

        const detection: AffixScriptDetection = {
          affixScriptKey: affixMapping.affixScriptKey,
          affixScriptName: affixMapping.name,
          affixScriptDescription: affixMapping.description,
          grimoireKey: grimoireDetection.grimoireKey,
          grimoireName: grimoireDetection.grimoireName,
          detectedEffects: [effect],
          confidence: 0.95, // High confidence for direct effect ID matching
          timestamp: event.timestamp,
          sourcePlayer: event.sourceID,
          detectionMethod: 'buff-pattern',
          triggeringEvent: event,
          supportingEvents: [],
          grimoireDetection,
          effectDuration: 0, // Would need to be calculated from remove events
        };

        // Only keep the highest confidence detection per player/grimoire combination
        const existing = playerGrimoireAffixes.get(playerGrimoireKey);
        if (!existing || detection.confidence > existing.confidence) {
          playerGrimoireAffixes.set(playerGrimoireKey, detection);
        }
      }
    }

    // Return all unique detections (one per player/grimoire)
    return Array.from(playerGrimoireAffixes.values());
  }

  /**
   * Detect affix scripts by analyzing buff/debuff patterns
   */
  private detectByBuffDebuffPatterns(
    grimoireDetection: GrimoireDetection,
    events: ParsedLogEvent[],
  ): AffixScriptDetection[] {
    // Map to ensure only one detection per player/grimoire combination
    const playerGrimoireDetections = new Map<string, AffixScriptDetection>();

    for (const [affixKey, pattern] of Object.entries(AFFIX_SCRIPT_PATTERNS)) {
      const detection = this.matchAffixPattern(grimoireDetection, events, affixKey, pattern);
      if (detection) {
        const playerGrimoireKey = `${detection.sourcePlayer}-${detection.grimoireKey}`;
        
        // Only keep the highest confidence detection per player/grimoire combination
        const existing = playerGrimoireDetections.get(playerGrimoireKey);
        if (!existing || detection.confidence > existing.confidence) {
          playerGrimoireDetections.set(playerGrimoireKey, detection);
        }
      }
    }

    return Array.from(playerGrimoireDetections.values());
  }

  /**
   * Match events against a specific affix script pattern
   */
  private matchAffixPattern(
    grimoireDetection: GrimoireDetection,
    events: ParsedLogEvent[],
    affixKey: string,
    pattern: any,
  ): AffixScriptDetection | null {
    const criteria = pattern.detectionCriteria;
    const matchingEvents: ParsedLogEvent[] = [];
    const effects: AffixEffect[] = [];

    // Look for buff/debuff applications that match the pattern
    for (const event of events) {
      if (criteria.expectedEvents?.includes(event.type)) {
        // Check if this event matches known effect IDs
        const effectMatch = this.matchKnownEffectId(event.abilityGameID, criteria);
        if (effectMatch) {
          matchingEvents.push(event);
          effects.push({
            type: event.type.includes('buff') ? 'buff' : event.type.includes('debuff') ? 'debuff' : 'passive',
            name: effectMatch.effectName,
            abilityId: event.abilityGameID,
            startTime: event.timestamp,
          });
        }
      }
    }

    if (matchingEvents.length > 0) {
      const triggeringEvent = matchingEvents[0];
      const confidence = this.calculateAffixConfidence(matchingEvents.length, criteria);

      return {
        affixScriptKey: affixKey,
        affixScriptName: pattern.name,
        affixScriptDescription: pattern.description,
        grimoireKey: grimoireDetection.grimoireKey,
        grimoireName: grimoireDetection.grimoireName,
        detectedEffects: effects,
        confidence,
        timestamp: triggeringEvent.timestamp,
        sourcePlayer: triggeringEvent.sourceID,
        detectionMethod: triggeringEvent.type.includes('buff') ? 'buff-pattern' : 'debuff-pattern',
        triggeringEvent,
        supportingEvents: matchingEvents.slice(1),
        grimoireDetection,
        effectDuration: this.calculateEffectDuration(events, triggeringEvent),
      };
    }

    return null;
  }

  /**
   * Check if an ability ID matches known effect IDs
   */
  private matchKnownEffectId(abilityId: number, criteria: any): { effectName: string } | null {
    for (const [effectName, ids] of Object.entries(KNOWN_EFFECT_IDS)) {
      if ((ids as number[]).includes(abilityId)) {
        // Check if this effect type is expected for this affix
        if (criteria.buffTypes?.includes(effectName) || criteria.debuffTypes?.includes(effectName)) {
          return { effectName };
        }
      }
    }
    return null;
  }

  /**
   * Enhanced method to detect affix scripts by looking for known major/minor effect patterns
   */
  private detectAffixByEffectPattern(
    grimoireDetection: GrimoireDetection,
    events: ParsedLogEvent[],
  ): AffixScriptDetection[] {
    const detections: AffixScriptDetection[] = [];
    const buffEvents = events.filter(e => e.type === 'applybuff');
    const debuffEvents = events.filter(e => e.type === 'applydebuff');

    // Check for common affix patterns based on major/minor effects
    const effectPatterns = {
      'savagery-and-prophecy': {
        name: 'Savagery and Prophecy',
        description: 'Provides Major Savagery and Major Prophecy buffs',
        requiredBuffs: ['major-savagery', 'major-prophecy'],
        confidence: 0.9,
      },
      'brutality-and-sorcery': {
        name: 'Brutality and Sorcery',
        description: 'Provides Major Brutality and Major Sorcery buffs', 
        requiredBuffs: ['major-brutality', 'major-sorcery'],
        confidence: 0.9,
      },
      'intellect-and-endurance': {
        name: 'Intellect and Endurance',
        description: 'Provides Major Intellect and Major Endurance buffs',
        requiredBuffs: ['major-intellect', 'major-endurance'],
        confidence: 0.9,
      },
      'berserk': {
        name: 'Berserk',
        description: 'Provides Major Berserk buff',
        requiredBuffs: ['major-berserk'],
        confidence: 0.85,
      },
      'breach': {
        name: 'Breach', 
        description: 'Applies Major Breach debuff',
        requiredDebuffs: ['major-breach'],
        confidence: 0.85,
      },
      'vulnerability': {
        name: 'Vulnerability',
        description: 'Applies Major Vulnerability debuff',
        requiredDebuffs: ['major-vulnerability'], 
        confidence: 0.85,
      },
      'maim': {
        name: 'Maim',
        description: 'Applies Major Maim debuff',
        requiredDebuffs: ['major-maim'],
        confidence: 0.85,
      },
      'defile': {
        name: 'Defile',
        description: 'Applies Major Defile debuff',
        requiredDebuffs: ['major-defile'],
        confidence: 0.85,
      },
    };

    // Map to track the best detection per player/grimoire to ensure only one affix per combination
    const bestDetections = new Map<string, AffixScriptDetection>();

    for (const [affixKey, pattern] of Object.entries(effectPatterns)) {
      const matchedEffects: AffixEffect[] = [];
      let hasAllRequired = true;

      // Check required buffs
      if ('requiredBuffs' in pattern && pattern.requiredBuffs) {
        for (const requiredBuff of pattern.requiredBuffs) {
          const effectIds = KNOWN_EFFECT_IDS[requiredBuff as keyof typeof KNOWN_EFFECT_IDS] || [];
          const matchingEvent = buffEvents.find(e => effectIds.includes(e.abilityGameID));
          
          if (matchingEvent) {
            matchedEffects.push({
              type: 'buff',
              name: requiredBuff,
              abilityId: matchingEvent.abilityGameID,
              startTime: matchingEvent.timestamp,
              duration: this.calculateEffectDuration(events, matchingEvent),
            });
          } else {
            hasAllRequired = false;
            break;
          }
        }
      }

      // Check required debuffs
      if ('requiredDebuffs' in pattern && pattern.requiredDebuffs && hasAllRequired) {
        for (const requiredDebuff of pattern.requiredDebuffs) {
          const effectIds = KNOWN_EFFECT_IDS[requiredDebuff as keyof typeof KNOWN_EFFECT_IDS] || [];
          const matchingEvent = debuffEvents.find(e => effectIds.includes(e.abilityGameID));
          
          if (matchingEvent) {
            matchedEffects.push({
              type: 'debuff',
              name: requiredDebuff,
              abilityId: matchingEvent.abilityGameID,
              startTime: matchingEvent.timestamp,
              duration: this.calculateEffectDuration(events, matchingEvent),
            });
          } else {
            hasAllRequired = false;
            break;
          }
        }
      }

      // If we found all required effects, create a detection
      if (hasAllRequired && matchedEffects.length > 0) {
        const triggeringEvent = buffEvents.concat(debuffEvents).find(e => 
          matchedEffects.some(effect => effect.abilityId === e.abilityGameID),
        );

        if (triggeringEvent) {
          const playerGrimoireKey = `${triggeringEvent.sourceID}-${grimoireDetection.grimoireKey}`;
          
          const detection: AffixScriptDetection = {
            affixScriptKey: affixKey,
            affixScriptName: pattern.name,
            affixScriptDescription: pattern.description,
            grimoireKey: grimoireDetection.grimoireKey,
            grimoireName: grimoireDetection.grimoireName,
            detectedEffects: matchedEffects,
            confidence: pattern.confidence,
            timestamp: triggeringEvent.timestamp,
            sourcePlayer: triggeringEvent.sourceID,
            detectionMethod: matchedEffects[0].type === 'buff' ? 'buff-pattern' : 'debuff-pattern',
            triggeringEvent,
            supportingEvents: [],
            grimoireDetection,
            effectDuration: Math.max(...matchedEffects.map(e => e.duration || 0)),
          };

          // Only keep the highest confidence detection per player/grimoire combination
          const existing = bestDetections.get(playerGrimoireKey);
          if (!existing || detection.confidence > existing.confidence) {
            bestDetections.set(playerGrimoireKey, detection);
          }
        }
      }
    }

    // Return only the best detections (one per player/grimoire)
    detections.push(...bestDetections.values());

    return detections;
  }

  /**
   * Calculate confidence based on pattern matches
   */
  private calculateAffixConfidence(matchCount: number, criteria: any): number {
    let confidence = 0.5; // Base confidence
    
    if (matchCount >= 1) confidence = 0.6;
    if (matchCount >= 2) confidence = 0.75;
    if (matchCount >= 3) confidence = 0.85;

    // Boost confidence if we match multiple expected buff types
    const expectedBuffTypes = (criteria.buffTypes || []).length;
    if (expectedBuffTypes > 1 && matchCount >= expectedBuffTypes) {
      confidence = Math.min(0.95, confidence + 0.1);
    }

    return confidence;
  }

  /**
   * Calculate effect duration from events
   */
  private calculateEffectDuration(events: ParsedLogEvent[], triggeringEvent: ParsedLogEvent): number {
    // Look for corresponding remove events
    const removeEvent = events.find(event => 
      event.abilityGameID === triggeringEvent.abilityGameID &&
      event.type.includes('remove') &&
      event.timestamp > triggeringEvent.timestamp,
    );

    if (removeEvent) {
      return removeEvent.timestamp - triggeringEvent.timestamp;
    }

    // If no remove event found, estimate based on typical affix durations
    return 15000; // 15 seconds default
  }

  /**
   * Detect affix scripts by analyzing persistent effects over time
   */
  private detectByPersistentEffects(
    grimoireDetection: GrimoireDetection,
    allEvents: ParsedLogEvent[],
  ): AffixScriptDetection[] {
    // Map to ensure only one detection per player/grimoire combination
    const playerGrimoireDetections = new Map<string, AffixScriptDetection>();
    
    // Look for buff/debuff pairs (apply/remove) that indicate persistent effects
    const persistentEffects = this.findPersistentEffects(grimoireDetection, allEvents);
    
    for (const effect of persistentEffects) {
      if (effect.duration && effect.duration >= this.MIN_EFFECT_DURATION) {
        const detection = this.createDetectionFromPersistentEffect(grimoireDetection, effect);
        if (detection) {
          const playerGrimoireKey = `${detection.sourcePlayer}-${detection.grimoireKey}`;
          
          // Only keep the highest confidence detection per player/grimoire combination
          const existing = playerGrimoireDetections.get(playerGrimoireKey);
          if (!existing || detection.confidence > existing.confidence) {
            playerGrimoireDetections.set(playerGrimoireKey, detection);
          }
        }
      }
    }

    return Array.from(playerGrimoireDetections.values());
  }

  /**
   * Find persistent buff/debuff effects
   */
  private findPersistentEffects(
    grimoireDetection: GrimoireDetection,
    allEvents: ParsedLogEvent[],
  ): AffixEffect[] {
    const effects: AffixEffect[] = [];
    const applyEvents = allEvents.filter(event => 
      event.sourceID === grimoireDetection.sourcePlayer &&
      (event.type === 'applybuff' || event.type === 'applydebuff') &&
      event.timestamp >= grimoireDetection.timestamp &&
      event.timestamp <= grimoireDetection.timestamp + this.ANALYSIS_WINDOW_MS,
    );

    for (const applyEvent of applyEvents) {
      // Find corresponding remove event
      const removeEvent = allEvents.find(event => 
        event.sourceID === applyEvent.sourceID &&
        event.abilityGameID === applyEvent.abilityGameID &&
        (event.type === 'removebuff' || event.type === 'removedebuff') &&
        event.timestamp > applyEvent.timestamp,
      );

      const duration = removeEvent ? 
        removeEvent.timestamp - applyEvent.timestamp : 
        this.ANALYSIS_WINDOW_MS; // Assume effect lasts for analysis window if no remove event

      effects.push({
        type: applyEvent.type === 'applybuff' ? 'buff' : 'debuff',
        name: `Effect ${applyEvent.abilityGameID}`,
        abilityId: applyEvent.abilityGameID,
        startTime: applyEvent.timestamp,
        endTime: removeEvent?.timestamp,
        duration,
      });
    }

    return effects;
  }

  /**
   * Create detection from persistent effect
   */
  private createDetectionFromPersistentEffect(
    grimoireDetection: GrimoireDetection,
    effect: AffixEffect,
  ): AffixScriptDetection | null {
    // This is a simplified implementation
    // In reality, we'd match against known affix patterns based on duration and effect type
    
    return {
      affixScriptKey: 'persistent-effect',
      affixScriptName: 'Persistent Effect',
      affixScriptDescription: `Persistent ${effect.type} effect detected`,
      grimoireKey: grimoireDetection.grimoireKey,
      grimoireName: grimoireDetection.grimoireName,
      detectedEffects: [effect],
      confidence: 0.5, // Medium confidence for generic persistent effect detection
      timestamp: effect.startTime,
      sourcePlayer: grimoireDetection.sourcePlayer,
      detectionMethod: 'duration-analysis',
      triggeringEvent: grimoireDetection.event, // Use grimoire event as trigger
      supportingEvents: [],
      grimoireDetection,
      effectDuration: effect.duration || 0,
    };
  }

  /**
   * Get affix script detection statistics
   */
  public getAffixScriptStatistics(result: AffixScriptDetectionResult): {
    totalDetections: number;
    uniqueAffixScripts: number;
    detectionsByMethod: Map<string, number>;
    averageEffectDuration: number;
    averageConfidence: number;
    affixScriptsByGrimoire: Map<string, Set<string>>;
    effectTypeDistribution: Map<string, number>;
  } {
    const detectionsByMethod = new Map<string, number>();
    const affixScriptsByGrimoire = new Map<string, Set<string>>();
    const effectTypeDistribution = new Map<string, number>();
    let totalEffectDuration = 0;
    let totalConfidence = 0;

    for (const detection of result.detections) {
      // Count by detection method
      const methodCount = detectionsByMethod.get(detection.detectionMethod) || 0;
      detectionsByMethod.set(detection.detectionMethod, methodCount + 1);

      // Track by grimoire
      if (!affixScriptsByGrimoire.has(detection.grimoireKey)) {
        affixScriptsByGrimoire.set(detection.grimoireKey, new Set());
      }
      affixScriptsByGrimoire.get(detection.grimoireKey)?.add(detection.affixScriptKey);

      // Count effect types
      for (const effect of detection.detectedEffects) {
        const typeCount = effectTypeDistribution.get(effect.type) || 0;
        effectTypeDistribution.set(effect.type, typeCount + 1);
      }

      totalEffectDuration += detection.effectDuration;
      totalConfidence += detection.confidence;
    }

    return {
      totalDetections: result.detections.length,
      uniqueAffixScripts: result.uniqueAffixScripts.size,
      detectionsByMethod,
      averageEffectDuration: result.detections.length > 0 ? totalEffectDuration / result.detections.length : 0,
      averageConfidence: result.detections.length > 0 ? totalConfidence / result.detections.length : 0,
      affixScriptsByGrimoire,
      effectTypeDistribution,
    };
  }
}

/**
 * Singleton instance for global access
 */
export const affixScriptDetector = new AffixScriptDetector();

export default AffixScriptDetector;