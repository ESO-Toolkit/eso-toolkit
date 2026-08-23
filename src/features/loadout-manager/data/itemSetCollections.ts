import collectionsJsonUrl from '../../../../data/eso-globals-item-set-collections.json?url';
import setNamesRaw from '../../../../data/libsets-set-names.json';

import type { SlotType } from './slotTypes';

interface ItemSetCollectionsFile {
  metadata: {
    generatedAt: string;
    source: string;
    totalPieces: number;
    totalItems: number;
    unknownSlotCount: number;
  };
  slotMasks: Record<string, SlotMaskEntry>;
  items: Record<string, CollectionItemEntry>;
}

interface SlotMaskEntry {
  category: 'armor' | 'weapon' | 'jewelry' | 'unknown';
  slot?: string;
  weight?: 'light' | 'medium' | 'heavy';
  note?: string;
}

interface CollectionItemEntry {
  setId: number;
  slotMask: number;
  category: 'armor' | 'weapon' | 'jewelry' | 'unknown';
  slot?: string;
  weight?: 'light' | 'medium' | 'heavy';
  note?: string;
}

interface LibSetsSetNamesFile {
  metadata: {
    generatedAt: string;
    source: string;
    totalSets: number;
    languages: string[];
  };
  sets: Record<string, Record<string, string>>;
}

type LocalizedSetNameEntry = Record<string, string>;

export interface ProcessedCollectionItem extends CollectionItemEntry {
  itemId: number;
  slotType?: SlotType;
  setName?: string;
}

const slotAliasMap: Record<string, SlotType> = {
  head: 'head',
  shoulders: 'shoulders',
  chest: 'chest',
  hands: 'hand',
  hand: 'hand',
  waist: 'waist',
  legs: 'legs',
  feet: 'feet',
  neck: 'neck',
  ring: 'ring',
  'ring-backup': 'ring',
  weapon: 'weapon',
  offhand: 'offhand',
};

const slotTypeOverrides: Record<number, SlotType> = {
  // Perfected Sul-Xan weapon drops export with an offhand mask even though the slot is a weapon bar item.
  174583: 'weapon',
  // Harpooner's Wading Kilt is leg armor (UESP confirmed), but collection data exports as waist.
  175524: 'legs',
};

const setNamesData = setNamesRaw as LibSetsSetNamesFile;

const collectionItems = new Map<number, ProcessedCollectionItem>();
const collectionItemsBySetAndMask = new Map<string, ProcessedCollectionItem>();
const collectionItemsBySetAndSlotType = new Map<string, ProcessedCollectionItem>();
const collectionItemsBySlotType = new Map<SlotType, Set<number>>();

const DEFAULT_SET_NAME_LOCALE = 'en';
const availableSetNameLocales = setNamesData.metadata?.languages ?? [];
const fallbackLocales: string[] = [
  DEFAULT_SET_NAME_LOCALE,
  ...availableSetNameLocales.filter((locale) => locale !== DEFAULT_SET_NAME_LOCALE),
];

const setNamesById = new Map<number, LocalizedSetNameEntry>();
Object.entries(setNamesData.sets).forEach(([setId, names]) => {
  const numericId = Number(setId);
  if (!Number.isNaN(numericId)) {
    setNamesById.set(numericId, names);
  }
});

const resolveSetName = (
  setId: number,
  locale: string = DEFAULT_SET_NAME_LOCALE,
): string | undefined => {
  const names = setNamesById.get(setId);
  if (!names) {
    return undefined;
  }

  if (locale && names[locale]) {
    return names[locale];
  }

  if (names[DEFAULT_SET_NAME_LOCALE]) {
    return names[DEFAULT_SET_NAME_LOCALE];
  }

  for (const fallbackLocale of fallbackLocales) {
    if (names[fallbackLocale]) {
      return names[fallbackLocale];
    }
  }

  return Object.values(names)[0];
};

export const getSetNameLocales = (): string[] => [...fallbackLocales];

export const getSetName = (
  setId: number,
  locale: string = DEFAULT_SET_NAME_LOCALE,
): string | undefined => resolveSetName(setId, locale);

export const getSetNameOrFallback = (
  setId: number,
  locale: string = DEFAULT_SET_NAME_LOCALE,
): string => resolveSetName(setId, locale) ?? `Unknown Set (${setId})`;

const buildMaskKey = (setId: number, slotMask: number): string => `${setId}:${slotMask}`;
const buildSlotTypeKey = (setId: number, slotType: SlotType): string => `${setId}:${slotType}`;

export let collectionMetadata: ItemSetCollectionsFile['metadata'] | undefined;
let collectionDataReady = false;
let collectionDataPromise: Promise<void> | null = null;

const populateCollectionIndexes = (data: ItemSetCollectionsFile): void => {
  const slotMaskInfoMap = new Map<
    number,
    { category: SlotMaskEntry['category']; slotType?: SlotType; weight?: SlotMaskEntry['weight'] }
  >();

  Object.entries(data.slotMasks).forEach(([maskValue, entry]) => {
    const mask = Number(maskValue);
    const slotType = entry.slot ? slotAliasMap[entry.slot] : undefined;
    slotMaskInfoMap.set(mask, {
      category: entry.category,
      slotType,
      weight: entry.weight,
    });
  });

  // Build local indexes first, then publish their contents together. This
  // prevents a failed or malformed load from exposing partial lookup results.
  const nextCollectionItems = new Map<number, ProcessedCollectionItem>();
  const nextCollectionItemsBySetAndMask = new Map<string, ProcessedCollectionItem>();
  const nextCollectionItemsBySetAndSlotType = new Map<string, ProcessedCollectionItem>();
  const nextCollectionItemsBySlotType = new Map<SlotType, Set<number>>();

  Object.entries(data.items).forEach(([id, entry]) => {
    const itemId = Number(id);
    const slotMaskInfo = slotMaskInfoMap.get(entry.slotMask);
    const slotTypeOverride = slotTypeOverrides[itemId];
    const slotType =
      slotTypeOverride ?? (entry.slot ? slotAliasMap[entry.slot] : slotMaskInfo?.slotType);
    const setName = typeof entry.setId === 'number' ? resolveSetName(entry.setId) : undefined;
    const processedItem: ProcessedCollectionItem = {
      ...entry,
      itemId,
      slotType,
      setName,
    };

    nextCollectionItems.set(itemId, processedItem);

    if (typeof entry.setId === 'number' && typeof entry.slotMask === 'number') {
      const maskKey = buildMaskKey(entry.setId, entry.slotMask);
      const existing = nextCollectionItemsBySetAndMask.get(maskKey);
      if (!existing || processedItem.itemId < existing.itemId) {
        nextCollectionItemsBySetAndMask.set(maskKey, processedItem);
      }
    }

    if (typeof entry.setId === 'number' && slotType) {
      const slotKey = buildSlotTypeKey(entry.setId, slotType);
      const existing = nextCollectionItemsBySetAndSlotType.get(slotKey);
      if (!existing || processedItem.itemId < existing.itemId) {
        nextCollectionItemsBySetAndSlotType.set(slotKey, processedItem);
      }

      let bucket = nextCollectionItemsBySlotType.get(slotType);
      if (!bucket) {
        bucket = new Set<number>();
        nextCollectionItemsBySlotType.set(slotType, bucket);
      }
      bucket.add(itemId);
    }
  });

  collectionItems.clear();
  nextCollectionItems.forEach((item, itemId) => collectionItems.set(itemId, item));
  collectionItemsBySetAndMask.clear();
  nextCollectionItemsBySetAndMask.forEach((item, key) =>
    collectionItemsBySetAndMask.set(key, item),
  );
  collectionItemsBySetAndSlotType.clear();
  nextCollectionItemsBySetAndSlotType.forEach((item, key) =>
    collectionItemsBySetAndSlotType.set(key, item),
  );
  collectionItemsBySlotType.clear();
  nextCollectionItemsBySlotType.forEach((items, slot) =>
    collectionItemsBySlotType.set(slot, items),
  );
  collectionMetadata = data.metadata;
  collectionDataReady = true;
};

export function isItemSetCollectionsReady(): boolean {
  return collectionDataReady;
}

/** Test/fixture seam; production uses preloadItemSetCollections(). */
export function __initItemSetCollectionsFromJson(data: ItemSetCollectionsFile): void {
  populateCollectionIndexes(data);
}

function startCollectionDataLoad(): Promise<void> {
  const promise = fetch(collectionsJsonUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Item set collections fetch failed: HTTP ${response.status}`);
      }
      return response.json() as Promise<ItemSetCollectionsFile>;
    })
    .then((data) => {
      populateCollectionIndexes(data);
    });

  promise.catch(() => {
    if (collectionDataPromise === promise) collectionDataPromise = null;
  });
  return promise;
}

export function preloadItemSetCollections(): Promise<void> {
  if (collectionDataReady) return Promise.resolve();
  if (typeof fetch !== 'function') {
    return Promise.reject(new Error('Item set collections fetch is unavailable'));
  }
  if (!collectionDataPromise) collectionDataPromise = startCollectionDataLoad();
  return collectionDataPromise;
}

// Consumers already reach this module through an async feature boundary, so
// begin the independent asset fetch as soon as that boundary is evaluated.
if (typeof fetch === 'function') {
  void preloadItemSetCollections().catch(() => {});
}

export function getCollectionItem(itemId: number): ProcessedCollectionItem | undefined {
  return collectionItems.get(itemId);
}

export function getCollectionSlot(itemId: number): SlotType | undefined {
  return collectionItems.get(itemId)?.slotType;
}

export function hasCollectionSlot(itemId: number): boolean {
  return collectionItems.has(itemId) && collectionItems.get(itemId)?.slotType !== undefined;
}

export function getCollectionSize(): number {
  return collectionItems.size;
}

/** Get all collection item IDs that belong to a given slot type. */
export function getCollectionItemIdsBySlot(slot: SlotType): ReadonlySet<number> {
  return collectionItemsBySlotType.get(slot) ?? new Set();
}

export function findCollectionItemBySetAndSlotMask(
  setId: number,
  slotMask: number,
): ProcessedCollectionItem | undefined {
  return collectionItemsBySetAndMask.get(buildMaskKey(setId, slotMask));
}

export function findCollectionItemBySetAndSlotType(
  setId: number,
  slotType: SlotType,
): ProcessedCollectionItem | undefined {
  return collectionItemsBySetAndSlotType.get(buildSlotTypeKey(setId, slotType));
}
