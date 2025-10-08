/**
 * Enhanced Scribing Tooltip Mapper with Signature Script Detection
 *
 * This module enhances the existing tooltip system to detect signature scripts
 * from combat log data and include them in the tooltip information.
 */

import { ScribedSkillData } from '@/components/SkillTooltip';
import { ReportAbility } from '@/graphql/generated';
import {
  BuffEvent,
  DamageEvent,
  DebuffEvent,
  HealEvent,
  ResourceChangeEvent,
  UnifiedCastEvent,
} from '@/types/combatlogEvents';
import { PlayerTalent } from '@/types/playerDetails';

import {
  buildTooltipPropsFromAbilityId,
  buildTooltipPropsFromClassAndName,
  buildTooltipProps as originalBuildTooltipProps,
} from '../../../utils/skillTooltipMapper';

import { analyzeScribingSkillWithSignature } from './enhancedScribingAnalysis';

/**
 * Interface for enhanced combat data used for signature script detection
 */
export interface CombatEventData {
  allReportAbilities: ReportAbility[];
  allDebuffEvents: DebuffEvent[];
  allBuffEvents: BuffEvent[];
  allResourceEvents: ResourceChangeEvent[];
  allDamageEvents: DamageEvent[];
  allCastEvents: UnifiedCastEvent[];
  allHealingEvents: HealEvent[];
}

/**
 * Enhanced tooltip builder that includes signature script detection from combat data
 */
export function buildEnhancedTooltipProps(options: {
  abilityId?: number;
  abilityName?: string;
  classKey?: string;
  talent?: PlayerTalent;
  playerId?: number;
  combatData?: CombatEventData;
  scribedSkillData?: ScribedSkillData;
}): ReturnType<typeof originalBuildTooltipProps> {
  const {
    abilityId,
    abilityName,
    classKey,
    talent,
    playerId = 1,
    combatData,
    scribedSkillData,
  } = options;

  // If we have combat data and a talent, try to enhance the scribing analysis
  let enhancedScribedSkillData = scribedSkillData;

  if (combatData && talent && !scribedSkillData) {
    const analysis = analyzeScribingSkillWithSignature(
      talent,
      combatData.allReportAbilities,
      combatData.allDebuffEvents,
      combatData.allBuffEvents,
      combatData.allResourceEvents,
      combatData.allDamageEvents,
      combatData.allCastEvents.filter((event) => event.type === 'cast'),
      combatData.allHealingEvents,
      playerId,
    );

    if (analysis) {
      enhancedScribedSkillData = analysis;
    }
  }

  // Use the original builder with enhanced data
  return originalBuildTooltipProps({
    abilityId,
    abilityName,
    classKey,
    scribedSkillData: enhancedScribedSkillData,
  });
}

/**
 * Batch analyze multiple talents for scribing skills with signature detection
 */
export function analyzePlayerScribingSkills(
  talents: PlayerTalent[],
  combatData: CombatEventData,
  playerId = 1,
): Map<number, ScribedSkillData> {
  const results = new Map<number, ScribedSkillData>();

  talents.forEach((talent) => {
    const analysis = analyzeScribingSkillWithSignature(
      talent,
      combatData.allReportAbilities,
      combatData.allDebuffEvents,
      combatData.allBuffEvents,
      combatData.allResourceEvents,
      combatData.allDamageEvents,
      combatData.allCastEvents.filter((event) => event.type === 'cast'),
      combatData.allHealingEvents,
      playerId,
    );

    if (analysis) {
      results.set(talent.guid, analysis);
    }
  });

  return results;
}

/**
 * Create enhanced scribing data from basic detection
 */
export function createEnhancedScribedSkillData(
  grimoireName: string,
  abilityName: string,
  combatData?: CombatEventData,
  talent?: PlayerTalent,
  playerId = 1,
): ScribedSkillData {
  const baseData: ScribedSkillData = {
    grimoireName,
    effects: [],
    recipe: {
      grimoire: grimoireName,
      transformation: 'unknown-focus',
      transformationType: 'basic-detection',
      confidence: 0.5,
      matchMethod: 'grimoire-pattern-match',
      recipeSummary: `${grimoireName} + Unknown Focus Script`,
      tooltipInfo: `Grimoire: ${grimoireName}\nThis scribed skill was detected from the ability name pattern.`,
    },
  };

  // If we have combat data and talent, enhance with signature detection
  if (combatData && talent) {
    const enhanced = analyzeScribingSkillWithSignature(
      talent,
      combatData.allReportAbilities,
      combatData.allDebuffEvents,
      combatData.allBuffEvents,
      combatData.allResourceEvents,
      combatData.allDamageEvents,
      combatData.allCastEvents.filter((event) => event.type === 'cast'),
      combatData.allHealingEvents,
      playerId,
    );

    if (enhanced) {
      return enhanced;
    }
  }

  return baseData;
}

/**
 * Helper to extract combat data from various data sources
 */
export function extractCombatData(data: {
  masterData?: {
    reportData?: {
      report?: {
        masterData?: {
          abilities?: ReportAbility[];
        };
      };
    };
  };
  damageEvents?: DamageEvent[];
  healingEvents?: HealEvent[];
  buffEvents?: BuffEvent[];
  debuffEvents?: DebuffEvent[];
  resourceEvents?: ResourceChangeEvent[];
  castEvents?: UnifiedCastEvent[];
}): CombatEventData | null {
  try {
    return {
      allReportAbilities: data.masterData?.reportData?.report?.masterData?.abilities || [],
      allDamageEvents: data.damageEvents || [],
      allHealingEvents: data.healingEvents || [],
      allBuffEvents: data.buffEvents || [],
      allDebuffEvents: data.debuffEvents || [],
      allResourceEvents: data.resourceEvents || [],
      allCastEvents: data.castEvents || [],
    };
  } catch {
    return null;
  }
}

/**
 * Enhanced tooltip builder specifically for scribing skills
 */
export function buildScribingTooltipProps(options: {
  talent: PlayerTalent;
  combatData: CombatEventData;
  playerId?: number;
  classKey?: string;
}): ReturnType<typeof originalBuildTooltipProps> {
  const { talent, combatData, playerId = 1, classKey } = options;

  const analysis = analyzeScribingSkillWithSignature(
    talent,
    combatData.allReportAbilities,
    combatData.allDebuffEvents,
    combatData.allBuffEvents,
    combatData.allResourceEvents,
    combatData.allDamageEvents,
    combatData.allCastEvents.filter((event) => event.type === 'cast'),
    combatData.allHealingEvents,
    playerId,
  );

  if (!analysis) {
    return null;
  }

  // Build tooltip with enhanced scribing data
  return originalBuildTooltipProps({
    abilityId: talent.guid,
    abilityName: talent.name,
    classKey,
    scribedSkillData: analysis,
  });
}

// Re-export the original functions for backward compatibility
export {
  buildTooltipPropsFromAbilityId,
  buildTooltipPropsFromClassAndName,
  originalBuildTooltipProps as buildTooltipProps,
};
