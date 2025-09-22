/**
 * Utility functions for detecting player classes based on ability usage
 *
 * This module provides functionality to:
 * - Map ability IDs to their corresponding classes using skillset data
 * - Analyze player ability usage to determine primary and secondary classes
 * - Provide detailed class analysis results
 */

// Import skillset data
import { KnownAbilities } from '@/types/abilities';

import { arcanistData } from '../data/skillsets/arcanist';
import { dragonknightData } from '../data/skillsets/dragonknight';
import { necromancerData } from '../data/skillsets/necromancer';
import { nightbladeData } from '../data/skillsets/nightblade';
import { sorcererData } from '../data/skillsets/sorcerer';
import { templarData } from '../data/skillsets/templar';
import { wardenData } from '../data/skillsets/warden';
// Import types
import { ReportAbilityFragment } from '../graphql/generated';
import {
  CombatantInfoEvent,
  UnifiedCastEvent,
  DamageEvent,
  BuffEvent,
  DebuffEvent,
} from '../types/combatlogEvents';
import { PlayerTalent } from '../types/playerDetails';

/**
 * If a skill name is in this list, it must be the exact ability ID to count for that skill line
 */
const SKILL_NAME_ID_REQUIREMENTS = Object.freeze<Record<string, KnownAbilities>>({
  Combustion: KnownAbilities.COMBUSTION,
});

// Collect all skillset data
const allSkillsets = [
  arcanistData,
  dragonknightData,
  necromancerData,
  nightbladeData,
  sorcererData,
  templarData,
  wardenData,
];

// Type definitions
export interface GameAbility {
  __typename: string;
  id: number;
  name: string;
  icon: string;
}

export interface AbilitiesData {
  [abilityId: string]: GameAbility;
}

export interface ReportAbilitiesData {
  [abilityId: string | number]: ReportAbilityFragment;
}

export interface ClassAnalysisResult {
  primary: string | null;
  skillLines: Array<{
    skillLine: string;
    className: string;
    count: number;
  }>;
}

function shouldSkipAbility(abilityName: string, abilityId: number): boolean {
  const requirementKey = Object.keys(SKILL_NAME_ID_REQUIREMENTS).find(
    (name) => name.toLowerCase() === abilityName.toLowerCase(),
  );

  // This handles the situation where multiple skills have the same name
  // For example, the DK passive combustion shares a name with the undaunted orb synergy "combustion"
  return requirementKey !== undefined && abilityId !== SKILL_NAME_ID_REQUIREMENTS[requirementKey];
}

/**
 * Extract ability IDs from various event types for a specific player
 * @param playerId - The player ID to extract abilities for
 * @param combatantInfoEvents - Combatant info events containing auras
 * @param castEvents - Cast events (unified type)
 * @param damageEvents - Damage events
 * @param friendlyBuffEvents - Buff events (includes apply and remove)
 * @param debuffEvents - Debuff events (includes apply and remove)
 * @param talents - Player talents containing ability IDs
 */
export function extractPlayerAbilityIds(
  playerId: string,
  combatantInfoEvents: CombatantInfoEvent[],
  castEvents: UnifiedCastEvent[],
  damageEvents: DamageEvent[],
  friendlyBuffEvents: BuffEvent[],
  debuffEvents: DebuffEvent[],
  talents?: PlayerTalent[],
): Set<number> {
  const abilityIds = new Set<number>();

  // Add abilities from combatant info auras (player as source)
  const combatantInfoEventsForPlayer = combatantInfoEvents.filter(
    (event) =>
      event.type === 'combatantinfo' && 'sourceID' in event && String(event.sourceID) === playerId,
  );

  combatantInfoEventsForPlayer.forEach((cie) => {
    const auras = cie.auras || [];
    auras.forEach((aura) => {
      if (typeof aura.ability === 'number') {
        abilityIds.add(aura.ability);
      }
    });
  });

  // Add abilities from cast events
  castEvents.forEach((event) => {
    if (
      (event.type === 'cast' || event.type === 'begincast') &&
      String(event.sourceID) === playerId &&
      typeof event.abilityGameID === 'number'
    ) {
      abilityIds.add(event.abilityGameID);
    }
  });

  // Add abilities from damage events
  damageEvents.forEach((event) => {
    if (
      event.type === 'damage' &&
      String(event.sourceID) === playerId &&
      typeof event.abilityGameID === 'number'
    ) {
      abilityIds.add(event.abilityGameID);
    }
  });

  // Add abilities from friendly buff events (only apply events)
  friendlyBuffEvents.forEach((event) => {
    if (
      (event.type === 'applybuff' || event.type === 'applybuffstack') &&
      String(event.sourceID) === playerId &&
      typeof event.abilityGameID === 'number'
    ) {
      abilityIds.add(event.abilityGameID);
    }
  });

  // Add abilities from debuff events (only apply events)
  debuffEvents.forEach((event) => {
    if (
      (event.type === 'applydebuff' || event.type === 'applydebuffstack') &&
      String(event.sourceID) === playerId &&
      typeof event.abilityGameID === 'number'
    ) {
      abilityIds.add(event.abilityGameID);
    }
  });

  // Add abilities from talents
  if (talents) {
    talents.forEach((talent) => {
      if (typeof talent.guid === 'number') {
        abilityIds.add(talent.guid);
      }
    });
  }

  return abilityIds;
}

/**
 * Create a mapping of ability IDs to skill line names based on skillset data
 * Uses skill name matching against activeAbilities, ultimates, passives, and morphs
 */
export function createSkillLineAbilityMapping(
  abilitiesData: AbilitiesData | ReportAbilitiesData,
): Record<number, { className: string; skillLineName: string }> {
  const skillLineMapping: Record<number, { className: string; skillLineName: string }> = {};

  // Build mapping by matching ability names to skillset data
  for (const [abilityIdStr, ability] of Object.entries(abilitiesData)) {
    const abilityId = parseInt(String(abilityIdStr), 10);

    // Handle both GameAbility and ReportAbilityFragment types
    const abilityName = 'name' in ability && ability.name ? ability.name.toLowerCase() : '';

    // This handles the situation where multiple skills have the same name
    // For example, the DK passive combustion shares a name with the undaunted orb synergy "combustion"
    if (shouldSkipAbility(abilityName, abilityId)) {
      continue;
    }

    if (!abilityName) continue;

    // Skip obvious non-class abilities
    const skipPatterns = [
      'light attack',
      'heavy attack',
      'block',
      'bash',
      'dodge',
      'sprint',
      'synergy',
      'weapon',
      'armor',
      'enchant',
      'food',
      'drink',
      'mundus',
      'set bonus',
      'vampire',
      'werewolf',
      'guild',
      'world',
      'alliance',
      'generic',
      'basic',
      'common',
    ];

    if (skipPatterns.some((pattern) => ability.name?.toLowerCase().includes(pattern))) {
      continue;
    }

    // Check each class skillset for matching ability names
    for (const skillset of allSkillsets) {
      let found = false;

      // Check each skill line in the skillset
      for (const [skillLineKey, skillLine] of Object.entries(skillset.skillLines)) {
        // Check activeAbilities
        if (skillLine.activeAbilities) {
          for (const [key, activeAbility] of Object.entries(skillLine.activeAbilities)) {
            if (
              key.toLowerCase() === abilityName ||
              activeAbility.name.toLowerCase() === abilityName
            ) {
              // Use the skill line name if available, otherwise use the skill line key
              const skillLineName = skillLine.name || skillLineKey;
              const className = skillset.class || 'Unknown';
              skillLineMapping[abilityId] = { className, skillLineName };
              found = true;
              break;
            }

            // Check morphs of activeAbilities
            if (activeAbility.morphs) {
              for (const [morphKey, morph] of Object.entries(activeAbility.morphs)) {
                if (
                  morphKey.toLowerCase() === abilityName ||
                  morph.name.toLowerCase() === abilityName
                ) {
                  const skillLineName = skillLine.name || skillLineKey;
                  const className = skillset.class || 'Unknown';
                  skillLineMapping[abilityId] = { className, skillLineName };
                  found = true;
                  break;
                }
              }
            }
            if (found) break;
          }
        }

        // Check ultimates
        if (!found && skillLine.ultimates) {
          for (const [key, ultimate] of Object.entries(skillLine.ultimates)) {
            if (key.toLowerCase() === abilityName || ultimate.name.toLowerCase() === abilityName) {
              const skillLineName = skillLine.name || skillLineKey;
              const className = skillset.class || 'Unknown';
              skillLineMapping[abilityId] = { className, skillLineName };
              found = true;
              break;
            }

            // Check morphs of ultimates
            if (ultimate.morphs) {
              for (const [morphKey, morph] of Object.entries(ultimate.morphs)) {
                if (
                  morphKey.toLowerCase() === abilityName ||
                  morph.name.toLowerCase() === abilityName
                ) {
                  const skillLineName = skillLine.name || skillLineKey;
                  const className = skillset.class || 'Unknown';
                  skillLineMapping[abilityId] = { className, skillLineName };
                  found = true;
                  break;
                }
              }
            }
            if (found) break;
          }
        }

        // Check passives
        if (!found && skillLine.passives) {
          // Handle both object format { [key: string]: Passive } and array format Passive[]
          if (Array.isArray(skillLine.passives)) {
            // Array format
            for (const passive of skillLine.passives) {
              if (passive.name.toLowerCase() === abilityName) {
                const skillLineName = skillLine.name || skillLineKey;
                const className = skillset.class || 'Unknown';
                skillLineMapping[abilityId] = { className, skillLineName };
                found = true;
                break;
              }
            }
          } else {
            // Object format
            for (const [key, passive] of Object.entries(skillLine.passives)) {
              if (key.toLowerCase() === abilityName || passive.name.toLowerCase() === abilityName) {
                const skillLineName = skillLine.name || skillLineKey;
                const className = skillset.class || 'Unknown';
                skillLineMapping[abilityId] = { className, skillLineName };
                found = true;
                break;
              }
            }
          }
        }

        if (found) break;
      }
      if (found) break;
    }
  }

  return skillLineMapping;
}

/**
 * Analyze player ability usage to determine skill line usage
 * @param abilityIds - Array or Set of ability IDs used by the player
 * @param abilitiesData - Loaded abilities data
 * @param skillLineMapping - Pre-computed skill line mapping (optional, will create if not provided)
 */
export function analyzePlayerClassUsage(
  abilityIds: number[] | Set<number>,
  abilitiesData: AbilitiesData | ReportAbilitiesData,
  skillLineMapping?: Record<number, { className: string; skillLineName: string }>,
): ClassAnalysisResult {
  const skillLineAbilityCounts: Record<
    string,
    { className: string; count: number; skillIds: Set<number> }
  > = {};

  // Create skill line mapping if not provided
  if (!skillLineMapping) {
    // Use type assertion to handle union type
    skillLineMapping = createSkillLineAbilityMapping(abilitiesData as ReportAbilitiesData);
  }

  // Convert Set to Array if needed
  const abilityArray = Array.isArray(abilityIds) ? abilityIds : Array.from(abilityIds);

  // Check each ability ID against our skill line mapping
  for (const abilityId of abilityArray) {
    const skillLineInfo = skillLineMapping[abilityId];
    if (skillLineInfo) {
      const { skillLineName, className } = skillLineInfo;
      if (!skillLineAbilityCounts[skillLineName]) {
        skillLineAbilityCounts[skillLineName] = {
          className,
          count: 0,
          skillIds: new Set<number>(),
        };
      }
      skillLineAbilityCounts[skillLineName].count++;
      skillLineAbilityCounts[skillLineName].skillIds.add(abilityId);
    }
  }

  // Sort skill lines by ability count and create the array
  const skillLines = Object.entries(skillLineAbilityCounts)
    .map(([skillLine, { className, count, skillIds }]) => ({
      skillLine,
      className,
      count,
      skillIds,
    }))
    .sort((a, b) => b.count - a.count);

  const primarySkillLine = skillLines.length > 0 ? skillLines[0].skillLine : null;

  return {
    primary: primarySkillLine,
    skillLines,
  };
}

/**
 * Convenience function that extracts ability IDs from events and analyzes skill line usage for a player
 * @param playerId - The player ID to analyze
 * @param abilitiesData - Loaded abilities data
 * @param combatantInfoEvents - Combatant info events containing auras
 * @param castEvents - Cast events
 * @param damageEvents - Damage events
 * @param friendlyBuffEvents - Apply buff events
 * @param debuffEvents - Apply debuff events
 * @param talents - Player talents containing ability IDs
 * @param skillLineMapping - Pre-computed skill line mapping (optional)
 */
export function analyzePlayerClassFromEvents(
  playerId: string,
  abilitiesData: AbilitiesData | ReportAbilitiesData,
  combatantInfoEvents: CombatantInfoEvent[],
  castEvents: UnifiedCastEvent[],
  damageEvents: DamageEvent[],
  friendlyBuffEvents: BuffEvent[],
  debuffEvents: DebuffEvent[],
  talents?: PlayerTalent[],
  skillLineMapping?: Record<number, { className: string; skillLineName: string }>,
): ClassAnalysisResult {
  const abilityIds = extractPlayerAbilityIds(
    playerId,
    combatantInfoEvents,
    castEvents,
    damageEvents,
    friendlyBuffEvents,
    debuffEvents,
    talents,
  );

  return analyzePlayerClassUsage(
    Array.from(abilityIds),
    abilitiesData as ReportAbilitiesData,
    skillLineMapping,
  );
}
