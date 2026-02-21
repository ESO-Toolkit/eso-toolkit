/**
 * LibSets Data Parser
 * 
 * Parses LibSets Lua data files to extract:
 * 1. SetItemIds: Maps setId -> array of item IDs (with decompression)
 * 2. SetNames: Maps setId -> multilingual set names
 * 
 * Output: TypeScript-compatible itemIdMap for comprehensive gear name resolution
 */

import * as fs from 'fs';
import * as path from 'path';

import { ESO_CONSUMABLE_LOOKUP } from '../src/data/esoConsumables';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

// ESO Equipment Type Constants (from game API)
// These match the slot indices used in GearConfig
const ESO_EQUIP_TYPE = {
  HEAD: 0,        // EQUIP_TYPE_HEAD
  NECK: 1,        // EQUIP_TYPE_NECK
  CHEST: 2,       // EQUIP_TYPE_CHEST
  SHOULDERS: 3,   // EQUIP_TYPE_SHOULDERS
  MAIN_HAND: 4,   // EQUIP_TYPE_MAIN_HAND
  OFF_HAND: 5,    // EQUIP_TYPE_OFF_HAND
  WAIST: 6,       // EQUIP_TYPE_WAIST
  LEGS: 8,        // EQUIP_TYPE_LEGS
  FEET: 9,        // EQUIP_TYPE_FEET
  HAND: 10,       // EQUIP_TYPE_HAND
  RING1: 11,      // EQUIP_TYPE_RING (first)
  RING2: 12,      // EQUIP_TYPE_RING (second)
} as const;

type SlotType = 'head' | 'neck' | 'chest' | 'shoulders' | 'hand' | 'waist' | 'legs' | 'feet' | 'ring' | 'weapon' | 'offhand';

interface SlotOverride {
  slot: SlotType;
  source: 'collections';
}
interface ItemInfo {
  name: string;
  setName: string;
  type: string;
  slot?: SlotType;          // Equipment slot (head, chest, etc.)
  equipType?: number;       // ESO EQUIP_TYPE constant value
}

interface SetData {
  id: number;
  name: string;
  itemIds: number[];
}

interface SetMetadata {
  setType?: number;
  veteran?: boolean | Record<number, boolean>;  // Can be boolean or per-equipType
  isCrafted?: boolean;
  isMonster?: boolean;
  isTrial?: boolean;
  isArena?: boolean;
}

// ============================================================
// LUA PARSING UTILITIES
// ============================================================

/**
 * Decompresses LibSets item ID format
 * - String "startId,count" -> array of consecutive IDs
 * - Number -> single item ID in array
 */
function decompressItemIds(entry: string | number): number[] {
  if (typeof entry === 'number') {
    return [entry];
  }

  // Handle compressed format: "109568,58" = 59 items (109568-109626)
  const parts = entry.split(',');
  if (parts.length === 2) {
    const startId = parseInt(parts[0], 10);
    const count = parseInt(parts[1], 10);
    
    if (isNaN(startId) || isNaN(count)) {
      console.warn(`Invalid compressed format: "${entry}"`);
      return [];
    }

    // Generate range: start to start+count (inclusive)
    return Array.from({ length: count + 1 }, (_, i) => startId + i);
  }

  console.warn(`Unexpected entry format: "${entry}"`);
  return [];
}

/**
 * Parse LibSets_Data_SetItemIds.lua file
 * Extracts setId -> [itemIds] mapping with decompression
 */
function parseSetItemIds(fileContent: string): Map<number, number[]> {
  const setItemIdsMap = new Map<number, number[]>();
  
  // Match pattern: [setId] = { ... }
  const setBlockRegex = /\[(\d+)\]\s*=\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = setBlockRegex.exec(fileContent)) !== null) {
    const setId = parseInt(match[1], 10);
    const itemsBlock = match[2];

    // Extract all entries (strings and numbers)
    const itemIds: number[] = [];
    
    // Match quoted strings: "109568,58"
    const stringRegex = /"([^"]+)"/g;
    let stringMatch: RegExpExecArray | null;
    while ((stringMatch = stringRegex.exec(itemsBlock)) !== null) {
      const decompressed = decompressItemIds(stringMatch[1]);
      itemIds.push(...decompressed);
    }

    // Match unquoted numbers: 22762, 85693, etc. (allow trailing comma, closing brace, or end of block)
    const numberRegex = /(?:^|[=,\s])(\d+)(?=\s*(?:,|}|$))/g;
    let numberMatch: RegExpExecArray | null;
    while ((numberMatch = numberRegex.exec(itemsBlock)) !== null) {
      const itemId = parseInt(numberMatch[1], 10);
      if (!isNaN(itemId) && itemId > 0) {
        itemIds.push(itemId);
      }
    }

    if (itemIds.length > 0) {
      setItemIdsMap.set(setId, itemIds);
    } else {
      const preview = itemsBlock.trim().slice(0, 80);
      console.warn(`⚠️  No item IDs parsed for setId ${setId}. Block preview: ${preview}${itemsBlock.length > 80 ? '…' : ''}`);
    }
  }

  return setItemIdsMap;
}

/**
 * Parse LibSets_Data_SetNames.lua file
 * Extracts setId -> name mapping (English only for now)
 */
function parseSetNames(fileContent: string): Map<number, string> {
  const setNamesMap = new Map<number, string>();
  
  // Match pattern: [setId] = { ["en"] = "Set Name", ... }
  const setBlockRegex = /\[(\d+)\]\s*=\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = setBlockRegex.exec(fileContent)) !== null) {
    const setId = parseInt(match[1], 10);
    const namesBlock = match[2];

    // Extract English name: ["en"] = "Set Name"
    const enNameRegex = /\["en"\]\s*=\s*"([^"]+)"/;
    const enMatch = namesBlock.match(enNameRegex);

    if (enMatch) {
      setNamesMap.set(setId, enMatch[1]);
    }
  }

  return setNamesMap;
}

/**
 * Parse LibSets_Data_Sets.lua file
 * Extracts setId -> metadata (including equipment types for monster sets)
 */
function parseSetMetadata(fileContent: string): Map<number, SetMetadata> {
  const metadataMap = new Map<number, SetMetadata>();
  
  // Match pattern: [setId] = { ... }
  // Each set definition is on a single line (can be very long)
  const lines = fileContent.split('\n');
  
  for (const line of lines) {
    // Match: [162] = {wayshrines={...}, veteran={[EQUIP_TYPE_HEAD]=true, ...}, setType=LIBSETS_SETTYPE_MONSTER, ...}
    const setMatch = line.match(/^\s*\[(\d+)\]\s*=\s*\{(.+)\}/);
    if (!setMatch) continue;
    
    const setId = parseInt(setMatch[1], 10);
    const dataBlock = setMatch[2];
    
    const metadata: SetMetadata = {};

    // Extract setType: setType=LIBSETS_SETTYPE_MONSTER
    const setTypeMatch = dataBlock.match(/setType\s*=\s*LIBSETS_SETTYPE_(\w+)/);
    if (setTypeMatch) {
      metadata.setType = setTypeMatch[1] === 'MONSTER' ? 1 : 0;
      metadata.isMonster = setTypeMatch[1] === 'MONSTER';
      metadata.isTrial = setTypeMatch[1] === 'TRIAL';
      metadata.isArena = setTypeMatch[1] === 'ARENA';
      metadata.isCrafted = setTypeMatch[1] === 'CRAFTED';
    }

    // Extract veteran info
    // Can be: veteran=false OR veteran={[EQUIP_TYPE_HEAD]=true, [EQUIP_TYPE_SHOULDERS]=false}
    const veteranBoolMatch = dataBlock.match(/veteran\s*=\s*(true|false)/);
    if (veteranBoolMatch) {
      metadata.veteran = veteranBoolMatch[1] === 'true';
    } else {
      // Check for table format: veteran={[EQUIP_TYPE_HEAD]=true, [EQUIP_TYPE_SHOULDERS]=false}
      const veteranTableMatch = dataBlock.match(/veteran\s*=\s*\{([^}]+)\}/);
      if (veteranTableMatch) {
        const veteranTable: Record<number, boolean> = {};
        const tableContent = veteranTableMatch[1];
        
        // Extract [EQUIP_TYPE_XXX]=true/false entries
        const entryRegex = /\[EQUIP_TYPE_(\w+)\]\s*=\s*(true|false)/g;
        let entryMatch: RegExpExecArray | null;
        
        while ((entryMatch = entryRegex.exec(tableContent)) !== null) {
          const equipTypeName = entryMatch[1];
          const value = entryMatch[2] === 'true';
          
          // Map equipment type name to constant value
          const equipTypeValue = ESO_EQUIP_TYPE[equipTypeName as keyof typeof ESO_EQUIP_TYPE];
          if (equipTypeValue !== undefined) {
            veteranTable[equipTypeValue] = value;
          }
        }
        
        if (Object.keys(veteranTable).length > 0) {
          metadata.veteran = veteranTable;
        }
      }
    }

    if (Object.keys(metadata).length > 0) {
      metadataMap.set(setId, metadata);
    }
  }

  return metadataMap;
}

/**
 * Map ESO equipment type constant to slot name
 */
function equipTypeToSlot(equipType: number): SlotType | undefined {
  switch (equipType) {
    case ESO_EQUIP_TYPE.HEAD: return 'head';
    case ESO_EQUIP_TYPE.NECK: return 'neck';
    case ESO_EQUIP_TYPE.CHEST: return 'chest';
    case ESO_EQUIP_TYPE.SHOULDERS: return 'shoulders';
    case ESO_EQUIP_TYPE.HAND: return 'hand';
    case ESO_EQUIP_TYPE.WAIST: return 'waist';
    case ESO_EQUIP_TYPE.LEGS: return 'legs';
    case ESO_EQUIP_TYPE.FEET: return 'feet';
    case ESO_EQUIP_TYPE.RING1:
    case ESO_EQUIP_TYPE.RING2:
      return 'ring';
    case ESO_EQUIP_TYPE.MAIN_HAND: return 'weapon';
    case ESO_EQUIP_TYPE.OFF_HAND: return 'offhand';
    default: return undefined;
  }
}

// ============================================================
// DATA INTEGRATION
// ============================================================

/**
 * Combine set item IDs and set names into unified data structure
 */
function combineSetData(
  itemIdsMap: Map<number, number[]>,
  namesMap: Map<number, string>
): SetData[] {
  const setData: SetData[] = [];

  for (const [setId, itemIds] of itemIdsMap.entries()) {
    const name = namesMap.get(setId);
    if (name) {
      setData.push({ id: setId, name, itemIds });
    } else {
      console.warn(`No name found for setId ${setId}, skipping`);
    }
  }

  return setData;
}

function normalizeCollectionSlot(slot?: string | null): SlotType | undefined {
  if (!slot) {
    return undefined;
  }

  if (slot === 'ring-backup') {
    return 'weapon';
  }

  const allowedSlots: SlotType[] = ['head', 'neck', 'chest', 'shoulders', 'hand', 'waist', 'legs', 'feet', 'ring', 'weapon', 'offhand'];
  return allowedSlots.includes(slot as SlotType) ? (slot as SlotType) : undefined;
}

function loadItemSetCollectionSlots(): Map<number, SlotOverride> {
  const datasetPath = path.join(__dirname, '..', 'data', 'eso-globals-item-set-collections.json');
  const slotMap = new Map<number, SlotOverride>();

  if (!fs.existsSync(datasetPath)) {
  console.log('   ⚠️  eso-globals-item-set-collections.json not found, skipping slot dataset');
    return slotMap;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
    const items = raw?.items ?? {};

    Object.entries(items).forEach(([itemId, info]: [string, any]) => {
      const slotType = normalizeCollectionSlot(info?.slot);
      if (slotType) {
        slotMap.set(Number(itemId), { slot: slotType, source: 'collections' });
      }
    });

  console.log(`   ✅ Loaded ${slotMap.size.toLocaleString()} slot overrides from eso-globals-item-set-collections.json`);
  } catch (error) {
  console.warn('   ⚠️  Failed to parse eso-globals-item-set-collections.json:', error);
  }

  return slotMap;
}

function loadSlotOverrides(): Map<number, SlotOverride> {
  const collectionSlots = loadItemSetCollectionSlots();
  console.log(`   ✅ Total slot overrides available: ${collectionSlots.size.toLocaleString()}`);
  return collectionSlots;
}

/**
 * Convert ESO slot index to our SlotType
 */
function esoSlotToSlotType(slot: number): SlotType | undefined {
  const mapping: Record<number, SlotType> = {
    0: 'head',
    1: 'neck',
    2: 'chest',
    3: 'shoulders',
    4: 'weapon',      // mainHand
    5: 'offhand',
    6: 'waist',
    8: 'legs',
    9: 'feet',
    10: 'hand',
    11: 'ring',       // ring1
    12: 'ring',       // ring2
    16: 'hand',       // gloves slot in WW exports
    20: 'weapon',     // back bar main hand
    21: 'offhand'     // back bar off hand
  };
  return mapping[slot];
}

/**
 * Generate itemIdMap.ts compatible structure with equipment type metadata
 * Maps itemId -> { name, setName, type, slot?, equipType? }
 */
function generateItemIdMap(
  setData: SetData[],
  metadataMap: Map<number, SetMetadata>,
  slotOverrides: Map<number, SlotOverride>
): Record<number, ItemInfo> {
  const itemMap: Record<number, ItemInfo> = {};
  const itemSetMap = new Map<number, number>();
  let itemsWithMonsterSlots = 0;
  let itemsWithSlotOverrides = 0;
  let overridesFromCollections = 0;
  const trustedSlotItems = new Set<number>();

  for (const set of setData) {
    const metadata = metadataMap.get(set.id);
    
    // For monster sets with equipment type info, assign slots
    if (metadata?.isMonster && typeof metadata.veteran === 'object') {
      const equipTypes = Object.keys(metadata.veteran).map(Number);
      const itemsPerType = Math.ceil(set.itemIds.length / equipTypes.length);
      
      // Distribute items across equipment types
      // Assumption: item IDs are ordered by equipment type (head first, then shoulders)
      equipTypes.forEach((equipType, index) => {
        const startIdx = index * itemsPerType;
        const endIdx = Math.min((index + 1) * itemsPerType, set.itemIds.length);
        const slot = equipTypeToSlot(equipType);
        
        for (let i = startIdx; i < endIdx; i++) {
          const itemId = set.itemIds[i];
          if (itemId) {
            itemMap[itemId] = {
              name: `${set.name} ${slot ? slot.charAt(0).toUpperCase() + slot.slice(1) : 'Gear'}`,
              setName: set.name,
              type: 'Gear',
              slot,
              equipType
            };
            itemSetMap.set(itemId, set.id);
            if (slot) itemsWithMonsterSlots++;
          }
        }
      });
    } else {
      // Standard sets without specific equipment type info
      for (const itemId of set.itemIds) {
        itemMap[itemId] = {
          name: `${set.name} Gear`,
          setName: set.name,
          type: 'Gear'
        };
        itemSetMap.set(itemId, set.id);
      }
    }
  }

  // Override with real slot data from WizardsWardrobe
  slotOverrides.forEach((override, itemId) => {
    if (itemMap[itemId]) {
      const slotType = override.slot;
      if (slotType) {
        // Update existing entry with real slot information
        itemMap[itemId] = {
          ...itemMap[itemId],
          slot: slotType
        };
        // Update name to be slot-specific
        const slotName = slotType.charAt(0).toUpperCase() + slotType.slice(1);
        itemMap[itemId].name = `${itemMap[itemId].setName} ${slotName}`;
        itemsWithSlotOverrides++;
        trustedSlotItems.add(itemId);
        overridesFromCollections++;
      }
    }
  });

  const arenaFixes = fixArenaSlotMislabels(itemMap, itemSetMap, metadataMap);
  if (arenaFixes > 0) {
    console.log(`   ✅ Corrected ${arenaFixes.toLocaleString()} arena weapon items mislabeled as rings`);
  }

  console.log(`   ${itemsWithMonsterSlots.toLocaleString()} items with monster set slots`);
  console.log(`   ${itemsWithSlotOverrides.toLocaleString()} items with slot overrides (${overridesFromCollections.toLocaleString()} from ESO collections)`);
  console.log(`   ${(itemsWithMonsterSlots + itemsWithSlotOverrides).toLocaleString()} total items with slot information`);
  return itemMap;
}

function fixArenaSlotMislabels(
  itemMap: Record<number, ItemInfo>,
  itemSetMap: Map<number, number>,
  metadataMap: Map<number, SetMetadata>
): number {
  let fixCount = 0;

  itemSetMap.forEach((setId, itemId) => {
    const metadata = metadataMap.get(setId);
    if (!metadata?.isArena) {
      return;
    }

    const item = itemMap[itemId];
    if (!item || item.slot !== 'ring') {
      return;
    }

    itemMap[itemId] = {
      ...item,
      slot: 'weapon',
      name: `${item.setName} Weapon`
    };
    fixCount++;
  });

  return fixCount;
}

function propagateSlotsFromTrustedItems(
  itemMap: Record<number, ItemInfo>,
  itemSetMap: Map<number, number>,
  trustedItems: Set<number>
): number {
  if (trustedItems.size === 0) {
    return 0;
  }

  const itemsBySet = new Map<number, number[]>();
  Object.keys(itemMap).forEach((idStr) => {
    const itemId = parseInt(idStr, 10);
    const setId = itemSetMap.get(itemId);
    if (!setId) {
      return;
    }
    if (!itemsBySet.has(setId)) {
      itemsBySet.set(setId, []);
    }
    itemsBySet.get(setId)!.push(itemId);
  });

  let propagatedCount = 0;

  itemsBySet.forEach((ids) => {
    ids.sort((a, b) => a - b);
    const isAnchor = ids.map((id) => trustedItems.has(id) && itemMap[id].slot !== undefined);
    if (!isAnchor.some(Boolean)) {
      return;
    }

    const leftNearest: Array<{ slot: SlotType; distance: number } | null> = new Array(ids.length).fill(null);
    let lastAnchorIndex = -1;
    for (let i = 0; i < ids.length; i++) {
      if (isAnchor[i]) {
        lastAnchorIndex = i;
        leftNearest[i] = { slot: itemMap[ids[i]].slot!, distance: 0 };
      } else if (lastAnchorIndex !== -1) {
        leftNearest[i] = {
          slot: itemMap[ids[lastAnchorIndex]].slot!,
          distance: ids[i] - ids[lastAnchorIndex]
        };
      }
    }

    const rightNearest: Array<{ slot: SlotType; distance: number } | null> = new Array(ids.length).fill(null);
    let nextAnchorIndex = -1;
    for (let i = ids.length - 1; i >= 0; i--) {
      if (isAnchor[i]) {
        nextAnchorIndex = i;
        rightNearest[i] = { slot: itemMap[ids[i]].slot!, distance: 0 };
      } else if (nextAnchorIndex !== -1) {
        rightNearest[i] = {
          slot: itemMap[ids[nextAnchorIndex]].slot!,
          distance: ids[nextAnchorIndex] - ids[i]
        };
      }
    }

    for (let i = 0; i < ids.length; i++) {
      if (isAnchor[i]) {
        continue;
      }
      const anchorSlots = new Set<SlotType>();
      ids.forEach((id, index) => {
        if (isAnchor[index]) {
          const slot = itemMap[id].slot;
          if (slot) {
            anchorSlots.add(slot);
          }
        }
      });

      if (anchorSlots.size < 2) {
        return;
      }

      const left = leftNearest[i];
      const right = rightNearest[i];
      if (!left && !right) {
        continue;
      }

      let chosenSlot: SlotType;
      if (left && right) {
        chosenSlot = left.distance <= right.distance ? left.slot : right.slot;
      } else {
        chosenSlot = (left ?? right)!.slot;
      }

      if (itemMap[ids[i]].slot !== chosenSlot) {
        const slotLabel = chosenSlot.charAt(0).toUpperCase() + chosenSlot.slice(1);
        itemMap[ids[i]] = {
          ...itemMap[ids[i]],
          slot: chosenSlot,
          name: `${itemMap[ids[i]].setName} ${slotLabel}`
        };
        propagatedCount++;
      }
    }
  });

  return propagatedCount;
}

function mergeConsumablesIntoItemMap(itemMap: Record<number, ItemInfo>): { addedCount: number; sample: string[] } {
  const sample: string[] = [];
  let addedCount = 0;

  Object.values(ESO_CONSUMABLE_LOOKUP).forEach((consumable) => {
    if (itemMap[consumable.id]) {
      return;
    }

    const typeLabel = consumable.type === 'food' ? 'Food' : 'Drink';
    itemMap[consumable.id] = {
      name: consumable.name,
      setName: consumable.category ?? 'Provisioning',
      type: typeLabel,
    };

    if (sample.length < 5) {
      sample.push(`${consumable.name} (#${consumable.id})`);
    }

    addedCount++;
  });

  return { addedCount, sample };
}

// ============================================================
// VALIDATION
// ============================================================

/**
 * Validate parsed data against user's actual gear
 * Loads extracted-item-ids.csv and checks coverage
 */
function validateCoverage(itemMap: Record<number, ItemInfo>): void {
  const csvPath = path.join(__dirname, '..', 'tmp', 'extracted-item-ids.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.warn('⚠️  No extracted-item-ids.csv found for validation');
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n').slice(1); // Skip header
  
  const userItemIds = lines.map(line => {
    const [itemId] = line.split(',');
    return parseInt(itemId, 10);
  }).filter(id => !isNaN(id));

  const totalItems = userItemIds.length;
  const mappedItems = userItemIds.filter(id => itemMap[id]).length;
  const coveragePercent = ((mappedItems / totalItems) * 100).toFixed(1);

  console.log('\n📊 COVERAGE ANALYSIS:');
  console.log(`   Total unique user items: ${totalItems}`);
  console.log(`   Mapped items: ${mappedItems}`);
  console.log(`   Coverage: ${coveragePercent}%`);

  // Show top unmapped items
  const unmappedItems = userItemIds.filter(id => !itemMap[id]);
  if (unmappedItems.length > 0) {
    console.log(`\n❌ Top 10 unmapped items:`);
    unmappedItems.slice(0, 10).forEach(id => {
      console.log(`   - ${id}`);
    });
  }
}

// ============================================================
// OUTPUT GENERATION
// ============================================================

/**
 * Generate TypeScript file content for itemIdMap.ts
 */
function generateTypeScriptFile(itemMap: Record<number, ItemInfo>): string {
  const entries = Object.entries(itemMap)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0])); // Sort by item ID

  const itemEntries = entries
    .map(([id, info]) => {
      // Escape backslashes first, then single quotes, to avoid double-escaping
      const name = info.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const setName = info.setName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      
      // Build the object with conditional properties
      const parts = [
        `name: '${name}'`,
        `setName: '${setName}'`,
        `type: '${info.type}'`
      ];
      
      if (info.slot) {
        parts.push(`slot: '${info.slot}'`);
      }
      
      if (info.equipType !== undefined) {
        parts.push(`equipType: ${info.equipType}`);
      }
      
      return `  ${id}: { ${parts.join(', ')} }`;
    })
    .join(',\n');

  return `/**
 * Item ID to Item Info Mapping
 * 
 * Auto-generated from LibSets data (API 101048, 2025-11-13)
 * Source: https://github.com/Baertram/LibSets/tree/LibSets-reworked
 * 
 * Maps ESO item IDs to their names, set names, and types.
 * Includes optional slot and equipType information for monster sets.
 * Used by GearSelector to display gear information.
 */

export type SlotType = 'head' | 'neck' | 'chest' | 'shoulders' | 'hand' | 'waist' | 'legs' | 'feet' | 'ring' | 'weapon' | 'offhand';

export interface ItemInfo {
  name: string;
  setName: string;
  type: string;
  slot?: SlotType;          // Equipment slot (head, chest, etc.) - available for monster sets
  equipType?: number;       // ESO EQUIP_TYPE constant value - available for monster sets
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

export const itemIdMap: Record<number, ItemInfo> = {
${itemEntries}
};

/**
 * Get item info by ID
 * @param itemId The item ID from combat logs
 * @returns Item info or undefined if not found
 */
export function getItemInfo(itemId: number): ItemInfo | undefined {
  return itemIdMap[itemId];
}

/**
 * Get item name by ID
 * @param itemId The item ID from combat logs
 * @returns Item name or undefined if not found
 */
export function getItemName(itemId: number): string | undefined {
  return itemIdMap[itemId]?.name;
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
  Object.values(itemIdMap).forEach(info => setNames.add(info.setName));
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
  return Object.entries(itemIdMap)
    .filter(([, info]) => info.setName === setName && info.slot === slot)
    .map(([id]) => parseInt(id, 10));
}

export function getItemsBySlot(slot: SlotType): { itemId: number; info: ItemInfo }[] {
  if (!itemsBySlotCache[slot]) {
    itemsBySlotCache[slot] = Object.entries(itemIdMap)
      .map(([id, info]) => ({ itemId: parseInt(id, 10), info }))
      .filter(({ info }) => info.slot === slot)
      .sort((a, b) => a.info.setName.localeCompare(b.info.setName) || a.info.name.localeCompare(b.info.name));
  }
  return itemsBySlotCache[slot]!;
}

export function getAvailableSetsForSlot(slot: SlotType): SlotSetSummary[] {
  if (!setSummaryCache[slot]) {
    const counts = new Map<string, number>();
    getItemsBySlot(slot).forEach(({ info }) => {
      counts.set(info.setName, (counts.get(info.setName) ?? 0) + 1);
    });

    setSummaryCache[slot] = Array.from(counts.entries())
      .map(([setName, itemCount]) => ({ setName, itemCount }))
      .sort((a, b) => a.setName.localeCompare(b.setName));
  }
  return setSummaryCache[slot]!;
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
`;
}

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  console.log('🔧 LibSets Data Parser');
  console.log('======================\n');

  // File paths
  const dataDir = path.join(__dirname, '..', 'tmp', 'libsets-data');
  const itemIdsFile = path.join(dataDir, 'LibSets_Data_SetItemIds.lua');
  const setNamesFile = path.join(dataDir, 'LibSets_Data_SetNames.lua');
  const outputFile = path.join(__dirname, '..', 'src', 'features', 'loadout-manager', 'data', 'itemIdMap.ts');

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Check if files exist
  if (!fs.existsSync(itemIdsFile)) {
    console.error(`❌ File not found: ${itemIdsFile}`);
    console.log('   Please ensure LibSets_Data_SetItemIds.lua is downloaded to tmp/libsets-data/');
    process.exit(1);
  }

  if (!fs.existsSync(setNamesFile)) {
    console.error(`❌ File not found: ${setNamesFile}`);
    console.log('   Please ensure LibSets_Data_SetNames.lua is downloaded to tmp/libsets-data/');
    process.exit(1);
  }

  // Check for Sets.lua file
  const setsFile = path.join(__dirname, '..', 'tmp', 'libsets-data', 'LibSets_Data_Sets.lua');
  const hasSetsFile = fs.existsSync(setsFile);
  
  if (!hasSetsFile) {
    console.log('⚠️  LibSets_Data_Sets.lua not found - slot information will be limited');
  }

  // Parse files
  console.log('📖 Parsing LibSets_Data_SetItemIds.lua...');
  const itemIdsContent = fs.readFileSync(itemIdsFile, 'utf-8');
  const itemIdsMap = parseSetItemIds(itemIdsContent);
  console.log(`   ✅ Parsed ${itemIdsMap.size} gear sets`);

  console.log('\n📖 Parsing LibSets_Data_SetNames.lua...');
  const setNamesContent = fs.readFileSync(setNamesFile, 'utf-8');
  const namesMap = parseSetNames(setNamesContent);
  console.log(`   ✅ Parsed ${namesMap.size} set names`);

  // Parse metadata if available
  let metadataMap = new Map<number, SetMetadata>();
  if (hasSetsFile) {
    console.log('\n📖 Parsing LibSets_Data_Sets.lua for equipment types...');
    const setsContent = fs.readFileSync(setsFile, 'utf-8');
    metadataMap = parseSetMetadata(setsContent);
    console.log(`   ✅ Parsed metadata for ${metadataMap.size} sets`);
    
    // Count monster sets with equipment type info
    let monsterSetsWithEquipTypes = 0;
    metadataMap.forEach(metadata => {
      if (metadata.isMonster && typeof metadata.veteran === 'object') {
        monsterSetsWithEquipTypes++;
      }
    });
    console.log(`   ✅ Found ${monsterSetsWithEquipTypes} monster sets with equipment type info`);
  }

  // Combine data
  console.log('\n🔗 Combining data...');
  const setData = combineSetData(itemIdsMap, namesMap);
  console.log(`   ✅ Combined ${setData.length} sets`);

  // Calculate total items
  const totalItems = setData.reduce((sum, set) => sum + set.itemIds.length, 0);
  console.log(`   ✅ Total items: ${totalItems.toLocaleString()}`);

  // Load slot overrides from datasets
  console.log('\n🎮 Loading slot override data...');
  const slotOverrides = loadSlotOverrides();

  // Generate item map with metadata
  console.log('\n🗺️  Generating itemIdMap...');
  const itemMap = generateItemIdMap(setData, metadataMap, slotOverrides);
  console.log(`   ✅ Generated ${Object.keys(itemMap).length.toLocaleString()} item mappings`);

  console.log('\n🥘 Merging consumable catalog...');
  const consumableStats = mergeConsumablesIntoItemMap(itemMap);
  if (consumableStats.addedCount > 0) {
    console.log(
      `   ✅ Added ${consumableStats.addedCount.toLocaleString()} consumables from ESO_CONSUMABLE_LOOKUP (${consumableStats.sample.join(
        ', ',
      )})`,
    );
  } else {
    console.log('   ⚠️  No additional consumable IDs were added');
  }

  // Validate coverage
  validateCoverage(itemMap);

  // Generate output file
  console.log('\n📝 Writing itemIdMap.ts...');
  const tsContent = generateTypeScriptFile(itemMap);
  fs.writeFileSync(outputFile, tsContent, 'utf-8');
  console.log(`   ✅ Written to: ${outputFile}`);

  // Summary
  console.log('\n✨ SUMMARY:');
  console.log(`   Sets parsed: ${setData.length}`);
  console.log(`   Items mapped: ${Object.keys(itemMap).length.toLocaleString()}`);
  console.log(`   Output file: ${path.relative(process.cwd(), outputFile)}`);
  
  // Show sample sets
  console.log('\n📦 Sample sets:');
  setData.slice(0, 5).forEach(set => {
    console.log(`   - [${set.id}] ${set.name}: ${set.itemIds.length} items`);
  });

  console.log('\n✅ Done!');
}

// Run the script
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
