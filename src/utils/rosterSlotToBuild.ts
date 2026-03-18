/**
 * Converts a roster slot (DPS / Tank / Healer) into a Build object
 * suitable for opening in the Build Editor.
 *
 * Maps all directly-compatible fields (skills, CP, food, passives) and
 * encodes gear set names into shortDescription so the user knows what to equip.
 */

import { v4 as uuidv4 } from 'uuid';

import {
  CLASS_SKILL_LINES,
  getDefaultLinesForClass,
} from '../features/build-editor/data/esoStaticData';
import type {
  Build,
  BuildSetup,
  BuildChampionPoints,
  CombatRole,
  ClassSkillLineId,
  ESOClass,
} from '../features/build-editor/types/build.types';
import type { SkillsConfig } from '../features/loadout-manager/types/loadout.types';
import { KnownSetIDs } from '../types/abilities';
import type { DPSSlot, HealerSetup, TankSetup } from '../types/roster';

import { getSetDisplayName } from './setNameUtils';

// ─── Skill-line label → ClassSkillLineId mapping ─────────────────────────────

const LABEL_TO_SKILL_LINE_ID = new Map<string, ClassSkillLineId>(
  CLASS_SKILL_LINES.map((sl) => [sl.label.toLowerCase(), sl.id]),
);

function resolveSkillLineId(label: string): ClassSkillLineId | null {
  return LABEL_TO_SKILL_LINE_ID.get(label.toLowerCase()) ?? null;
}

/**
 * Infer the ESO class from skill line labels.
 * Picks the class that owns the majority of selected lines.
 */
function inferClassFromSkillLines(lines: (string | undefined)[]): {
  esoClass: ESOClass;
  classSkillLines: [ClassSkillLineId | null, ClassSkillLineId | null, ClassSkillLineId | null];
} {
  const resolvedIds = lines
    .filter((l): l is string => !!l)
    .map(resolveSkillLineId)
    .filter((id): id is ClassSkillLineId => id !== null);

  if (resolvedIds.length === 0) {
    return { esoClass: 'any-class', classSkillLines: [null, null, null] };
  }

  // Count which class owns the most selected lines
  const classCounts = new Map<ESOClass, number>();
  for (const id of resolvedIds) {
    const def = CLASS_SKILL_LINES.find((sl) => sl.id === id);
    if (def) {
      classCounts.set(def.ownerClass, (classCounts.get(def.ownerClass) ?? 0) + 1);
    }
  }

  let bestClass: ESOClass = 'any-class';
  let bestCount = 0;
  for (const [cls, count] of classCounts) {
    if (count > bestCount) {
      bestClass = cls;
      bestCount = count;
    }
  }

  // If we identified a clear class, fill all 3 default lines for that class
  // but override with the user's actual selections where available
  const defaults = getDefaultLinesForClass(bestClass);
  const classSkillLines: [
    ClassSkillLineId | null,
    ClassSkillLineId | null,
    ClassSkillLineId | null,
  ] = [resolvedIds[0] ?? defaults[0], resolvedIds[1] ?? defaults[1], resolvedIds[2] ?? defaults[2]];

  return { esoClass: bestClass, classSkillLines };
}

// ─── Gear description builder ────────────────────────────────────────────────

function buildGearDescription(
  set1?: KnownSetIDs,
  set2?: KnownSetIDs,
  monsterSet?: KnownSetIDs,
  additionalSets?: KnownSetIDs[],
  ultimate?: string | null,
  championPoint?: string | null,
): string {
  const parts: string[] = [];

  const s1 = getSetDisplayName(set1);
  const s2 = getSetDisplayName(set2);
  const ms = getSetDisplayName(monsterSet);

  if (s1) parts.push(`5pc: ${s1}`);
  if (s2) parts.push(`5pc: ${s2}`);
  if (ms) parts.push(`Monster/Mythic: ${ms}`);

  if (additionalSets?.length) {
    const extra = additionalSets.map((s) => getSetDisplayName(s)).filter(Boolean);
    if (extra.length) parts.push(`Additional: ${extra.join(', ')}`);
  }

  if (ultimate) parts.push(`Ultimate: ${ultimate}`);
  if (championPoint) parts.push(`CP: ${championPoint}`);

  return parts.join(' · ');
}

// ─── Setup factory ───────────────────────────────────────────────────────────

const emptyCP = (): BuildChampionPoints => ({
  warfare: { slots: [null, null, null, null], passives: {} },
  fitness: { slots: [null, null, null, null], passives: {} },
  craft: { slots: [null, null, null, null], passives: {} },
});

const emptySkills = (): SkillsConfig => ({ 0: {}, 1: {} });

function makeSetupFromSlot(opts: {
  skills?: SkillsConfig;
  cpPoints?: BuildChampionPoints;
  food?: { id?: number; name?: string };
  passives?: number[];
}): BuildSetup {
  return {
    id: uuidv4(),
    name: 'Default',
    attributes: { magicka: 0, health: 0, stamina: 0 },
    curse: 'none',
    mundusStone: '',
    gear: {},
    skills: opts.skills ?? emptySkills(),
    cp: opts.cpPoints ?? emptyCP(),
    consumables: {
      potions: [],
      food: opts.food ?? {},
    },
    passives: opts.passives ?? [],
    screenshots: [],
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function dpsSlotToBuild(slot: DPSSlot): Build {
  const skillLines = slot.skillLines
    ? [slot.skillLines.line1, slot.skillLines.line2, slot.skillLines.line3]
    : [];
  const { esoClass, classSkillLines } = inferClassFromSkillLines(skillLines);

  const description = buildGearDescription(
    slot.set1,
    slot.set2,
    slot.monsterSet,
    slot.additionalSets,
    slot.ultimate,
    slot.championPoint,
  );

  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    name: slot.playerName ? `${slot.playerName}'s Build` : `DPS ${slot.slotNumber} Build`,
    shortDescription: description,
    esoClass,
    classSkillLines,
    role: 'hybrid-dps' as CombatRole,
    gameMode: 'pve',
    races: [],
    setups: [
      makeSetupFromSlot({
        skills: slot.skills,
        cpPoints: slot.cpPoints,
        food: slot.food,
        passives: slot.passives,
      }),
    ],
    guide: { content: '', youtubeUrl: '', bannerImageUrl: '' },
    settings: { visibility: 'private', dlc: 'Base Game', setupOrder: [0] },
    addonImportString: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function tankSlotToBuild(tank: TankSetup, tankNum: 1 | 2): Build {
  const skillLines = tank.skillLines
    ? [tank.skillLines.line1, tank.skillLines.line2, tank.skillLines.line3]
    : [];
  const { esoClass, classSkillLines } = inferClassFromSkillLines(skillLines);

  const description = buildGearDescription(
    tank.gearSets.set1,
    tank.gearSets.set2,
    tank.gearSets.monsterSet,
    tank.gearSets.additionalSets,
    tank.ultimate,
  );

  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    name: tank.playerName ? `${tank.playerName}'s Build` : `Tank ${tankNum} Build`,
    shortDescription: description,
    esoClass,
    classSkillLines,
    role: 'tank',
    gameMode: 'pve',
    races: [],
    setups: [
      makeSetupFromSlot({
        skills: tank.skills,
        cpPoints: tank.cpPoints,
        food: tank.food,
        passives: tank.passives,
      }),
    ],
    guide: { content: '', youtubeUrl: '', bannerImageUrl: '' },
    settings: { visibility: 'private', dlc: 'Base Game', setupOrder: [0] },
    addonImportString: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function healerSlotToBuild(healer: HealerSetup, healerNum: 1 | 2): Build {
  const skillLines = healer.skillLines
    ? [healer.skillLines.line1, healer.skillLines.line2, healer.skillLines.line3]
    : [];
  const { esoClass, classSkillLines } = inferClassFromSkillLines(skillLines);

  const description = buildGearDescription(
    healer.set1,
    healer.set2,
    healer.monsterSet,
    healer.additionalSets,
    healer.ultimate,
  );

  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    name: healer.playerName ? `${healer.playerName}'s Build` : `Healer ${healerNum} Build`,
    shortDescription: description,
    esoClass,
    classSkillLines,
    role: 'healer',
    gameMode: 'pve',
    races: [],
    setups: [
      makeSetupFromSlot({
        skills: healer.skills,
        cpPoints: healer.cpPoints,
        food: healer.food,
        passives: healer.passives,
      }),
    ],
    guide: { content: '', youtubeUrl: '', bannerImageUrl: '' },
    settings: { visibility: 'private', dlc: 'Base Game', setupOrder: [0] },
    addonImportString: '',
    createdAt: now,
    updatedAt: now,
  };
}
