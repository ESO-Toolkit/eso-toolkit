/**
 * Utility functions for detecting player classes based on ability usage
 *
 * This module provides functionality to:
 * - Map ability IDs to their corresponding classes using skillset data
 * - Analyze player ability usage to determine primary and secondary classes
 * - Provide detailed class analysis results
 */

// Import skillset data
import { KnownAbilities, AURA_EXCLUDED_ABILITIES } from '@/types/abilities';

import * as classSkillLines from '../data/skill-lines/class';
import type { SkillLineData } from '../data/types/skill-line-types';
// Import types
import { ReportAbilityFragment } from '../graphql/gql/graphql';
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

const SKIP_NAME_PATTERNS = [
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

const CLASS_SKILL_LINES = Object.values(classSkillLines) as SkillLineData[];

interface SkillLineMeta {
  className: string;
  skillLineName: string;
}

const ABILITY_ID_TO_SKILL_LINE = new Map<number, SkillLineMeta>();
const ABILITY_NAME_TO_SKILL_LINE = new Map<string, SkillLineMeta>();

function normalizeName(value?: string | null): string {
  return value?.toLowerCase().trim() ?? '';
}

function registerSkillLineMeta(): void {
  for (const skillLine of CLASS_SKILL_LINES) {
    if (!skillLine?.skills) continue;
    const meta: SkillLineMeta = {
      className: skillLine.class || 'Unknown',
      skillLineName: skillLine.name,
    };

    for (const skill of skillLine.skills) {
      if (typeof skill.id === 'number' && !ABILITY_ID_TO_SKILL_LINE.has(skill.id)) {
        ABILITY_ID_TO_SKILL_LINE.set(skill.id, meta);
      }

      const normalizedSkillName = normalizeName(skill.name);
      if (normalizedSkillName && !ABILITY_NAME_TO_SKILL_LINE.has(normalizedSkillName)) {
        ABILITY_NAME_TO_SKILL_LINE.set(normalizedSkillName, meta);
      }
    }
  }
}

registerSkillLineMeta();

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
    skillIds: Set<number>;
  }>;
}

function shouldSkipAbility(abilityName: string | undefined | null, abilityId: number): boolean {
  const normalizedName = normalizeName(abilityName);
  if (!normalizedName) {
    return false;
  }

  const requirementKey = Object.keys(SKILL_NAME_ID_REQUIREMENTS).find(
    (name) => name.toLowerCase() === normalizedName,
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
  _damageEvents: DamageEvent[],
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
      if (typeof aura.ability === 'number' && !AURA_EXCLUDED_ABILITIES.has(aura.ability)) {
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
  // Damage events routinely report class skills cast by other combatants (synergies, companions, etc.)
  // and create false positives, so they are intentionally ignored.

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

  for (const [abilityIdStr, ability] of Object.entries(abilitiesData)) {
    const abilityId = Number(abilityIdStr);
    if (!Number.isFinite(abilityId)) {
      continue;
    }

    const abilityName = 'name' in ability ? ability.name : undefined;

    if (shouldSkipAbility(abilityName, abilityId)) {
      continue;
    }

    const normalizedAbilityName = normalizeName(abilityName);

    if (
      normalizedAbilityName &&
      SKIP_NAME_PATTERNS.some((pattern) => normalizedAbilityName.includes(pattern))
    ) {
      continue;
    }

    const meta =
      ABILITY_ID_TO_SKILL_LINE.get(abilityId) ||
      (normalizedAbilityName ? ABILITY_NAME_TO_SKILL_LINE.get(normalizedAbilityName) : undefined);

    if (meta) {
      skillLineMapping[abilityId] = meta;
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
