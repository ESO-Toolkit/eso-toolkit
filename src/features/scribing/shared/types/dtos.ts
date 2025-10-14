/**
 * Data Transfer Objects for ESO Scribing system
 * These represent data structures for API communication and external interfaces
 */

import { ResourceType, DamageType, ScriptType, SkillLine } from './entities';

/**
 * Scribing Detection Result DTO - represents the result of scribing detection algorithms
 */
export interface ScribingDetectionResult {
  playerId: number;
  playerName: string;
  detectedCombinations: DetectedCombination[];
  confidence: number;
  analysisTimestamp: number;
}

/**
 * Detected Combination DTO - represents a detected scribing combination from logs
 */
export interface DetectedCombination {
  grimoire: string;
  grimoireKey: string;
  casts: number;
  focus: string;
  focusKey?: string;
  signature: string;
  signatureKey?: string;
  affix: string;
  affixKey?: string;
  confidence?: {
    focus?: number;
    signature?: number;
    affix?: number;
    overall?: number;
  };
  events?: {
    casts: number;
    buffs: number;
    debuffs: number;
    damage: number;
    heals: number;
  };
}

/**
 * Ability Scribing Mapping DTO - represents the mapping between ability IDs and scribing components
 */
export interface AbilityScribingMapping {
  abilityId: number;
  type: 'grimoire' | 'transformation' | 'signature' | 'affix';
  grimoireKey: string;
  componentKey: string;
  name: string;
  category?: string;
  description?: string;
}

/**
 * Scribing Component Lookup DTO - optimized lookup structure for scribing components
 */
export interface ScribingComponentLookup {
  grimoires: Map<number, AbilityScribingMapping>;
  transformations: Map<number, AbilityScribingMapping>;
  signatures: Map<number, AbilityScribingMapping>;
  affixes: Map<number, AbilityScribingMapping>;
  all: Map<number, AbilityScribingMapping[]>;
}

/**
 * Scribing Recipe Match DTO - represents a recipe match result
 */
export interface ScribingRecipeMatch {
  grimoire: string;
  transformation: string;
  transformationType: string;
  confidence: number;
  matchMethod: string;
  recipeSummary: string;
  tooltipInfo: string;
}

/**
 * Scribed Skill Data DTO - comprehensive data for a scribed skill
 */
export interface ScribedSkillData {
  skillId: number;
  skillName: string;
  recipe?: ScribingRecipeMatch;
  effects: Array<{
    abilityId: number;
    abilityName: string;
    type: 'buff' | 'debuff' | 'damage' | 'heal' | 'aura' | 'resource';
    count: number;
  }>;
}

/**
 * Scribing Simulation Request DTO - request for scribing simulation
 */
export interface ScribingSimulationRequest {
  grimoireId: string;
  focusScriptId?: string;
  signatureScriptId?: string;
  affixScriptId?: string;
  characterLevel?: number;
  championPoints?: number;
}

/**
 * Scribing Simulation Response DTO - result of scribing simulation
 */
export interface ScribingSimulationResponse {
  combination: {
    grimoire: string;
    focusScript?: string;
    signatureScript?: string;
    affixScript?: string;
  };
  calculatedSkill: {
    name: string;
    description: string;
    resourceType: ResourceType;
    cost: number;
    castTime: number;
    range: number;
    duration?: number;
    damage?: {
      type: DamageType;
      amount: number;
    };
    effects: string[];
  };
  isValid: boolean;
  errors?: string[];
}

/**
 * Script Filter Criteria DTO - for filtering scripts in UI
 */
export interface ScriptFilterCriteria {
  type?: ScriptType;
  skillLine?: SkillLine;
  damageType?: DamageType;
  compatibleWith?: string; // grimoire ID
  searchTerm?: string;
  availableOnly?: boolean;
}

/**
 * Scribing Statistics DTO - aggregated statistics about scribing data
 */
export interface ScribingStatistics {
  totalGrimoires: number;
  totalFocusScripts: number;
  totalSignatureScripts: number;
  totalAffixScripts: number;
  totalPossibleCombinations: number;
  popularCombinations: Array<{
    combination: {
      grimoire: string;
      focusScript: string;
      signatureScript: string;
      affixScript: string;
    };
    usage: number;
  }>;
}

/**
 * Scribing Export Data DTO - for exporting scribing configurations
 */
export interface ScribingExportData {
  version: string;
  exportTimestamp: number;
  combinations: Array<{
    name: string;
    description: string;
    combination: {
      grimoire: string;
      focusScript: string;
      signatureScript: string;
      affixScript: string;
    };
  }>;
}

/**
 * Scribing Import Request DTO - for importing scribing configurations
 */
export interface ScribingImportRequest {
  data: ScribingExportData;
  overwriteExisting: boolean;
  validateCombinations: boolean;
}
