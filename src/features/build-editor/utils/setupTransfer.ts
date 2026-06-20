/**
 * Setup Transfer Helpers
 * Pure, side-effect-free utilities for duplicating setups, copying one section
 * from another setup, and manipulating skill bars. No Redux access — these are
 * the shared foundation the duplication / copy-part / paste-import UIs build on.
 *
 * Setups are plain JSON data (no class instances / functions), so a structural
 * deep clone via JSON.parse(JSON.stringify(x)) is correct and sufficient.
 */

import { v4 as uuidv4 } from 'uuid';

import type { SkillsConfig } from '../../loadout-manager/types/loadout.types';
import { getDefaultLinesForClass } from '../data/esoStaticData';
import type { Build, BuildSetup } from '../types/build.types';

// ─── Section descriptors ──────────────────────────────────────────────────────

/** The copy-able logical sections of a setup. */
export type SetupSection =
  | 'gear'
  | 'skills'
  | 'champion'
  | 'consumables'
  | 'passives'
  | 'character';

export interface SetupSectionMeta {
  id: SetupSection;
  label: string;
}

/** Ordered list used to render copy-from menus. */
export const SETUP_SECTIONS: SetupSectionMeta[] = [
  { id: 'gear', label: 'Gear' },
  { id: 'skills', label: 'Skills' },
  { id: 'champion', label: 'Champion Points' },
  { id: 'consumables', label: 'Consumables' },
  { id: 'passives', label: 'Passives' },
  { id: 'character', label: 'Character' },
];

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Maximum length for a setup name (matches the rename input cap). */
const MAX_SETUP_NAME_LENGTH = 32;

/**
 * Structural deep clone for plain-JSON setup data. Returns `undefined`
 * untouched — optional setup fields (skilledAbilities, quickslots, …) are
 * frequently absent, and JSON.parse(JSON.stringify(undefined)) would throw.
 */
function deepClone<T>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

/**
 * Build the default copy name `${name} copy`, truncating the base name so the
 * full result still fits within MAX_SETUP_NAME_LENGTH.
 */
function defaultCopyName(name: string): string {
  const suffix = ' copy';
  const candidate = `${name}${suffix}`;
  if (candidate.length <= MAX_SETUP_NAME_LENGTH) return candidate;
  const room = MAX_SETUP_NAME_LENGTH - suffix.length;
  if (room <= 0) return candidate.slice(0, MAX_SETUP_NAME_LENGTH);
  return `${name.slice(0, room)}${suffix}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Deep clone a setup, assign a fresh uuid id, and set its name. The default
 * name is `${setup.name} copy`, truncated sensibly if that would exceed 32
 * characters; pass an explicit `name` to override.
 */
export function cloneSetup(setup: BuildSetup, name?: string): BuildSetup {
  const clone = deepClone(setup);
  clone.id = uuidv4();
  clone.name = name ?? defaultCopyName(setup.name);
  return clone;
}

/**
 * Return a NEW BuildSetup equal to `target` but with the given section's data
 * replaced by a deep clone from `source`. The whole `target` is deep-cloned so
 * callers never share references with either input.
 *
 * Section field ownership:
 *   gear        -> gear
 *   skills      -> skills, skilledAbilities, scribedAbilityIds, quickslots
 *   champion    -> cp
 *   consumables -> consumables
 *   passives    -> passives
 *   character   -> attributes, curse, mundusStone
 */
export function copySetupSection(
  target: BuildSetup,
  source: BuildSetup,
  section: SetupSection,
): BuildSetup {
  const next = deepClone(target);

  switch (section) {
    case 'gear':
      next.gear = deepClone(source.gear);
      break;
    case 'skills':
      next.skills = deepClone(source.skills);
      next.skilledAbilities = deepClone(source.skilledAbilities);
      next.scribedAbilityIds = deepClone(source.scribedAbilityIds);
      next.quickslots = deepClone(source.quickslots);
      break;
    case 'champion':
      next.cp = deepClone(source.cp);
      break;
    case 'consumables':
      next.consumables = deepClone(source.consumables);
      break;
    case 'passives':
      next.passives = deepClone(source.passives);
      break;
    case 'character':
      next.attributes = deepClone(source.attributes);
      next.curse = source.curse;
      next.mundusStone = source.mundusStone;
      break;
  }

  return next;
}

/**
 * Return a NEW BuildSetup with the given section reset to its empty default.
 * Mirrors copySetupSection's field ownership so "clear" and "copy" stay in sync.
 */
export function clearedSetupSection(setup: BuildSetup, section: SetupSection): BuildSetup {
  const next = deepClone(setup);

  switch (section) {
    case 'gear':
      next.gear = {};
      break;
    case 'skills':
      next.skills = { 0: {}, 1: {} };
      delete next.skilledAbilities;
      delete next.scribedAbilityIds;
      delete next.quickslots;
      break;
    case 'champion':
      next.cp = {
        warfare: { slots: [null, null, null, null], passives: {} },
        fitness: { slots: [null, null, null, null], passives: {} },
        craft: { slots: [null, null, null, null], passives: {} },
      };
      break;
    case 'consumables':
      next.consumables = { potions: [], food: {} };
      break;
    case 'passives':
      next.passives = [];
      break;
    case 'character':
      next.attributes = { magicka: 0, health: 0, stamina: 0 };
      next.curse = 'none';
      next.mundusStone = '';
      break;
  }

  return next;
}

/**
 * True when any setup already holds user-entered content — gear, slotted
 * skills, champion perks/stars, passives, consumables, non-zero attributes, a
 * mundus, or a non-default curse. Used to decide whether a build-wide identity
 * (class/race) import is risky: only a truly blank build is safe to auto-apply
 * identity to, since class is shared across every setup. (Build-level content
 * such as class-mastery picks is checked by the caller alongside this.)
 */
export function buildHasContent(setups: BuildSetup[]): boolean {
  return setups.some((s) => {
    if (Object.keys(s.gear ?? {}).length > 0) return true;
    if (Object.keys(s.skills?.[0] ?? {}).length > 0) return true;
    if (Object.keys(s.skills?.[1] ?? {}).length > 0) return true;
    if ((s.passives?.length ?? 0) > 0) return true;
    if (s.mundusStone) return true;
    if (s.curse && s.curse !== 'none') return true;
    const a = s.attributes;
    if (a && (a.magicka > 0 || a.health > 0 || a.stamina > 0)) return true;
    const c = s.consumables;
    if (c && ((c.potions?.length ?? 0) > 0 || Object.keys(c.food ?? {}).length > 0)) return true;
    const cp = s.cp;
    if (cp) {
      for (const tree of [cp.warfare, cp.fitness, cp.craft]) {
        if (tree.slots.some((x) => x != null)) return true;
        if (Object.keys(tree.passives ?? {}).length > 0) return true;
      }
    }
    return false;
  });
}

/**
 * True when the build's BUILD-LEVEL identity (class, subclass skill lines, or
 * races) has been changed from a factory-fresh build (Dragonknight with its
 * default three lines and no races). A build-wide identity import would
 * overwrite these, so it should be opt-in once any of them is set.
 */
export function buildIdentityTouched(
  esoClass: Build['esoClass'],
  classSkillLines: Build['classSkillLines'],
  races: string[],
): boolean {
  if (esoClass !== 'dragonknight') return true;
  if (races.length > 0) return true;
  const def = getDefaultLinesForClass('dragonknight');
  return classSkillLines.some((line, i) => line !== def[i]);
}

// ─── Skill-bar helpers ────────────────────────────────────────────────────────

/**
 * Return a new SkillsConfig with the front (0) and back (1) bars swapped.
 * Bars are deep-cloned so the result shares no references with the input.
 */
export function swapSkillBars(skills: SkillsConfig): SkillsConfig {
  return {
    0: deepClone(skills[1]),
    1: deepClone(skills[0]),
  };
}

/**
 * Return a new SkillsConfig where the `to` bar is a deep clone of the `from`
 * bar. The untouched bar is also deep-cloned for full immutability.
 */
export function copySkillBar(skills: SkillsConfig, from: 0 | 1, to: 0 | 1): SkillsConfig {
  const next: SkillsConfig = {
    0: deepClone(skills[0]),
    1: deepClone(skills[1]),
  };
  next[to] = deepClone(skills[from]);
  return next;
}
