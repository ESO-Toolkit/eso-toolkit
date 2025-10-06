/**
 * Enhanced Scribing Tooltip Mapper with Affix Script Detection
 * 
 * This module integrates affix script detection into the existing scribing tooltip system.
 * It extends the current tooltip functionality to include real-time affix script detection
 * based on combat events.
 */

import { ScribedSkillData, SkillTooltipProps } from '@/components/SkillTooltip';
import {
  BuffEvent,
  CastEvent,
  DamageEvent,
  DebuffEvent,
  HealEvent,
  ResourceChangeEvent,
} from '@/types/combatlogEvents';
import { PlayerTalent } from '@/types/playerDetails';

import {
  analyzeScribingSkillWithAffixScripts,
  AffixScriptDetectionResult,
  ScribedSkillDataWithAffix,
} from './affixScriptDetection';
import { analyzeScribingSkillWithSignature } from './enhancedScribingAnalysis';
import { 
  createEnhancedScribedSkillData,
  CombatEventData,
} from './enhancedTooltipMapper';
import { getScribingSkillByAbilityId } from './Scribing';
import { buildTooltipProps } from '../../../utils/skillTooltipMapper';

/**
 * Enhanced tooltip builder that includes both signature script and affix script detection
 */
export function buildEnhancedScribingTooltipProps(options: {
  talent: PlayerTalent;
  combatEventData: CombatEventData;
  playerId?: number;
  classKey?: string;
  abilityId?: number;
  abilityName?: string;
}): SkillTooltipProps | null {
  const { 
    talent, 
    combatEventData, 
    playerId = 1, 
    classKey, 
    abilityId, 
    abilityName, 
  } = options;

  // First, get the base scribing skill analysis with signature detection
  const enhancedScribedData = analyzeScribingSkillWithSignature(
    talent,
    combatEventData.allReportAbilities,
    combatEventData.allDebuffEvents,
    combatEventData.allBuffEvents,
    combatEventData.allResourceEvents,
    combatEventData.allDamageEvents,
    combatEventData.allCastEvents,
    combatEventData.allHealingEvents,
    playerId,
  );

  // Then, add affix script detection to the analysis
  const affixEnhancedData = analyzeScribingSkillWithAffixScripts(
    talent,
    combatEventData.allBuffEvents,
    combatEventData.allDebuffEvents,
    combatEventData.allDamageEvents,
    combatEventData.allHealingEvents,
    combatEventData.allCastEvents,
    playerId,
    enhancedScribedData,
  );

  // Convert ScribedSkillDataWithAffix to ScribedSkillData for tooltip compatibility
  const tooltipScribedData: ScribedSkillData | undefined = affixEnhancedData ? {
    grimoireName: affixEnhancedData.grimoireName,
    effects: affixEnhancedData.effects,
    wasCastInFight: affixEnhancedData.wasCastInFight,
    recipe: affixEnhancedData.recipe,
    signatureScript: affixEnhancedData.signatureScript,
    affixScripts: affixEnhancedData.affixScripts?.map(affix => ({
      id: affix.affixScript.id,
      name: affix.affixScript.name,
      description: affix.affixScript.description,
      confidence: affix.confidence,
      detectionMethod: affix.detectionMethod,
      evidence: affix.evidence,
    })),
  } : undefined;

  // Build the tooltip props with enhanced data
  return buildTooltipProps({
    abilityId: abilityId || talent.guid,
    abilityName: abilityName || talent.name,
    classKey,
    scribedSkillData: tooltipScribedData,
  });
}

/**
 * Batch analysis function for multiple talents with affix script detection
 */
export function analyzePlayerScribingSkillsWithAffixScripts(
  talents: PlayerTalent[],
  combatEventData: CombatEventData,
  playerId: number = 1,
): Map<number, ScribedSkillDataWithAffix> {
  const results = new Map<number, ScribedSkillDataWithAffix>();

  talents.forEach(talent => {
    // Only analyze scribing skills (detect by name patterns or other criteria)
    if (isScribingSkill(talent)) {
      const analysis = analyzeScribingSkillWithAffixScripts(
        talent,
        combatEventData.allBuffEvents,
        combatEventData.allDebuffEvents,
        combatEventData.allDamageEvents,
        combatEventData.allHealingEvents,
        combatEventData.allCastEvents,
        playerId,
      );

      if (analysis) {
        results.set(talent.guid, analysis);
      }
    }
  });

  return results;
}

/**
 * Helper function to detect if a talent represents a scribing skill
 * Uses ability ID lookup first, then fallback to pattern matching
 */
function isScribingSkill(talent: PlayerTalent): boolean {
  // First try ability ID lookup for accurate detection
  const scribingInfo = getScribingSkillByAbilityId(talent.guid);
  if (scribingInfo) {
    return true;
  }

  // Fallback to pattern matching for cases where ability ID mapping is incomplete
  const grimoirePatterns = [
    'Wield Soul', 'Ulfsild\'s Contingency', 'Trample', 'Traveling Knife',
    'Banner Bearer', 'Scribing Altar', 'Soul Burst', 'Torchbearer',
    'Elemental Explosion', 'Shield Throw', 'Vault', 'Contingency',
    // Add more grimoire patterns as needed
  ];

  const talentName = talent.name.toLowerCase();
  return grimoirePatterns.some(pattern => 
    talentName.includes(pattern.toLowerCase()),
  );
}

/**
 * Enhanced tooltip props builder specifically for PlayerCard integration
 */
export function buildPlayerCardScribingTooltip(
  talent: PlayerTalent,
  combatEventData: CombatEventData,
  playerId: number,
  classKey?: string,
): SkillTooltipProps | null {
  // Check if this is a scribing skill first
  if (!isScribingSkill(talent)) {
    // Return regular tooltip for non-scribing skills
    return buildTooltipProps({
      abilityId: talent.guid,
      abilityName: talent.name,
      classKey,
    });
  }

  // Use enhanced scribing tooltip for scribing skills
  return buildEnhancedScribingTooltipProps({
    talent,
    combatEventData,
    playerId,
    classKey,
    abilityId: talent.guid,
    abilityName: talent.name,
  });
}

/**
 * Create summary statistics for affix script usage
 */
export function createAffixScriptUsageSummary(
  affixScriptAnalyses: Map<number, ScribedSkillDataWithAffix>,
): {
  totalScribingSkills: number;
  skillsWithAffixScripts: number;
  uniqueAffixScripts: string[];
  mostUsedAffixScript: string | null;
  averageConfidence: number;
} {
  const allAffixScripts: AffixScriptDetectionResult[] = [];
  let totalConfidence = 0;
  let confidenceCount = 0;

  affixScriptAnalyses.forEach(analysis => {
    if (analysis.affixScripts) {
      allAffixScripts.push(...analysis.affixScripts);
      analysis.affixScripts.forEach(affix => {
        totalConfidence += affix.confidence;
        confidenceCount++;
      });
    }
  });

  const uniqueAffixScripts = [...new Set(allAffixScripts.map(a => a.affixScript.name))];
  
  // Find most used affix script
  const affixCounts = new Map<string, number>();
  allAffixScripts.forEach(affix => {
    const current = affixCounts.get(affix.affixScript.name) || 0;
    affixCounts.set(affix.affixScript.name, current + 1);
  });

  let mostUsedAffixScript: string | null = null;
  let maxCount = 0;
  affixCounts.forEach((count, name) => {
    if (count > maxCount) {
      maxCount = count;
      mostUsedAffixScript = name;
    }
  });

  return {
    totalScribingSkills: affixScriptAnalyses.size,
    skillsWithAffixScripts: Array.from(affixScriptAnalyses.values())
      .filter(analysis => analysis.affixScripts && analysis.affixScripts.length > 0).length,
    uniqueAffixScripts,
    mostUsedAffixScript,
    averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
  };
}

export default {
  buildEnhancedScribingTooltipProps,
  analyzePlayerScribingSkillsWithAffixScripts,
  buildPlayerCardScribingTooltip,
  createAffixScriptUsageSummary,
};