/**
 * Enhanced Scribing Analysis with Signature Script Detection
 *
 * Integrates signature script detection with existing scribing skill analysis
 */

import { ScribedSkillData, ScribedSkillEffect } from '@/components/SkillTooltip';
import { ReportAbility } from '@/graphql/generated';
import {
  BuffEvent,
  UnifiedCastEvent,
  DamageEvent,
  DebuffEvent,
  HealEvent,
  ResourceChangeEvent,
} from '@/types/combatlogEvents';
import { PlayerTalent } from '@/types/playerDetails';

// Removed databaseSignatureScriptDetection - using unified detection instead
import {
  analyzeScribingSkillEffects,
  ScribingSkillAnalysis,
  GRIMOIRE_NAME_PATTERNS,
  SCRIBING_BLACKLIST,
  getScribingSkillByAbilityId,
} from './Scribing';
import { SignatureScript, SignatureScriptDetectionResult } from './signatureScriptDetection';

// Extended event types with optional extraAbilityGameID
type ExtendedBuffEvent = BuffEvent & {
  extraAbilityGameID?: number;
  sourceFile?: string;
};

type ExtendedDebuffEvent = DebuffEvent & {
  extraAbilityGameID?: number;
  sourceFile?: string;
};

type ExtendedResourceEvent = ResourceChangeEvent & {
  extraAbilityGameID?: number;
  sourceFile?: string;
};

// Player structure interfaces
interface PlayerData {
  id: number;
  combatantInfo?: {
    talents?: PlayerTalent[];
  };
}

interface PlayerDetails {
  data?: {
    playerDetails?: {
      tanks?: PlayerData[];
      dps?: PlayerData[];
      healers?: PlayerData[];
    };
  };
}

interface MasterData {
  reportData?: {
    report?: {
      masterData?: {
        abilities?: ReportAbility[];
      };
    };
  };
}

/**
 * Enhanced scribing skill analysis that includes signature script detection
 */
export function analyzeScribingSkillWithSignature(
  talent: PlayerTalent,
  allReportAbilities: ReportAbility[],
  allDebuffEvents: DebuffEvent[],
  allBuffEvents: BuffEvent[],
  allResourceEvents: ResourceChangeEvent[],
  allDamageEvents: DamageEvent[],
  allCastEvents: UnifiedCastEvent[],
  allHealingEvents: HealEvent[],
  playerId = 1,
): ScribedSkillData | null {
  // FIRST: Check if we have an exact ability ID match from the scribing database
  const scribingInfo = getScribingSkillByAbilityId(talent.guid);

  if (scribingInfo) {
    // We have a perfect match from the database, use it with 100% confidence
    return {
      grimoireName: scribingInfo.grimoire,
      effects: [], // Will be populated by other systems if needed
      recipe: {
        grimoire: scribingInfo.grimoire,
        transformation: scribingInfo.transformation,
        transformationType: scribingInfo.transformationType,
        confidence: 1.0, // 100% confidence for database matches
        matchMethod: 'ability-id-match',
        recipeSummary: `📖 ${scribingInfo.grimoire} + 🔄 ${scribingInfo.transformation}`,
        tooltipInfo: `📖 Grimoire: ${scribingInfo.grimoire}\n🔄 ${scribingInfo.transformationType}: ${scribingInfo.transformation}`,
      },
    };
  }

  // FALLBACK: If no ability ID match, run the existing scribing analysis
  // Filter UnifiedCastEvent to only include actual cast events
  const filteredCastEvents = allCastEvents.filter((event) => event.type === 'cast');

  const basicAnalysis = analyzeScribingSkillEffects(
    talent,
    allReportAbilities,
    allDebuffEvents,
    allBuffEvents,
    allResourceEvents,
    allDamageEvents,
    filteredCastEvents,
    allHealingEvents,
    playerId,
  );

  if (!basicAnalysis) {
    return null;
  }

  // Find abilities related to this scribed skill for signature detection
  const grimoirePattern = GRIMOIRE_NAME_PATTERNS[basicAnalysis.grimoire];
  const relatedAbilities = allReportAbilities.filter(
    (ability) =>
      ability.name && grimoirePattern.test(ability.name) && !SCRIBING_BLACKLIST.has(ability.name),
  );

  // Find related events for signature script detection
  const _relatedDamage = allDamageEvents.filter(
    (event) =>
      event.sourceID === playerId &&
      (event.abilityGameID === talent.guid ||
        relatedAbilities.some((ability) => ability.gameID === event.abilityGameID)),
  );

  const _relatedHealing = allHealingEvents.filter(
    (event) =>
      event.sourceID === playerId &&
      (event.abilityGameID === talent.guid ||
        relatedAbilities.some((ability) => ability.gameID === event.abilityGameID)),
  );

  const _relatedBuffs = allBuffEvents.filter(
    (event) =>
      event.sourceID === playerId &&
      (event.abilityGameID === talent.guid ||
        relatedAbilities.some((ability) => ability.gameID === event.abilityGameID) ||
        (event as ExtendedBuffEvent).extraAbilityGameID === talent.guid),
  );

  const _relatedDebuffs = allDebuffEvents.filter(
    (event) =>
      event.sourceID === playerId &&
      (event.abilityGameID === talent.guid ||
        relatedAbilities.some((ability) => ability.gameID === event.abilityGameID) ||
        (event as ExtendedDebuffEvent).extraAbilityGameID === talent.guid),
  );

  const _relatedResources = allResourceEvents.filter(
    (event) =>
      event.sourceID === playerId &&
      (event.abilityGameID === talent.guid ||
        relatedAbilities.some((ability) => ability.gameID === event.abilityGameID) ||
        (event as ExtendedResourceEvent).extraAbilityGameID === talent.guid),
  );

  // TODO: Replace with unified scribing detection
  const _allEventAbilityIds: number[] = [];
  const databaseSignatureDetection = {
    matchingAbilities: [],
    signatureScript: null,
    detectedScript: null,
    confidence: 0,
    matchingPatterns: [],
  };

  // Convert basic analysis effects to ScribedSkillEffect format
  const effects: ScribedSkillEffect[] = basicAnalysis.effects.map((effect) => ({
    abilityId: effect.abilityId,
    abilityName: effect.abilityName,
    type: determineEffectType(effect.events),
    count: effect.events.length,
  }));

  // Create the recipe information (convert database detection to expected format)
  const signatureDetectionForRecipe: SignatureScriptDetectionResult = {
    detectedScript: databaseSignatureDetection.detectedScript as SignatureScript | null,
    confidence: databaseSignatureDetection.confidence,
    matchingPatterns: databaseSignatureDetection.matchingPatterns,
    evidence: databaseSignatureDetection.matchingAbilities.map((abilityId) => ({
      type: 'ability-name' as const,
      value: abilityId,
      pattern: `Ability ID ${abilityId}`,
      weight: 1.0,
    })),
  };

  const recipe = createRecipeFromAnalysis(basicAnalysis, signatureDetectionForRecipe);

  // Build the result
  const result: ScribedSkillData = {
    grimoireName: basicAnalysis.grimoire,
    effects,
    recipe,
  };

  // Add signature script information using database detection
  // TODO: Replace with unified scribing detection
  const signatureScriptInfo = null;
  if (signatureScriptInfo) {
    result.signatureScript = signatureScriptInfo;
  }

  return result;
}

/**
 * Determine effect type from events
 */
function determineEffectType(events: unknown[]): ScribedSkillEffect['type'] {
  const hasSourceFile = (event: unknown): event is { sourceFile: string } =>
    typeof event === 'object' && event !== null && 'sourceFile' in event;

  if (events.some((e) => hasSourceFile(e) && e.sourceFile === 'damage-events')) return 'damage';
  if (events.some((e) => hasSourceFile(e) && e.sourceFile === 'healing-events')) return 'heal';
  if (events.some((e) => hasSourceFile(e) && e.sourceFile === 'buff-events')) return 'buff';
  if (events.some((e) => hasSourceFile(e) && e.sourceFile === 'debuff-events')) return 'debuff';
  if (events.some((e) => hasSourceFile(e) && e.sourceFile === 'resource-events')) return 'resource';
  return 'aura';
}

/**
 * Create recipe information from analysis and signature detection
 */
function createRecipeFromAnalysis(
  analysis: ScribingSkillAnalysis,
  signatureDetection: SignatureScriptDetectionResult,
): ScribedSkillData['recipe'] {
  const grimoire = analysis.grimoire;
  let transformation = 'unknown';
  let tooltipInfo = `Grimoire: ${grimoire}`;

  // Try to determine focus script from ability effects
  // This is a simplified approach - could be enhanced with more sophisticated analysis
  if (analysis.effects.length > 0) {
    const _firstEffect = analysis.effects[0];
    // This is where you could add logic to map specific effects to focus scripts
    transformation = 'focus-script-unknown';
  }

  if (signatureDetection.detectedScript) {
    const signatureName = formatSignatureScriptName(signatureDetection.detectedScript);
    tooltipInfo += `\nSignature Script: ${signatureName} (${Math.round(signatureDetection.confidence * 100)}% confidence)`;
  }

  return {
    grimoire,
    transformation,
    transformationType: 'scribing-analysis',
    confidence: signatureDetection.confidence,
    matchMethod: 'enhanced-pattern-analysis',
    recipeSummary: `${grimoire} + ${transformation}${signatureDetection.detectedScript ? ` + ${formatSignatureScriptName(signatureDetection.detectedScript)}` : ''}`,
    tooltipInfo,
  };
}

/**
 * Format signature script name for display
 */
function formatSignatureScriptName(script: SignatureScript): string {
  return script
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Analyze all players' scribing skills with signature script detection
 */
export function analyzeAllPlayersScribingSkillsWithSignatures(
  playerDetails: PlayerDetails,
  masterData: MasterData,
  allDebuffEvents: DebuffEvent[],
  allBuffEvents: BuffEvent[],
  allResourceEvents: ResourceChangeEvent[],
  allDamageEvents: DamageEvent[],
  allHealingEvents: HealEvent[],
  allCastEvents: UnifiedCastEvent[],
): Record<number, ScribedSkillData[]> {
  const result: Record<number, ScribedSkillData[]> = {};

  // Get all players from the player details structure
  const allPlayers = [
    ...(playerDetails.data?.playerDetails?.tanks || []),
    ...(playerDetails.data?.playerDetails?.dps || []),
    ...(playerDetails.data?.playerDetails?.healers || []),
  ];

  const allReportAbilities = masterData.reportData?.report?.masterData?.abilities || [];

  // Analyze each player's scribing skills
  allPlayers.forEach((player: PlayerData) => {
    const playerId = player.id;
    const talents = player.combatantInfo?.talents || [];

    const scribingAnalyses: ScribedSkillData[] = [];

    talents.forEach((talent: PlayerTalent) => {
      const analysis = analyzeScribingSkillWithSignature(
        talent,
        allReportAbilities,
        allDebuffEvents,
        allBuffEvents,
        allResourceEvents,
        allDamageEvents,
        allCastEvents,
        allHealingEvents,
        playerId,
      );

      if (analysis) {
        scribingAnalyses.push(analysis);
      }
    });

    if (scribingAnalyses.length > 0) {
      result[playerId] = scribingAnalyses;
    }
  });

  return result;
}
