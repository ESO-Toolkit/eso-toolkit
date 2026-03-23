/**
 * Skill Line Skills - Uses curated skill line data for ability selection
 * Provides active abilities and ultimates from organized skill lines
 */
/* eslint-disable import/order */

import abilitiesRaw from '../../../../data/abilities.json';
import scribingDatabaseRaw from '../../../../data/scribing-complete.json';
import { assault } from '../../../data/skill-lines/alliance-war/assault';
import { support } from '../../../data/skill-lines/alliance-war/support';
import { heavyArmor } from '../../../data/skill-lines/armor/heavyArmor';
import { lightArmor } from '../../../data/skill-lines/armor/lightArmor';
import { mediumArmor } from '../../../data/skill-lines/armor/mediumArmor';
import * as classSkillLines from '../../../data/skill-lines/class';
import { SCRIBING_ICON_OVERRIDES } from '../../../data/skill-lines/generated/scribingIconOverrides';
import { SKILL_ICON_OVERRIDES } from '../../../data/skill-lines/generated/skillIconOverrides';

// Import guild skill lines (SkillLineData with flat skills array)
import { darkBrotherhood } from '../../../data/skill-lines/guild/darkBrotherhood';
import { fightersGuild } from '../../../data/skill-lines/guild/fightersGuild';
import { magesGuild } from '../../../data/skill-lines/guild/magesGuild';
import { psijicOrder } from '../../../data/skill-lines/guild/psijicOrder';
import { thievesGuild } from '../../../data/skill-lines/guild/thievesGuild';
import { undaunted } from '../../../data/skill-lines/guild/undaunted';

// Import regenerated class skill lines (SkillLineData modules)

// Import alliance war skill lines

// Import regenerated weapon skill lines
import { bowSkillLine } from '../../../data/skill-lines/weapon/bow';
import { destructionStaffSkillLine } from '../../../data/skill-lines/weapon/destructionStaff';
import { dualWieldSkillLine } from '../../../data/skill-lines/weapon/dualWield';
import { oneHandAndShieldSkillLine } from '../../../data/skill-lines/weapon/oneHandAndShield';
import { restorationStaff as restorationStaffSkillLine } from '../../../data/skill-lines/weapon/restorationStaff';
import { twoHandedSkillLine } from '../../../data/skill-lines/weapon/twoHanded';
import { excavation } from '../../../data/skill-lines/world/excavation';
import { legerdemain } from '../../../data/skill-lines/world/legerdemain';
import { mythicAbilities } from '../../../data/skill-lines/world/mythicAbilities';
import { scrying } from '../../../data/skill-lines/world/scrying';
import { soulMagic } from '../../../data/skill-lines/world/soul-magic';
import { vampire } from '../../../data/skill-lines/world/vampire';
import { werewolf } from '../../../data/skill-lines/world/werewolf';
import type { Ability, SkillData, SkillLineData } from '../../../data/types/skill-line-types';
import { Logger } from '@/utils/logger';

// Guild skill lines (flat structure)
const GUILD_SKILL_LINES: SkillLineData[] = [
  fightersGuild,
  magesGuild,
  psijicOrder,
  undaunted,
  darkBrotherhood,
  thievesGuild,
];

const CLASS_SKILL_LINES: SkillLineData[] = Object.values(classSkillLines).filter(
  (value): value is SkillLineData => Boolean((value as SkillLineData | undefined)?.skills),
);

const WEAPON_SKILL_LINES: SkillLineData[] = [
  bowSkillLine,
  destructionStaffSkillLine,
  dualWieldSkillLine,
  oneHandAndShieldSkillLine,
  restorationStaffSkillLine,
  twoHandedSkillLine,
];

const ARMOR_SKILL_LINES: SkillLineData[] = [lightArmor, mediumArmor, heavyArmor];

const ALLIANCE_SKILL_LINES: SkillLineData[] = [assault, support];

const WORLD_SKILL_LINES: SkillLineData[] = [
  soulMagic,
  vampire,
  werewolf,
  scrying,
  excavation,
  legerdemain,
  mythicAbilities,
];

const SANITIZED_ICON_MISSING = new Set(['', 'icon_missing']);
const SKILL_ICON_OVERRIDE_MAP: Record<number, string> = {
  ...SKILL_ICON_OVERRIDES,
  ...SCRIBING_ICON_OVERRIDES,
};

const sanitizeIconValue = (icon?: string | null): string | undefined => {
  if (!icon) return undefined;
  const trimmed = icon.trim();
  if (!trimmed || SANITIZED_ICON_MISSING.has(trimmed)) return undefined;
  return trimmed;
};

const getIconOverride = (id?: number): string | undefined => {
  if (id == null) return undefined;
  return SKILL_ICON_OVERRIDE_MAP[id];
};

const getSkillIcon = (skill: SkillData): string | undefined => {
  const directIcon = sanitizeIconValue(skill.icon as string | undefined);
  if (directIcon) return directIcon;

  const candidateIds = [
    skill.id,
    (skill as SkillData).baseAbilityId,
    (skill as SkillData).baseSkillId,
    ...(((skill as SkillData).alternateIds as number[]) ?? []),
  ];

  for (const candidate of candidateIds) {
    if (candidate == null) continue;
    const override = getIconOverride(candidate);
    if (override) {
      return override;
    }
  }

  return undefined;
};

type ScribingTransformation = {
  name: string;
  abilityIds?: number[];
};

type ScribingGrimoire = {
  id?: number;
  name: string;
  nameTransformations: Record<string, ScribingTransformation>;
};

type ScribingDatabase = {
  grimoires?: Record<string, ScribingGrimoire>;
};

const scribingDatabase = scribingDatabaseRaw as ScribingDatabase;

// Cache for all active skills
let activeSkillsCache: SkillData[] | null = null;
let passiveSkillsCache: SkillData[] | null = null;
let skillsByIdCache: Map<number, SkillData> | null = null;
let skillsByNameCache: Map<string, SkillData> | null = null;
const skillsLogger = new Logger({ contextPrefix: 'SkillLineSkills' });

/**
 * Initialize the cache by extracting all active/ultimate abilities from skill lines
 */
function initializeCache(): void {
  if (activeSkillsCache !== null) return;

  activeSkillsCache = [];
  passiveSkillsCache = [];
  skillsByIdCache = new Map();
  skillsByNameCache = new Map();
  const activeSkills = activeSkillsCache;
  const passiveSkills = passiveSkillsCache;
  const skillsById = skillsByIdCache;
  const skillsByName = skillsByNameCache;

  const ingestSkillLine = (skillLineData: SkillLineData | undefined): void => {
    if (!skillLineData?.skills) return;
    const skillLineName = skillLineData.name || 'Unknown';

    for (const skill of skillLineData.skills) {
      const skillType =
        skill.type ?? (skill.isUltimate ? 'ultimate' : skill.isPassive ? 'passive' : 'active');

      const baseSkillId = skill.baseSkillId ?? skill.baseAbilityId;
      const skillData: SkillData = {
        id: skill.id,
        name: skill.name,
        type: skillType,
        isPassive: skillType === 'passive',
        category: skillLineName,
        icon: getSkillIcon(skill),
        isUltimate: skillType === 'ultimate' || Boolean(skill.isUltimate),
        baseSkillId,
        baseAbilityId: skill.baseAbilityId ?? baseSkillId,
        description: skill.description,
        alternateIds: Array.isArray((skill as SkillData).alternateIds)
          ? [...((skill as SkillData).alternateIds as number[])]
          : undefined,
      };

      if (skillType === 'passive') {
        passiveSkills.push(skillData);
      } else {
        activeSkills.push(skillData);
      }
      skillsById.set(skill.id, skillData);
      skillsByName.set(skill.name.toLowerCase(), skillData);

      if (skillData.alternateIds?.length) {
        for (const altId of skillData.alternateIds) {
          if (typeof altId === 'number') {
            skillsById.set(altId, skillData);
          }
        }
      }
    }
  };

  // Process guild, class, weapon, and alliance skill lines (flat SkillLineData structures)
  [
    ...GUILD_SKILL_LINES,
    ...CLASS_SKILL_LINES,
    ...WEAPON_SKILL_LINES,
    ...ALLIANCE_SKILL_LINES,
    ...WORLD_SKILL_LINES,
    ...ARMOR_SKILL_LINES,
  ].forEach(ingestSkillLine);

  ingestScribingSkills(activeSkills, skillsById, skillsByName);

  // Sort alphabetically for better UX
  activeSkills.sort((a, b) => a.name.localeCompare(b.name));
  passiveSkills.sort((a, b) => a.name.localeCompare(b.name));
  skillsLogger.info('Initialized skill line cache', {
    active: activeSkillsCache.length,
    passive: passiveSkillsCache!.length,
  });
}

function ingestScribingSkills(
  activeSkills: SkillData[],
  skillsById: Map<number, SkillData>,
  skillsByName: Map<string, SkillData>,
): void {
  const grimoires = scribingDatabase?.grimoires;
  if (!grimoires) return;

  const seen = new Set<number>(activeSkills.map((skill) => skill.id));

  for (const grimoire of Object.values(grimoires)) {
    if (!grimoire) continue;
    const category = `Scribing · ${grimoire.name}`;
    const baseSkillId = typeof grimoire.id === 'number' ? grimoire.id : undefined;
    const baseIcon = baseSkillId ? getIconOverride(baseSkillId) : undefined;

    if (baseSkillId && !seen.has(baseSkillId)) {
      const baseSkill: SkillData = {
        id: baseSkillId,
        name: grimoire.name,
        type: 'active',
        category,
        icon: baseIcon,
        baseSkillId,
        baseAbilityId: baseSkillId,
      };
      activeSkills.push(baseSkill);
      skillsById.set(baseSkillId, baseSkill);
      skillsByName.set(baseSkill.name.toLowerCase(), baseSkill);
      seen.add(baseSkillId);
    }

    for (const transformation of Object.values(grimoire.nameTransformations ?? {})) {
      if (!transformation?.abilityIds?.length) continue;

      for (const abilityId of transformation.abilityIds) {
        if (seen.has(abilityId)) continue;

        const icon = getIconOverride(abilityId) ?? baseIcon;
        const skillData: SkillData = {
          id: abilityId,
          name: transformation.name,
          type: 'active',
          category,
          icon,
          baseSkillId,
          baseAbilityId: baseSkillId,
          grimoire: grimoire.name,
        };

        activeSkills.push(skillData);
        skillsById.set(abilityId, skillData);
        skillsByName.set(skillData.name.toLowerCase(), skillData);
        seen.add(abilityId);
      }
    }
  }
}

const abilitiesById = abilitiesRaw as Record<string, Ability>;

/**
 * Get skill by ID. Falls back to abilities.json for IDs not in the curated
 * skill-line data (e.g. passive rank variants).
 */
export function getSkillById(id: number): SkillData | undefined {
  if (!activeSkillsCache) {
    initializeCache();
  }
  const cached = skillsByIdCache?.get(id);
  if (cached) return cached;

  // Fallback: look up in abilities.json for IDs missing from skill-line data
  const ability = abilitiesById[String(id)];
  if (!ability) return undefined;

  const fallback: SkillData = {
    id: ability.id,
    name: ability.name,
    type: 'passive',
    isPassive: true,
    icon: ability.icon,
  };
  // Cache so subsequent lookups are instant
  skillsByIdCache?.set(id, fallback);
  return fallback;
}

/**
 * Search skills by name (active, ultimate, and passive).
 * Callers can filter by `skill.isPassive` to narrow results.
 */
export function searchSkills(query: string, limit = 50): SkillData[] {
  // If cache not ready, initialize in background
  if (!activeSkillsCache || !passiveSkillsCache) {
    initializeCache();
    return [];
  }

  const lowerQuery = query.toLowerCase().trim();
  const results: SkillData[] = [];

  // Search active/ultimate skills first, then passives
  for (const pool of [activeSkillsCache, passiveSkillsCache]) {
    for (const skill of pool) {
      if (skill.name.toLowerCase().includes(lowerQuery)) {
        results.push(skill);
        if (results.length >= limit) break;
      }
    }
    if (results.length >= limit) break;
  }

  return results;
}

/**
 * Get all active skills (non-passive abilities)
 */
export function getAllActiveSkills(): SkillData[] {
  if (!activeSkillsCache) {
    initializeCache();
    return [];
  }
  return activeSkillsCache || [];
}

/**
 * Get all ultimate skills
 */
export function getUltimates(): SkillData[] {
  if (!activeSkillsCache) {
    initializeCache();
    return [];
  }
  return activeSkillsCache?.filter((skill) => skill.isUltimate) || [];
}

/**
 * Get all regular (non-ultimate) active skills
 */
export function getRegularSkills(): SkillData[] {
  if (!activeSkillsCache) {
    initializeCache();
    return [];
  }
  return activeSkillsCache?.filter((skill) => !skill.isUltimate) || [];
}

/**
 * Get all unique skill categories (skill line names)
 */
export function getCategories(): string[] {
  if (!activeSkillsCache) {
    initializeCache();
    return [];
  }

  const categories = new Set<string>();
  for (const skill of activeSkillsCache) {
    if (skill.category) {
      categories.add(skill.category);
    }
  }

  return Array.from(categories).sort();
}

/**
 * Get all skills in a specific category (skill line)
 */
export function getSkillsByCategory(category: string): SkillData[] {
  if (!activeSkillsCache) {
    initializeCache();
    return [];
  }

  return activeSkillsCache.filter((skill) => skill.category === category);
}

/**
 * Get all passive skills for a given skill line name.
 */
export function getPassivesByCategory(lineName: string): SkillData[] {
  if (!passiveSkillsCache) {
    initializeCache();
    return [];
  }

  return passiveSkillsCache.filter((skill) => skill.category === lineName);
}

/**
 * Search passive skills by name.
 */
export function searchPassives(query: string, limit = 50): SkillData[] {
  if (!passiveSkillsCache) {
    initializeCache();
    return [];
  }

  const lowerQuery = query.toLowerCase().trim();
  const results: SkillData[] = [];

  for (const skill of passiveSkillsCache) {
    if (skill.name.toLowerCase().includes(lowerQuery)) {
      results.push(skill);
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Get skill by name (case-insensitive exact match)
 */
export function getSkillByName(name: string): SkillData | undefined {
  if (!activeSkillsCache) {
    initializeCache();
    return undefined;
  }
  return skillsByNameCache?.get(name.toLowerCase());
}

/**
 * Get statistics about available skills
 */
export function getSkillStats(): {
  total: number;
  ultimates: number;
  actives: number;
  categories: number;
} {
  if (!activeSkillsCache) {
    initializeCache();
    return { total: 0, ultimates: 0, actives: 0, categories: 0 };
  }

  const ultimates = activeSkillsCache.filter((skill) => skill.isUltimate).length;
  const actives = activeSkillsCache.filter((skill) => !skill.isUltimate).length;

  return {
    total: activeSkillsCache.length,
    ultimates,
    actives,
    categories: getCategories().length,
  };
}

/**
 * Preload the skill data (call this early in app initialization)
 */
export function preloadSkillData(): void {
  initializeCache();
}

// ── Skill Line Index (for organized picker UI) ──────────────────────────────

/** Lightweight metadata for a single skill line. */
export interface SkillLineMeta {
  /** Skill line display name (e.g. "Ardent Flame", "Destruction Staff") */
  name: string;
  /** Broad category: 'class' | 'weapon' | 'guild' | 'alliance' | 'world' */
  broadCategory: string;
  /** Owning class or source name (e.g. "Dragonknight", "Weapon") */
  className: string;
}

/** Returns metadata for all skill lines, organized for picker UI. */
export function getSkillLineIndex(): SkillLineMeta[] {
  return [
    ...CLASS_SKILL_LINES,
    ...WEAPON_SKILL_LINES,
    ...GUILD_SKILL_LINES,
    ...ALLIANCE_SKILL_LINES,
    ...WORLD_SKILL_LINES,
  ].map((l) => ({
    name: l.name,
    broadCategory: l.category,
    className: l.class,
  }));
}
