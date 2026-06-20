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
import type { BuildSetup } from '../types/build.types';

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

/** Structural deep clone for plain-JSON setup data. */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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
