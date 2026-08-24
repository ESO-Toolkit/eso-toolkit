/**
 * Synchronously populates the itemIdMap record with the REAL generated data
 * for tests that assert against real items (crafted sets, slot validation,
 * canonical weapon dedup, …).
 *
 * Import this FIRST in a test file — before any module that reads item data
 * at module scope (e.g. GearPicker.mixedWeapons calls getItemsBySlot during
 * test-module evaluation). In production the same data arrives via
 * preloadItemData()'s fetch; jsdom has no fetch, so tests use this seam.
 */
import { __initItemIdMapFromJson, type ItemInfo } from '@/features/loadout-manager/data/itemIdMap';
import { __initItemSetCollectionsFromJson } from '@/features/loadout-manager/data/itemSetCollections';

// require() keeps the ~12 MB JSON literal out of the TypeScript program — a
// static import would make tsc parse and type the whole file on every check.
// (This module only runs under jest, where CJS require is always available.)
// eslint-disable-next-line no-undef, @typescript-eslint/no-require-imports
const itemIdMapJson = require('../features/loadout-manager/data/itemIdMap.json') as Record<
  number,
  ItemInfo
>;

__initItemIdMapFromJson(itemIdMapJson);

// The production collection index is populated by the fetched JSON asset. Jest
// has no Vite asset server, so initialize the same shared index synchronously
// for tests that exercise collection-backed slot/set lookups.
const itemSetCollectionsJson =
  // eslint-disable-next-line no-undef, @typescript-eslint/no-require-imports
  require('../../data/eso-globals-item-set-collections.json') as Parameters<
    typeof __initItemSetCollectionsFromJson
  >[0];

__initItemSetCollectionsFromJson(itemSetCollectionsJson);
