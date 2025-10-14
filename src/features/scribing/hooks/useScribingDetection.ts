/**
 * React hook for scribing detection
 * Uses the authoritative scribing database for comprehensive ability ID lookup
 * and integrates with existing detection algorithms for signature and affix scripts
 */

import { useState, useEffect, useCallback } from 'react';

import scribingData from '../../../../data/scribing-complete.json';
import { ScribedSkillData } from '../../../components/SkillTooltip';
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
import { getScribingSkillByAbilityId } from '../utils/Scribing';

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

export interface CombatEventData {
  buffs: BuffEvent[];
  debuffs: DebuffEvent[];
  damage: DamageEvent[];
  casts: UnifiedCastEvent[];
  heals: HealEvent[];
  resources: ResourceChangeEvent[];
}

export interface UseScribingDetectionOptions {
  fightId?: string;
  playerId?: number;
  abilityId?: number;
  enabled?: boolean;
  // combatEvents parameter removed - hook fetches from Redux internally
}

export interface UseScribingDetectionResult {
  data: unknown; // Placeholder for future ScribingDetectionResult
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
async function detectSignatureScript(
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
    // eslint-disable-next-line no-console
    console.error('Error detecting signature script:', error);
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
async function detectAffixScripts(
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

    // Track which casts had each effect (to avoid >100% correlations from multi-target)
    const buffCandidates = new Map<number, Set<number>>(); // effectId -> Set of cast indices
    const debuffCandidates = new Map<number, Set<number>>(); // effectId -> Set of cast indices
    const damageCandidates = new Map<number, Set<number>>(); // effectId -> Set of cast indices
    const healCandidates = new Map<number, Set<number>>(); // effectId -> Set of cast indices

    casts.forEach((cast, castIndex) => {
      const windowStart = cast.timestamp;
      const windowEnd = cast.timestamp + AFFIX_WINDOW_MS;

      // Analyze buffs applied in window (to self or allies)
      // KEY INSIGHT: Affix scripts do NOT populate extraAbilityGameID
      // Include events at the same timestamp or after (some affixes apply simultaneously with cast)
      const windowBuffs = combatEvents.buffs.filter(
        (b) =>
          b.sourceID === playerId &&
          b.timestamp >= windowStart &&
          b.timestamp <= windowEnd &&
          !('extraAbilityGameID' in b && b.extraAbilityGameID), // Filter out core ability effects
      );

      // Analyze debuffs applied in window (to enemies)
      // KEY INSIGHT: Affix scripts do NOT populate extraAbilityGameID
      // Include events at the same timestamp or after (some affixes apply simultaneously with cast)
      const windowDebuffs = combatEvents.debuffs.filter(
        (d) =>
          d.sourceID === playerId &&
          d.timestamp >= windowStart &&
          d.timestamp <= windowEnd &&
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

    // Sort by consistency to find the single best match
    allCandidates.sort((a, b) => b.consistency - a.consistency);

    // Create detection for the single highest-correlated affix (only one affix supported per ability)
    if (allCandidates.length > 0) {
      const topAffix = allCandidates[0];
      const confidence = topAffix.consistency;

      // Look up the affix script name from the database
      const scriptName = AFFIX_SCRIPT_ID_TO_NAME.get(topAffix.id);

      // Determine detection method and description based on event type
      let detectionMethod = '';
      let description = '';

      switch (topAffix.type) {
        case 'buff':
          detectionMethod = 'Buff Pattern Analysis (No extraAbilityGameID)';
          description = `Applies buff effect (ID: ${topAffix.id}) in ${Math.round(confidence * 100)}% of casts`;
          break;
        case 'debuff':
          detectionMethod = 'Debuff Pattern Analysis (No extraAbilityGameID)';
          description = `Applies debuff effect (ID: ${topAffix.id}) in ${Math.round(confidence * 100)}% of casts`;
          break;
        case 'damage':
          detectionMethod = 'Damage Pattern Analysis';
          description = `Adds additional damage (Ability ID: ${topAffix.id}) in ${Math.round(confidence * 100)}% of casts`;
          break;
        case 'heal':
          detectionMethod = 'Healing Pattern Analysis';
          description = `Adds additional healing (Ability ID: ${topAffix.id}) in ${Math.round(confidence * 100)}% of casts`;
          break;
      }

      detections.push({
        id: `${topAffix.type}-affix-${topAffix.id}`,
        name:
          scriptName ||
          `${topAffix.type.charAt(0).toUpperCase() + topAffix.type.slice(1)} Affix Script`,
        description,
        confidence,
        detectionMethod,
        evidence: {
          buffIds: topAffix.type === 'buff' ? [topAffix.id] : [],
          debuffIds: topAffix.type === 'debuff' ? [topAffix.id] : [],
          abilityNames:
            topAffix.type === 'damage' || topAffix.type === 'heal'
              ? [
                  `${topAffix.type.charAt(0).toUpperCase() + topAffix.type.slice(1)} Ability ${topAffix.id}`,
                ]
              : [],
          occurrenceCount: topAffix.castSet.size,
        },
      });
    }

    return detections;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error detecting affix scripts:', error);
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

  const [data, setData] = useState<unknown>(null);
  const [scribedSkillData, setScribedSkillData] = useState<ScribedSkillData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use event hooks instead of selectors to ensure all data is fetched
  // Critical: Some signature scripts appear in different event types (e.g., Anchorite's Potency in resources)
  const { damageEvents: damage } = useDamageEvents();
  const { healingEvents: heals } = useHealingEvents();
  const { friendlyBuffEvents: friendlyBuffs } = useFriendlyBuffEvents();
  const { hostileBuffEvents: hostileBuffs } = useHostileBuffEvents();
  const { debuffEvents: debuffs } = useDebuffEvents();
  const { castEvents: casts } = useCastEvents();
  const { resourceEvents: resources } = useResourceEvents();

  // Combine friendly and hostile buffs
  const allBuffs = [...friendlyBuffs, ...hostileBuffs];

  const fetchScribingData = useCallback(async () => {
    if (!enabled || !playerId || !abilityId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Look up the ability in the complete scribing database
      const scribingInfo = getScribingSkillByAbilityId(abilityId);

      if (scribingInfo) {
        // Create combat event data structure from Redux state
        const combatEvents: CombatEventData = {
          buffs: allBuffs,
          debuffs,
          damage,
          casts,
          heals,
          resources,
        };

        // Detect signature and affix scripts from combat events
        const signatureResult = await detectSignatureScript(abilityId, playerId, combatEvents);

        const affixResults = await detectAffixScripts(
          abilityId,
          playerId,
          combatEvents,
          scribingInfo.grimoireKey,
        );

        // Debug logging for affix detection
        // eslint-disable-next-line no-console
        console.log(`🔍 Affix Detection for ${scribingInfo.grimoire} (ID: ${abilityId}):`, {
          grimoireKey: scribingInfo.grimoireKey,
          affixResultsCount: affixResults.length,
          affixResults,
        });

        // Found a scribing ability! Create proper ScribedSkillData with real detection
        const scribedData: ScribedSkillData = {
          grimoireName: scribingInfo.grimoire,
          effects: [], // Would be populated from actual effect data
          wasCastInFight: true, // Assume true if we're asking about it
          recipe: {
            grimoire: scribingInfo.grimoire,
            transformation: scribingInfo.transformation,
            transformationType: scribingInfo.transformationType,
            confidence: 1.0, // High confidence from direct database lookup
            matchMethod: 'Database Lookup',
            recipeSummary: `📖 ${scribingInfo.grimoire} + 🔄 ${scribingInfo.transformation}`,
            tooltipInfo: `Detected from scribing database with 100% confidence`,
          },
          signatureScript: signatureResult || {
            name: 'Unknown Signature',
            confidence: 0.5,
            detectionMethod: 'No combat data',
            evidence: ['Database lookup confirmed scribing ability'],
          },
          affixScripts:
            affixResults.length > 0
              ? affixResults
              : [
                  {
                    id: 'affix-1',
                    name: 'Unknown Affix',
                    description: 'Scribing affix script',
                    confidence: 0.5,
                    detectionMethod: 'No combat data',
                    evidence: {
                      buffIds: [],
                      debuffIds: [],
                      abilityNames: [],
                      occurrenceCount: 1,
                    },
                  },
                ],
        };

        setScribedSkillData(scribedData);
        setData({
          detected: true,
          source: 'database',
          abilityId,
          scribingInfo,
          signatureResult,
          affixResults,
        });
      } else {
        // Not a scribing ability or not in database
        setScribedSkillData(null);
        setData({ detected: false, source: 'database', abilityId });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setScribedSkillData(null);
      setData(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fightId, playerId, abilityId, enabled, allBuffs, debuffs, damage, casts, heals, resources]);

  const refetch = useCallback(async () => {
    await fetchScribingData();
  }, [fetchScribingData]);

  useEffect(() => {
    fetchScribingData();
  }, [fetchScribingData]);

  return {
    data,
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
    fightId,
    playerId,
    abilityId,
    enabled: Boolean(fightId && playerId && abilityId),
  });

  return { scribedSkillData, loading, error };
}
