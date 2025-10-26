import React from 'react';

import { SkillStat, SkillTooltipProps } from '../components/SkillTooltip';
import type { ScribedSkillData } from '@/features/scribing/types';
// TODO: Implement proper scribing detection services
// Temporary stubs to prevent compilation errors
const analyzeScribingSkillWithSignature = (..._args: unknown[]): null => null;
const getScribingSkillByAbilityId = (
  abilityId: number,
): { grimoire: string; transformation: string; transformationType: string } | null => {
  // Basic scribing abilities for backward compatibility
  const knownScribingAbilities: Record<
    number,
    { grimoire: string; transformation: string; transformationType: string }
  > = {
    217340: {
      grimoire: 'Traveling Knife',
      transformation: 'Physical Damage',
      transformationType: 'Focus Script',
    },
    217784: {
      grimoire: 'Soul Burst',
      transformation: 'Magic Damage',
      transformationType: 'Focus Script',
    },
    220542: {
      grimoire: 'Trample',
      transformation: 'Magic Damage',
      transformationType: 'Focus Script',
    },
    240150: {
      grimoire: 'Elemental Explosion',
      transformation: 'Fire Damage',
      transformationType: 'Focus Script',
    },
  };
  return knownScribingAbilities[abilityId] || null;
};
const GRIMOIRE_NAME_PATTERNS: Record<string, RegExp> = {};
const getAllGrimoires = (): unknown[] => [];
const SCRIBING_BLACKLIST = new Set<string>();
import { ReportAbility } from '../graphql/gql/graphql';
import {
  DamageEvent,
  HealEvent,
  BuffEvent,
  DebuffEvent,
  ResourceChangeEvent,
  UnifiedCastEvent,
} from '../types/combatlogEvents';
import { PlayerTalent } from '../types/playerDetails';

import { abilityIdMapper } from './abilityIdMapper';
import { findSkillByName, SkillNode, getClassKey } from './skillLinesRegistry';

// SkillNode type is now imported from skillLinesRegistry

// Keys we look for to render Stats. Extend as needed.
const STAT_LABELS: Record<string, string> = {
  cost: 'Cost',
  target: 'Target',
  duration: 'Duration',
  castTime: 'Cast Time',
  channelTime: 'Channel Time',
  radius: 'Radius',
  maxRange: 'Max Range',
  range: 'Range',
  cooldown: 'Cooldown',
};

function toStats(node: SkillNode): SkillStat[] {
  const stats: SkillStat[] = [];
  for (const [key, label] of Object.entries(STAT_LABELS)) {
    const v = node?.[key];
    if (typeof v === 'string' && v.trim().length > 0) {
      stats.push({ label, value: v });
    }
  }
  return stats;
}

export type MapSkillOptions = {
  className: string;
  skillLineName: string;
  node: SkillNode; // ability or morph node
  inheritFrom?: SkillNode; // parent ability to inherit base stats from
  // One of these for icon derivation; all optional (icon can be omitted)
  abilityId?: number;
  iconSlug?: string;
  iconUrl?: string;
  headerBadge?: string; // e.g., 'Active' | 'Passive' | 'Ultimate'
  morphOfName?: string; // optional explicit morphOf text
  scribedSkillData?: ScribedSkillData; // optional scribed skill data
};

export function mapSkillToTooltipProps(opts: MapSkillOptions): SkillTooltipProps {
  const {
    className,
    skillLineName,
    node,
    inheritFrom,
    abilityId,
    iconSlug,
    iconUrl,
    headerBadge,
    morphOfName,
    scribedSkillData: _scribedSkillData,
  } = opts;

  // Resolve fields, letting the node override parent inheritFrom
  const merged = inheritFrom ? { ...inheritFrom, ...node } : node;

  const stats = toStats(merged);
  const header =
    headerBadge ?? (typeof merged?.type === 'string' ? capitalCase(merged.type) : 'Active');

  // Build a richer multi-paragraph description when we have a parent (base) node
  const descriptionNode: React.ReactNode = ((): React.ReactNode => {
    const baseDesc = inheritFrom?.description as string | undefined;
    const morphDesc = merged?.description as string | undefined;
    const parts: React.ReactNode[] = [];

    // Prefer morph description over base description to avoid duplication
    // Most morph descriptions are complete and don't need the base description
    if (morphDesc && morphDesc.trim()) {
      parts.push(morphDesc.trim());
    } else if (baseDesc && baseDesc.trim()) {
      parts.push(baseDesc.trim());
    }
    // If we have pulse info, add a helpful synthesized line
    const pulseInterval = merged?.pulseInterval as string | undefined;
    const pulseDamage = merged?.pulseDamage as string | undefined;
    if (pulseInterval || pulseDamage) {
      const synthesized =
        [
          pulseInterval ? `Pulses every ${pulseInterval.replace(/^every /i, '')}` : undefined,
          pulseDamage ? `deals an additional ${pulseDamage}` : undefined,
        ]
          .filter(Boolean)
          .join(', ') + (pulseInterval || pulseDamage ? '.' : '');
      if (synthesized.trim()) parts.push(synthesized);
    }
    const passiveBuff = inheritFrom?.passiveBuff as string | undefined;
    if (passiveBuff && passiveBuff.trim()) {
      parts.push(`While slotted on either ability bar, gain ${passiveBuff}.`);
    }
    if (parts.length <= 1) {
      return parts[0] ?? '';
    }
    // Interleave paragraphs with line breaks without JSX (keep file as .ts)
    const children: React.ReactNode[] = [];
    parts.forEach((p, i) => {
      children.push(p);
      if (i < parts.length - 1) {
        children.push(React.createElement('br', { key: `br1-${i}` }));
        children.push(React.createElement('br', { key: `br2-${i}` }));
      }
    });
    return React.createElement(React.Fragment, null, ...children);
  })();

  return {
    headerBadge: header,
    lineText: `${className} — ${skillLineName}`,
    iconUrl,
    iconSlug,
    abilityId,
    name: merged?.name ?? 'Unknown',
    morphOf: morphOfName,
    stats,
    description: descriptionNode,
  };
}

function capitalCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// Detect if an ability name is a scribed skill and return grimoire name
function detectScribedSkillGrimoire(abilityName: string): string | null {
  if (!abilityName || SCRIBING_BLACKLIST.has(abilityName)) {
    return null;
  }

  for (const grimoireType of getAllGrimoires() as string[]) {
    const pattern = GRIMOIRE_NAME_PATTERNS[grimoireType];
    if (pattern?.test(abilityName)) {
      return grimoireType;
    }
  }

  return null;
}

// Normalize ability names to handle elemental staff variants
function normalizeAbilityName(abilityName: string): string {
  const name = abilityName.trim();

  // Handle Blockade variants - these all refer to "Elemental Blockade"
  if (name.startsWith('Blockade of ')) {
    return 'Elemental Blockade';
  }

  // Handle Wall variants - these all refer to "Wall of Elements"
  if (name.startsWith('Wall of ') && !name.includes('Elements')) {
    return 'Wall of Elements';
  }

  // Add more elemental variants as needed
  // Could add Impulse variants, etc.

  return name;
}

// Create fallback tooltip for known weapon abilities
function createWeaponAbilityFallback(abilityName: string): SkillTooltipProps | null {
  const normalizedName = normalizeAbilityName(abilityName);

  // Handle Blockade variants
  if (normalizedName === 'Elemental Blockade' || abilityName.startsWith('Blockade of ')) {
    return {
      name: abilityName,
      lineText: 'Destruction Staff',
      description:
        'Slam your staff down to create an elemental barrier in front of you, dealing Magic Damage to enemies in the target area every second. Blockade of Fire deals additional damage to Burning enemies. Blockade of Frost costs more, but snares and reduces armor against Chilled enemies and grants damage shields. Blockade of Storms sets Concussed enemies Off Balance.',
      stats: [
        { label: 'Cost', value: '2970 Magicka' },
        { label: 'Target', value: 'Area' },
        { label: 'Duration', value: '15 seconds' },
        { label: 'Radius', value: '18 meters' },
      ],
    };
  }

  // Handle Wall variants
  if (
    normalizedName === 'Wall of Elements' ||
    (abilityName.startsWith('Wall of ') && !abilityName.includes('Elements'))
  ) {
    return {
      name: abilityName,
      lineText: 'Destruction Staff',
      description:
        'Slam your staff down to create an elemental barrier in front of you, dealing Magic Damage to enemies in the target area every second. Wall of Fire deals additional damage to Burning enemies. Wall of Frost costs more, but snares and reduces armor against Chilled enemies and grants damage shields. Wall of Storms sets Concussed enemies Off Balance.',
      stats: [
        { label: 'Cost', value: '2970 Magicka' },
        { label: 'Target', value: 'Area' },
        { label: 'Duration', value: '10 seconds' },
        { label: 'Radius', value: '18 meters' },
      ],
    };
  }

  return null;
}

// Public helper: build rich SkillTooltipProps from ability ID
export function buildTooltipPropsFromAbilityId(
  abilityId: number,
  scribedSkillData?: ScribedSkillData,
): SkillTooltipProps | null {
  const abilityData = abilityIdMapper.getAbilityById(abilityId);
  if (!abilityData) {
    return null;
  }

  // Check if this is a scribed skill using ability ID lookup from scribing database
  const scribingInfo = getScribingSkillByAbilityId(abilityId);
  const finalScribedSkillData =
    scribedSkillData ||
    (scribingInfo
      ? {
          grimoireName: scribingInfo.grimoire,
          effects: [],
          recipe: {
            grimoire: scribingInfo.grimoire,
            transformation: scribingInfo.transformation,
            transformationType: scribingInfo.transformationType,
            confidence: 1.0, // 100% confidence since we have exact ability ID match
            matchMethod: 'ability-id-match',
            recipeSummary: `📖 ${scribingInfo.grimoire} + 🔄 ${scribingInfo.transformation}`,
            tooltipInfo: `📖 Grimoire: ${scribingInfo.grimoire}\n🔄 ${scribingInfo.transformationType}: ${scribingInfo.transformation}`,
          },
        }
      : undefined);

  // Try to find detailed skill data by name
  const found = abilityData.name ? findSkillByName(abilityData.name) : null;
  if (found) {
    const { node, skillLineName, skillLineData, parent } = found;
    const className = getClassKey(skillLineData);

    return mapSkillToTooltipProps({
      className: skillLineData.class || skillLineData.weapon || capitalCase(className),
      skillLineName,
      node,
      inheritFrom: parent,
      morphOfName: parent?.name,
      abilityId,
      iconUrl: abilityIdMapper.getIconUrl(abilityId) || undefined,
      scribedSkillData: finalScribedSkillData,
    });
  }

  // Fallback to basic tooltip with just ability data
  return {
    name: abilityData.name || 'Unknown Ability',
    description: `${abilityData.name || 'Unknown Ability'} (ID: ${abilityId})`,
    abilityId,
    iconUrl: abilityIdMapper.getIconUrl(abilityId) || undefined,
    lineText: scribingInfo ? 'Scribing' : 'Unknown Skill Line',
    stats: [],
  };
}

// Public helper: build rich SkillTooltipProps from class key and ability name
export function buildTooltipPropsFromClassAndName(
  classKey: string,
  abilityName: string,
  scribedSkillData?: ScribedSkillData,
): SkillTooltipProps | null {
  // Check if this is a scribed skill - first try ability ID lookup, then fallback to heuristics
  const abilityData = abilityIdMapper.getAbilityByName(abilityName);
  const scribingInfo = abilityData?.gameID ? getScribingSkillByAbilityId(abilityData.gameID) : null;
  const detectedGrimoire = scribingInfo ? null : detectScribedSkillGrimoire(abilityName);

  const finalScribedSkillData =
    scribedSkillData ||
    (scribingInfo
      ? {
          grimoireName: scribingInfo.grimoire,
          effects: [],
          recipe: {
            grimoire: scribingInfo.grimoire,
            transformation: scribingInfo.transformation,
            transformationType: scribingInfo.transformationType,
            confidence: 1.0, // 100% confidence since we have exact ability ID match
            matchMethod: 'ability-id-match',
            recipeSummary: `📖 ${scribingInfo.grimoire} + 🔄 ${scribingInfo.transformation}`,
            tooltipInfo: `📖 Grimoire: ${scribingInfo.grimoire}\n🔄 ${scribingInfo.transformationType}: ${scribingInfo.transformation}`,
          },
        }
      : detectedGrimoire
        ? {
            grimoireName: detectedGrimoire,
            effects: [],
            recipe: {
              grimoire: detectedGrimoire,
              transformation: 'Unknown',
              transformationType: 'Focus Script',
              confidence: 0.7, // Lower confidence for heuristic-based detection
              matchMethod: 'name-pattern-match',
              recipeSummary: `📖 ${detectedGrimoire} + 🔄 Unknown Focus Script`,
              tooltipInfo: `📖 Grimoire: ${detectedGrimoire}\n🔄 Focus Script: Unknown (detected by name pattern)`,
            },
          }
        : undefined);

  // First try to find by name in skill lines
  const found = findSkillByName(abilityName);
  if (found) {
    const { node, skillLineName, skillLineData, parent } = found;
    const className = getClassKey(skillLineData);

    // abilityData is already defined above, use it for ability ID and icon

    return mapSkillToTooltipProps({
      className: skillLineData.class || skillLineData.weapon || capitalCase(className),
      skillLineName,
      node,
      inheritFrom: parent,
      morphOfName: parent?.name,
      abilityId: abilityData?.gameID,
      iconUrl: abilityData?.gameID
        ? abilityIdMapper.getIconUrl(abilityData.gameID) || undefined
        : undefined,
      scribedSkillData: finalScribedSkillData,
    });
  }

  // Fallback to weapon ability fallback
  const weaponFallback = createWeaponAbilityFallback(abilityName);
  if (weaponFallback) {
    return {
      ...weaponFallback,
    };
  }

  // If this is a scribed skill but not found in skill lines, create a basic scribed skill tooltip
  if (scribingInfo || detectedGrimoire) {
    const grimoireName = scribingInfo?.grimoire || detectedGrimoire;
    return {
      name: abilityName,
      description: `${abilityName} - A scribed skill from the ${grimoireName} grimoire.`,
      lineText: 'Scribing',
      stats: [],
    };
  }

  return null;
}

/**
 * Enhanced scribing tooltip mapper that includes signature script detection
 * This function can be used when you have access to the full combat log data
 */
export function enhancedScribingTooltipMapper(
  abilityId: number,
  talent: PlayerTalent,
  allReportAbilities: ReportAbility[],
  allDebuffEvents: DebuffEvent[],
  allBuffEvents: BuffEvent[],
  allResourceEvents: ResourceChangeEvent[],
  allDamageEvents: DamageEvent[],
  allCastEvents: UnifiedCastEvent[],
  allHealingEvents: HealEvent[],
  playerId = 1,
): SkillTooltipProps | null {
  // First try to get enhanced scribing data with signature script detection
  const enhancedScribingData = analyzeScribingSkillWithSignature(
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

  // Use the enhanced scribing data to build tooltip props
  return buildTooltipPropsFromAbilityId(abilityId, enhancedScribingData || undefined);
}

/**
 * Helper function to enrich existing ScribedSkillData with signature script information
 * Use this when you have basic scribing data but want to add signature script detection
 */
export function enrichScribedSkillData(
  baseScribingData: ScribedSkillData,
  abilityId?: number,
): ScribedSkillData {
  const enhanced: ScribedSkillData = { ...baseScribingData };

  // If we have an ability ID, try to get more detailed scribing information
  if (abilityId) {
    const scribingInfo = getScribingSkillByAbilityId(abilityId);
    if (scribingInfo && !enhanced.recipe) {
      enhanced.recipe = {
        grimoire: scribingInfo.grimoire,
        transformation: scribingInfo.transformation,
        transformationType: scribingInfo.transformationType,
        confidence: 1.0,
        matchMethod: 'ability-id-lookup',
        recipeSummary: `📖 ${scribingInfo.grimoire} + 🔄 ${scribingInfo.transformation}`,
        tooltipInfo: `📖 Grimoire: ${scribingInfo.grimoire}\n🔄 ${scribingInfo.transformationType}: ${scribingInfo.transformation}`,
      };
    }
  }

  // TODO: Add signature script detection here when we have access to combat log data
  // For now, we can only enhance with basic ability ID lookup

  return enhanced;
}

// Enhanced function that can work with either ID or name
export function buildTooltipProps(options: {
  abilityId?: number;
  abilityName?: string;
  classKey?: string;
  scribedSkillData?: ScribedSkillData;
}): SkillTooltipProps | null {
  const { abilityId, abilityName, classKey, scribedSkillData } = options;

  // Prefer ID-based lookup if available
  if (abilityId) {
    return buildTooltipPropsFromAbilityId(abilityId, scribedSkillData);
  }

  // Fall back to name-based lookup
  if (abilityName) {
    return buildTooltipPropsFromClassAndName(classKey || '', abilityName, scribedSkillData);
  }

  return null;
}
