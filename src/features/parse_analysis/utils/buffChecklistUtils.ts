/**
 * Buff Checklist Utilities
 * Analyzes buff sources to determine which buffs come from the trial dummy
 * and which come from the player, highlighting redundancies.
 */

import type { AbilityData } from '../../../contexts/AbilityIdMapperContext';
import { BuffEvent, CombatantInfoEvent } from '../../../types/combatlogEvents';
import {
  TRIAL_DUMMY_BUFF_IDS,
  TRIAL_DUMMY_BUFF_NAMES,
  TRIAL_DUMMY_BUFF_CATEGORIES,
} from '../constants/trialDummyConstants';
import { BuffChecklistItem, BuffChecklistResult } from '../types/buffChecklist';

// Type for ability mapper interface
interface AbilityMapper {
  getAbilityById: (id: number) => AbilityData | null;
}

const SUPPORT_BUFF_ID_SET = new Set<number>(TRIAL_DUMMY_BUFF_CATEGORIES.supportAbilities);

/**
 * Group buff ability IDs by their display name.
 * Multiple ability IDs may represent the same buff (e.g., alternate versions).
 */
function groupBuffsByName(): Map<string, number[]> {
  const buffGroups = new Map<string, number[]>();

  TRIAL_DUMMY_BUFF_IDS.forEach((buffId) => {
    const buffName = TRIAL_DUMMY_BUFF_NAMES[buffId];
    if (buffName) {
      const existing = buffGroups.get(buffName) || [];
      existing.push(buffId);
      buffGroups.set(buffName, existing);
    }
  });

  return buffGroups;
}

/**
 * Determine the category of a buff based on its name and IDs.
 */
function getBuffCategory(buffName: string, abilityIds: number[]): 'major' | 'minor' | 'support' {
  // Check if any of the ability IDs are in the categorized lists
  const majorBuffIds = TRIAL_DUMMY_BUFF_CATEGORIES.majorBuffs as readonly number[];
  const minorBuffIds = TRIAL_DUMMY_BUFF_CATEGORIES.minorBuffs as readonly number[];
  const supportBuffIds = TRIAL_DUMMY_BUFF_CATEGORIES.supportAbilities as readonly number[];

  const isMajor = abilityIds.some((id) => majorBuffIds.includes(id));
  const isMinor = abilityIds.some((id) => minorBuffIds.includes(id));
  const isSupport = abilityIds.some((id) => supportBuffIds.includes(id));

  if (isMajor) return 'major';
  if (isMinor) return 'minor';
  if (isSupport) return 'support';

  // Fallback: parse from name
  if (buffName.toLowerCase().includes('major')) return 'major';
  if (buffName.toLowerCase().includes('minor')) return 'minor';
  return 'support';
}

/**
 * Analyze buff events to create a detailed checklist showing:
 * - Which buffs are provided by the trial dummy
 * - Which buffs are also provided by the player (redundant)
 * - Summary statistics
 *
 * @param buffEvents All buff events from the fight
 * @param combatantInfoEvents Combatant info events containing aura snapshots
 * @param playerId The player's source ID
 * @param dummyId The trial dummy's source ID (typically from enemy actors)
 * @param fightStartTime Fight start timestamp
 * @param fightEndTime Fight end timestamp
 * @param abilityMapper Ability mapper for resolving ability names
 */
export function analyzeBuffChecklist(
  buffEvents: BuffEvent[],
  combatantInfoEvents: CombatantInfoEvent[],
  playerId: number,
  dummyId: number,
  fightStartTime: number,
  fightEndTime: number,
  abilityMapper: AbilityMapper,
): BuffChecklistResult {
  // Collect all unique buff ability IDs from events and auras
  const allBuffAbilityIds = new Set<number>();

  // Collect from buff events (dummy and player)
  buffEvents.forEach((event) => {
    if (
      event.type === 'applybuff' &&
      event.targetID === playerId &&
      event.timestamp >= fightStartTime &&
      event.timestamp <= fightEndTime &&
      (event.sourceID === dummyId || event.sourceID === playerId)
    ) {
      allBuffAbilityIds.add(event.abilityGameID);
    }
  });

  // Collect from auras (player only)
  combatantInfoEvents.forEach((event) => {
    if (
      event.sourceID === playerId &&
      event.timestamp >= fightStartTime &&
      event.timestamp <= fightEndTime &&
      event.auras
    ) {
      event.auras.forEach((aura) => {
        if (aura.source === playerId) {
          allBuffAbilityIds.add(aura.ability);
        }
      });
    }
  });

  // Get the hardcoded buff groups for name mapping
  const hardcodedBuffGroups = groupBuffsByName();

  // Build a map of ability ID to name (use hardcoded names if available, otherwise look up from abilities data)
  const abilityIdToName = new Map<number, string>();

  // First, add all hardcoded buff names
  hardcodedBuffGroups.forEach((abilityIds, buffName) => {
    abilityIds.forEach((id) => {
      abilityIdToName.set(id, buffName);
    });
  });

  // For abilities not in hardcoded list, try to get name from multiple sources
  allBuffAbilityIds.forEach((abilityId) => {
    if (!abilityIdToName.has(abilityId)) {
      let name: string | null = null;

      // First, try to get from auras (if available in combatant info)
      for (const event of combatantInfoEvents) {
        if (event.auras) {
          const aura = event.auras.find((a) => a.ability === abilityId);
          if (aura?.name) {
            name = aura.name;
            break;
          }
        }
      }

      // If not found in auras, try the ability mapper
      if (!name) {
        const abilityData = abilityMapper.getAbilityById(abilityId);
        if (abilityData?.name) {
          name = abilityData.name;
        }
      }

      // Fallback to ability ID if no name found
      abilityIdToName.set(abilityId, name || `Buff ${abilityId}`);
    }
  });

  // Group ability IDs by name (multiple IDs might have the same name)
  const buffGroupsByName = new Map<string, number[]>();
  allBuffAbilityIds.forEach((abilityId) => {
    const name = abilityIdToName.get(abilityId) || `Buff ${abilityId}`;
    const existing = buffGroupsByName.get(name) || [];
    existing.push(abilityId);
    buffGroupsByName.set(name, existing);
  });

  const checklistItems: BuffChecklistItem[] = [];

  // For each unique buff name, check if it's provided by dummy and/or player
  buffGroupsByName.forEach((abilityIds, buffName) => {
    const isKnownTrialDummyBuff = abilityIds.some((id) => TRIAL_DUMMY_BUFF_IDS.has(id));

    // Check if dummy provides this buff to the player (via applybuff events)
    let isDummyProvided = buffEvents.some(
      (event) =>
        event.sourceID === dummyId &&
        event.targetID === playerId &&
        abilityIds.includes(event.abilityGameID) &&
        event.type === 'applybuff' &&
        event.timestamp >= fightStartTime &&
        event.timestamp <= fightEndTime,
    );

    const isSupportBuff = abilityIds.some((id) => SUPPORT_BUFF_ID_SET.has(id));

    if (!isDummyProvided && isKnownTrialDummyBuff && isSupportBuff) {
      const auraEvidence = combatantInfoEvents.some(
        (event) =>
          event.sourceID === playerId &&
          event.timestamp >= fightStartTime &&
          event.timestamp <= fightEndTime &&
          event.auras?.some((aura) => abilityIds.includes(aura.ability)),
      );

      if (auraEvidence) {
        isDummyProvided = true;
      }
    }

    // Check if player provides this buff to themselves (via applybuff events)
    let isPlayerProvided = buffEvents.some(
      (event) =>
        event.sourceID === playerId &&
        event.targetID === playerId &&
        abilityIds.includes(event.abilityGameID) &&
        event.type === 'applybuff' &&
        event.timestamp >= fightStartTime &&
        event.timestamp <= fightEndTime,
    );

    const shouldInferPlayerFromAuras =
      !isPlayerProvided && (!isKnownTrialDummyBuff || !isDummyProvided);

    // Also check combatant info auras for player-applied buffs
    // Auras show buffs that are active on the player at the time of the snapshot
    if (shouldInferPlayerFromAuras) {
      isPlayerProvided = combatantInfoEvents.some(
        (event) =>
          event.sourceID === playerId &&
          event.timestamp >= fightStartTime &&
          event.timestamp <= fightEndTime &&
          event.auras?.some(
            (aura) => aura.source === playerId && abilityIds.includes(aura.ability),
          ),
      );
    }

    const category = getBuffCategory(buffName, abilityIds);
    const isRedundant = isDummyProvided && isPlayerProvided;

    checklistItems.push({
      buffName,
      abilityIds,
      category,
      isProvidedByDummy: isDummyProvided,
      isProvidedByPlayer: isPlayerProvided,
      isRedundant,
    });
  });

  // Separate by category
  const majorBuffs = checklistItems.filter((item) => item.category === 'major');
  const minorBuffs = checklistItems.filter((item) => item.category === 'minor');
  const supportBuffs = checklistItems.filter((item) => item.category === 'support');

  // Get redundant buff names
  const redundantBuffs = checklistItems
    .filter((item) => item.isRedundant)
    .map((item) => item.buffName);

  // Calculate summary
  const summary = {
    totalDummyBuffs: checklistItems.filter((item) => item.isProvidedByDummy).length,
    totalPlayerBuffs: checklistItems.filter((item) => item.isProvidedByPlayer).length,
    totalRedundantBuffs: redundantBuffs.length,
  };

  return {
    majorBuffs,
    minorBuffs,
    supportBuffs,
    redundantBuffs,
    summary,
  };
}
