/**
 * LibSets Data Parser
 * 
 * Parses LibSets Lua data files to extract:
 * 1. SetItemIds: Maps setId -> array of item IDs (with decompression)
 * 2. SetNames: Maps setId -> multilingual set names
 * 
 * Output: itemIdMap.json — the data asset fetched at runtime by the
 * hand-maintained loader module src/features/loadout-manager/data/itemIdMap.ts
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

interface MergeStats {
  added: number;
  preserved: number;
  preservedOnlyInExisting: number;
  setNamesUpdated: number;
}

function isItemInfo(value: unknown): value is ItemInfo {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const info = value as Partial<ItemInfo>;
  return typeof info.name === 'string' && typeof info.setName === 'string' && typeof info.type === 'string';
}

function loadExistingItemMap(filePath: string): Record<number, ItemInfo> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Existing item map must be a JSON object: ${filePath}`);
  }

  const invalidEntries = Object.entries(parsed).filter(([, value]) => !isItemInfo(value));
  if (invalidEntries.length > 0) {
    throw new Error(`Existing item map contains ${invalidEntries.length} invalid entries: ${filePath}`);
  }

  return parsed as Record<number, ItemInfo>;
}

/**
 * Merge a freshly generated upstream map without allowing its inferred slot
 * data to overwrite curated facts already present in itemIdMap.json.
 *
 * Existing entries are authoritative for name, slot, equipType, and type.
 * A setName is filled only when an old entry is missing it; this is the one
 * safe correction that cannot discard curated metadata. Entries no longer
 * present upstream remain in the output so a refresh cannot silently remove
 * IDs that are still referenced by saved builds.
 */
function mergeWithExistingItemMap(
  generatedMap: Record<number, ItemInfo>,
  existingMap: Record<number, ItemInfo>,
): { itemMap: Record<number, ItemInfo>; stats: MergeStats } {
  const itemMap: Record<number, ItemInfo> = { ...existingMap };
  const stats: MergeStats = {
    added: 0,
    preserved: 0,
    preservedOnlyInExisting: 0,
    setNamesUpdated: 0,
  };

  for (const [id, generatedInfo] of Object.entries(generatedMap)) {
    const existingInfo = existingMap[Number(id)];
    if (!existingInfo) {
      itemMap[Number(id)] = generatedInfo;
      stats.added++;
      continue;
    }

    if (!existingInfo.setName && generatedInfo.setName) {
      itemMap[Number(id)] = { ...existingInfo, setName: generatedInfo.setName };
      stats.setNamesUpdated++;
    }
    stats.preserved++;
  }

  stats.preservedOnlyInExisting = Object.keys(existingMap).filter(id => !generatedMap[Number(id)]).length;
  return { itemMap, stats };
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
 * Generate the itemIdMap.json content — the data asset fetched at runtime by
 * src/features/loadout-manager/data/itemIdMap.ts (a hand-maintained loader
 * module: do NOT overwrite it from this script). Keys sort numerically so the
 * output is deterministic; run prettier over the file after regenerating so
 * it matches the committed formatting.
 */
function generateItemIdMapJson(itemMap: Record<number, ItemInfo>): string {
  const entries = Object.entries(itemMap)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([id, info]) => {
      const entry: ItemInfo = {
        name: info.name,
        setName: info.setName,
        type: info.type,
      };
      if (info.slot) {
        entry.slot = info.slot;
      }
      if (info.equipType !== undefined) {
        entry.equipType = info.equipType;
      }

      const key = JSON.stringify(id);
      const compactEntry = `{ ${Object.entries(entry)
        .map(([field, value]) => `${JSON.stringify(field)}: ${JSON.stringify(value)}`)
        .join(', ')} }`;
      const compact = `  ${key}: ${compactEntry},`;
      if (compact.length <= 100) {
        return compact;
      }

      const formatted = JSON.stringify(entry, null, 2).split('\n');
      return [
        `  ${key}: ${formatted[0]}`,
        ...formatted.slice(1, -1).map(line => `  ${line}`),
        '  },',
      ].join('\n');
    });

  if (entries.length > 0) {
    entries[entries.length - 1] = entries[entries.length - 1].replace(/,$/, '');
  }
  return `{\n${entries.join('\n')}\n}\n`;
}


// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
  console.log('🔧 LibSets Data Parser');
  console.log('======================\n');

  // File paths
  const dataDir = process.env.LIBSETS_DATA_DIR
    ? path.resolve(process.env.LIBSETS_DATA_DIR)
    : path.join(__dirname, '..', 'tmp', 'libsets-data');
  const itemIdsFile = path.join(dataDir, 'LibSets_Data_SetItemIds.lua');
  const setNamesFile = path.join(dataDir, 'LibSets_Data_SetNames.lua');
  const outputFile = process.env.ITEM_ID_MAP_OUTPUT
    ? path.resolve(process.env.ITEM_ID_MAP_OUTPUT)
    : path.join(__dirname, '..', 'src', 'features', 'loadout-manager', 'data', 'itemIdMap.json');

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
  const setsFile = path.join(dataDir, 'LibSets_Data_Sets.lua');
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
  const generatedItemMap = generateItemIdMap(setData, metadataMap, slotOverrides);
  const mergeExisting = process.env.LIBSETS_MERGE_EXISTING === '1';
  let itemMap = generatedItemMap;
  if (mergeExisting) {
    const existingMap = loadExistingItemMap(outputFile);
    const mergeResult = mergeWithExistingItemMap(generatedItemMap, existingMap);
    itemMap = mergeResult.itemMap;
    console.log(`   ✅ Merge mode: preserved ${mergeResult.stats.preserved.toLocaleString()} existing IDs`);
    console.log(`   ✅ Merge mode: added ${mergeResult.stats.added.toLocaleString()} upstream-only IDs`);
    console.log(
      `   ✅ Merge mode: retained ${mergeResult.stats.preservedOnlyInExisting.toLocaleString()} IDs absent from upstream`,
    );
    console.log(`   ✅ Merge mode: filled ${mergeResult.stats.setNamesUpdated.toLocaleString()} missing setName fields`);
  }
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
  console.log('\n📝 Writing itemIdMap.json...');
  const jsonContent = generateItemIdMapJson(itemMap);
  fs.writeFileSync(outputFile, jsonContent, 'utf-8');
  console.log(`   ✅ Written to: ${outputFile}`);
  console.log('   ℹ️  Run prettier --write on the JSON so it matches the committed formatting.');

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
