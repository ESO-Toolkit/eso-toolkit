/**
 * Converts combat log player data into populated roster slots.
 *
 * Extracted from RosterBuilderPage.tsx and enhanced with full-mode data:
 * skills, gear, champion points, food, passives, arena weapons, DPS mythics.
 *
 * Data flow:
 *   ESO Logs API → PlayerDetails + CombatantInfoEvents
 *     → convertLogPlayersToRoster()
 *     → LogImportResult { tanks, healers, dpsSlots }
 */

import type { BuildChampionPoints } from '../features/build-editor/types/build.types';
import type { GearConfig, SkillsConfig } from '../features/loadout-manager/types/loadout.types';
import {
  KnownAbilities,
  KnownSetIDs,
  RED_CHAMPION_POINTS,
  BLUE_CHAMPION_POINTS,
  GREEN_CHAMPION_POINTS,
} from '../types/abilities';
import type { CombatantAura } from '../types/combatlogEvents';
import type { PlayerGear, PlayerTalent } from '../types/playerDetails';
import {
  ALL_5PIECE_SETS,
  ARENA_WEAPON_SETS,
  DPS_MYTHIC_SETS,
  HealerBuff,
  HealerChampionPoint,
  MONSTER_SETS,
  SupportUltimate,
} from '../types/roster';
import type { DPSSlot, HealerSetup, RaidRoster, TankSetup } from '../types/roster';

import { detectClassFromTalents } from './classDetectionUtils';
import { detectFoodFromAuras } from './foodDetectionUtils';
import { convertChampionPoints, convertGear, convertSkills, resolveFood } from './playerToBuild';
import { findSetIdByName, getSetDisplayName } from './setNameUtils';

// ─── Input Types ─────────────────────────────────────────────────────────────
// The GraphQL response returns loosely-typed JSON blobs for player details.
// These types match the API response shape rather than the canonical strict types.

interface LogGearItem {
  setName?: string;
  setID?: number;
  permanentEnchant?: number;
}

interface LogCombatantInfo {
  gear?: LogGearItem[];
  talents?: PlayerTalent[];
}

interface LogPlayerData {
  name?: string;
  id?: number;
  combatantInfo?: LogCombatantInfo;
}

export interface LogPlayerDetails {
  tanks?: LogPlayerData[];
  healers?: LogPlayerData[];
  dps?: LogPlayerData[];
}

interface LogAuraInfo {
  source: number;
  ability: number;
  stacks?: number;
  icon?: string;
  name?: string;
}

export interface LogCombatantInfoEvent {
  timestamp: number;
  type: string;
  sourceID: number;
  targetID?: number;
  sourceIsFriendly?: boolean;
  auras?: LogAuraInfo[];
}

// ─── Output Type ─────────────────────────────────────────────────────────────

export interface LogImportResult {
  tanks: TankSetup[];
  healers: HealerSetup[];
  dpsSlots: DPSSlot[];
}

// ─── Set Categorization ─────────────────────────────────────────────────────

function normalizeSetName(name: string): string {
  return name.replace(/^Perfected\s+/i, '');
}

function isPerfected(name: string): boolean {
  return /^Perfected\s+/i.test(name);
}

/** Categorize a player's gear into 5-piece, monster, arena, and other sets. */
function categorizeSets(gear: LogGearItem[]): {
  fivePieceSets: string[];
  monsterSets: string[];
  arenaWeapon: string | undefined;
  dpsMythic: KnownSetIDs | undefined;
  otherSets: string[];
} {
  // If setName is missing but setID exists, look up the name
  const transformedGear = gear.map((item) => {
    if (!item.setName && item.setID) {
      const displayName = getSetDisplayName(item.setID as KnownSetIDs);
      if (displayName) return { ...item, setName: displayName };
    }
    return item;
  });

  // Count pieces and track perfected variants
  const rawCountMap = new Map<string, number>();
  const perfectedVersions = new Map<string, string>();

  for (const item of transformedGear) {
    if (!item.setName) continue;
    const pieceCount = 1; // Each gear array entry is one equipped piece
    rawCountMap.set(item.setName, (rawCountMap.get(item.setName) ?? 0) + pieceCount);
    if (isPerfected(item.setName)) {
      perfectedVersions.set(normalizeSetName(item.setName), item.setName);
    }
  }

  // Consolidate perfected/non-perfected variants
  const setCountMap = new Map<string, number>();
  const processedNormalized = new Set<string>();

  rawCountMap.forEach((count, setName) => {
    const normalized = normalizeSetName(setName);
    if (processedNormalized.has(normalized)) return;
    processedNormalized.add(normalized);

    let totalCount = 0;
    const perfectedName = perfectedVersions.get(normalized);
    if (perfectedName) totalCount += rawCountMap.get(perfectedName) ?? 0;
    totalCount += rawCountMap.get(normalized) ?? 0;
    setCountMap.set(normalized, totalCount);
  });

  const fivePieceSets: string[] = [];
  const monsterSets: string[] = [];
  const otherSets: string[] = [];
  let arenaWeapon: string | undefined;
  let dpsMythic: KnownSetIDs | undefined;

  const excludedSetIds = new Set<KnownSetIDs>([
    KnownSetIDs.ARMOR_OF_THE_TRAINEE,
    KnownSetIDs.DRUIDS_BRAID,
  ]);

  setCountMap.forEach((count, setName) => {
    const setId = findSetIdByName(setName);
    if (setId && excludedSetIds.has(setId)) return;

    // Arena weapon detection
    if (setId && (ARENA_WEAPON_SETS as readonly KnownSetIDs[]).includes(setId)) {
      arenaWeapon = getSetDisplayName(setId);
      return;
    }

    // DPS mythic detection
    if (setId && (DPS_MYTHIC_SETS as readonly KnownSetIDs[]).includes(setId)) {
      dpsMythic = setId;
      return;
    }

    // Monster/mythic sets (2-piece and 1-piece support mythics)
    if (setId && MONSTER_SETS.includes(setId)) {
      monsterSets.push(setName);
    } else if (setId && count >= 5 && ALL_5PIECE_SETS.includes(setId)) {
      fivePieceSets.push(setName);
    } else {
      otherSets.push(setName);
    }
  });

  return { fivePieceSets, monsterSets, arenaWeapon, dpsMythic, otherSets };
}

// ─── Ultimate Detection ──────────────────────────────────────────────────────

const ULTIMATE_ID_MAP: Record<number, SupportUltimate> = {
  [KnownAbilities.AGGRESSIVE_HORN]: SupportUltimate.WARHORN,
  [KnownAbilities.GLACIAL_COLOSSUS]: SupportUltimate.COLOSSUS,
  [KnownAbilities.REVIVING_BARRIER]: SupportUltimate.BARRIER,
  [KnownAbilities.REPLENISHING_BARRIER]: SupportUltimate.BARRIER,
  [KnownAbilities.SUMMON_CHARGED_ATRONACH]: SupportUltimate.ATRONACH,
};

function extractUltimate(combatantInfo: LogCombatantInfo | undefined): SupportUltimate | null {
  if (!combatantInfo?.talents) return null;
  for (const talent of combatantInfo.talents) {
    if (talent.guid && ULTIMATE_ID_MAP[talent.guid]) {
      return ULTIMATE_ID_MAP[talent.guid];
    }
  }
  return null;
}

// ─── Set ID Deduplication ────────────────────────────────────────────────────

function deduplicateSetIds(setIds: KnownSetIDs[]): KnownSetIDs[] {
  const seen = new Set<string>();
  return setIds.filter((id) => {
    const displayName = getSetDisplayName(id);
    const normalizedName = normalizeSetName(displayName);
    if (seen.has(normalizedName)) return false;
    seen.add(normalizedName);
    return true;
  });
}

// ─── Healer Champion Point Detection ─────────────────────────────────────────

function extractHealerChampionPoint(
  combatantInfo: LogCombatantInfo | undefined,
  playerId: number | undefined,
  playerChampionPoints: Map<string, Set<number>>,
): HealerChampionPoint | null {
  // First check auras (more reliable)
  if (playerId !== undefined) {
    const cpSet = playerChampionPoints.get(String(playerId));
    if (cpSet) {
      if (cpSet.has(KnownAbilities.ENLIVENING_OVERFLOW))
        return HealerChampionPoint.ENLIVENING_OVERFLOW;
      if (cpSet.has(KnownAbilities.FROM_THE_BRINK)) return HealerChampionPoint.FROM_THE_BRINK;
    }
  }

  // Fallback to talents
  if (!combatantInfo?.talents) return null;
  const championPointIdMap: Record<number, HealerChampionPoint> = {
    [KnownAbilities.ENLIVENING_OVERFLOW]: HealerChampionPoint.ENLIVENING_OVERFLOW,
    [KnownAbilities.FROM_THE_BRINK]: HealerChampionPoint.FROM_THE_BRINK,
  };
  for (const talent of combatantInfo.talents) {
    if (talent.guid && championPointIdMap[talent.guid]) return championPointIdMap[talent.guid];
  }
  return null;
}

// ─── Healer Buff Detection ───────────────────────────────────────────────────

function extractHealerBuff(
  combatantInfo: LogCombatantInfo | undefined,
  playerId: number | undefined,
  playerChampionPoints: Map<string, Set<number>>,
): HealerBuff | null {
  if (playerId !== undefined) {
    const cpSet = playerChampionPoints.get(String(playerId));
    if (cpSet) {
      if (cpSet.has(KnownAbilities.ENLIVENING_OVERFLOW)) return HealerBuff.ENLIVENING_OVERFLOW;
      if (cpSet.has(KnownAbilities.FROM_THE_BRINK)) return HealerBuff.FROM_THE_BRINK;
    }
  }

  if (!combatantInfo?.talents) return null;
  const healerBuffIdMap: Record<number, HealerBuff> = {
    [KnownAbilities.ENLIVENING_OVERFLOW]: HealerBuff.ENLIVENING_OVERFLOW,
    [KnownAbilities.FROM_THE_BRINK]: HealerBuff.FROM_THE_BRINK,
  };
  for (const talent of combatantInfo.talents) {
    if (talent.guid && healerBuffIdMap[talent.guid]) return healerBuffIdMap[talent.guid];
  }
  return null;
}

// ─── Full-Mode Data Extraction ───────────────────────────────────────────────

interface FullModeData {
  skills: SkillsConfig;
  gear: GearConfig;
  cpPoints: BuildChampionPoints;
  food: { id?: number; name?: string } | undefined;
  passives: number[];
}

/**
 * Extracts full-mode data (skills, gear, CP, food, passives) for a single player.
 * Reuses conversion functions from playerToBuild.ts.
 */
function extractFullModeData(
  combatantInfo: LogCombatantInfo | undefined,
  playerAuras: CombatantAura[],
): FullModeData {
  const emptySkills: SkillsConfig = { 0: {}, 1: {} };
  const emptyCp: BuildChampionPoints = {
    warfare: { slots: [null, null, null, null], passives: {} },
    fitness: { slots: [null, null, null, null], passives: {} },
    craft: { slots: [null, null, null, null], passives: {} },
  };

  // Skills + passives from talents
  let skills = emptySkills;
  let passives: number[] = [];
  if (combatantInfo?.talents && combatantInfo.talents.length > 0) {
    const result = convertSkills(combatantInfo.talents);
    skills = result.skills;
    passives = result.passives;
  }

  // Gear from combatantInfo (cast to PlayerGear[] — the API response contains
  // all the fields PlayerGear expects, plus extras that the index signature ignores)
  let gear: GearConfig = {};
  if (combatantInfo?.gear && combatantInfo.gear.length > 0) {
    gear = convertGear(combatantInfo.gear as unknown as PlayerGear[]);
  }

  // Champion points from auras
  const cpList: Array<{ name: string; id: number; color: 'red' | 'blue' | 'green' }> = [];
  for (const aura of playerAuras) {
    const id = aura.ability;
    if (RED_CHAMPION_POINTS.has(id)) {
      cpList.push({ name: aura.name, id, color: 'red' });
    } else if (BLUE_CHAMPION_POINTS.has(id)) {
      cpList.push({ name: aura.name, id, color: 'blue' });
    } else if (GREEN_CHAMPION_POINTS.has(id)) {
      cpList.push({ name: aura.name, id, color: 'green' });
    }
  }
  const cpPoints = cpList.length > 0 ? convertChampionPoints(cpList) : emptyCp;

  // Food from auras — detectFoodFromAuras expects { id, name }, CombatantAura uses { ability, name }
  const aurasFoodShaped = playerAuras.map((a) => ({
    name: a.name,
    id: a.ability,
    stacks: a.stacks,
  }));
  const foodAura = detectFoodFromAuras(aurasFoodShaped);
  const food = foodAura ? resolveFood(foodAura) : undefined;

  return { skills, gear, cpPoints, food, passives };
}

// ─── Aura Index Builder ──────────────────────────────────────────────────────

/**
 * Builds per-player aura maps and healer CP tracking from CombatantInfoEvents.
 */
function buildPlayerAuraIndex(events: LogCombatantInfoEvent[]): {
  playerAuras: Map<string, CombatantAura[]>;
  playerHealerCPs: Map<string, Set<number>>;
} {
  const playerAuras = new Map<string, CombatantAura[]>();
  const playerHealerCPs = new Map<string, Set<number>>();

  for (const event of events) {
    if (!event.auras || event.auras.length === 0) continue;
    const sourceId = String(event.sourceID);

    if (!playerAuras.has(sourceId)) playerAuras.set(sourceId, []);
    if (!playerHealerCPs.has(sourceId)) playerHealerCPs.set(sourceId, new Set());

    for (const aura of event.auras) {
      // Build full aura list for full-mode extraction
      playerAuras.get(sourceId)!.push({
        source: aura.source,
        ability: aura.ability,
        stacks: aura.stacks ?? 0,
        icon: aura.icon ?? '',
        name: aura.name ?? '',
      });

      // Track healer CP abilities specifically
      if (
        aura.ability === KnownAbilities.ENLIVENING_OVERFLOW ||
        aura.ability === KnownAbilities.FROM_THE_BRINK
      ) {
        playerHealerCPs.get(sourceId)!.add(aura.ability);
      }
    }
  }

  return { playerAuras, playerHealerCPs };
}

// ─── Ultimate Smart-Replace Logic ────────────────────────────────────────────

function resolveUltimate(
  extractedUltimate: SupportUltimate | null,
  existingUltimate: string | null | undefined,
): string | null {
  const shouldReplace =
    !existingUltimate ||
    (existingUltimate === SupportUltimate.BARRIER &&
      extractedUltimate &&
      extractedUltimate !== SupportUltimate.BARRIER);

  return shouldReplace ? extractedUltimate : (existingUltimate ?? null);
}

// ─── Skill Line Detection ────────────────────────────────────────────────────

function extractSkillLines(combatantInfo: LogCombatantInfo | undefined): {
  line1: string;
  line2: string;
  line3: string;
  isFlex: boolean;
} {
  const empty = { line1: '', line2: '', line3: '', isFlex: false };
  if (!combatantInfo?.talents?.length) return empty;

  const result = detectClassFromTalents(combatantInfo.talents);
  const top = result.skillLines.slice(0, 3);
  return {
    line1: top[0]?.skillLine ?? '',
    line2: top[1]?.skillLine ?? '',
    line3: top[2]?.skillLine ?? '',
    isFlex: false,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Converts combat log player data into fully-populated roster slots.
 *
 * Populates both simple-mode fields (set assignments, ultimates, healer buffs)
 * and full-mode fields (skills, gear, champion points, food, passives).
 */
export function convertLogPlayersToRoster(
  details: LogPlayerDetails,
  combatantInfoEvents: LogCombatantInfoEvent[],
  existingRoster: RaidRoster,
): LogImportResult {
  const { tanks = [], healers = [], dps = [] } = details;
  const { playerAuras, playerHealerCPs } = buildPlayerAuraIndex(combatantInfoEvents);

  // ── Parse tanks ──────────────────────────────────────────────────────────

  const parsedTanks: TankSetup[] = tanks.map((tank, index) => {
    const gear = tank.combatantInfo?.gear ?? [];
    const { fivePieceSets, monsterSets, otherSets } = categorizeSets(gear);
    const extractedUltimate = extractUltimate(tank.combatantInfo);
    const existingUltimate = existingRoster.tanks[index]?.ultimate ?? null;
    const finalUltimate = resolveUltimate(extractedUltimate, existingUltimate);

    // Full-mode data
    const auras = playerAuras.get(String(tank.id)) ?? [];
    const fullMode = extractFullModeData(tank.combatantInfo, auras);

    return {
      slotNumber: index + 1,
      playerName: tank.name ?? `Tank ${index + 1}`,
      roleLabel: `T${index + 1}`,
      gearSets: {
        set1: fivePieceSets[0] ? findSetIdByName(fivePieceSets[0]) : undefined,
        set2: fivePieceSets[1] ? findSetIdByName(fivePieceSets[1]) : undefined,
        monsterSet: monsterSets[0] ? findSetIdByName(monsterSets[0]) : undefined,
        additionalSets: deduplicateSetIds(
          [...fivePieceSets.slice(2), ...monsterSets.slice(1), ...otherSets]
            .map((name) => findSetIdByName(name))
            .filter((id): id is KnownSetIDs => id !== undefined),
        ),
      },
      skillLines: extractSkillLines(tank.combatantInfo),
      ultimate: finalUltimate,
      specificSkills: [],
      // Full-mode fields
      skills: fullMode.skills,
      gear: fullMode.gear,
      cpPoints: fullMode.cpPoints,
      food: fullMode.food,
      passives: fullMode.passives.length > 0 ? fullMode.passives : undefined,
    } satisfies TankSetup;
  });

  // ── Parse healers ────────────────────────────────────────────────────────

  const parsedHealers: HealerSetup[] = healers.map((healer, index) => {
    const gear = healer.combatantInfo?.gear ?? [];
    const { fivePieceSets, monsterSets, arenaWeapon, otherSets } = categorizeSets(gear);
    const extractedUltimate = extractUltimate(healer.combatantInfo);
    const existingUltimate = existingRoster.healers[index]?.ultimate ?? null;
    const finalUltimate = resolveUltimate(extractedUltimate, existingUltimate);

    // Full-mode data
    const auras = playerAuras.get(String(healer.id)) ?? [];
    const fullMode = extractFullModeData(healer.combatantInfo, auras);

    return {
      slotNumber: index + 1,
      playerName: healer.name ?? `Healer ${index + 1}`,
      roleLabel: `H${index + 1}`,
      set1: fivePieceSets[0] ? findSetIdByName(fivePieceSets[0]) : undefined,
      set2: fivePieceSets[1] ? findSetIdByName(fivePieceSets[1]) : undefined,
      monsterSet: monsterSets[0] ? findSetIdByName(monsterSets[0]) : undefined,
      additionalSets: deduplicateSetIds(
        [...fivePieceSets.slice(2), ...monsterSets.slice(1), ...otherSets]
          .map((name) => findSetIdByName(name))
          .filter((id): id is KnownSetIDs => id !== undefined),
      ),
      skillLines: extractSkillLines(healer.combatantInfo),
      healerBuff: extractHealerBuff(healer.combatantInfo, healer.id, playerHealerCPs),
      championPoint: extractHealerChampionPoint(healer.combatantInfo, healer.id, playerHealerCPs),
      specificSkills: [],
      ultimate: finalUltimate,
      arenaWeapon,
      // Full-mode fields
      skills: fullMode.skills,
      gear: fullMode.gear,
      cpPoints: fullMode.cpPoints,
      food: fullMode.food,
      passives: fullMode.passives.length > 0 ? fullMode.passives : undefined,
    } satisfies HealerSetup;
  });

  // ── Parse DPS (up to 8 slots) ───────────────────────────────────────────

  const parsedDPS: DPSSlot[] = dps.slice(0, 8).map((dpsPlayer, index) => {
    const gear = dpsPlayer.combatantInfo?.gear ?? [];
    const { fivePieceSets, monsterSets, arenaWeapon, dpsMythic, otherSets } = categorizeSets(gear);

    // Full-mode data
    const auras = playerAuras.get(String(dpsPlayer.id)) ?? [];
    const fullMode = extractFullModeData(dpsPlayer.combatantInfo, auras);
    const extractedUltimate = extractUltimate(dpsPlayer.combatantInfo);

    return {
      slotNumber: index + 1,
      playerName: dpsPlayer.name ?? '',
      set1: fivePieceSets[0] ? findSetIdByName(fivePieceSets[0]) : undefined,
      set2: fivePieceSets[1] ? findSetIdByName(fivePieceSets[1]) : undefined,
      // DPS mythics go in the monster/mythic slot; fallback to regular monster sets
      monsterSet: dpsMythic ?? (monsterSets[0] ? findSetIdByName(monsterSets[0]) : undefined),
      additionalSets: deduplicateSetIds(
        [...fivePieceSets.slice(2), ...monsterSets.slice(dpsMythic ? 0 : 1), ...otherSets]
          .filter(Boolean)
          .map((name) => findSetIdByName(name))
          .filter((id): id is KnownSetIDs => id !== undefined),
      ),
      skillLines: extractSkillLines(dpsPlayer.combatantInfo),
      ultimate: extractedUltimate,
      arenaWeapon,
      // Full-mode fields
      skills: fullMode.skills,
      gear: fullMode.gear,
      cpPoints: fullMode.cpPoints,
      food: fullMode.food,
      passives: fullMode.passives.length > 0 ? fullMode.passives : undefined,
    } satisfies DPSSlot;
  });

  return { tanks: parsedTanks, healers: parsedHealers, dpsSlots: parsedDPS };
}
