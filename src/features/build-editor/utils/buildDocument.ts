import { decodeBuildFromURL } from '@/utils/buildEncoding';

import { getDefaultLinesForClass } from '../data/esoStaticData';
import type { Build } from '../types/build.types';

import { isSupportedScreenshot, MAX_SCREENSHOTS_PER_SETUP } from './screenshotValidation';

const BUILD_DOCUMENT_FORMAT = 'eso-log-build';
const BUILD_DOCUMENT_VERSION = 1;
const MAX_BUILD_SETUPS = 5;
const MAX_CHAMPION_SLOTS = 4;

const ESO_CLASSES = new Set([
  'any-class',
  'dragonknight',
  'sorcerer',
  'nightblade',
  'templar',
  'warden',
  'necromancer',
  'arcanist',
]);
const COMBAT_ROLES = new Set(['tank', 'healer', 'magicka-dps', 'stamina-dps', 'hybrid-dps']);
const GAME_MODES = new Set(['pve', 'pvp']);
const CLASS_SKILL_LINES = new Set([
  'class.ardent-flame',
  'class.draconic-power',
  'class.earthen-heart',
  'class.dark-magic',
  'class.daedric-summoning',
  'class.storm-calling',
  'class.assassination',
  'class.shadow',
  'class.siphoning',
  'class.aedric-spear',
  'class.dawns-wrath',
  'class.restoring-light',
  'class.animal-companions',
  'class.green-balance',
  'class.winters-embrace',
  'class.grave-lord',
  'class.bone-tyrant',
  'class.living-death',
  'class.herald-of-the-tome',
  'class.soldier-of-apocrypha',
  'class.curative-runeforms',
]);

interface BuildDocument {
  format: typeof BUILD_DOCUMENT_FORMAT;
  version: typeof BUILD_DOCUMENT_VERSION;
  exportedAt: string;
  build: Build;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every(isFiniteNumber);

const isAttributes = (value: unknown): boolean =>
  isRecord(value) &&
  isFiniteNumber(value.magicka) &&
  isFiniteNumber(value.health) &&
  isFiniteNumber(value.stamina);

const isGearPiece = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  return (
    (value.link === undefined || typeof value.link === 'string') &&
    (value.id === undefined || typeof value.id === 'string' || isFiniteNumber(value.id)) &&
    (value.trait === undefined || typeof value.trait === 'string') &&
    (value.enchant === undefined || typeof value.enchant === 'string') &&
    (value.weight === undefined ||
      value.weight === 'light' ||
      value.weight === 'medium' ||
      value.weight === 'heavy')
  );
};

const isGear = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  return Object.entries(value).every(([slot, piece]) =>
    slot === 'mythic' ? isFiniteNumber(piece) : /^\d+$/.test(slot) && isGearPiece(piece),
  );
};

const isSkillBar = (value: unknown): boolean =>
  isRecord(value) &&
  Object.entries(value).every(
    ([slot, abilityId]) => /^\d+$/.test(slot) && isFiniteNumber(abilityId),
  );

const isSkills = (value: unknown): boolean =>
  isRecord(value) && isSkillBar(value['0']) && isSkillBar(value['1']);

const isChampionTree = (value: unknown): boolean =>
  isRecord(value) &&
  Array.isArray(value.slots) &&
  value.slots.length <= MAX_CHAMPION_SLOTS &&
  value.slots.every((slot) => slot === null || isFiniteNumber(slot)) &&
  isRecord(value.passives) &&
  Object.values(value.passives).every(isFiniteNumber);

const isChampionPoints = (value: unknown): boolean =>
  isRecord(value) &&
  isChampionTree(value.warfare) &&
  isChampionTree(value.fitness) &&
  isChampionTree(value.craft);

const isPotion = (value: unknown): boolean =>
  isRecord(value) &&
  isFiniteNumber(value.id) &&
  typeof value.name === 'string' &&
  isStringArray(value.effects);

const isConsumables = (value: unknown): boolean =>
  isRecord(value) &&
  Array.isArray(value.potions) &&
  value.potions.every(isPotion) &&
  isRecord(value.food) &&
  (value.food.id === undefined || isFiniteNumber(value.food.id)) &&
  (value.food.name === undefined || typeof value.food.name === 'string');

const isStatOverrides = (value: unknown): boolean =>
  isRecord(value) &&
  isRecord(value.buffs) &&
  Object.values(value.buffs).every((enabled) => typeof enabled === 'boolean') &&
  isFiniteNumber(value.lightArmorCount) &&
  isFiniteNumber(value.mediumArmorCount) &&
  isFiniteNumber(value.weaponDamage) &&
  isFiniteNumber(value.balorghUltimate);

const isSkilledAbility = (value: unknown): boolean =>
  isRecord(value) && isFiniteNumber(value.abilityId) && isFiniteNumber(value.morph);

const isQuickslot = (value: unknown): boolean =>
  isRecord(value) && isFiniteNumber(value.type) && isFiniteNumber(value.id);

const isSetup = (value: unknown): boolean => {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isAttributes(value.attributes) &&
    typeof value.curse === 'string' &&
    typeof value.mundusStone === 'string' &&
    isGear(value.gear) &&
    isSkills(value.skills) &&
    isChampionPoints(value.cp) &&
    isConsumables(value.consumables) &&
    isNumberArray(value.passives) &&
    Array.isArray(value.screenshots) &&
    value.screenshots.length <= MAX_SCREENSHOTS_PER_SETUP &&
    value.screenshots.every(isSupportedScreenshot) &&
    (value.skilledAbilities === undefined ||
      (Array.isArray(value.skilledAbilities) && value.skilledAbilities.every(isSkilledAbility))) &&
    (value.scribedAbilityIds === undefined || isNumberArray(value.scribedAbilityIds)) &&
    (value.quickslots === undefined ||
      (Array.isArray(value.quickslots) && value.quickslots.every(isQuickslot))) &&
    (value.statOverrides === undefined || isStatOverrides(value.statOverrides))
  );
};

const isGuide = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.content === 'string' &&
  typeof value.youtubeUrl === 'string' &&
  typeof value.bannerImageUrl === 'string';

const isSettings = (value: unknown, setupCount: number): boolean =>
  isRecord(value) &&
  (value.visibility === 'public' ||
    value.visibility === 'private' ||
    value.visibility === 'link-only') &&
  typeof value.dlc === 'string' &&
  isNumberArray(value.setupOrder) &&
  value.setupOrder.length === setupCount &&
  value.setupOrder.every(
    (setupIndex, position, setupOrder) =>
      Number.isInteger(setupIndex) &&
      setupIndex >= 0 &&
      setupIndex < setupCount &&
      setupOrder.indexOf(setupIndex) === position,
  );

/**
 * A narrow boundary check for imported build documents. The editor's reducers
 * own field-level validation; this prevents arbitrary JSON from being loaded as
 * a build and crashing the first selector that expects the core shape.
 */
export const isBuild = (value: unknown): value is Build => {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.shortDescription !== 'string' ||
    typeof value.esoClass !== 'string' ||
    !ESO_CLASSES.has(value.esoClass) ||
    typeof value.role !== 'string' ||
    !COMBAT_ROLES.has(value.role) ||
    typeof value.gameMode !== 'string' ||
    !GAME_MODES.has(value.gameMode) ||
    typeof value.addonImportString !== 'string' ||
    !isStringArray(value.races) ||
    !Array.isArray(value.classSkillLines) ||
    value.classSkillLines.length !== 3 ||
    !value.classSkillLines.every(
      (skillLine) =>
        skillLine === null || (typeof skillLine === 'string' && CLASS_SKILL_LINES.has(skillLine)),
    ) ||
    (value.classMasteryPassives !== undefined &&
      (!isNumberArray(value.classMasteryPassives) || value.classMasteryPassives.length > 2)) ||
    !Array.isArray(value.setups) ||
    value.setups.length === 0 ||
    value.setups.length > MAX_BUILD_SETUPS ||
    !value.setups.every(isSetup) ||
    !isGuide(value.guide) ||
    !isSettings(value.settings, value.setups.length) ||
    (value.trialTags !== undefined && !isStringArray(value.trialTags)) ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string'
  ) {
    return false;
  }

  return true;
};

/**
 * Upgrade records written by older editor versions before applying today's
 * strict validation boundary. This is intentionally not used for new file or
 * URL imports: external documents must already satisfy the current schema.
 */
export const migrateLegacyStoredBuild = (value: unknown): Build | undefined => {
  if (!isRecord(value)) return undefined;

  const esoClass = typeof value.esoClass === 'string' ? value.esoClass : undefined;
  if (!esoClass || !ESO_CLASSES.has(esoClass) || !Array.isArray(value.setups)) {
    return undefined;
  }

  const candidate = {
    ...value,
    classSkillLines: Array.isArray(value.classSkillLines)
      ? [...value.classSkillLines]
      : getDefaultLinesForClass(esoClass as Build['esoClass']),
    classMasteryPassives: Array.isArray(value.classMasteryPassives)
      ? [...value.classMasteryPassives]
      : [],
    setups: value.setups.map((setup) => {
      if (!isRecord(setup)) return setup;
      const screenshots = Array.isArray(setup.screenshots)
        ? setup.screenshots.filter(isSupportedScreenshot).slice(0, MAX_SCREENSHOTS_PER_SETUP)
        : [];
      return { ...setup, screenshots };
    }),
  };

  return isBuild(candidate) ? candidate : undefined;
};

/** Serialize the complete editable build. Public links use the compact codec. */
export const serializeBuildDocument = (build: Build): string => {
  const document: BuildDocument = {
    format: BUILD_DOCUMENT_FORMAT,
    version: BUILD_DOCUMENT_VERSION,
    exportedAt: new Date().toISOString(),
    build,
  };
  return JSON.stringify(document, null, 2);
};

interface AsyncSerializationState {
  parts: BlobPart[];
  pendingCharacters: number;
}

const SERIALIZATION_YIELD_CHARACTERS = 512 * 1024;

const appendJsonPart = async (state: AsyncSerializationState, part: string): Promise<void> => {
  state.parts.push(part);
  state.pendingCharacters += part.length;
  if (state.pendingCharacters < SERIALIZATION_YIELD_CHARACTERS) return;

  state.pendingCharacters = 0;
  await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
};

/**
 * Append JSON incrementally so screenshot-heavy documents do not require one
 * enormous intermediate string or monopolize the main thread for one task.
 */
const appendJsonValue = async (state: AsyncSerializationState, value: unknown): Promise<void> => {
  if (value === null || typeof value !== 'object') {
    await appendJsonPart(state, JSON.stringify(value) ?? 'null');
    return;
  }

  if (Array.isArray(value)) {
    await appendJsonPart(state, '[');
    for (let index = 0; index < value.length; index += 1) {
      if (index > 0) await appendJsonPart(state, ',');
      await appendJsonValue(state, value[index]);
    }
    await appendJsonPart(state, ']');
    return;
  }

  await appendJsonPart(state, '{');
  let wroteEntry = false;
  for (const [key, entryValue] of Object.entries(value)) {
    if (
      entryValue === undefined ||
      typeof entryValue === 'function' ||
      typeof entryValue === 'symbol'
    ) {
      continue;
    }
    if (wroteEntry) await appendJsonPart(state, ',');
    await appendJsonPart(state, JSON.stringify(key));
    await appendJsonPart(state, ':');
    await appendJsonValue(state, entryValue);
    wroteEntry = true;
  }
  await appendJsonPart(state, '}');
};

/** Create a lossless export without duplicating the whole document in memory. */
export const createBuildDocumentBlob = async (build: Build): Promise<Blob> => {
  const document: BuildDocument = {
    format: BUILD_DOCUMENT_FORMAT,
    version: BUILD_DOCUMENT_VERSION,
    exportedAt: new Date().toISOString(),
    build,
  };
  const state: AsyncSerializationState = { parts: [], pendingCharacters: 0 };
  await appendJsonValue(state, document);
  return new Blob(state.parts, { type: 'application/json;charset=utf-8' });
};

/**
 * Parse the current lossless document format, a legacy raw Build JSON file, or
 * the compact strings downloaded by older versions of the editor.
 */
export const parseBuildDocument = async (source: string): Promise<Build | undefined> => {
  const trimmed = source.trim();
  if (!trimmed) return undefined;

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (isBuild(parsed)) return parsed;
    if (isRecord(parsed) && parsed.format === BUILD_DOCUMENT_FORMAT) {
      if (parsed.version !== BUILD_DOCUMENT_VERSION) return undefined;
      return isBuild(parsed.build) ? parsed.build : undefined;
    }
  } catch {
    // Older .esobuild files contain a compact transport string, not JSON.
  }

  const decoded = await decodeBuildFromURL(trimmed);
  return decoded && isBuild(decoded) ? decoded : undefined;
};
