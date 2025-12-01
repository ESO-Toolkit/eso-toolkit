import collectionsRaw from '../../../../data/eso-globals-item-set-collections.json';

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

export interface ProcessedCollectionItem extends CollectionItemEntry {
  itemId: number;
  slotType?: SlotType;
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
  'ring-backup': 'weapon',
  weapon: 'weapon',
  offhand: 'offhand',
};

const slotTypeOverrides: Record<number, SlotType> = {
  // Perfected Sul-Xan weapon drops export with an offhand mask even though the slot is a weapon bar item.
  174583: 'weapon',
};

const data = collectionsRaw as ItemSetCollectionsFile;

const collectionItems = new Map<number, ProcessedCollectionItem>();
const collectionItemsBySetAndMask = new Map<string, ProcessedCollectionItem>();
const collectionItemsBySetAndSlotType = new Map<string, ProcessedCollectionItem>();

const slotMaskInfoMap = new Map<number, { category: SlotMaskEntry['category']; slotType?: SlotType; weight?: SlotMaskEntry['weight'] }>();

Object.entries(data.slotMasks).forEach(([maskValue, entry]) => {
  const mask = Number(maskValue);
  const slotType = entry.slot ? slotAliasMap[entry.slot] : undefined;
  slotMaskInfoMap.set(mask, {
    category: entry.category,
    slotType,
    weight: entry.weight,
  });
});

const buildMaskKey = (setId: number, slotMask: number): string => `${setId}:${slotMask}`;
const buildSlotTypeKey = (setId: number, slotType: SlotType): string => `${setId}:${slotType}`;

Object.entries(data.items).forEach(([id, entry]) => {
  const itemId = Number(id);
  const slotMaskInfo = slotMaskInfoMap.get(entry.slotMask);
  const slotTypeOverride = slotTypeOverrides[itemId];
  const slotType = slotTypeOverride ?? (entry.slot ? slotAliasMap[entry.slot] : slotMaskInfo?.slotType);
  const processedItem: ProcessedCollectionItem = {
    ...entry,
    itemId,
    slotType,
  };

  collectionItems.set(itemId, processedItem);

  if (typeof entry.setId === 'number' && typeof entry.slotMask === 'number') {
    const maskKey = buildMaskKey(entry.setId, entry.slotMask);
    const existing = collectionItemsBySetAndMask.get(maskKey);
    if (!existing || processedItem.itemId < existing.itemId) {
      collectionItemsBySetAndMask.set(maskKey, processedItem);
    }
  }

  if (typeof entry.setId === 'number' && slotType) {
    const slotKey = buildSlotTypeKey(entry.setId, slotType);
    const existing = collectionItemsBySetAndSlotType.get(slotKey);
    if (!existing || processedItem.itemId < existing.itemId) {
      collectionItemsBySetAndSlotType.set(slotKey, processedItem);
    }
  }
});

export const collectionMetadata = data.metadata;

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
