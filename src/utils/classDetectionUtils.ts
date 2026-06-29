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
import { CLASS_MASTERY_LINE_NAME } from '../data/skill-lines/class/classMastery';
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
const BASE_CLASS_SKILL_LINES_BY_CLASS = new Map<string, SkillLineMeta[]>();

function normalizeName(value?: string | null): string {
  return value?.toLowerCase().trim() ?? '';
}

function skillLineKey(meta: SkillLineMeta): string {
  return `${meta.className}\u0000${meta.skillLineName}`;
}

function registerBaseClassSkillLine(meta: SkillLineMeta): void {
  if (meta.skillLineName === CLASS_MASTERY_LINE_NAME) {
    return;
  }

  const classKey = normalizeName(meta.className);
  const lines = BASE_CLASS_SKILL_LINES_BY_CLASS.get(classKey) ?? [];
  if (!lines.some((line) => line.skillLineName === meta.skillLineName)) {
    lines.push(meta);
    BASE_CLASS_SKILL_LINES_BY_CLASS.set(classKey, lines);
  }
}

function registerSkillLineMeta(): void {
  for (const skillLine of CLASS_SKILL_LINES) {
    if (!skillLine?.skills) continue;
    const meta: SkillLineMeta = {
      className: skillLine.class || 'Unknown',
      skillLineName: skillLine.name,
    };

    registerBaseClassSkillLine(meta);

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

interface SkillLineCount {
  skillLine: string;
  className: string;
  count: number;
  skillIds: Set<number>;
  order: number;
}

function addSkillLineEvidence(
  skillLineAbilityCounts: Map<string, SkillLineCount>,
  meta: SkillLineMeta,
  abilityId?: number,
): void {
  const key = skillLineKey(meta);
  let entry = skillLineAbilityCounts.get(key);
  if (!entry) {
    entry = {
      skillLine: meta.skillLineName,
      className: meta.className,
      count: 0,
      skillIds: new Set<number>(),
      order: skillLineAbilityCounts.size,
    };
    skillLineAbilityCounts.set(key, entry);
  }

  if (abilityId !== undefined) {
    entry.count++;
    entry.skillIds.add(abilityId);
  }
}

function addNativeClassLinesFromClassMastery(
  skillLineAbilityCounts: Map<string, SkillLineCount>,
  classMasteryClasses: Set<string>,
): void {
  for (const className of classMasteryClasses) {
    const nativeLines = BASE_CLASS_SKILL_LINES_BY_CLASS.get(normalizeName(className)) ?? [];
    nativeLines.forEach((meta) => {
      addSkillLineEvidence(skillLineAbilityCounts, meta);
    });
  }
}

function resolveSkillLineMeta(
  abilityId: number,
  skillLineMapping?: Record<number, { className: string; skillLineName: string }>,
): SkillLineMeta | undefined {
  return skillLineMapping?.[abilityId] ?? ABILITY_ID_TO_SKILL_LINE.get(abilityId);
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
  // Only include auras the player placed themselves (aura.source === player).
  // Pre-buff AoE zones placed by *other* players register on all nearby players at fight start;
  // filtering by source prevents cross-player effects from polluting class detection.
  // Known active-skill pre-buff residuals (e.g. Standard of Might ground zone, Lightning Flood
  // puddle) that slip through as self-sourced auras are excluded via AURA_EXCLUDED_ABILITIES.
  const combatantInfoEventsForPlayer = combatantInfoEvents.filter(
    (event) =>
      event.type === 'combatantinfo' && 'sourceID' in event && String(event.sourceID) === playerId,
  );

  const playerIdNum = Number(playerId);
  combatantInfoEventsForPlayer.forEach((cie) => {
    const auras = cie.auras || [];
    auras.forEach((aura) => {
      if (
        typeof aura.ability === 'number' &&
        !AURA_EXCLUDED_ABILITIES.has(aura.ability) &&
        aura.source === playerIdNum
      ) {
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
  const skillLineAbilityCounts = new Map<string, SkillLineCount>();
  const classMasteryClasses = new Set<string>();

  // Create skill line mapping if not provided
  if (!skillLineMapping) {
    // Use type assertion to handle union type
    skillLineMapping = createSkillLineAbilityMapping(abilitiesData as ReportAbilitiesData);
  }

  // Convert Set to Array if needed
  const abilityArray = Array.isArray(abilityIds) ? abilityIds : Array.from(abilityIds);

  // Check each ability ID against our skill line mapping
  for (const abilityId of abilityArray) {
    const skillLineInfo = resolveSkillLineMeta(abilityId, skillLineMapping);
    if (skillLineInfo) {
      if (skillLineInfo.skillLineName === CLASS_MASTERY_LINE_NAME) {
        classMasteryClasses.add(skillLineInfo.className);
        continue;
      }
      addSkillLineEvidence(skillLineAbilityCounts, skillLineInfo, abilityId);
    }
  }

  addNativeClassLinesFromClassMastery(skillLineAbilityCounts, classMasteryClasses);

  // Sort skill lines by ability count and create the array
  const skillLines = Array.from(skillLineAbilityCounts.values())
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .map(({ skillLine, className, count, skillIds }) => ({
      skillLine,
      className,
      count,
      skillIds,
    }));

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

/**
 * Detect class and skill lines from talent data alone (no combat events needed).
 *
 * Talents contain `guid` values that are ability IDs — we match them directly
 * against the pre-built ABILITY_ID_TO_SKILL_LINE Map. This is useful for
 * contexts where only PlayerDetails data is available (e.g., leaderboard
 * roster import) without full combat event streams.
 */
export function detectClassFromTalents(talents: PlayerTalent[]): ClassAnalysisResult {
  const skillLineCounts = new Map<string, SkillLineCount>();
  const classMasteryClasses = new Set<string>();

  for (const talent of talents) {
    const id = talent.guid;
    if (typeof id !== 'number') continue;

    const meta = ABILITY_ID_TO_SKILL_LINE.get(id);
    if (!meta) continue;

    if (meta.skillLineName === CLASS_MASTERY_LINE_NAME) {
      classMasteryClasses.add(meta.className);
      continue;
    }

    addSkillLineEvidence(skillLineCounts, meta, id);
  }

  addNativeClassLinesFromClassMastery(skillLineCounts, classMasteryClasses);

  const skillLines = Array.from(skillLineCounts.values())
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .map(({ skillLine, className, count, skillIds }) => ({
      skillLine,
      className,
      count,
      skillIds,
    }));

  // `primary` is the primary *skill-line* name, matching the documented
  // contract of analyzePlayerClassUsage (see playerToBuild.ts) and its tests.
  // Returning className here previously made the same result shape ambiguous.
  return {
    primary: skillLines.length > 0 ? skillLines[0].skillLine : null,
    skillLines,
  };
}
