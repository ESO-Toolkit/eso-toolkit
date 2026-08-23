/**
 * Item ID to Item Info Mapping
 *
 * Data refreshed from LibSets (API 101050, 2026-05-25)
 * Source: https://github.com/Baertram/LibSets/tree/76f2adab4e495f0b3ddb9884cb10c47f32e9f4b1
 *
 * Maps ESO item IDs to their names, set names, and types.
 * Includes optional slot and equipType information for monster sets.
 * Used by GearSelector to display gear information.
 *
 * The ~119K-entry map ships as a fetched JSON asset (./itemIdMap.json,
 * emitted content-hashed by Vite via the `?url` import) instead of a TS
 * object literal: the browser JSON.parses ~12 MB of data instead of
 * parsing+evaluating ~11 MB of JavaScript, and the asset is HTTP-cacheable
 * independently of code chunks. The exported `itemIdMap` record starts
 * EMPTY and is populated in place once `preloadItemData()` resolves —
 * callers that need answers (rather than a graceful empty result) must
 * await `preloadItemData()` or check `isItemDataReady()` first. Jest
 * populates the record synchronously via `__initItemIdMapFromJson`
 * (see src/test/initItemData.ts) — jsdom has no fetch.
 */

import { getRegisteredSlot } from '../utils/wizardWardrobeSlotRegistry';

import itemIdMapJsonUrl from './itemIdMap.json?url';
import {
  getCollectionItem,
  getCollectionItemIdsBySlot,
  preloadItemSetCollections,
} from './itemSetCollections';
import type { SlotType } from './slotTypes';
export type { SlotType } from './slotTypes';

export interface ItemInfo {
  name: string;
  setName: string;
  type: string;
  slot?: SlotType; // Equipment slot (head, chest, etc.) - available for monster sets
  equipType?: number; // ESO EQUIP_TYPE constant value - available for monster sets
}

export interface SlotSetSummary {
  setName: string;
  itemCount: number;
}

export interface ItemValidationResult {
  valid: boolean;
  error?: string;
  info?: ItemInfo;
}

const itemsBySlotCache: Partial<Record<SlotType, { itemId: number; info: ItemInfo }[]>> = {};
const setSummaryCache: Partial<Record<SlotType, SlotSetSummary[]>> = {};

type ArmorWeight = 'light' | 'medium' | 'heavy';

interface SlotLabelConfig {
  defaultLabel: string;
  weightLabels?: Partial<Record<ArmorWeight, string>>;
}

const slotLabelMap: Record<SlotType, SlotLabelConfig> = {
  head: { defaultLabel: 'Head' },
  neck: { defaultLabel: 'Necklace' },
  chest: { defaultLabel: 'Chest' },
  shoulders: { defaultLabel: 'Shoulders' },
  hand: {
    defaultLabel: 'Hands',
    weightLabels: { light: 'Gloves', medium: 'Bracers', heavy: 'Gauntlets' },
  },
  waist: { defaultLabel: 'Waist' },
  legs: { defaultLabel: 'Legs' },
  feet: { defaultLabel: 'Feet' },
  ring: { defaultLabel: 'Ring' },
  weapon: { defaultLabel: 'Weapon' },
  offhand: { defaultLabel: 'Off-Hand' },
};

const nameSuffixes = [
  ' Gear',
  ' Weapon',
  ' Jewelry',
  // Slot-specific labels that may need replacement when wardrobe/collection
  // data corrects an item's slot (e.g. a ring-tagged item placed in a weapon slot).
  ' Head',
  ' Neck',
  ' Necklace',
  ' Chest',
  ' Shoulders',
  ' Hands',
  ' Gloves',
  ' Bracers',
  ' Gauntlets',
  ' Waist',
  ' Legs',
  ' Feet',
  ' Ring',
  ' Offhand',
  ' Off-Hand',
];

function resolveSlotLabel(slot?: SlotType, weight?: ArmorWeight): string | undefined {
  if (!slot) {
    return undefined;
  }
  const config = slotLabelMap[slot];
  if (!config) {
    return slot;
  }
  if (weight && config.weightLabels?.[weight]) {
    return config.weightLabels[weight];
  }
  return config.defaultLabel;
}

function applySlotLabel(name: string, slotLabel?: string): string {
  if (!slotLabel || name.endsWith(' ' + slotLabel)) {
    return name;
  }

  for (const suffix of nameSuffixes) {
    if (name.endsWith(suffix)) {
      const result = name.slice(0, -suffix.length) + ' ' + slotLabel;
      // Guard against double suffixes when set name ends with a slot word
      // (e.g. "Oakensoul Ring" set → "Oakensoul Ring Ring" → deduplicate)
      const doubled = ' ' + slotLabel + ' ' + slotLabel;
      if (result.endsWith(doubled)) {
        return result.slice(0, -(slotLabel.length + 1));
      }
      return result;
    }
  }

  return name;
}

/**
 * The item map — ONE stable record, populated IN PLACE by init and never
 * swapped for a new object. Two consumers depend on the stable identity:
 * `getItemInfo`'s enrichment write-back mutates entries, and
 * `itemSlotValidator` iterates the raw record directly.
 *
 * Empty until `preloadItemData()` resolves (or a test calls
 * `__initItemIdMapFromJson`).
 */
export const itemIdMap: Record<number, ItemInfo> = {};

let itemDataReady = false;
let itemDataPromise: Promise<void> | null = null;

/**
 * True once the item data has loaded. Synchronous — lets callers (and the
 * accessor caches below) avoid baking in or caching results computed while
 * the map is still empty. Mirrors `isIconDataReady` in itemIconResolver.
 */
export function isItemDataReady(): boolean {
  return itemDataReady;
}

/**
 * Populate the map synchronously from already-parsed JSON. The production
 * fetch path funnels through here; jest calls it directly with the JSON
 * fixture (src/test/initItemData.ts) since jsdom has no fetch.
 */
export function __initItemIdMapFromJson(data: Record<number, ItemInfo>): void {
  Object.assign(itemIdMap, data);
  itemDataReady = true;
}

function startItemDataLoad(): Promise<void> {
  const promise = Promise.all([
    fetch(itemIdMapJsonUrl).then((response) => {
      if (!response.ok) {
        throw new Error(`Item data fetch failed: HTTP ${response.status}`);
      }
      return response.json() as Promise<Record<number, ItemInfo>>;
    }),
    preloadItemSetCollections(),
  ]).then(([data]) => {
    __initItemIdMapFromJson(data);
  });
  // On failure, clear the cached promise so the next caller retries instead of
  // re-awaiting a permanently rejected promise (same contract as
  // preloadIconData — see itemIconResolver.ts).
  promise.catch(() => {
    if (itemDataPromise === promise) itemDataPromise = null;
  });
  return promise;
}

/**
 * Load the item data. Resolves once the map is populated; rejects on fetch
 * failure (and resets so a later call retries). Same reject-propagates +
 * self-resetting contract as `preloadIconData` — callers that can degrade
 * gracefully attach their own `.catch`, callers with an error state (e.g.
 * GearPicker) surface the rejection and retry on the next attempt.
 */
export function preloadItemData(): Promise<void> {
  if (itemDataReady) return Promise.resolve();
  if (!itemDataPromise) itemDataPromise = startItemDataLoad();
  return itemDataPromise;
}

// Eagerly start the fetch at module evaluation — every consumer of this module
// already sits behind an async boundary (lazy route chunk / dynamic import /
// idle warm), so evaluation time IS the earliest possible fetch time. Guarded:
// jsdom (jest) has no fetch; tests init synchronously instead.
if (typeof fetch === 'function') {
  void preloadItemData().catch(() => {});
}

/**
 * Get item info by ID
 * @param itemId The item ID from combat logs
 * @returns Item info or undefined if not found
 */
export function getItemInfo(itemId: number): ItemInfo | undefined {
  const info = itemIdMap[itemId];
  if (!info) {
    return undefined;
  }

  const collectionItem = getCollectionItem(itemId);
  const wardrobeSlot = getRegisteredSlot(itemId);
  // Collection data (ESO's Item Set Collection API) is more authoritative than
  // the auto-generated info.slot values, which have known mismatches (e.g. all
  // hand items tagged as 'weapon'). Wizard's Wardrobe is player-confirmed, so
  // it stays highest priority.
  const slot = wardrobeSlot ?? collectionItem?.slotType ?? info.slot;
  const slotLabel = resolveSlotLabel(slot, collectionItem?.weight);
  const updatedName = applySlotLabel(info.name, slotLabel);

  if (slot === info.slot && updatedName === info.name) {
    return info;
  }

  const updatedInfo: ItemInfo = {
    ...info,
    slot,
    name: updatedName,
  };

  itemIdMap[itemId] = updatedInfo;
  return updatedInfo;
}

/**
 * Check if item ID is mapped
 * @param itemId The item ID to check
 * @returns True if item is in the map
 */
export function hasItemInfo(itemId: number): boolean {
  return itemId in itemIdMap;
}

/**
 * Get all set names
 * @returns Array of unique set names
 */
export function getAllSetNames(): string[] {
  const setNames = new Set<string>();
  Object.values(itemIdMap).forEach((info) => setNames.add(info.setName));
  return Array.from(setNames).sort();
}

/**
 * Get all item IDs for a specific set
 * @param setName The set name to search for
 * @returns Array of item IDs belonging to the set
 */
export function getItemIdsBySet(setName: string): number[] {
  return Object.entries(itemIdMap)
    .filter(([, info]) => info.setName === setName)
    .map(([id]) => parseInt(id, 10));
}

/**
 * Get item IDs for a specific set and slot
 * Useful for monster sets where you need a specific slot (head/shoulders)
 * @param setName The set name to search for
 * @param slot The equipment slot to filter by
 * @returns Array of item IDs matching the set and slot
 */
export function getSetItemsBySlot(setName: string, slot: SlotType): number[] {
  return getItemsBySlot(slot)
    .filter(({ info }) => info.setName === setName)
    .map(({ itemId }) => itemId);
}

export function getItemsBySlot(slot: SlotType): { itemId: number; info: ItemInfo }[] {
  const cached = itemsBySlotCache[slot];
  if (cached) {
    return cached;
  }

  // Merge two item-id sources:
  //  1. Items with a hardcoded slot in itemIdMap  (~13K total across all slots)
  //  2. Items from the collection JSON index      (~10K total across all slots)
  // Using a Set avoids duplicates when an item appears in both.
  const candidateIds = new Set<number>();

  // Source 1: hardcoded slots — scan only items that already have the slot field
  for (const [id, info] of Object.entries(itemIdMap)) {
    if (info.slot === slot) candidateIds.add(parseInt(id, 10));
  }

  // Source 2: collection-based slots — pre-indexed, O(1) lookup per slot type
  for (const id of getCollectionItemIdsBySlot(slot)) {
    candidateIds.add(id);
  }

  // Enrich and filter — only iterate the small candidate set, not all 119K items
  const results: { itemId: number; info: ItemInfo }[] = [];
  for (const itemId of candidateIds) {
    const enriched = getItemInfo(itemId);
    if (enriched?.slot === slot) {
      results.push({ itemId, info: enriched });
    }
  }

  results.sort(
    (a, b) =>
      a.info.setName.localeCompare(b.info.setName) || a.info.name.localeCompare(b.info.name),
  );

  // Never latch a result computed before the item data loaded — a pre-init
  // call would otherwise serve a near-empty list for this slot for the rest
  // of the session (a cached [] is truthy, so the guard above would hit).
  if (itemDataReady) {
    itemsBySlotCache[slot] = results;
  }
  return results;
}

const canonicalItemsBySlotCache: Partial<Record<SlotType, { itemId: number; info: ItemInfo }[]>> =
  {};

/**
 * Per-item discriminator used to decide which raw variants collapse into one
 * canonical row. Variants sharing a key are deduped to the lowest item ID.
 */
export type CanonicalKeyFn = (itemId: number, info: ItemInfo) => string;

const defaultCanonicalKey: CanonicalKeyFn = (_itemId, info) => info.setName;

/**
 * Like `getItemsBySlot`, but collapses every set down to a SINGLE canonical
 * item per (set, slot) — or per whatever `keyFn` distinguishes.
 *
 * The raw item data carries one entry per level/quality/trait variant — e.g.
 * "Zaan" shoulders has ~24 distinct item IDs that all render as the identical
 * name "Zaan Shoulders". The build editor never distinguishes those variants
 * (trait, weight, and enchant are chosen via separate chips on the slot card),
 * so surfacing all of them in the picker is pure noise.
 *
 * IMPORTANT — weapons are different. The `'weapon'`/`'offhand'` slots pack EVERY
 * weapon TYPE of a set (axe, sword, bow, staff, …) under one generic name like
 * "Mother's Sorrow Weapon" — the distinguishing signal lives in the per-item
 * icon, not the name. Deduping those by set name alone would keep only the
 * lowest-ID weapon (an axe) and silently drop the bow / staff / greatsword, so
 * the user could no longer equip them. Callers that need weapon types preserved
 * must pass a `keyFn` that folds the weapon type into the key (see GearPicker,
 * which keys by the slot-aware display name).
 *
 * Canonical pick = the lowest item ID for each key. This is deterministic and
 * matches the lowest-ID convention already used by the collection index
 * (`collectionItemsBySetAndSlotType`), so the picker and the import/export
 * paths agree on which ID represents a set's piece in a given slot.
 *
 * Results are cached per slot only for the DEFAULT (set-name) key — passing a
 * custom `keyFn` recomputes each call, since the key function isn't part of the
 * cache identity. Callers that invoke this hot path with a custom key should
 * memoize the result themselves.
 */
export function getCanonicalItemsBySlot(
  slot: SlotType,
  keyFn: CanonicalKeyFn = defaultCanonicalKey,
): { itemId: number; info: ItemInfo }[] {
  const isDefaultKey = keyFn === defaultCanonicalKey;
  if (isDefaultKey && canonicalItemsBySlotCache[slot]) {
    return canonicalItemsBySlotCache[slot]!;
  }

  const byKey = new Map<string, { itemId: number; info: ItemInfo }>();
  for (const entry of getItemsBySlot(slot)) {
    const key = keyFn(entry.itemId, entry.info);
    const existing = byKey.get(key);
    if (!existing || entry.itemId < existing.itemId) {
      byKey.set(key, entry);
    }
  }

  const result = Array.from(byKey.values()).sort(
    (a, b) =>
      a.info.setName.localeCompare(b.info.setName) || a.info.name.localeCompare(b.info.name),
  );

  // Same pre-init guard as getItemsBySlot — never latch an empty map's result.
  if (isDefaultKey && itemDataReady) canonicalItemsBySlotCache[slot] = result;
  return result;
}

export function getAvailableSetsForSlot(slot: SlotType): SlotSetSummary[] {
  const cached = setSummaryCache[slot];
  if (cached) {
    return cached;
  }

  const counts = new Map<string, number>();
  getItemsBySlot(slot).forEach(({ info }) => {
    counts.set(info.setName, (counts.get(info.setName) ?? 0) + 1);
  });

  const summaries = Array.from(counts.entries())
    .map(([setName, itemCount]) => ({ setName, itemCount }))
    .sort((a, b) => a.setName.localeCompare(b.setName));

  // Same pre-init guard as getItemsBySlot — never latch an empty map's result.
  if (itemDataReady) {
    setSummaryCache[slot] = summaries;
  }
  return summaries;
}

export function validateItemForSlot(itemId: number, slot: SlotType): ItemValidationResult {
  const info = getItemInfo(itemId);
  if (!info) {
    return { valid: false, error: 'Item ' + itemId + ' not found' };
  }

  if (!info.slot) {
    return { valid: false, error: 'Item ' + itemId + ' has no slot metadata', info };
  }

  if (info.slot !== slot) {
    return {
      valid: false,
      error: 'Item slot mismatch: expected ' + slot + ', got ' + info.slot,
      info,
    };
  }

  return { valid: true, info };
}
