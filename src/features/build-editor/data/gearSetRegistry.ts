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
import type { ArmorWeight } from '@/features/loadout-manager/types/loadout.types';
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
const weightAvailability = new Map<string, Set<ArmorWeight>>();

const normalize = (name: string): string =>
  name
    .toLowerCase()
    .replace(/^perfected\s+/, '')
    .replace(/['']/g, "'")
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Register sets from a data source, optionally tagging them with an armor weight. */
function registerSets(sets: Record<string, unknown>, weight?: ArmorWeight): void {
  for (const setData of Object.values(sets)) {
    if (!setData || typeof setData !== 'object') continue;
    const d = setData as GearSetData;
    if (typeof d.name !== 'string') continue;
    const key = normalize(d.name);
    registry.set(key, d);
    if (weight) {
      let ws = weightAvailability.get(key);
      if (!ws) {
        ws = new Set();
        weightAvailability.set(key, ws);
      }
      ws.add(weight);
    }
  }
}

// Weight-specific data files — each set appears only in the files matching
// the armor weights it can drop in.
registerSets(lightSets as Record<string, unknown>, 'light');
registerSets(mediumSets as Record<string, unknown>, 'medium');
registerSets(heavySets as Record<string, unknown>, 'heavy');

// Weight-agnostic sources (monster sets from legacy adapters come in all
// weights; arena/mythic/shared have no apparel weight concept).
registerSets(monsterGearSets as Record<string, unknown>);
registerSets(mythicSets as Record<string, unknown>);
registerSets(arenaSpecialGearSets as Record<string, unknown>);
registerSets(arenaSets as Record<string, unknown>);
registerSets(sharedSets as Record<string, unknown>);

const ALL_WEIGHTS: ArmorWeight[] = ['light', 'medium', 'heavy'];

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

/**
 * Get which armor weights a set can appear in.
 *
 * - Sets found in weight-specific data files (light/medium/heavy.ts) return
 *   only the weights they were found in.
 * - Sets only found in weight-agnostic sources (monster legacy adapters,
 *   mythics, arena, shared) return all three weights.
 * - Unknown sets return all three weights (permissive default).
 */
export function getAvailableWeights(setName: string): ArmorWeight[] {
  const ws = weightAvailability.get(normalize(setName));
  if (!ws || ws.size === 0) return ALL_WEIGHTS;
  return ALL_WEIGHTS.filter((w) => ws.has(w));
}
