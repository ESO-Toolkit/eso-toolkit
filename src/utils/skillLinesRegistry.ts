// Import all skill-lines data
import { assault } from '../data/skill-lines/alliance-war/assault';
import { support } from '../data/skill-lines/alliance-war/support';
import * as classSkillLines from '../data/skill-lines/class';
import { darkBrotherhood } from '../data/skill-lines/guild/darkBrotherhood';
import { fightersGuild } from '../data/skill-lines/guild/fightersGuild';
import { magesGuild } from '../data/skill-lines/guild/magesGuild';
import { psijicOrder } from '../data/skill-lines/guild/psijicOrder';
import { thievesGuild } from '../data/skill-lines/guild/thievesGuild';
import { undaunted } from '../data/skill-lines/guild/undaunted';
import { bowSkillLine } from '../data/skill-lines/weapon/bow';
import { destructionStaffSkillLine } from '../data/skill-lines/weapon/destructionStaff';
import { dualWieldSkillLine } from '../data/skill-lines/weapon/dualWield';
import { oneHandAndShieldSkillLine } from '../data/skill-lines/weapon/oneHandAndShield';
import { restorationStaff as restorationStaffSkillLine } from '../data/skill-lines/weapon/restorationStaff';
import { twoHandedSkillLine } from '../data/skill-lines/weapon/twoHanded';
import type { SkillData, SkillLineData } from '../data/types/skill-line-types';

type SkillAbilityCollection = 'ultimates' | 'actives' | 'activeAbilities' | 'passives';
type SkillCategoryKey = 'classes' | 'weapons' | 'alliance' | 'guild';

type RegistryCategoryValue = SkillLineData | SkillLineData[] | null | undefined;

type RegistryCategory = Record<string, RegistryCategoryValue>;

const CLASS_SKILL_LINES = Object.values(classSkillLines) as SkillLineData[];

const CLASS_REGISTRY: Record<string, SkillLineData[]> = CLASS_SKILL_LINES.reduce(
  (acc, skillLine) => {
    const key = (skillLine.class || 'Unknown').toLowerCase();
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(skillLine);
    return acc;
  },
  {} as Record<string, SkillLineData[]>,
);

// Registry of all skill lines organized by category
export const SKILL_LINES_REGISTRY = {
  classes: CLASS_REGISTRY,
  weapons: {
    bow: bowSkillLine,
    destructionStaff: destructionStaffSkillLine,
    dualWield: dualWieldSkillLine,
    oneHandAndShield: oneHandAndShieldSkillLine,
    restorationStaff: restorationStaffSkillLine,
    twoHanded: twoHandedSkillLine,
  },
  alliance: {
    assault,
    support,
  },
  guild: {
    undaunted: undaunted,
    fightersGuild: fightersGuild,
    magesGuild: magesGuild,
    thievesGuild: thievesGuild,
    darkBrotherhood: darkBrotherhood,
    psijicOrder: psijicOrder,
  },
} as const;

function flattenCategory(category: RegistryCategory): SkillLineData[] {
  const entries: SkillLineData[] = [];
  for (const value of Object.values(category)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      entries.push(...value.filter(Boolean) as SkillLineData[]);
    } else {
      entries.push(value as SkillLineData);
    }
  }
  return entries;
}

export const ALL_SKILL_LINES: SkillLineData[] = [
  ...flattenCategory(SKILL_LINES_REGISTRY.classes as RegistryCategory),
  ...flattenCategory(SKILL_LINES_REGISTRY.weapons as RegistryCategory),
  ...flattenCategory(SKILL_LINES_REGISTRY.alliance as RegistryCategory),
  ...flattenCategory(SKILL_LINES_REGISTRY.guild as RegistryCategory),
];

// Type for skill node (ability/morph)
export interface SkillNode {
  name?: string;
  type?: string;
  description?: string;
  cost?: string;
  target?: string;
  duration?: string;
  castTime?: string;
  channelTime?: string;
  radius?: string;
  maxRange?: string;
  range?: string;
  cooldown?: string;
  damage?: string;
  healing?: string;
  morphs?: SkillNode[] | Record<string, SkillNode>;
  // Additional properties specific to skill-lines structure
  [key: string]: unknown;
}

// Type for search result
export interface SkillSearchResult {
  node: SkillNode;
  skillLineName: string;
  skillLineData: SkillLineData;
  category: SkillCategoryKey;
  abilityType?: SkillAbilityCollection;
  parent?: SkillNode;
}

function normalizeName(value?: string): string {
  return value?.toLowerCase().trim() ?? '';
}

function resolveAbilityCollection(skill: SkillData): SkillAbilityCollection {
  if (skill.type === 'ultimate' || skill.isUltimate) return 'ultimates';
  if (skill.type === 'passive' || skill.isPassive) return 'passives';
  return 'actives';
}

function skillDataToSkillNode(skill: SkillData): SkillNode {
  const skillNode: SkillNode = { ...skill };
  if (!skillNode.type) {
    if (skill.isUltimate) skillNode.type = 'ultimate';
    else if (skill.isPassive) skillNode.type = 'passive';
    else skillNode.type = 'active';
  }
  return skillNode;
}

function findParentSkillNode(skillLineData: SkillLineData, skill: SkillData): SkillNode | undefined {
  const parentId = skill.baseSkillId ?? skill.baseAbilityId;
  if (!parentId || parentId === skill.id) {
    return undefined;
  }

  const parent = skillLineData.skills.find(
    (candidate) => candidate.id === parentId || candidate.baseAbilityId === parentId,
  );
  return parent ? skillDataToSkillNode(parent) : undefined;
}

function searchSkillLine(
  skillLineData: SkillLineData,
  normalizedTarget: string,
  category: SkillCategoryKey,
): SkillSearchResult | null {
  if (!Array.isArray(skillLineData.skills)) return null;

  for (const skill of skillLineData.skills) {
    if (!skill?.name) continue;
    if (normalizeName(skill.name) !== normalizedTarget) continue;

    const node = skillDataToSkillNode(skill);
    return {
      node,
      skillLineName: skillLineData.name,
      skillLineData,
      category,
      abilityType: resolveAbilityCollection(skill),
      parent: findParentSkillNode(skillLineData, skill),
    };
  }

  return null;
}

function searchClassSkillLines(normalizedTarget: string): SkillSearchResult | null {
  for (const skillLines of Object.values(SKILL_LINES_REGISTRY.classes)) {
    for (const skillLine of skillLines) {
      const result = searchSkillLine(skillLine, normalizedTarget, 'classes');
      if (result) return result;
    }
  }
  return null;
}

function searchCategorySkillLines(
  category: Exclude<SkillCategoryKey, 'classes'>,
  normalizedTarget: string,
): SkillSearchResult | null {
  const entries = SKILL_LINES_REGISTRY[category];
  for (const skillLineData of Object.values(entries)) {
    if (!skillLineData) continue;
    const result = searchSkillLine(skillLineData as SkillLineData, normalizedTarget, category);
    if (result) return result;
  }
  return null;
}

/**
 * Search for a skill/ability by name across all skill lines
 */
export function findSkillByName(abilityName: string): SkillSearchResult | null {
  if (!abilityName) return null;

  const normalizedTarget = abilityName.toLowerCase().trim();
  return (
    searchClassSkillLines(normalizedTarget) ||
    searchCategorySkillLines('weapons', normalizedTarget) ||
    searchCategorySkillLines('alliance', normalizedTarget) ||
    searchCategorySkillLines('guild', normalizedTarget)
  );
}

/**
 * Get class key from skillset data
 */
export function getClassKey(skillLineData: SkillLineData): string {
  if (!skillLineData || typeof skillLineData !== 'object') {
    return 'unknown';
  }

  const className = (skillLineData as { class?: string }).class?.toLowerCase();
  if (className) return className;
  const weapon = (skillLineData as { weapon?: string }).weapon?.toLowerCase();
  if (weapon) return weapon;
  return 'unknown';
}
