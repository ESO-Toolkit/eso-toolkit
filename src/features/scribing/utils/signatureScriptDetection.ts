/**
 * Signature Script Detection for ESO Scribing System
 *
 * This utility analyzes ability usage patterns in combat logs to determine
 * which signature script was used for scribed skills.
 */

import { ReportAbility } from '@/graphql/generated';
import {
  BuffEvent,
  CastEvent,
  DamageEvent,
  DebuffEvent,
  HealEvent,
  ResourceChangeEvent,
} from '@/types/combatlogEvents';
import { PlayerTalent } from '@/types/playerDetails';

import { Effect } from './Scribing';

// Extended event interfaces with optional properties for signature script detection
interface ExtendedDamageEvent extends DamageEvent {
  damageTypeFlags?: number;
  isDot?: boolean;
  periodicDamage?: boolean;
}

interface ExtendedHealEvent extends HealEvent {
  tick?: boolean;
  isHot?: boolean;
  periodicHealing?: boolean;
}

/**
 * Signature script types and their characteristic effects
 */
export enum SignatureScript {
  LINGERING_TORMENT = 'lingering-torment',
  HUNTERS_SNARE = 'hunters-snare',
  KNIGHTS_VALOR = 'knights-valor',
  LEECHING_THIRST = 'leeching-thirst',
  ECHOING_VIGOR = 'echoing-vigor',
  CRUSHING_IMPACT = 'crushing-impact',
  ELEMENTAL_BURST = 'elemental-burst',
  MAGICAL_EXPLOSION = 'magical-explosion',
  BURNING_EMBERS = 'burning-embers',
  FROST_EXPLOSION = 'frost-explosion',
  SHOCKING_EXPLOSION = 'shocking-explosion',
  POISON_EXPLOSION = 'poison-explosion',
  DISEASE_EXPLOSION = 'disease-explosion',
  VAMPIRIC_EXPLOSION = 'vampiric-explosion',
  HEROIC_RESOLVE = 'heroic-resolve',
  BRUTAL_WEAPON = 'brutal-weapon',
  VOID_EXPLOSION = 'void-explosion',
  SPECTRAL_EXPLOSION = 'spectral-explosion',
  SOUL_EXPLOSION = 'soul-explosion',
  BLOOD_EXPLOSION = 'blood-explosion',
}

/**
 * Effects that help identify signature scripts
 */
export interface SignatureScriptEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'resource';
  subtype?: 'dot' | 'hot' | 'aoe' | 'single' | 'instant' | 'over-time';
  keywords: string[];
  damageTypes?: number[]; // ESO damage type IDs
  abilityNamePatterns?: RegExp[];
}

/**
 * Signature script detection patterns
 */
export const SIGNATURE_SCRIPT_PATTERNS: Record<SignatureScript, SignatureScriptEffect[]> = {
  [SignatureScript.LINGERING_TORMENT]: [
    {
      type: 'damage',
      subtype: 'dot',
      keywords: ['torment', 'lingering', 'damage over time', 'dot'],
      abilityNamePatterns: [/torment/i, /lingering/i],
    },
  ],
  [SignatureScript.HUNTERS_SNARE]: [
    {
      type: 'debuff',
      keywords: ['snare', 'immobilize', 'slow', 'root'],
      abilityNamePatterns: [/snare/i, /immobilize/i, /root/i],
    },
  ],
  [SignatureScript.KNIGHTS_VALOR]: [
    {
      type: 'buff',
      keywords: ['armor', 'resistance', 'block', 'shield', 'valor'],
      abilityNamePatterns: [/armor/i, /resistance/i, /valor/i],
    },
  ],
  [SignatureScript.LEECHING_THIRST]: [
    {
      type: 'heal',
      subtype: 'instant',
      keywords: ['leech', 'life steal', 'thirst', 'drain'],
      abilityNamePatterns: [/leech/i, /thirst/i, /drain/i],
    },
  ],
  [SignatureScript.ECHOING_VIGOR]: [
    {
      type: 'heal',
      subtype: 'hot',
      keywords: ['vigor', 'regeneration', 'echo', 'heal over time'],
      abilityNamePatterns: [/vigor/i, /regeneration/i, /echo/i],
    },
  ],
  [SignatureScript.CRUSHING_IMPACT]: [
    {
      type: 'damage',
      subtype: 'instant',
      keywords: ['crush', 'impact', 'stagger', 'knockdown'],
      abilityNamePatterns: [/crush/i, /impact/i, /stagger/i],
    },
  ],
  [SignatureScript.ELEMENTAL_BURST]: [
    {
      type: 'damage',
      subtype: 'aoe',
      keywords: ['elemental', 'burst', 'area'],
      damageTypes: [2, 4, 8], // Fire, Frost, Shock
      abilityNamePatterns: [/elemental/i, /burst/i],
    },
  ],
  [SignatureScript.MAGICAL_EXPLOSION]: [
    {
      type: 'damage',
      subtype: 'aoe',
      keywords: ['magical', 'explosion', 'magic'],
      damageTypes: [64], // Magic damage
      abilityNamePatterns: [/magical/i, /explosion/i],
    },
  ],
  [SignatureScript.BURNING_EMBERS]: [
    {
      type: 'damage',
      subtype: 'dot',
      keywords: ['burning', 'embers', 'fire', 'flame'],
      damageTypes: [2], // Fire damage
      abilityNamePatterns: [/burning/i, /embers/i, /fire/i, /flame/i],
    },
  ],
  [SignatureScript.FROST_EXPLOSION]: [
    {
      type: 'damage',
      subtype: 'aoe',
      keywords: ['frost', 'ice', 'cold', 'explosion'],
      damageTypes: [4], // Frost damage
      abilityNamePatterns: [/frost/i, /ice/i, /cold/i],
    },
  ],
  [SignatureScript.SHOCKING_EXPLOSION]: [
    {
      type: 'damage',
      subtype: 'aoe',
      keywords: ['shock', 'lightning', 'electric', 'explosion'],
      damageTypes: [8], // Shock damage
      abilityNamePatterns: [/shock/i, /lightning/i, /electric/i],
    },
  ],
  [SignatureScript.POISON_EXPLOSION]: [
    {
      type: 'damage',
      subtype: 'aoe',
      keywords: ['poison', 'toxic', 'venom', 'explosion'],
      damageTypes: [16], // Poison damage
      abilityNamePatterns: [/poison/i, /toxic/i, /venom/i],
    },
  ],
  [SignatureScript.DISEASE_EXPLOSION]: [
    {
      type: 'damage',
      subtype: 'aoe',
      keywords: ['disease', 'plague', 'infection', 'explosion'],
      damageTypes: [32], // Disease damage
      abilityNamePatterns: [/disease/i, /plague/i, /infection/i],
    },
  ],
  [SignatureScript.VAMPIRIC_EXPLOSION]: [
    {
      type: 'damage',
      subtype: 'aoe',
      keywords: ['vampiric', 'vampire', 'blood', 'drain'],
      abilityNamePatterns: [/vampiric/i, /vampire/i, /blood/i],
    },
  ],
  [SignatureScript.HEROIC_RESOLVE]: [
    {
      type: 'buff',
      keywords: ['heroic', 'resolve', 'courage', 'fortitude'],
      abilityNamePatterns: [/heroic/i, /resolve/i, /courage/i],
    },
  ],
  [SignatureScript.BRUTAL_WEAPON]: [
    {
      type: 'buff',
      keywords: ['brutal', 'weapon', 'damage', 'power'],
      abilityNamePatterns: [/brutal/i, /weapon/i],
    },
  ],
  [SignatureScript.VOID_EXPLOSION]: [
    {
      type: 'damage',
      subtype: 'aoe',
      keywords: ['void', 'oblivion', 'explosion'],
      abilityNamePatterns: [/void/i, /oblivion/i],
    },
  ],
  [SignatureScript.SPECTRAL_EXPLOSION]: [
    {
      type: 'damage',
      subtype: 'aoe',
      keywords: ['spectral', 'spirit', 'ghost', 'explosion'],
      abilityNamePatterns: [/spectral/i, /spirit/i, /ghost/i],
    },
  ],
  [SignatureScript.SOUL_EXPLOSION]: [
    {
      type: 'damage',
      subtype: 'aoe',
      keywords: ['soul', 'spirit', 'explosion'],
      abilityNamePatterns: [/soul/i, /spirit/i],
    },
  ],
  [SignatureScript.BLOOD_EXPLOSION]: [
    {
      type: 'damage',
      subtype: 'aoe',
      keywords: ['blood', 'crimson', 'explosion'],
      abilityNamePatterns: [/blood/i, /crimson/i],
    },
  ],
};

/**
 * Result interface for signature script detection
 */
export interface SignatureScriptDetectionResult {
  detectedScript: SignatureScript | null;
  confidence: number; // 0-1 scale
  evidence: SignatureScriptEvidence[];
  matchingPatterns: string[];
}

export interface SignatureScriptEvidence {
  type: 'ability-name' | 'damage-type' | 'effect-type' | 'buff-debuff';
  value: string | number;
  pattern: string;
  weight: number; // How strongly this suggests the signature script
}

/**
 * Detect signature script used in a scribed skill based on observed abilities and effects
 */
export function detectSignatureScript(
  relatedAbilities: ReportAbility[],
  damageEvents: DamageEvent[],
  healEvents: HealEvent[],
  buffEvents: BuffEvent[],
  debuffEvents: DebuffEvent[],
  _resourceEvents: ResourceChangeEvent[],
): SignatureScriptDetectionResult {
  const evidence: SignatureScriptEvidence[] = [];
  const patternMatches: Record<SignatureScript, { score: number; matches: string[] }> =
    {} as Record<SignatureScript, { score: number; matches: string[] }>;

  // Initialize pattern matches
  Object.values(SignatureScript).forEach((script) => {
    patternMatches[script] = { score: 0, matches: [] };
  });

  // Analyze ability names for signature script patterns
  relatedAbilities.forEach((ability) => {
    if (!ability.name) return;

    Object.entries(SIGNATURE_SCRIPT_PATTERNS).forEach(([script, patterns]) => {
      patterns.forEach((pattern) => {
        if (pattern.abilityNamePatterns) {
          pattern.abilityNamePatterns.forEach((regex) => {
            if (regex.test(ability.name!)) {
              const weight = 0.8; // High weight for ability name matches
              patternMatches[script as SignatureScript].score += weight;
              patternMatches[script as SignatureScript].matches.push(
                `ability-name: ${ability.name}`,
              );

              evidence.push({
                type: 'ability-name',
                value: ability.name!,
                pattern: regex.source,
                weight,
              });
            }
          });
        }
      });
    });
  });

  // Analyze damage types
  damageEvents.forEach((event) => {
    Object.entries(SIGNATURE_SCRIPT_PATTERNS).forEach(([script, patterns]) => {
      patterns.forEach((pattern) => {
        // Use damageTypeFlags from extended properties if available
        const damageTypeFlags = (event as ExtendedDamageEvent).damageTypeFlags;
        if (
          pattern.damageTypes &&
          damageTypeFlags &&
          pattern.damageTypes.includes(damageTypeFlags)
        ) {
          const weight = 0.6; // Medium weight for damage type matches
          patternMatches[script as SignatureScript].score += weight;
          patternMatches[script as SignatureScript].matches.push(`damage-type: ${damageTypeFlags}`);

          evidence.push({
            type: 'damage-type',
            value: damageTypeFlags,
            pattern: pattern.type,
            weight,
          });
        }
      });
    });
  });

  // Analyze effect types (damage over time, heals over time, etc.)
  const hasDoT = damageEvents.some(
    (event) =>
      event.tick ||
      (event as ExtendedDamageEvent).isDot ||
      (event as ExtendedDamageEvent).periodicDamage,
  );

  const hasHoT = healEvents.some(
    (event) =>
      (event as ExtendedHealEvent).tick ||
      (event as ExtendedHealEvent).isHot ||
      (event as ExtendedHealEvent).periodicHealing,
  );

  if (hasDoT) {
    // DoT effects suggest certain signature scripts
    [SignatureScript.LINGERING_TORMENT, SignatureScript.BURNING_EMBERS].forEach((script) => {
      const weight = 0.7;
      patternMatches[script].score += weight;
      patternMatches[script].matches.push('effect-type: damage-over-time');

      evidence.push({
        type: 'effect-type',
        value: 'damage-over-time',
        pattern: 'dot',
        weight,
      });
    });
  }

  if (hasHoT) {
    // HoT effects suggest healing signature scripts
    [SignatureScript.ECHOING_VIGOR].forEach((script) => {
      const weight = 0.7;
      patternMatches[script].score += weight;
      patternMatches[script].matches.push('effect-type: heal-over-time');

      evidence.push({
        type: 'effect-type',
        value: 'heal-over-time',
        pattern: 'hot',
        weight,
      });
    });
  }

  // Analyze buff/debuff effects
  const hasBuffs = buffEvents.length > 0;
  const hasDebuffs = debuffEvents.length > 0;

  if (hasDebuffs) {
    [SignatureScript.HUNTERS_SNARE].forEach((script) => {
      const weight = 0.5;
      patternMatches[script].score += weight;
      patternMatches[script].matches.push('effect-type: debuff');

      evidence.push({
        type: 'buff-debuff',
        value: 'debuff',
        pattern: 'debuff',
        weight,
      });
    });
  }

  if (hasBuffs) {
    [
      SignatureScript.KNIGHTS_VALOR,
      SignatureScript.HEROIC_RESOLVE,
      SignatureScript.BRUTAL_WEAPON,
    ].forEach((script) => {
      const weight = 0.4;
      patternMatches[script].score += weight;
      patternMatches[script].matches.push('effect-type: buff');

      evidence.push({
        type: 'buff-debuff',
        value: 'buff',
        pattern: 'buff',
        weight,
      });
    });
  }

  // Find the highest scoring signature script
  let bestScript: SignatureScript | null = null;
  let bestScore = 0;
  let bestMatches: string[] = [];

  Object.entries(patternMatches).forEach(([script, data]) => {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestScript = script as SignatureScript;
      bestMatches = data.matches;
    }
  });

  // Calculate confidence based on score and number of matches
  const confidence = Math.min(bestScore / 2, 1); // Normalize to 0-1 scale

  return {
    detectedScript: confidence > 0.3 ? bestScript : null, // Only return if confidence > 30%
    confidence,
    evidence,
    matchingPatterns: bestMatches,
  };
}

/**
 * Enhanced scribing skill analysis that includes signature script detection
 */
export interface EnhancedScribingSkillAnalysis {
  grimoire: string;
  focusScript?: string;
  signatureScript?: SignatureScript;
  signatureScriptConfidence?: number;
  effects: Effect[];
  talentName: string;
  talentGuid: number;
  detectionDetails?: SignatureScriptDetectionResult;
}

/**
 * Analyze scribing skill and detect signature script
 */
export function analyzeScribingSkillWithSignatureDetection(
  talent: PlayerTalent,
  allReportAbilities: ReportAbility[],
  allDebuffEvents: DebuffEvent[],
  allBuffEvents: BuffEvent[],
  allResourceEvents: ResourceChangeEvent[],
  allDamageEvents: DamageEvent[],
  allCastEvents: CastEvent[],
  allHealingEvents: HealEvent[],
  playerId = 1,
): EnhancedScribingSkillAnalysis | null {
  // First, get the basic scribing analysis
  // This would call your existing analyzeScribingSkillEffects function
  // For now, let's create a simplified version

  // Find related abilities for this talent
  const relatedAbilities = allReportAbilities.filter(
    (ability) => ability.name && ability.name.includes(talent.name?.split(' ')[0] || ''),
  );

  if (relatedAbilities.length === 0) {
    return null;
  }

  // Find events related to this talent
  const relatedDamage = allDamageEvents.filter(
    (event) =>
      event.sourceID === playerId &&
      (event.abilityGameID === talent.guid ||
        relatedAbilities.some((ability) => ability.gameID === event.abilityGameID)),
  );

  const relatedHealing = allHealingEvents.filter(
    (event) =>
      event.sourceID === playerId &&
      (event.abilityGameID === talent.guid ||
        relatedAbilities.some((ability) => ability.gameID === event.abilityGameID)),
  );

  const relatedBuffs = allBuffEvents.filter(
    (event) =>
      event.sourceID === playerId &&
      (event.abilityGameID === talent.guid ||
        relatedAbilities.some((ability) => ability.gameID === event.abilityGameID)),
  );

  const relatedDebuffs = allDebuffEvents.filter(
    (event) =>
      event.sourceID === playerId &&
      (event.abilityGameID === talent.guid ||
        relatedAbilities.some((ability) => ability.gameID === event.abilityGameID)),
  );

  const relatedResources = allResourceEvents.filter(
    (event) =>
      event.sourceID === playerId &&
      (event.abilityGameID === talent.guid ||
        relatedAbilities.some((ability) => ability.gameID === event.abilityGameID)),
  );

  // Detect signature script
  const signatureDetection = detectSignatureScript(
    relatedAbilities,
    relatedDamage,
    relatedHealing,
    relatedBuffs,
    relatedDebuffs,
    relatedResources,
  );

  return {
    grimoire: 'unknown', // Would need to detect this from talent name patterns
    signatureScript: signatureDetection.detectedScript || undefined,
    signatureScriptConfidence: signatureDetection.confidence,
    effects: [], // Would populate with actual effects
    talentName: talent.name || '',
    talentGuid: talent.guid || 0,
    detectionDetails: signatureDetection,
  };
}
