/**
 * Converts combat log player data into a Build object for the Build Editor.
 *
 * This is the "Extract Build from Log" bridge — similar to rosterSlotToBuild.ts
 * but sourced from CombatantInfo (gear, talents, auras) rather than roster slots.
 *
 * Data flow:  PlayerCard → playerToBuild() → encodeBuildToURL() → /build-editor?b=…
 */

import { v4 as uuidv4 } from 'uuid';

import { ESO_CONSUMABLES } from '../data/esoConsumables';
import { ESO_POTIONS } from '../data/esoPotions';
import {
  CLASS_SKILL_LINES,
  ESO_MUNDUS_STONES,
  getDefaultLinesForClass,
} from '../features/build-editor/data/esoStaticData';
import type {
  Build,
  BuildChampionPoints,
  BuildPotion,
  BuildSetup,
  ClassSkillLineId,
  CombatRole,
  ESOClass,
} from '../features/build-editor/types/build.types';
import type { GearConfig, GearPiece } from '../features/loadout-manager/types/loadout.types';
import { RED_CHAMPION_POINTS, BLUE_CHAMPION_POINTS, GREEN_CHAMPION_POINTS } from '../types/abilities';
import type { PlayerGear, PlayerTalent } from '../types/playerDetails';
import type { ClassAnalysisResult } from './classDetectionUtils';
import type { PotionType } from './potionDetectionUtils';

// ─── Gear Slot Mapping ──────────────────────────────────────────────────────
// CombatantInfo PlayerGear uses sequential slot indices (GearSlot enum),
// while GearConfig uses ESO's native equipment slot numbering (EQUIP_SLOTS).

const PLAYER_GEAR_SLOT_TO_EQUIP_SLOT: Record<number, number> = {
  0: 0,   // HEAD → Head
  1: 2,   // CHEST → Body
  2: 3,   // SHOULDERS → Shoulders
  3: 6,   // WAIST → Waist
  4: 16,  // HANDS → Hands
  5: 8,   // LEGS → Legs
  6: 9,   // FEET → Feet
  7: 1,   // NECK → Neck
  8: 11,  // RING1 → Ring 1
  9: 12,  // RING2 → Ring 2
  10: 4,  // MAIN_HAND → Main-Hand
  11: 5,  // OFF_HAND → Off-Hand
  12: 20, // BACKUP_MAIN_HAND → Main-Hand Backup
  13: 21, // BACKUP_OFF_HAND → Off-Hand Backup
};

// ─── Armor Weight Mapping ───────────────────────────────────────────────────
// Only apparel slots (0-6 in CombatantInfo order) carry armor weight.
// Jewelry (slots 7-9) and weapons (10-13) do not.
// ArmorType enum: LIGHT=1, MEDIUM=2, HEAVY=3 — but WeaponType also starts at
// 1, so checking .type alone is ambiguous. We must gate on the slot index.

const APPAREL_SLOTS = new Set([0, 1, 2, 3, 4, 5, 6]); // HEAD–FEET

function resolveArmorWeight(
  slotIdx: number,
  gearType: number,
): 'light' | 'medium' | 'heavy' | undefined {
  if (!APPAREL_SLOTS.has(slotIdx)) return undefined;
  switch (gearType) {
    case 1: return 'light';
    case 2: return 'medium';
    case 3: return 'heavy';
    default: return undefined;
  }
}

// ─── Mundus Name → Build Editor ID ─────────────────────────────────────────

const MUNDUS_NAME_TO_ID = new Map<string, string>(
  ESO_MUNDUS_STONES.map((m) => [m.label.toLowerCase(), m.id]),
);

function resolveMundusId(mundusName: string): string {
  // Mundus buffs from logs often arrive as "Boon: The Thief" or just "The Thief"
  const cleaned = mundusName.replace(/^(?:boon|bonus\s*\(\d+\)):\s*/i, '').trim().toLowerCase();
  return MUNDUS_NAME_TO_ID.get(cleaned) ?? '';
}

// ─── Class Detection → ESOClass + Skill Lines ──────────────────────────────

const LABEL_TO_SKILL_LINE_ID = new Map<string, ClassSkillLineId>(
  CLASS_SKILL_LINES.map((sl) => [sl.label.toLowerCase(), sl.id]),
);

function resolveClassFromAnalysis(classAnalysis?: ClassAnalysisResult): {
  esoClass: ESOClass;
  classSkillLines: [ClassSkillLineId | null, ClassSkillLineId | null, ClassSkillLineId | null];
} {
  if (!classAnalysis?.skillLines?.length) {
    return { esoClass: 'any-class', classSkillLines: [null, null, null] };
  }

  // classAnalysis.primary is a *skill line* name (e.g. "Ardent Flame"), NOT a class name.
  // The actual class name lives on each skillLine entry's className field.
  const classNameLower = classAnalysis.skillLines[0].className.toLowerCase();
  const esoClass: ESOClass =
    classNameLower === 'dragonknight' ? 'dragonknight' :
    classNameLower === 'sorcerer' ? 'sorcerer' :
    classNameLower === 'nightblade' ? 'nightblade' :
    classNameLower === 'templar' ? 'templar' :
    classNameLower === 'warden' ? 'warden' :
    classNameLower === 'necromancer' ? 'necromancer' :
    classNameLower === 'arcanist' ? 'arcanist' :
    'any-class';

  // Resolve skill lines from the analysis
  const resolvedIds: ClassSkillLineId[] = (classAnalysis.skillLines ?? [])
    .map((sl) => LABEL_TO_SKILL_LINE_ID.get(sl.skillLine.toLowerCase()))
    .filter((id): id is ClassSkillLineId => id != null);

  if (resolvedIds.length > 0 && esoClass !== 'any-class') {
    const defaults = getDefaultLinesForClass(esoClass);
    return {
      esoClass,
      classSkillLines: [
        resolvedIds[0] ?? defaults[0],
        resolvedIds[1] ?? defaults[1],
        resolvedIds[2] ?? defaults[2],
      ],
    };
  }

  if (esoClass !== 'any-class') {
    return { esoClass, classSkillLines: getDefaultLinesForClass(esoClass) };
  }

  return { esoClass: 'any-class', classSkillLines: [null, null, null] };
}

// ─── Role Mapping ───────────────────────────────────────────────────────────

function resolveRole(playerRole?: string): CombatRole {
  switch (playerRole?.toLowerCase()) {
    case 'tank': return 'tank';
    case 'healer': return 'healer';
    default: return 'hybrid-dps';
  }
}

// ─── Gear Conversion ────────────────────────────────────────────────────────

function convertGear(gear: PlayerGear[]): GearConfig {
  const config: GearConfig = {};

  for (let slotIdx = 0; slotIdx < gear.length; slotIdx++) {
    const item = gear[slotIdx];
    if (!item || item.id === 0) continue; // Empty slot

    const equipSlot = PLAYER_GEAR_SLOT_TO_EQUIP_SLOT[slotIdx];
    if (equipSlot === undefined) continue;

    const piece: GearPiece = { id: item.id };

    const weight = resolveArmorWeight(slotIdx, item.type);
    if (weight) piece.weight = weight;

    config[equipSlot] = piece;
  }

  return config;
}

// ─── Skills Conversion ──────────────────────────────────────────────────────
// CombatantInfo.talents: first 12 entries are skill bar abilities
//   [0-4] = Front bar abilities, [5] = Front bar ultimate
//   [6-10] = Back bar abilities, [11] = Back bar ultimate
// SkillsConfig uses slots 3-7 (abilities) and 8 (ultimate) per bar.

function convertSkills(talents: PlayerTalent[]): {
  skills: BuildSetup['skills'];
  passives: number[];
} {
  const skills: BuildSetup['skills'] = { 0: {}, 1: {} };
  const passives: number[] = [];

  // First 12 talents are skill bar abilities (if present)
  const barAbilities = talents.slice(0, 12);
  const passiveTalents = talents.slice(12);

  // Front bar: talents[0-4] → slots 3-7, talents[5] → slot 8 (ultimate)
  for (let i = 0; i < Math.min(5, barAbilities.length); i++) {
    const t = barAbilities[i];
    if (t?.guid) skills[0][i + 3] = t.guid;
  }
  if (barAbilities[5]?.guid) {
    skills[0][8] = barAbilities[5].guid;
  }

  // Back bar: talents[6-10] → slots 3-7, talents[11] → slot 8 (ultimate)
  for (let i = 6; i < Math.min(11, barAbilities.length); i++) {
    const t = barAbilities[i];
    if (t?.guid) skills[1][i - 6 + 3] = t.guid;
  }
  if (barAbilities[11]?.guid) {
    skills[1][8] = barAbilities[11].guid;
  }

  // Remaining talents are passives
  for (const t of passiveTalents) {
    if (t?.guid) passives.push(t.guid);
  }

  return { skills, passives };
}

// ─── Champion Points Conversion ─────────────────────────────────────────────

function convertChampionPoints(
  cpList: Array<{ name: string; id: number; color: 'red' | 'blue' | 'green' }>,
): BuildChampionPoints {
  const cp: BuildChampionPoints = {
    warfare: { slots: [null, null, null, null], passives: {} },
    fitness: { slots: [null, null, null, null], passives: {} },
    craft: { slots: [null, null, null, null], passives: {} },
  };

  // Separate CP by tree — the color already tells us which tree
  // Blue = Warfare (slottable), Red = Fitness (slottable), Green = Craft (slottable)
  const warfareSlots: number[] = [];
  const fitnessSlots: number[] = [];
  const craftSlots: number[] = [];

  for (const point of cpList) {
    if (BLUE_CHAMPION_POINTS.has(point.id)) {
      warfareSlots.push(point.id);
    } else if (RED_CHAMPION_POINTS.has(point.id)) {
      fitnessSlots.push(point.id);
    } else if (GREEN_CHAMPION_POINTS.has(point.id)) {
      craftSlots.push(point.id);
    }
  }

  // Fill up to 4 slots per tree
  for (let i = 0; i < Math.min(4, warfareSlots.length); i++) {
    cp.warfare.slots[i] = warfareSlots[i];
  }
  for (let i = 0; i < Math.min(4, fitnessSlots.length); i++) {
    cp.fitness.slots[i] = fitnessSlots[i];
  }
  for (let i = 0; i < Math.min(4, craftSlots.length); i++) {
    cp.craft.slots[i] = craftSlots[i];
  }

  return cp;
}

// ─── Food Resolution ────────────────────────────────────────────────────────
// Combat logs give us the food buff name from auras.  The build editor stores
// consumable *item* IDs from ESO_CONSUMABLES.  We fuzzy-match by name.

const CONSUMABLE_NAME_INDEX = new Map<string, number>(
  ESO_CONSUMABLES.map((c) => [c.name.toLowerCase(), c.id]),
);

function resolveFood(foodAura?: { id?: number; name?: string }): { id?: number; name?: string } {
  if (!foodAura?.name) return {};

  // Try exact match first
  const exactId = CONSUMABLE_NAME_INDEX.get(foodAura.name.toLowerCase());
  if (exactId != null) return { id: exactId, name: foodAura.name };

  // Try substring match (aura name often includes extra text like "Increase Max …")
  const auraLower = foodAura.name.toLowerCase();
  for (const c of ESO_CONSUMABLES) {
    if (auraLower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(auraLower)) {
      return { id: c.id, name: c.name };
    }
  }

  // Fallback: keep the name for display, no item ID
  return { name: foodAura.name };
}

// ─── Potion Resolution ──────────────────────────────────────────────────────
// PotionStreamResult gives us a classified PotionType (e.g. 'spell-power').
// Map that to the best-matching curated potion from ESO_POTIONS.

const POTION_TYPE_TO_ID: Record<string, number> = {
  'spell-power': 9001,   // Essence of Spell Power
  'weapon-power': 9011,  // Essence of Weapon Power
  'tri-stat': 9021,      // Essence of Health (Tri-Stat)
  'heroism': 9051,       // Essence of Heroism
  'health': 9022,        // Essence of Health
  'magicka': 9023,       // Essence of Magicka
  'stamina': 9024,       // Essence of Stamina
};

function resolvePotions(potionType?: PotionType): BuildPotion[] {
  if (!potionType || potionType === 'none' || potionType === 'unknown') return [];

  const potionId = POTION_TYPE_TO_ID[potionType];
  if (potionId == null) return [];

  const potion = ESO_POTIONS.find((p) => p.id === potionId);
  if (!potion) return [];

  return [{ id: potion.id, name: potion.name, effects: [...potion.effects] }];
}

// ─── Gear Set Description ───────────────────────────────────────────────────

function buildGearDescription(gear: PlayerGear[]): string {
  // Count set pieces to build a readable description
  const setCounts = new Map<string, number>();
  for (const item of gear) {
    if (item.id === 0 || !item.setName) continue;
    const name = item.setName.replace(/^perfected\s+/i, '');
    setCounts.set(name, (setCounts.get(name) ?? 0) + 1);
  }

  const parts: string[] = [];
  for (const [name, count] of setCounts) {
    parts.push(`${count}pc ${name}`);
  }
  return parts.join(' · ');
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface PlayerBuildExtractionData {
  /** Player display name */
  playerName: string;
  /** Player's detected role (from role detection or fallback) */
  role?: string;
  /** CombatantInfo gear array (14 slots) */
  gear: PlayerGear[];
  /** CombatantInfo talents array (skills + passives) */
  talents: PlayerTalent[];
  /** Detected mundus buffs from auras */
  mundusBuffs: Array<{ name: string; id: number }>;
  /** Detected champion points from auras */
  championPoints: Array<{ name: string; id: number; color: 'red' | 'blue' | 'green' }>;
  /** Class analysis result from ability detection */
  classAnalysis?: ClassAnalysisResult;
  /** Detected food aura (buff name + aura ID — NOT the consumable item ID) */
  food?: { id?: number; name?: string };
  /** Classified potion type from the live event stream */
  potionType?: PotionType;
}

/**
 * Converts combat log player data into a Build suitable for the Build Editor.
 * Extracts gear (with slot mapping), skills, passives, mundus, CP, and class.
 */
export function playerToBuild(data: PlayerBuildExtractionData): Build {
  const { esoClass, classSkillLines } = resolveClassFromAnalysis(data.classAnalysis);
  const role = resolveRole(data.role);
  const gearConfig = convertGear(data.gear);
  const { skills, passives } = convertSkills(data.talents);
  const cp = convertChampionPoints(data.championPoints);
  const mundusStone = data.mundusBuffs.length > 0
    ? resolveMundusId(data.mundusBuffs[0].name)
    : '';
  const description = buildGearDescription(data.gear);

  const now = new Date().toISOString();

  const setup: BuildSetup = {
    id: uuidv4(),
    name: 'Default',
    attributes: { magicka: 0, health: 0, stamina: 0 },
    curse: 'none',
    mundusStone,
    gear: gearConfig,
    skills,
    cp,
    consumables: {
      potions: resolvePotions(data.potionType),
      food: resolveFood(data.food),
    },
    passives,
    screenshots: [],
  };

  return {
    id: uuidv4(),
    name: `${data.playerName}'s Build`,
    shortDescription: description,
    esoClass,
    classSkillLines,
    role,
    gameMode: 'pve',
    races: [],
    setups: [setup],
    guide: { content: '', youtubeUrl: '', bannerImageUrl: '' },
    settings: { visibility: 'private', dlc: 'Base Game', setupOrder: [0] },
    addonImportString: '',
    createdAt: now,
    updatedAt: now,
  };
}
