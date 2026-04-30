/**
 * Gear Set Registry — provides set type and bonus lookups for the GearPicker.
 *
 * Builds a normalized name → GearSetData map from all gear set data files.
 * Re-uses the same data sources as gearSetTooltipMapper but exposes a
 * purpose-built API for the build editor gear picker UI.
 */

import * as arenaSets from '@/data/Gear Sets/arena';
import * as heavySets from '@/data/Gear Sets/heavy';
import { arenaSpecialGearSets, monsterGearSets } from '@/data/Gear Sets/legacyAdapters';
import * as lightSets from '@/data/Gear Sets/light';
import * as mediumSets from '@/data/Gear Sets/medium';
import * as mythicSets from '@/data/Gear Sets/mythics';
import * as sharedSets from '@/data/Gear Sets/shared';
import type { GearSetData } from '@/types/gearSet';

// ─── Set Type Definitions ───────────────────────────────────────────────────

export type GearSetType =
  | 'Overland'
  | 'Dungeon'
  | 'Trial'
  | 'Arena'
  | 'Monster Set'
  | 'Mythic'
  | 'Craftable'
  | 'PvP'
  | 'Class Sets'
  | 'Other';

export const SET_TYPE_ORDER: GearSetType[] = [
  'Dungeon',
  'Trial',
  'Overland',
  'Craftable',
  'Monster Set',
  'Arena',
  'Mythic',
  'PvP',
  'Class Sets',
  'Other',
];

export const SET_TYPE_COLORS: Record<GearSetType, string> = {
  Overland: '#66bb6a',
  Dungeon: '#42a5f5',
  Trial: '#ab47bc',
  Arena: '#ef5350',
  'Monster Set': '#ff7043',
  Mythic: '#ffd54f',
  Craftable: '#26a69a',
  PvP: '#ec407a',
  'Class Sets': '#7c4dff',
  Other: '#78909c',
};

// ─── Registry ────────────────────────────────────────────────────────────────

const registry = new Map<string, GearSetData>();

const normalize = (name: string): string =>
  name
    .toLowerCase()
    .replace(/^perfected\s+/, '')
    .replace(/['']/g, "'")
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// Populate from all data files
const allSets = [
  ...Object.values(lightSets),
  ...Object.values(heavySets),
  ...Object.values(mediumSets),
  ...Object.values(monsterGearSets),
  ...Object.values(mythicSets),
  ...Object.values(arenaSpecialGearSets),
  ...Object.values(arenaSets),
  ...Object.values(sharedSets),
];

for (const setData of allSets) {
  if (!setData || typeof setData !== 'object') continue;
  const d = setData as GearSetData;
  if (typeof d.name !== 'string') continue;
  registry.set(normalize(d.name), d);
}

/**
 * Look up a gear set by its display name.
 * Handles normalization (case, "Perfected" prefix, punctuation).
 */
export function lookupGearSet(setName: string): GearSetData | undefined {
  return registry.get(normalize(setName));
}

/**
 * Get the set type for a given set name, defaulting to 'Other'.
 */
export function getSetType(setName: string): GearSetType {
  const data = lookupGearSet(setName);
  if (!data) return 'Other';
  const t = data.setType as GearSetType;
  return SET_TYPE_ORDER.includes(t) ? t : 'Other';
}
