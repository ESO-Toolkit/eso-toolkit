/**
 * Debuff Checklist Utilities
 * Analyzes debuff sources to determine which debuffs are being applied
 * to the trial dummy by the player.
 */

import type { AbilityData } from '../../../contexts/AbilityIdMapperContext';
import { DebuffEvent } from '../../../types/combatlogEvents';
import {
  TRIAL_DUMMY_SELF_DEBUFF_IDS,
  TRIAL_DUMMY_SELF_DEBUFF_NAMES,
} from '../constants/trialDummyConstants';
import { DebuffChecklistItem, DebuffChecklistResult } from '../types/debuffChecklist';

// Type for ability mapper interface
interface AbilityMapper {
  getAbilityById: (id: number) => AbilityData | null;
}

/**
 * Determine the category of a debuff based on its name.
 */
function getDebuffCategory(debuffName: string): 'major' | 'minor' | 'support' {
  const nameLower = debuffName.toLowerCase();
  if (nameLower.includes('major')) return 'major';
  if (nameLower.includes('minor')) return 'minor';
  return 'support';
}

/**
 * Analyze debuff events to create a detailed checklist showing:
 * - Which debuffs the player is applying to the trial dummy
 * - Categorized by major/minor/support
 * - Summary statistics
 *
 * @param debuffEvents All debuff events from the fight
 * @param playerId The player's source ID
 * @param dummyId The trial dummy's target ID
 * @param fightStartTime Fight start timestamp
 * @param fightEndTime Fight end timestamp
 * @param abilityMapper Ability mapper for resolving ability names
 */
export function analyzeDebuffChecklist(
  debuffEvents: DebuffEvent[],
  playerId: number,
  dummyId: number,
  fightStartTime: number,
  fightEndTime: number,
  abilityMapper: AbilityMapper,
): DebuffChecklistResult {
  const playerDebuffIds = new Set<number>();
  const dummyDebuffIds = new Set<number>();
  const abilityIdToName = new Map<number, string>();

  debuffEvents.forEach((event) => {
    if (
      event.type === 'applydebuff' &&
      event.targetID === dummyId &&
      event.timestamp >= fightStartTime &&
      event.timestamp <= fightEndTime
    ) {
      if (event.sourceID === playerId) {
        playerDebuffIds.add(event.abilityGameID);
      } else if (event.sourceID === dummyId) {
        dummyDebuffIds.add(event.abilityGameID);
      }
    }
  });

  // Ensure known dummy debuffs are included even if mapper lacks data
  TRIAL_DUMMY_SELF_DEBUFF_IDS.forEach((abilityId) => {
    if (!abilityIdToName.has(abilityId)) {
      const name = TRIAL_DUMMY_SELF_DEBUFF_NAMES[abilityId];
      if (name) {
        abilityIdToName.set(abilityId, name);
      }
    }
  });

  const allDebuffAbilityIds = new Set<number>([...playerDebuffIds, ...dummyDebuffIds]);

  allDebuffAbilityIds.forEach((abilityId) => {
    if (!abilityIdToName.has(abilityId)) {
      const abilityData = abilityMapper.getAbilityById(abilityId);
      const name =
        abilityData?.name || TRIAL_DUMMY_SELF_DEBUFF_NAMES[abilityId] || `Debuff ${abilityId}`;
      abilityIdToName.set(abilityId, name);
    }
  });

  const debuffGroupsByName = new Map<string, number[]>();
  allDebuffAbilityIds.forEach((abilityId) => {
    const name = abilityIdToName.get(abilityId) || `Debuff ${abilityId}`;
    const existing = debuffGroupsByName.get(name) || [];
    existing.push(abilityId);
    debuffGroupsByName.set(name, existing);
  });

  const checklistItems: DebuffChecklistItem[] = [];

  debuffGroupsByName.forEach((abilityIds, debuffName) => {
    const category = getDebuffCategory(debuffName);
    const isAppliedByPlayer = abilityIds.some((id) => playerDebuffIds.has(id));
    const isAppliedByDummy = abilityIds.some((id) => dummyDebuffIds.has(id));

    checklistItems.push({
      debuffName,
      abilityIds,
      category,
      isAppliedByPlayer,
      isAppliedByDummy,
    });
  });

  const majorDebuffs = checklistItems.filter((item) => item.category === 'major');
  const minorDebuffs = checklistItems.filter((item) => item.category === 'minor');
  const trackedDebuffs = [...majorDebuffs, ...minorDebuffs];
  const totalPlayerDebuffs = trackedDebuffs.filter((item) => item.isAppliedByPlayer).length;
  const totalDummyDebuffs = trackedDebuffs.filter((item) => item.isAppliedByDummy).length;

  const summary = {
    totalTrackedDebuffs: trackedDebuffs.length,
    totalPlayerDebuffs,
    totalDummyDebuffs,
  };

  return {
    majorDebuffs,
    minorDebuffs,
    summary,
  };
}
