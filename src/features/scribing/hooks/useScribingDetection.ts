/**
 * React hook for scribing detection
 * Uses the authoritative scribing database for comprehensive ability ID lookup
 * and integrates with existing detection algorithms for signature and affix scripts
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';

import { Logger, LogLevel } from '@/contexts/LoggerContext';
import { selectActivePlayersById } from '@/store/player_data/playerDataSelectors';
import { useAppDispatch } from '@/store/useAppDispatch';
import {
  executeScribingDetectionsTask,
  selectScribingDetectionsResult,
  selectScribingDetectionsTask,
} from '@/store/worker_results';

import scribingData from '../../../../data/scribing-complete.json';
// Import event hooks instead of selectors to ensure data is fetched
import { useCastEvents } from '../../../hooks/events/useCastEvents';
import { useDamageEvents } from '../../../hooks/events/useDamageEvents';
import { useDebuffEvents } from '../../../hooks/events/useDebuffEvents';
import { useFriendlyBuffEvents } from '../../../hooks/events/useFriendlyBuffEvents';
import { useHealingEvents } from '../../../hooks/events/useHealingEvents';
import { useHostileBuffEvents } from '../../../hooks/events/useHostileBuffEvents';
import { useResourceEvents } from '../../../hooks/events/useResourceEvents';
import type {
  BuffEvent,
  DebuffEvent,
  DamageEvent,
  UnifiedCastEvent,
  HealEvent,
  ResourceChangeEvent,
} from '../../../types/combatlogEvents';
import {
  computeScribingDetection,
  SCRIBING_DETECTION_SCHEMA_VERSION,
  type PlayerAbilityList,
} from '../analysis/scribingDetectionAnalysis';
import type { ScribedSkillData, ResolvedScribingDetection } from '../types';
import {
  getScribingSkillByAbilityId,
  isScribingAbility,
  type ScribingSkillInfo,
} from '../utils/Scribing';

interface ScribingDataStructure {
  grimoires?: Record<string, { id?: number; nameTransformations?: Record<string, unknown> }>;
  signatureScripts?: Record<
    string,
    { name?: string; abilityIds?: number[]; compatibleGrimoires?: string[] }
  >;
  affixScripts?: Record<
    string,
    { name: string; abilityIds?: number[]; compatibleGrimoires?: string[] }
  >;
}

// Module-level logger for standalone functions
const moduleLogger = new Logger({ level: LogLevel.INFO, contextPrefix: 'ScribingDetection' });

// Extract all valid signature script ability IDs from the scribing database
const VALID_SIGNATURE_SCRIPT_IDS = new Set<number>();
const SIGNATURE_SCRIPT_ID_TO_NAME = new Map<number, string>();
Object.values(scribingData.signatureScripts).forEach(
  (script: {
    name: string;
    abilityIds?: number[];
    grimoireSpecificEffects?: Record<string, { mainAbilityId?: number; statusEffects?: number[] }>;
  }) => {
    if (script.abilityIds) {
      script.abilityIds.forEach((id: number) => {
        VALID_SIGNATURE_SCRIPT_IDS.add(id);
        SIGNATURE_SCRIPT_ID_TO_NAME.set(id, script.name);
      });
    }

    // Also include grimoire-specific status effects for signatures like Assassin's Misery
    if (script.grimoireSpecificEffects) {
      Object.values(script.grimoireSpecificEffects).forEach(
        (grimoireConfig: { mainAbilityId?: number; statusEffects?: number[] }) => {
          // Add main ability ID
          if (grimoireConfig.mainAbilityId) {
            VALID_SIGNATURE_SCRIPT_IDS.add(grimoireConfig.mainAbilityId);
            SIGNATURE_SCRIPT_ID_TO_NAME.set(grimoireConfig.mainAbilityId, script.name);
          }
          // Add status effect IDs
          if (grimoireConfig.statusEffects) {
            grimoireConfig.statusEffects.forEach((id: number) => {
              VALID_SIGNATURE_SCRIPT_IDS.add(id);
              SIGNATURE_SCRIPT_ID_TO_NAME.set(id, script.name);
            });
          }
        },
      );

      // ESO combat logs surface the Arcanist Class Mastery signature via ability 252143 (Crux/Ultimate
      // tick) instead of the class-specific banner IDs that live in the scribing database. Manually map
      // that ability so our detectors can positively identify Class Mastery from resource events.
      const CLASS_MASTERY_EXTRA_EFFECT_IDS = [252143];
      const classMasteryScript = (
        scribingData.signatureScripts as Record<string, { name: string }>
      )['class-mastery'];
      if (classMasteryScript) {
        CLASS_MASTERY_EXTRA_EFFECT_IDS.forEach((id) => {
          VALID_SIGNATURE_SCRIPT_IDS.add(id);
          SIGNATURE_SCRIPT_ID_TO_NAME.set(id, classMasteryScript.name ?? 'Class Mastery');
        });
      }
    }
  },
);

// Extract all valid affix script ability IDs from the scribing database
const VALID_AFFIX_SCRIPT_IDS = new Set<number>();
const AFFIX_SCRIPT_ID_TO_NAME = new Map<number, string>();
Object.values(scribingData.affixScripts).forEach(
  (script: { name: string; abilityIds?: number[] }) => {
    if (script.abilityIds) {
      script.abilityIds.forEach((id: number) => {
        VALID_AFFIX_SCRIPT_IDS.add(id);
        AFFIX_SCRIPT_ID_TO_NAME.set(id, script.name);
      });
    }
  },
);

// Certain scribing abilities (e.g., Ulfsild's Contingency) delay their affix trigger
// until the next resource-costing skill is used.
const DEFERRED_AFFIX_TRIGGER_ABILITIES = new Set<number>([240150]);

const BANNER_GRIMOIRE_KEY = 'banner-bearer';
const BANNER_PSEUDO_CAST_WINDOW_MS = 1000;

const bannerGrimoire = (scribingData as ScribingDataStructure).grimoires?.[BANNER_GRIMOIRE_KEY];
const BANNER_PRIMARY_ABILITY_IDS = new Set<number>();

if (bannerGrimoire?.nameTransformations) {
  Object.entries(
    bannerGrimoire.nameTransformations as Record<string, { name: string; abilityIds?: number[] }>,
  ).forEach(([, config]) => {
    const primaryAbilityId = config.abilityIds?.[0];
    if (typeof primaryAbilityId === 'number') {
      BANNER_PRIMARY_ABILITY_IDS.add(primaryAbilityId);
    }
  });
}

const SCRIBING_INFO_CACHE = new Map<number, ScribingSkillInfo | null>();

function lookupScribingSkill(abilityId: number): ScribingSkillInfo | null {
  if (!SCRIBING_INFO_CACHE.has(abilityId)) {
    SCRIBING_INFO_CACHE.set(abilityId, getScribingSkillByAbilityId(abilityId));
  }
  return SCRIBING_INFO_CACHE.get(abilityId) ?? null;
}

// ESO Logs omit explicit cast events for Banner Bearer; derive them from buff applications instead.
function _synthesizeBannerCasts(
  casts: UnifiedCastEvent[],
  buffs: BuffEvent[],
  abilityId: number,
  playerId: number,
  baseInfo: ScribingSkillInfo,
): UnifiedCastEvent[] {
  const syntheticCasts: UnifiedCastEvent[] = [];
  const lastSyntheticTimestampByPlayer = new Map<number, number>();

  for (const buff of buffs) {
    if (buff.sourceID !== playerId) {
      continue;
    }
    if (buff.type !== 'applybuff' && buff.type !== 'applybuffstack') {
      continue;
    }

    const buffScribingInfo = lookupScribingSkill(buff.abilityGameID);
    if (!buffScribingInfo) {
      continue;
    }
    if (buffScribingInfo.grimoireKey !== baseInfo.grimoireKey) {
      continue;
    }
    const baseIsBannerBaseAbility =
      baseInfo.grimoireKey === BANNER_GRIMOIRE_KEY && baseInfo.grimoireId === baseInfo.abilityId;
    if (!baseIsBannerBaseAbility && buffScribingInfo.transformation !== baseInfo.transformation) {
      continue;
    }

    const lastTimestamp = lastSyntheticTimestampByPlayer.get(playerId);
    if (
      lastTimestamp !== undefined &&
      buff.timestamp - lastTimestamp < BANNER_PSEUDO_CAST_WINDOW_MS
    ) {
      continue;
    }

    lastSyntheticTimestampByPlayer.set(playerId, buff.timestamp);

    syntheticCasts.push({
      timestamp: buff.timestamp,
      type: 'cast',
      sourceID: buff.sourceID,
      sourceIsFriendly: buff.sourceIsFriendly,
      targetID: buff.targetID,
      targetIsFriendly: buff.targetIsFriendly,
      abilityGameID: abilityId,
      fight: buff.fight,
      fake: true,
    });
  }

  if (syntheticCasts.length === 0) {
    return casts;
  }

  return [...casts, ...syntheticCasts].sort((a, b) => a.timestamp - b.timestamp);
}

function _resolveBannerPrimaryAbilityId(
  abilityId: number,
  playerId: number,
  buffs: BuffEvent[],
): ScribingSkillInfo | null {
  if (!playerId) {
    return null;
  }

  const counts = new Map<number, number>();

  buffs.forEach((buff) => {
    if (buff.sourceID !== playerId) {
      return;
    }
    if (buff.type !== 'applybuff' && buff.type !== 'applybuffstack') {
      return;
    }
    if (!BANNER_PRIMARY_ABILITY_IDS.has(buff.abilityGameID)) {
      return;
    }

    const current = counts.get(buff.abilityGameID) ?? 0;
    counts.set(buff.abilityGameID, current + 1);
  });

  if (counts.size === 0) {
    return null;
  }

  let topAbilityId = abilityId;
  let topCount = counts.get(abilityId) ?? 0;

  counts.forEach((count, candidateId) => {
    if (count > topCount) {
      topAbilityId = candidateId;
      topCount = count;
    }
  });

  if (topAbilityId === abilityId) {
    return null;
  }

  const info = lookupScribingSkill(topAbilityId);
  if (!info || info.grimoireKey !== BANNER_GRIMOIRE_KEY) {
    return null;
  }

  return info;
}

export interface CombatEventData {
  buffs: BuffEvent[];
  debuffs: DebuffEvent[];
  damage: DamageEvent[];
  casts: UnifiedCastEvent[];
  heals: HealEvent[];
  resources: ResourceChangeEvent[];
}

export interface UseScribingDetectionOptions {
  fightId?: string | null;
  playerId?: number;
  abilityId?: number;
  enabled?: boolean;
}

export interface UseScribingDetectionResult {
  data: ResolvedScribingDetection | null;
  scribedSkillData: ScribedSkillData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Detect signature script from combat events
 * Analyzes buff/debuff/resource patterns to identify signature script
 *
 * Signature scripts modify HOW the ability works (e.g., adding healing, damage over time, resource generation, etc.)
 * They typically apply specific buffs, debuffs, or resource changes with recognizable patterns.
 *
 * Examples:
 * - Lingering Torment: Adds DoT effects (damage events)
 * - Anchorite's Potency: Grants ultimate (resource events with ability ID 216940 "Potent Soul")
 * - Anchorite's Cruelty: Enhances soul magic effects (buff/debuff events)
 */
async function _detectSignatureScript(
  abilityId: number,
  playerId: number,
  combatEvents: CombatEventData,
): Promise<{
  name: string;
  confidence: number;
  detectionMethod: string;
  evidence: string[];
} | null> {
  try {
    // Find all casts of this ability by this player
    const abilityCasts = combatEvents.casts.filter(
      (e) => e.sourceID === playerId && e.abilityGameID === abilityId,
    );

    if (abilityCasts.length === 0) {
      return null;
    }

    // Analyze all event types that appear consistently after casts
    const SIGNATURE_WINDOW_MS = 1500; // Signature effects appear within 1.5 seconds (some like Gladiator's Tenacity trigger at ~1.2s)
    const signatureEffects = new Map<number, { name: string; count: number; type: string }>();

    // Helper function to check and count signature script IDs
    const checkAndCountSignature = (
      event: { abilityGameID: number; extraAbilityGameID?: number },
      eventType: string,
    ): void => {
      // Check primary abilityGameID
      if (
        event.abilityGameID !== abilityId &&
        VALID_SIGNATURE_SCRIPT_IDS.has(event.abilityGameID)
      ) {
        const existing = signatureEffects.get(event.abilityGameID) || {
          name: `${eventType} ${event.abilityGameID}`,
          count: 0,
          type: eventType,
        };
        signatureEffects.set(event.abilityGameID, { ...existing, count: existing.count + 1 });
      }
      // Check extraAbilityGameID
      if (
        event.extraAbilityGameID &&
        event.extraAbilityGameID !== abilityId &&
        VALID_SIGNATURE_SCRIPT_IDS.has(event.extraAbilityGameID)
      ) {
        const existing = signatureEffects.get(event.extraAbilityGameID) || {
          name: `${eventType} ${event.extraAbilityGameID}`,
          count: 0,
          type: eventType,
        };
        signatureEffects.set(event.extraAbilityGameID, { ...existing, count: existing.count + 1 });
      }
    };

    for (const cast of abilityCasts) {
      const windowEnd = cast.timestamp + SIGNATURE_WINDOW_MS;

      // Check buffs
      const postCastBuffs = combatEvents.buffs.filter(
        (b) => b.sourceID === playerId && b.timestamp > cast.timestamp && b.timestamp <= windowEnd,
      );
      postCastBuffs.forEach((b) => checkAndCountSignature(b, 'buff'));

      // Check debuffs
      const postCastDebuffs = combatEvents.debuffs.filter(
        (d) => d.sourceID === playerId && d.timestamp > cast.timestamp && d.timestamp <= windowEnd,
      );
      postCastDebuffs.forEach((d) => checkAndCountSignature(d, 'debuff'));

      // Check damage events
      const postCastDamage = combatEvents.damage.filter(
        (d) => d.sourceID === playerId && d.timestamp > cast.timestamp && d.timestamp <= windowEnd,
      );
      postCastDamage.forEach((d) => checkAndCountSignature(d, 'damage'));

      // Check healing events
      const postCastHeals = combatEvents.heals.filter(
        (h) => h.sourceID === playerId && h.timestamp > cast.timestamp && h.timestamp <= windowEnd,
      );
      postCastHeals.forEach((h) => checkAndCountSignature(h, 'healing'));

      // Check resource events (e.g., Anchorite's Potency grants ultimate via resource events)
      const postCastResources = combatEvents.resources.filter(
        (r) => r.sourceID === playerId && r.timestamp > cast.timestamp && r.timestamp <= windowEnd,
      );
      postCastResources.forEach((r) => checkAndCountSignature(r, 'resource'));

      // Check cast events (signature scripts can trigger additional casts)
      const postCastCasts = combatEvents.casts.filter(
        (c) =>
          c.sourceID === playerId &&
          c.abilityGameID !== abilityId && // Exclude the original ability
          c.timestamp > cast.timestamp &&
          c.timestamp <= windowEnd,
      );
      postCastCasts.forEach((c) => checkAndCountSignature(c, 'cast'));
    }

    // Signature effects should appear consistently (in at least 50% of casts)
    const MIN_CONSISTENCY = 0.5;
    const consistentEffects = Array.from(signatureEffects.entries())
      .filter(([_, effect]) => effect.count >= abilityCasts.length * MIN_CONSISTENCY)
      .sort((a, b) => b[1].count - a[1].count);

    if (consistentEffects.length > 0) {
      const [topEffectId, topEffect] = consistentEffects[0];
      const confidence = Math.min(0.95, topEffect.count / abilityCasts.length);

      // Look up the signature script name from the database
      const scriptName = SIGNATURE_SCRIPT_ID_TO_NAME.get(topEffectId);

      return {
        name: scriptName || `Signature Script (Effect ID: ${topEffectId})`,
        confidence,
        detectionMethod: 'Post-Cast Pattern Analysis',
        evidence: [
          `Analyzed ${abilityCasts.length} casts`,
          `Found ${consistentEffects.length} consistent effects`,
          `Top effect: ${topEffect.type} ID ${topEffectId} (${topEffect.count}/${abilityCasts.length} casts)`,
          ...consistentEffects
            .slice(0, 3)
            .map(([id, eff]) => `${eff.type} ${id}: ${eff.count} occurrences`),
        ],
      };
    }

    // If no signature script detected above threshold, check for highly correlated abilities
    // Show abilities that appear in at least (n-2) casts (or 50% if fewer than 4 casts)
    const minCorrelation =
      abilityCasts.length >= 4 ? abilityCasts.length - 2 : Math.ceil(abilityCasts.length * 0.5);

    const highlyCorrelated = Array.from(signatureEffects.entries())
      .filter(([_, effect]) => effect.count >= minCorrelation)
      .sort((a, b) => b[1].count - a[1].count);

    if (highlyCorrelated.length > 0) {
      // Return info about correlated abilities instead of null
      const correlatedIds = highlyCorrelated
        .slice(0, 5)
        .map(([id, eff]) => `${eff.type} ${id} (${eff.count}/${abilityCasts.length} casts)`);

      return {
        name: 'Correlated Abilities Detected',
        confidence: 0.3, // Low confidence since not identified as signature script
        detectionMethod: 'Correlation Analysis',
        evidence: [
          `Analyzed ${abilityCasts.length} casts`,
          `No signature script identified (need ≥${Math.ceil(abilityCasts.length * MIN_CONSISTENCY)}/${abilityCasts.length} consistency)`,
          `Found ${highlyCorrelated.length} highly correlated abilities (≥${minCorrelation}/${abilityCasts.length} casts):`,
          ...correlatedIds,
          `💡 These may be ability effects rather than signature scripts`,
        ],
      };
    }

    return null;
  } catch (error) {
    moduleLogger.error(
      'Error detecting signature script',
      error instanceof Error ? error : undefined,
      { abilityId, playerId },
    );
    return null;
  }
}

/**
 * Detect affix scripts from combat events
 * Analyzes persistent effects and special combat patterns
 *
 * Affix scripts add ADDITIONAL effects to the ability (e.g., applying Off Balance, granting buffs, etc.)
 * They create persistent effects or modify combat outcomes in specific ways.
 */
async function _detectAffixScripts(
  abilityId: number,
  playerId: number,
  combatEvents: CombatEventData,
  grimoireKey?: string,
): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    confidence: number;
    detectionMethod: string;
    evidence: {
      buffIds: number[];
      debuffIds: number[];
      abilityNames: string[];
      occurrenceCount: number;
    };
  }>
> {
  try {
    const detections: Array<{
      id: string;
      name: string;
      description: string;
      confidence: number;
      detectionMethod: string;
      evidence: {
        buffIds: number[];
        debuffIds: number[];
        abilityNames: string[];
        occurrenceCount: number;
      };
    }> = [];

    // Filter affix scripts by grimoire compatibility
    // Only check affixes that are compatible with this specific grimoire
    const GRIMOIRE_COMPATIBLE_AFFIX_IDS = new Set<number>();
    if (grimoireKey) {
      Object.entries(scribingData.affixScripts).forEach(
        ([_key, script]: [string, { compatibleGrimoires?: string[]; abilityIds?: number[] }]) => {
          if (script.compatibleGrimoires && script.compatibleGrimoires.includes(grimoireKey)) {
            if (script.abilityIds) {
              script.abilityIds.forEach((id: number) => {
                GRIMOIRE_COMPATIBLE_AFFIX_IDS.add(id);
              });
            }
          }
        },
      );
    } else {
      // Fallback: if no grimoire provided, use all affix scripts (backward compatibility)
      VALID_AFFIX_SCRIPT_IDS.forEach((id) => GRIMOIRE_COMPATIBLE_AFFIX_IDS.add(id));
    }

    // Find casts of this ability
    const casts = combatEvents.casts.filter(
      (e) => e.sourceID === playerId && e.abilityGameID === abilityId,
    );

    if (casts.length === 0) {
      return [];
    }

    // Analyze effects in a tighter window for more accurate correlation
    // Affix effects typically appear within 1 second of the cast
    const AFFIX_WINDOW_MS = 1000; // Reduced from 10s to 1s for better accuracy
    const BUFF_WINDOW_MS = 1200; // Slightly larger than the affix window to handle delayed buff ticks

    // Track which casts had each effect (to avoid >100% correlations from multi-target)
    const buffCandidates = new Map<number, Set<number>>(); // effectId -> Set of cast indices
    const debuffCandidates = new Map<number, Set<number>>(); // effectId -> Set of cast indices
    const damageCandidates = new Map<number, Set<number>>(); // effectId -> Set of cast indices
    const healCandidates = new Map<number, Set<number>>(); // effectId -> Set of cast indices

    const getAffixTriggerStartTime = (
      cast: UnifiedCastEvent,
      ability: number,
      player: number,
      events: CombatEventData,
    ): number => {
      if (!DEFERRED_AFFIX_TRIGGER_ABILITIES.has(ability)) {
        return cast.timestamp;
      }

      const candidates: number[] = [];

      const recordNext = <T extends { sourceID: number; timestamp: number }>(
        items: T[],
        predicate: (item: T) => boolean = () => true,
      ): void => {
        const next = items.find(
          (item) => item.sourceID === player && item.timestamp > cast.timestamp && predicate(item),
        );
        if (next) {
          candidates.push(next.timestamp);
        }
      };

      // Next cast that isn't the contingency itself is the ideal trigger signal.
      recordNext(events.casts, (event) => event.abilityGameID !== ability);

      // Fallbacks: combat or healing events triggered by the follow-up skill.
      recordNext(events.damage);
      recordNext(events.heals);

      // Resource spending is the canonical trigger; prefer negative deltas when available.
      const resourceCost = events.resources.find(
        (event) =>
          event.sourceID === player &&
          event.timestamp > cast.timestamp &&
          (event.resourceChange ?? 0) < 0,
      );
      if (resourceCost) {
        candidates.push(resourceCost.timestamp);
      }

      if (candidates.length === 0) {
        // As a final fallback, allow a subsequent cast even if it's the same ability.
        const nextCast = events.casts.find(
          (event) => event.sourceID === player && event.timestamp > cast.timestamp,
        );
        if (nextCast) {
          candidates.push(nextCast.timestamp);
        }
      }

      if (candidates.length === 0) {
        return cast.timestamp;
      }

      return Math.min(...candidates);
    };

    casts.forEach((cast, castIndex) => {
      const triggerStart = getAffixTriggerStartTime(cast, abilityId, playerId, combatEvents);
      const windowStart = triggerStart;
      const windowEnd = triggerStart + AFFIX_WINDOW_MS;
      const buffWindowEnd = triggerStart + BUFF_WINDOW_MS;

      // Analyze buffs applied in window (to self or allies)
      // KEY INSIGHT: Affix scripts do NOT populate extraAbilityGameID
      // Include events at the same timestamp or after (some affixes apply simultaneously with cast)
      const windowBuffs = combatEvents.buffs.filter(
        (b) =>
          b.sourceID === playerId &&
          b.timestamp >= windowStart &&
          b.timestamp <= buffWindowEnd &&
          !('extraAbilityGameID' in b && b.extraAbilityGameID), // Filter out core ability effects
      );

      // Analyze debuffs applied in window (to enemies)
      // KEY INSIGHT: Affix scripts do NOT populate extraAbilityGameID
      // Include events at the same timestamp or after (some affixes apply simultaneously with cast)
      const windowDebuffs = combatEvents.debuffs.filter(
        (d) =>
          d.sourceID === playerId &&
          d.timestamp >= windowStart &&
          d.timestamp <= buffWindowEnd &&
          !('extraAbilityGameID' in d && d.extraAbilityGameID), // Filter out core ability effects
      );

      // Analyze damage events (some affixes add damage types)
      // Only include events AFTER the cast (not at the same timestamp)
      const windowDamage = combatEvents.damage.filter(
        (dmg) =>
          dmg.sourceID === playerId &&
          dmg.timestamp > windowStart &&
          dmg.timestamp <= windowEnd &&
          dmg.abilityGameID !== abilityId,
      );

      // Analyze heal events (some affixes add healing)
      // Only include events AFTER the cast (not at the same timestamp)
      const windowHeals = combatEvents.heals.filter(
        (heal) =>
          heal.sourceID === playerId &&
          heal.timestamp > windowStart &&
          heal.timestamp <= windowEnd &&
          heal.abilityGameID !== abilityId,
      );

      // Count buff occurrences (only track grimoire-compatible affix script IDs)
      // Note: We don't check extraAbilityGameID here because we already filtered it out above
      windowBuffs.forEach((b) => {
        if (b.abilityGameID !== abilityId && GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(b.abilityGameID)) {
          if (!buffCandidates.has(b.abilityGameID)) {
            buffCandidates.set(b.abilityGameID, new Set());
          }
          buffCandidates.get(b.abilityGameID)!.add(castIndex);
        }
      });

      // Count debuff occurrences (only track grimoire-compatible affix script IDs)
      // Note: We don't check extraAbilityGameID here because we already filtered it out above
      windowDebuffs.forEach((d) => {
        if (d.abilityGameID !== abilityId && GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(d.abilityGameID)) {
          if (!debuffCandidates.has(d.abilityGameID)) {
            debuffCandidates.set(d.abilityGameID, new Set());
          }
          debuffCandidates.get(d.abilityGameID)!.add(castIndex);
        }
      });

      // Count damage ability occurrences (only track grimoire-compatible affix script IDs)
      windowDamage.forEach((dmg) => {
        if (GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(dmg.abilityGameID)) {
          if (!damageCandidates.has(dmg.abilityGameID)) {
            damageCandidates.set(dmg.abilityGameID, new Set());
          }
          damageCandidates.get(dmg.abilityGameID)!.add(castIndex);
        }
      });

      // Count heal ability occurrences (only track grimoire-compatible affix script IDs)
      windowHeals.forEach((heal) => {
        if (GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(heal.abilityGameID)) {
          if (!healCandidates.has(heal.abilityGameID)) {
            healCandidates.set(heal.abilityGameID, new Set());
          }
          healCandidates.get(heal.abilityGameID)!.add(castIndex);
        }
      });
    });

    // Find the most correlated affix effects (highest consistency)
    // Show only the single best match across all event types (since only one affix is supported)

    // Collect all candidates from all event types
    const allCandidates: Array<{
      id: number;
      castSet: Set<number>;
      consistency: number;
      type: 'buff' | 'debuff' | 'damage' | 'heal';
    }> = [];

    // Add buff candidates
    Array.from(buffCandidates.entries()).forEach(([id, castSet]) => {
      allCandidates.push({
        id,
        castSet,
        consistency: castSet.size / casts.length,
        type: 'buff',
      });
    });

    // Add debuff candidates
    Array.from(debuffCandidates.entries()).forEach(([id, castSet]) => {
      allCandidates.push({
        id,
        castSet,
        consistency: castSet.size / casts.length,
        type: 'debuff',
      });
    });

    // Add damage candidates
    Array.from(damageCandidates.entries()).forEach(([id, castSet]) => {
      allCandidates.push({
        id,
        castSet,
        consistency: castSet.size / casts.length,
        type: 'damage',
      });
    });

    // Add heal candidates
    Array.from(healCandidates.entries()).forEach(([id, castSet]) => {
      allCandidates.push({
        id,
        castSet,
        consistency: castSet.size / casts.length,
        type: 'heal',
      });
    });

    const preferTypeOrder: Array<'buff' | 'debuff' | 'damage' | 'heal'> = [
      'buff',
      'debuff',
      'damage',
      'heal',
    ];

    type AggregatedCandidate = {
      key: string;
      scriptName?: string;
      abilityIds: Set<number>;
      castSet: Set<number>;
      typeCounts: Record<'buff' | 'debuff' | 'damage' | 'heal', number>;
    };

    const aggregated = new Map<string, AggregatedCandidate>();

    allCandidates.forEach((candidate) => {
      const scriptName = AFFIX_SCRIPT_ID_TO_NAME.get(candidate.id);
      const key = scriptName ?? `ability-${candidate.id}`;
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          key,
          scriptName,
          abilityIds: new Set<number>(),
          castSet: new Set<number>(),
          typeCounts: {
            buff: 0,
            debuff: 0,
            damage: 0,
            heal: 0,
          },
        });
      }

      const entry = aggregated.get(key)!;
      entry.abilityIds.add(candidate.id);
      candidate.castSet.forEach((index) => entry.castSet.add(index));
      entry.typeCounts[candidate.type] += 1;
    });

    const aggregatedCandidates = Array.from(aggregated.values()).map((entry) => {
      const dominantType = preferTypeOrder.reduce<'buff' | 'debuff' | 'damage' | 'heal'>(
        (acc, type) => {
          if (entry.typeCounts[type] > entry.typeCounts[acc]) {
            return type;
          }
          return acc;
        },
        'buff',
      );

      const totalCasts = casts.length;
      const consistency = totalCasts > 0 ? entry.castSet.size / totalCasts : 0;

      return {
        key: entry.key,
        scriptName: entry.scriptName,
        abilityIds: entry.abilityIds,
        castSet: entry.castSet,
        dominantType,
        consistency,
      };
    });

    aggregatedCandidates.sort((a, b) => {
      if (b.consistency !== a.consistency) {
        return b.consistency - a.consistency;
      }
      if (b.castSet.size !== a.castSet.size) {
        return b.castSet.size - a.castSet.size;
      }
      if (a.scriptName && b.scriptName) {
        return a.scriptName.localeCompare(b.scriptName);
      }
      if (a.scriptName) {
        return -1;
      }
      if (b.scriptName) {
        return 1;
      }
      const aMin = Math.min(...a.abilityIds);
      const bMin = Math.min(...b.abilityIds);
      return aMin - bMin;
    });

    const topAggregate = aggregatedCandidates[0];

    if (topAggregate) {
      const confidence = topAggregate.consistency;
      const scriptName = topAggregate.scriptName;
      const primaryAbilityId = Math.min(...topAggregate.abilityIds);

      let detectionMethod = '';
      let description = '';

      switch (topAggregate.dominantType) {
        case 'buff':
          detectionMethod = 'Buff Pattern Analysis (No extraAbilityGameID)';
          description = `Applies buff effects in ${Math.round(confidence * 100)}% of casts`;
          break;
        case 'debuff':
          detectionMethod = 'Debuff Pattern Analysis (No extraAbilityGameID)';
          description = `Applies debuff effects in ${Math.round(confidence * 100)}% of casts`;
          break;
        case 'damage':
          detectionMethod = 'Damage Pattern Analysis';
          description = `Adds additional damage effects in ${Math.round(confidence * 100)}% of casts`;
          break;
        case 'heal':
          detectionMethod = 'Healing Pattern Analysis';
          description = `Adds additional healing effects in ${Math.round(confidence * 100)}% of casts`;
          break;
      }

      const buffIds: number[] = [];
      const debuffIds: number[] = [];
      const abilityNames: string[] = [];

      topAggregate.abilityIds.forEach((id) => {
        if (topAggregate.dominantType === 'buff') {
          buffIds.push(id);
        } else if (topAggregate.dominantType === 'debuff') {
          debuffIds.push(id);
        } else if (topAggregate.dominantType === 'damage' || topAggregate.dominantType === 'heal') {
          abilityNames.push(
            `${topAggregate.dominantType.charAt(0).toUpperCase() + topAggregate.dominantType.slice(1)} Ability ${id}`,
          );
        }
      });

      detections.push({
        id: `affix-${scriptName ?? primaryAbilityId}`,
        name:
          scriptName ??
          `${topAggregate.dominantType.charAt(0).toUpperCase() + topAggregate.dominantType.slice(1)} Affix Script`,
        description,
        confidence,
        detectionMethod,
        evidence: {
          buffIds,
          debuffIds,
          abilityNames,
          occurrenceCount: topAggregate.castSet.size,
        },
      });
    }

    return detections;
  } catch (error) {
    moduleLogger.error(
      'Error detecting affix scripts',
      error instanceof Error ? error : undefined,
      { abilityId, playerId, grimoireKey },
    );
    return [];
  }
}

/**
 * Hook for scribing detection using the complete scribing database
 * and integrated detection algorithms.
 * Fetches combat events from Redux state automatically.
 */
export function useScribingDetection(
  options: UseScribingDetectionOptions,
): UseScribingDetectionResult {
  const { fightId, playerId, abilityId, enabled = true } = options;
  const dispatch = useAppDispatch();

  const playersById = useSelector(selectActivePlayersById);
  const workerTaskState = useSelector(selectScribingDetectionsTask);
  const workerResult = useSelector(selectScribingDetectionsResult);

  const { damageEvents: damage } = useDamageEvents();
  const { healingEvents: heals } = useHealingEvents();
  const { friendlyBuffEvents } = useFriendlyBuffEvents();
  const { hostileBuffEvents } = useHostileBuffEvents();
  const { debuffEvents: debuffs } = useDebuffEvents();
  const { castEvents: casts } = useCastEvents();
  const { resourceEvents: resources } = useResourceEvents();

  const allBuffs = useMemo(
    () => [...friendlyBuffEvents, ...hostileBuffEvents],
    [friendlyBuffEvents, hostileBuffEvents],
  );

  const combatEvents = useMemo<CombatEventData>(
    () => ({
      buffs: allBuffs,
      debuffs,
      damage,
      casts,
      heals,
      resources,
    }),
    [allBuffs, debuffs, damage, casts, heals, resources],
  );

  const fightIdNumber = useMemo(() => {
    if (!fightId) {
      return null;
    }
    const parsed = Number(fightId);
    return Number.isFinite(parsed) ? parsed : null;
  }, [fightId]);

  const isTestMode =
    typeof process !== 'undefined' &&
    typeof process.env !== 'undefined' &&
    process.env.NODE_ENV === 'test';

  const shouldAttemptDetection =
    enabled &&
    fightIdNumber !== null &&
    typeof playerId === 'number' &&
    typeof abilityId === 'number' &&
    abilityId > 0 &&
    isScribingAbility(abilityId);

  const basePlayerAbilities = useMemo<PlayerAbilityList[]>(() => {
    const players = Object.values(playersById);

    return players
      .map((player) => {
        const talents = player.combatantInfo?.talents ?? [];
        const abilityIds = Array.from(
          new Set(
            talents
              .map((talent) => talent?.guid)
              .filter((guid): guid is number => typeof guid === 'number' && isScribingAbility(guid)),
          ),
        );

        return {
          playerId: player.id,
          abilityIds,
        };
      })
      .filter((entry) => entry.abilityIds.length > 0);
  }, [playersById]);

  const requestedPlayerAbilities = useMemo<PlayerAbilityList[]>(() => {
    if (!shouldAttemptDetection || typeof playerId !== 'number' || typeof abilityId !== 'number') {
      return basePlayerAbilities;
    }

    const merged = new Map<number, Set<number>>();
    basePlayerAbilities.forEach((entry) => {
      merged.set(entry.playerId, new Set(entry.abilityIds));
    });

    if (!merged.has(playerId)) {
      merged.set(playerId, new Set());
    }
    merged.get(playerId)!.add(abilityId);

    return Array.from(merged.entries()).map(([id, set]) => ({
      playerId: id,
      abilityIds: Array.from(set),
    }));
  }, [basePlayerAbilities, shouldAttemptDetection, playerId, abilityId]);

  const existingAbilitySets = useMemo(() => {
    if (!workerResult || fightIdNumber === null || workerResult.fightId !== fightIdNumber) {
      return new Map<number, Set<number>>();
    }

    const map = new Map<number, Set<number>>();
    Object.entries(workerResult.players).forEach(([playerKey, abilityMap]) => {
      const validAbilities = new Set<number>();
      const staleAbilities: number[] = [];
      Object.entries(abilityMap).forEach(([abilityKey, detection]) => {
        if (detection?.schemaVersion === SCRIBING_DETECTION_SCHEMA_VERSION) {
          validAbilities.add(Number(abilityKey));
        } else {
          staleAbilities.push(Number(abilityKey));
        }
      });

      if (staleAbilities.length > 0) {
        moduleLogger.info('Ignoring stale scribing detection results', {
          fightId: fightIdNumber,
          playerId: Number(playerKey),
          staleAbilities,
          expectedSchemaVersion: SCRIBING_DETECTION_SCHEMA_VERSION,
        });
      }

      if (validAbilities.size > 0) {
        map.set(Number(playerKey), validAbilities);
      }
    });
    return map;
  }, [workerResult, fightIdNumber]);

  const combinedPlayerAbilities = useMemo<PlayerAbilityList[]>(() => {
    if (!shouldAttemptDetection) {
      return [];
    }

    const merged = new Map<number, Set<number>>();

    existingAbilitySets.forEach((set, id) => {
      merged.set(id, new Set(set));
    });

    requestedPlayerAbilities.forEach((entry) => {
      if (!merged.has(entry.playerId)) {
        merged.set(entry.playerId, new Set());
      }
      const set = merged.get(entry.playerId)!;
      entry.abilityIds.forEach((value) => set.add(value));
    });

    return Array.from(merged.entries())
      .map(([id, set]) => ({ playerId: id, abilityIds: Array.from(set) }))
      .filter((entry) => entry.abilityIds.length > 0);
  }, [existingAbilitySets, requestedPlayerAbilities, shouldAttemptDetection]);

  const currentDetection: ResolvedScribingDetection | null = useMemo(() => {
    if (
      !shouldAttemptDetection ||
      !workerResult ||
      fightIdNumber === null ||
      workerResult.fightId !== fightIdNumber ||
      typeof playerId !== 'number' ||
      typeof abilityId !== 'number'
    ) {
      return null;
    }

    const detection = workerResult.players[playerId]?.[abilityId] ?? null;

    return detection;
  }, [shouldAttemptDetection, workerResult, fightIdNumber, playerId, abilityId]);

  const usableWorkerDetection = useMemo(() => {
    if (!currentDetection) {
      return null;
    }

    if (currentDetection.schemaVersion !== SCRIBING_DETECTION_SCHEMA_VERSION) {
      moduleLogger.info('Discarding worker detection with outdated schema', {
        fightId: fightIdNumber,
        playerId,
        abilityId,
        schemaVersion: currentDetection.schemaVersion,
        expectedSchemaVersion: SCRIBING_DETECTION_SCHEMA_VERSION,
      });
      return null;
    }

    return currentDetection;
  }, [currentDetection, fightIdNumber, playerId, abilityId]);

  const shouldUseWorker =
    shouldAttemptDetection &&
    typeof window !== 'undefined' &&
    !isTestMode &&
    combinedPlayerAbilities.length > 0;

  useEffect(() => {
    if (!shouldUseWorker) {
      return;
    }
    if (!fightIdNumber || typeof playerId !== 'number' || typeof abilityId !== 'number') {
      return;
    }
    if (combinedPlayerAbilities.length === 0) {
      return;
    }
    if (usableWorkerDetection) {
      return;
    }
    if (workerTaskState.isLoading) {
      return;
    }

    moduleLogger.info('Requesting scribing detection via worker', {
      fightId: fightIdNumber,
      playerId,
      abilityId,
      abilityCount: combinedPlayerAbilities.reduce(
        (sum, entry) => sum + entry.abilityIds.length,
        0,
      ),
    });

    dispatch(
      executeScribingDetectionsTask({
        fightId: fightIdNumber,
        combatEvents,
        playerAbilities: combinedPlayerAbilities,
      }),
    );
  }, [
    shouldUseWorker,
    fightIdNumber,
    playerId,
    abilityId,
    usableWorkerDetection,
    combinedPlayerAbilities,
    combatEvents,
    dispatch,
    workerTaskState.isLoading,
  ]);

  const fallbackDetection = useMemo(() => {
    if (!shouldAttemptDetection || shouldUseWorker) {
      return null;
    }
    if (typeof playerId !== 'number' || typeof abilityId !== 'number') {
      return null;
    }

    const detection = computeScribingDetection({
      abilityId,
      playerId,
      combatEvents,
    });
    if (detection) {
      moduleLogger.debug('Computed fallback scribing detection', {
        fightId: fightIdNumber,
        playerId,
        abilityId,
        schemaVersion: detection.schemaVersion,
      });
    }
    return detection;
  }, [shouldAttemptDetection, shouldUseWorker, playerId, abilityId, combatEvents, fightIdNumber]);
  const resolvedDetection = usableWorkerDetection ?? fallbackDetection ?? null;
  const loading = shouldUseWorker ? !usableWorkerDetection && workerTaskState.isLoading : false;
  const error = shouldUseWorker ? workerTaskState.error : null;
  const scribedSkillData = resolvedDetection?.scribedSkillData ?? null;

  useEffect(() => {
    if (usableWorkerDetection) {
      moduleLogger.info('Using worker-provided scribing detection result', {
        fightId: fightIdNumber,
        playerId,
        abilityId,
        schemaVersion: usableWorkerDetection.schemaVersion,
      });
      return;
    }

    if (fallbackDetection) {
      moduleLogger.info('Using fallback scribing detection result', {
        fightId: fightIdNumber,
        playerId,
        abilityId,
        schemaVersion: fallbackDetection.schemaVersion,
      });
      return;
    }

    if (!loading && shouldAttemptDetection) {
      moduleLogger.debug('Scribing detection not yet available', {
        fightId: fightIdNumber,
        playerId,
        abilityId,
        shouldUseWorker,
      });
    }
  }, [
    usableWorkerDetection,
    fallbackDetection,
    fightIdNumber,
    playerId,
    abilityId,
    loading,
    shouldAttemptDetection,
    shouldUseWorker,
  ]);

  const refetch = useCallback(async () => {
    if (!shouldAttemptDetection) {
      return;
    }

    if (shouldUseWorker) {
      if (!fightIdNumber) {
        return;
      }
      moduleLogger.info('Manually refetching scribing detection via worker', {
        fightId: fightIdNumber,
        playerId,
        abilityId,
      });
      await dispatch(
        executeScribingDetectionsTask({
          fightId: fightIdNumber,
          combatEvents,
          playerAbilities: combinedPlayerAbilities,
        }),
      );
      return;
    }

    if (typeof playerId !== 'number' || typeof abilityId !== 'number') {
      return;
    }
  }, [
    shouldAttemptDetection,
    shouldUseWorker,
    fightIdNumber,
    playerId,
    abilityId,
    combatEvents,
    combinedPlayerAbilities,
    dispatch,
  ]);

  return {
    data: resolvedDetection,
    scribedSkillData,
    loading,
    error,
    refetch,
  };
}

/**
 * Hook for getting scribing data for a specific skill.
 * Simplified wrapper that fetches combat events from Redux automatically.
 *
 * @param fightId - Fight identifier
 * @param playerId - Player identifier
 * @param abilityId - Ability identifier to detect scribing for
 */
export function useSkillScribingData(
  fightId: string | undefined,
  playerId: number | undefined,
  abilityId: number | undefined,
): {
  scribedSkillData: ScribedSkillData | null;
  loading: boolean;
  error: string | null;
} {
  const { scribedSkillData, loading, error } = useScribingDetection({
    fightId: fightId ?? null,
    playerId,
    abilityId,
    enabled: Boolean(fightId && playerId && abilityId),
  });

  return { scribedSkillData, loading, error };
}
