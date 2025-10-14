/**
 * Affix Script Detection for Scribing Tooltips
 *
 * This module integrates the affix script detection logic from our standalone detector
 * into the existing scribing tooltip system to provide real-time affix script identification
 * in skill tooltips.
 */

import {
  BuffEvent,
  UnifiedCastEvent,
  DamageEvent,
  DebuffEvent,
  HealEvent,
} from '@/types/combatlogEvents';
import { PlayerTalent } from '@/types/playerDetails';

import scribingData from '../../../../data/scribing-complete.json';
import { AffixScript } from '../types/scribing-schemas';

// Import scribing data dynamically to handle module resolution

import { getScribingSkillByAbilityId } from './Scribing';

// Type for grimoire transformations
interface GrimoireTransformation {
  name?: string;
  abilityIds?: number[];
  [key: string]: unknown;
}

// Type for grimoire
interface Grimoire {
  nameTransformations?: Record<string, GrimoireTransformation>;
  [key: string]: unknown;
}

// Type for our scribing database
interface ScribingDatabase {
  affixScripts: Record<string, AffixScript>;
  grimoires?: Record<string, Grimoire>;
  [key: string]: unknown;
}

// Cast the imported data to our expected type
const SCRIBING_DATABASE = scribingData as ScribingDatabase;

// Interface for affix script detection result
export interface AffixScriptDetectionResult {
  affixScript: {
    id: string;
    name: string;
    description: string;
    category?: string;
    mechanicalEffect?: string;
  };
  confidence: number;
  detectionMethod: 'buff-debuff-pairing' | 'pattern-matching' | 'signature-analysis';
  evidence: {
    buffIds: number[];
    debuffIds: number[];
    abilityNames: string[];
    occurrenceCount: number;
  };
  appliedToAbilities: Array<{
    abilityId: number;
    abilityName: string;
    grimoire?: string;
  }>;
}

// Interface for enhanced scribing skill data with affix scripts
export interface ScribedSkillDataWithAffix {
  grimoireName: string;
  effects: Array<{
    abilityId: number;
    abilityName: string;
    type: 'buff' | 'debuff' | 'damage' | 'heal' | 'aura' | 'resource';
    count: number;
  }>;
  /** Whether this skill was actually cast in the current fight */
  wasCastInFight?: boolean;
  recipe?: {
    grimoire: string;
    transformation: string;
    transformationType: string;
    confidence: number;
    matchMethod: string;
    recipeSummary: string;
    tooltipInfo: string;
  };
  signatureScript?: {
    name: string;
    confidence: number;
    detectionMethod: string;
    evidence: string[];
  };
  affixScripts?: AffixScriptDetectionResult[];
}

/**
 * Core affix script detection class adapted for tooltip usage
 */
class AffixScriptDetector {
  private scribingAbilities: Map<number, string> = new Map();
  private affixScripts: Map<string, AffixScript> = new Map();

  constructor() {
    this.loadScribingDatabase();
  }

  private loadScribingDatabase(): void {
    // Load affix scripts
    Object.entries(SCRIBING_DATABASE.affixScripts || {}).forEach(([key, affix]) => {
      this.affixScripts.set(key, affix);
    });

    // Load scribing abilities from grimoires with their name transformations
    const grimoires = SCRIBING_DATABASE.grimoires || {};
    Object.values(grimoires).forEach((grimoire: Grimoire) => {
      if (grimoire.nameTransformations) {
        Object.values(grimoire.nameTransformations).forEach(
          (transformation: GrimoireTransformation) => {
            if (transformation.abilityIds && Array.isArray(transformation.abilityIds)) {
              transformation.abilityIds.forEach((id: number) => {
                this.scribingAbilities.set(id, transformation.name || 'Unknown Transformation');
              });
            }
          },
        );
      }
    });
  }

  /**
   * Detect affix scripts used by a specific scribing ability
   */
  detectAffixScriptsForAbility(
    talent: PlayerTalent,
    allBuffEvents: BuffEvent[],
    allDebuffEvents: DebuffEvent[],
    allDamageEvents?: DamageEvent[],
    allHealEvents?: HealEvent[],
    allCastEvents?: UnifiedCastEvent[],
    playerId: number = 1,
  ): AffixScriptDetectionResult[] {
    const results: AffixScriptDetectionResult[] = [];

    // Only detect affix scripts for abilities that are actually scribed skills
    if (!this.scribingAbilities.has(talent.guid)) {
      return results; // This is not a scribed skill, so no affix scripts
    }

    // Find buff/debuff events related to this ability
    const relatedBuffs = this.findRelatedBuffDebuffEvents(
      talent.guid,
      allBuffEvents,
      allDebuffEvents,
      playerId,
    );

    // Analyze each buff/debuff for affix script patterns
    for (const event of relatedBuffs) {
      const affixDetection = this.matchEventToAffixScript(event, talent);
      if (affixDetection) {
        // Check if we already have this affix script (avoid duplicates)
        const existingIndex = results.findIndex(
          (r) => r.affixScript.id === affixDetection.affixScript.id,
        );
        if (existingIndex >= 0) {
          // Merge evidence and increase confidence
          results[existingIndex].evidence.buffIds = [
            ...new Set([
              ...results[existingIndex].evidence.buffIds,
              ...affixDetection.evidence.buffIds,
            ]),
          ];
          results[existingIndex].evidence.debuffIds = [
            ...new Set([
              ...results[existingIndex].evidence.debuffIds,
              ...affixDetection.evidence.debuffIds,
            ]),
          ];
          results[existingIndex].evidence.occurrenceCount +=
            affixDetection.evidence.occurrenceCount;
          results[existingIndex].confidence = Math.min(
            1.0,
            results[existingIndex].confidence + 0.15,
          );
        } else {
          results.push(affixDetection);
        }
      }
    }

    // Enforce one affix script per scribed skill constraint
    // If we have multiple detections, keep only the one with highest confidence
    if (results.length > 1) {
      // Sort by confidence (descending) and keep only the top result
      results.sort((a, b) => b.confidence - a.confidence);
      return [results[0]];
    }

    return results;
  }

  private findRelatedBuffDebuffEvents(
    abilityId: number,
    buffEvents: BuffEvent[],
    debuffEvents: DebuffEvent[],
    playerId: number,
  ): Array<BuffEvent | DebuffEvent> {
    const related: Array<BuffEvent | DebuffEvent> = [];

    // Only include buff/debuff events that are directly caused by the scribed skill
    // This means the event's abilityGameID should match the scribed skill's ability ID
    // or be a known affix script effect that can be applied by this scribing ability

    [...buffEvents, ...debuffEvents].forEach((event) => {
      // Check if this buff/debuff event is from the same player
      if (event.sourceID === playerId) {
        // Only include events that could plausibly be from this scribed skill
        // We'll check this more carefully in the matching phase
        const isPlausibleAffixEffect = this.isPlausibleAffixEffect(event.abilityGameID);

        if (isPlausibleAffixEffect) {
          related.push(event);
        }
      }
    });

    return related;
  }

  /**
   * Check if an ability ID could plausibly be an affix script effect
   */
  private isPlausibleAffixEffect(abilityId: number): boolean {
    // Check against known affix script ability IDs
    // This is a more conservative approach to avoid false positives

    const knownAffixAbilityIds = new Set([
      // Major/Minor Brutality and Sorcery
      217790, 61694, 61685,

      // Major/Minor Savagery and Prophecy
      218015, 218016, 217673, 61694, 61687,

      // Major/Minor Endurance and Intellect
      227123, 217662, 61708, 61704,

      // Breach
      216945, 148803, 61743,

      // Maim
      217105, 218990, 61723,

      // Vulnerability
      68359, 106754,

      // Berserk
      218988, 61747,

      // Defile
      21927, 61729,
    ]);

    return knownAffixAbilityIds.has(abilityId);
  }

  private matchEventToAffixScript(
    event: BuffEvent | DebuffEvent,
    talent: PlayerTalent,
  ): AffixScriptDetectionResult | null {
    // Map common buff/debuff ability IDs to affix scripts
    const affixMappings = this.createAffixMappings();

    // Get the ability ID from the event
    const eventAbilityId = event.abilityGameID;

    // Try to match the event ability ID to known affix patterns
    // We'll use the ability ID as the primary matching method
    for (const [pattern, affixKey] of affixMappings.entries()) {
      // Check if this ability ID matches known affix script patterns
      if (this.isAffixAbilityId(eventAbilityId, affixKey)) {
        const affixScript = this.affixScripts.get(affixKey);
        if (affixScript) {
          return {
            affixScript: {
              id: affixKey,
              name: affixScript.name,
              description: affixScript.description,
              category: affixScript.category,
              mechanicalEffect:
                typeof affixScript.mechanicalEffect === 'string'
                  ? affixScript.mechanicalEffect
                  : undefined,
            },
            confidence: 0.8, // High confidence for direct ID match
            detectionMethod: 'pattern-matching',
            evidence: {
              buffIds:
                event.type.includes('buff') && !event.type.includes('debuff')
                  ? [event.abilityGameID]
                  : [],
              debuffIds: event.type.includes('debuff') ? [event.abilityGameID] : [],
              abilityNames: [pattern], // Use the pattern name as a proxy
              occurrenceCount: 1,
            },
            appliedToAbilities: [
              {
                abilityId: talent.guid,
                abilityName: talent.name,
                grimoire: this.detectGrimoireFromTalent(talent),
              },
            ],
          };
        }
      }
    }

    return null;
  }

  private createAffixMappings(): Map<string, string> {
    const mappings = new Map<string, string>();

    // Map buff/debuff names to affix script keys
    // These come from our analysis of the affix script database
    mappings.set('Major Berserk', 'berserk');
    mappings.set('Minor Berserk', 'berserk');
    mappings.set('Major Brutality', 'brutality-and-sorcery');
    mappings.set('Major Sorcery', 'brutality-and-sorcery');
    mappings.set('Major Savagery', 'savagery-and-prophecy');
    mappings.set('Major Prophecy', 'savagery-and-prophecy');
    mappings.set('Major Intellect', 'intellect-and-endurance');
    mappings.set('Major Endurance', 'intellect-and-endurance');
    mappings.set('Minor Endurance', 'intellect-and-endurance');
    mappings.set('Major Breach', 'breach');
    mappings.set('Minor Breach', 'breach');
    mappings.set('Major Maim', 'maim');
    mappings.set('Minor Maim', 'maim');
    mappings.set('Major Vulnerability', 'vulnerability');
    mappings.set('Minor Vulnerability', 'vulnerability');
    mappings.set('Major Defile', 'defile');
    mappings.set('Minor Defile', 'defile');
    mappings.set('Major Cowardice', 'cowardice');
    mappings.set('Minor Cowardice', 'cowardice');
    mappings.set('Major Lifesteal', 'lifesteal');
    mappings.set('Minor Lifesteal', 'lifesteal');
    mappings.set('Major Magickasteal', 'magickasteal');
    mappings.set('Minor Magickasteal', 'magickasteal');

    return mappings;
  }

  private isAffixAbilityId(abilityId: number, affixKey: string): boolean {
    // Map known ability IDs from our detection results to affix scripts
    // These IDs come from our analysis of the GPY4jVfpctLRgA32 report
    const knownAffixIds = new Map<number, string>();

    // From our previous detection results:
    knownAffixIds.set(227123, 'intellect-and-endurance'); // Minor Endurance
    knownAffixIds.set(218015, 'savagery-and-prophecy'); // Major Savagery
    knownAffixIds.set(218016, 'savagery-and-prophecy'); // Major Prophecy
    knownAffixIds.set(217673, 'savagery-and-prophecy'); // Major Prophecy
    knownAffixIds.set(68359, 'vulnerability'); // Minor Vulnerability
    knownAffixIds.set(148803, 'breach'); // Minor Breach
    knownAffixIds.set(216945, 'breach'); // Major Breach
    knownAffixIds.set(217662, 'intellect-and-endurance'); // Minor Endurance
    knownAffixIds.set(218990, 'maim'); // Minor Maim
    knownAffixIds.set(21927, 'defile'); // Minor Defile

    return knownAffixIds.get(abilityId) === affixKey;
  }

  private detectGrimoireFromTalent(talent: PlayerTalent): string | undefined {
    // Use existing grimoire detection logic
    const grimoires = [
      'Wield Soul',
      "Ulfsild's Contingency",
      'Trample',
      'Traveling Knife',
      'Banner Bearer',
      'Scribing Altar',
      'Soul Burst',
      'Torchbearer',
      // Add more as needed
    ];

    for (const grimoire of grimoires) {
      if (talent.name.toLowerCase().includes(grimoire.toLowerCase())) {
        return grimoire;
      }
    }

    return undefined;
  }
}

// Singleton instance for reuse
const affixDetector = new AffixScriptDetector();

/**
 * Enhanced function to analyze scribing skill with affix script detection
 */
export function analyzeScribingSkillWithAffixScripts(
  talent: PlayerTalent,
  allBuffEvents: BuffEvent[],
  allDebuffEvents: DebuffEvent[],
  allDamageEvents?: DamageEvent[],
  allHealEvents?: HealEvent[],
  allCastEvents?: UnifiedCastEvent[],
  playerId: number = 1,
  existingScribedData?: ScribedSkillDataWithAffix,
): ScribedSkillDataWithAffix | null {
  // Check if this ability was actually cast by the player in the fight
  const wasCastInFight = allCastEvents
    ? allCastEvents.some((cast) => cast.sourceID === playerId && cast.abilityGameID === talent.guid)
    : false;

  // Start with existing scribed skill data or create basic structure
  const baseData: ScribedSkillDataWithAffix = existingScribedData || {
    grimoireName: 'Unknown',
    effects: [],
    wasCastInFight,
  };

  // If the skill wasn't cast, we can still return basic data with the flag
  if (!wasCastInFight) {
    return {
      ...baseData,
      wasCastInFight: false,
    };
  }

  // Detect affix scripts for this ability
  const affixScripts = affixDetector.detectAffixScriptsForAbility(
    talent,
    allBuffEvents,
    allDebuffEvents,
    allDamageEvents,
    allHealEvents,
    allCastEvents,
    playerId,
  );

  // Add affix scripts to the data if any were found
  if (affixScripts.length > 0) {
    baseData.affixScripts = affixScripts;

    // Update recipe information to include affix scripts
    if (baseData.recipe) {
      const affixNames = affixScripts.map((a) => a.affixScript.name).join(', ');
      baseData.recipe.recipeSummary += ` + ${affixNames}`;
      baseData.recipe.tooltipInfo += `\nAffix Scripts: ${affixNames}`;
    } else {
      // Create recipe section if it doesn't exist
      const affixNames = affixScripts.map((a) => a.affixScript.name).join(', ');

      // Check if we have ability ID mapping for better confidence
      const scribingInfo = getScribingSkillByAbilityId(talent.guid);

      if (scribingInfo) {
        // Use database match with high confidence
        baseData.recipe = {
          grimoire: scribingInfo.grimoire,
          transformation: scribingInfo.transformation,
          transformationType: scribingInfo.transformationType,
          confidence: 1.0, // 100% confidence for database matches
          matchMethod: 'ability-id-match',
          recipeSummary: `📖 ${scribingInfo.grimoire} + 🔄 ${scribingInfo.transformation} + 🎭 ${affixNames}`,
          tooltipInfo: `📖 Grimoire: ${scribingInfo.grimoire}\n🔄 ${scribingInfo.transformationType}: ${scribingInfo.transformation}\n🎭 Affix Scripts: ${affixNames}`,
        };
      } else {
        // Fallback to heuristic detection
        baseData.recipe = {
          grimoire: baseData.grimoireName,
          transformation: 'Unknown Focus Script',
          transformationType: 'scribing-analysis',
          confidence: 0.7,
          matchMethod: 'affix-detection',
          recipeSummary: `${baseData.grimoireName} + Unknown Focus + ${affixNames}`,
          tooltipInfo: `Grimoire: ${baseData.grimoireName}\nAffix Scripts: ${affixNames}`,
        };
      }
    }
  }

  return baseData;
}

/**
 * Helper function to format affix scripts for tooltip display
 */
export function formatAffixScriptsForTooltip(affixScripts: AffixScriptDetectionResult[]): string {
  if (affixScripts.length === 0) {
    return 'No affix scripts detected';
  }

  return affixScripts
    .map((affix) => {
      const confidencePercent = Math.round(affix.confidence * 100);
      return `🎭 ${affix.affixScript.name} (${confidencePercent}% confidence)`;
    })
    .join('\n');
}

/**
 * Create affix script chips for tooltip display
 */
export function createAffixScriptChips(affixScripts: AffixScriptDetectionResult[]): Array<{
  id: string;
  name: string;
  description: string;
  confidence: number;
  count: number;
  type: 'affix';
}> {
  return affixScripts.map((affix) => ({
    id: affix.affixScript.id,
    name: affix.affixScript.name,
    description: affix.affixScript.description,
    confidence: affix.confidence,
    count: affix.evidence.occurrenceCount,
    type: 'affix' as const,
  }));
}

export { affixDetector };
