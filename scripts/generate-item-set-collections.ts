import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type SlotCategory = 'armor' | 'weapon' | 'jewelry' | 'unknown';
type ArmorWeight = 'light' | 'medium' | 'heavy';

interface SlotInfo {
  category: SlotCategory;
  slot?:
    | 'head'
    | 'shoulders'
    | 'chest'
    | 'hands'
    | 'waist'
    | 'legs'
    | 'feet'
    | 'neck'
    | 'ring'
    | 'ring-backup'
    | 'weapon'
    | 'offhand';
  weight?: ArmorWeight;
  note?: string;
  itemType?: string;
}

interface ItemEntry {
  setId: number;
  slotMask: number;
  category: SlotCategory;
  slot?: SlotInfo['slot'];
  weight?: ArmorWeight;
  note?: string;
  itemType?: string;
}

interface MythicSlotOverride {
  setId: number;
  name: string;
  slotMask: number;
  note?: string;
}

const SLOT_MASK_INFO: Record<number, SlotInfo> = {
  // Armor – head
  1: { category: 'armor', slot: 'head', weight: 'light' },
  2: { category: 'armor', slot: 'head', weight: 'medium' },
  4: { category: 'armor', slot: 'head', weight: 'heavy' },
  // Shoulders
  8: { category: 'armor', slot: 'shoulders', weight: 'light' },
  16: { category: 'armor', slot: 'shoulders', weight: 'medium' },
  32: { category: 'armor', slot: 'shoulders', weight: 'heavy' },
  // Chest
  64: { category: 'armor', slot: 'chest', weight: 'light' },
  128: { category: 'armor', slot: 'chest', weight: 'medium' },
  256: { category: 'armor', slot: 'chest', weight: 'heavy' },
  // Hands (Wizard's Wardrobe data mis-labels these as backup weapon slots)
  512: { category: 'armor', slot: 'hands', weight: 'light', note: 'Corrected from WW backup weapon mask' },
  1024: { category: 'armor', slot: 'hands', weight: 'medium', note: 'Corrected from WW backup weapon mask' },
  2048: { category: 'armor', slot: 'hands', weight: 'heavy', note: 'Corrected from WW backup weapon mask' },
  // Waist
  4096: { category: 'armor', slot: 'waist', weight: 'light' },
  8192: { category: 'armor', slot: 'waist', weight: 'medium' },
  16384: { category: 'armor', slot: 'waist', weight: 'heavy' },
  // Legs
  32768: { category: 'armor', slot: 'legs', weight: 'light' },
  65536: { category: 'armor', slot: 'legs', weight: 'medium' },
  131072: { category: 'armor', slot: 'legs', weight: 'heavy' },
  // Feet
  262144: { category: 'armor', slot: 'feet', weight: 'light' },
  524288: { category: 'armor', slot: 'feet', weight: 'medium' },
  1048576: { category: 'armor', slot: 'feet', weight: 'heavy' },
  // Jewelry
  2097152: { category: 'jewelry', slot: 'neck' },
  4194304: { category: 'jewelry', slot: 'ring' },
  // High-bit weapon masks (Wizard's Wardrobe exports these as backup weapon slots)
  536870912: {
    category: 'weapon',
    slot: 'weapon',
    note: 'Battle axe (WW export mask; confirmed via itemId 166159 sample link)',
    itemType: 'battle-axe',
  },
  4294967296: {
    category: 'weapon',
    slot: 'weapon',
    note: 'Inferno staff (WW export mask)',
    itemType: 'inferno-staff',
  },
  8589934592: {
    category: 'weapon',
    slot: 'weapon',
    note: 'Frost staff (mask override; confirmed by itemId 174950 sample link)',
    itemType: 'frost-staff',
  },
  17179869184: {
    category: 'weapon',
    slot: 'weapon',
    note: 'Lightning staff (WW export mask; verified via itemId 57454 Destructive Impact weapon link)',
    itemType: 'lightning-staff',
  },
  // Weapons (front bar / generic)
  8388608: { category: 'weapon', slot: 'weapon', note: 'Dagger (front bar)', itemType: 'dagger' },
  16777216: {
    category: 'weapon',
    slot: 'weapon',
    note: 'One-hand axe (WW mask; confirmed via itemId 181706 Turning Tide link)',
    itemType: 'one-hand-axe',
  },
  33554432: {
    category: 'weapon',
    slot: 'weapon',
    note: 'One-hand mace (WW mask; confirmed via item 206813)',
    itemType: 'one-hand-mace',
  },
  67108864: {
    category: 'weapon',
    slot: 'weapon',
    note: 'One-hand sword (WW mask; confirmed via item 95872)',
    itemType: 'one-hand-sword',
  },
  134217728: {
    category: 'weapon',
    slot: 'weapon',
    note: 'Unconfirmed weapon mask (WW backup bar slot not observed in available data)',
    itemType: 'unknown',
  },
  268435456: {
    category: 'weapon',
    slot: 'weapon',
    note: 'Maul (WW mask; confirmed via itemId 166058 sample link)',
    itemType: 'maul',
  },
  1073741824: { category: 'weapon', slot: 'weapon', note: 'Bow', itemType: 'bow' },
  2147483648: {
    category: 'weapon',
    slot: 'weapon',
    note: 'Restoration staff',
    itemType: 'restoration-staff',
  },
  34359738368: { category: 'weapon', slot: 'offhand', note: 'Shield', itemType: 'shield' },
};

const globalsPath = path.join(__dirname, '..', 'tmp', 'globals.txt');
const outputPath = path.join(__dirname, '..', 'data', 'eso-globals-item-set-collections.json');
const libSetsItemIdsPath = path.join(
  __dirname,
  '..',
  'tmp',
  'libsets-data',
  'LibSets_Data_SetItemIds.lua'
);

const MYTHIC_SLOT_OVERRIDES: MythicSlotOverride[] = [
  { setId: 476, name: "Grave Guardian's Amulet", slotMask: 2097152 },
  { setId: 575, name: 'Ring of the Pale Order', slotMask: 4194304 },
  { setId: 576, name: 'Pearls of Ehlnofey', slotMask: 2097152 },
  { setId: 593, name: 'Gaze of Sithis', slotMask: 4 },
  { setId: 594, name: "Harpooner's Wading Kilt", slotMask: 8192 },
  { setId: 625, name: 'Markyn Ring of Majesty', slotMask: 4194304 },
  { setId: 657, name: "Sea-Serpent's Coil", slotMask: 2097152 },
  { setId: 658, name: 'Oakensoul Ring', slotMask: 4194304 },
  { setId: 691, name: 'Cryptcanon Vestments', slotMask: 64 },
  { setId: 694, name: 'Velothi Ur-Mage\'s Amulet', slotMask: 2097152 },
];

if (!fs.existsSync(globalsPath)) {
  console.error('❌ Cannot find tmp/globals.txt. Download the ESO globals dump first.');
  process.exit(1);
}

const slotPattern = /itemSetCollectionSlot\s*=\s*([0-9eE+\-.]+)/;
const piecePattern = /pieceId\s*=\s*(\d+)/;
const setPattern = /itemSetId\s*=\s*(\d+)/;

function floatToMask(value: number): number {
  const buf = Buffer.allocUnsafe(8);
  buf.writeDoubleLE(value, 0);
  const mask = buf.readBigUInt64LE(0);
  if (mask > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Slot mask ${mask.toString()} exceeds JS safe integer range`);
  }
  return Number(mask);
}

async function main() {
  console.log('🔍 Parsing globals dump for item set collection slots...');

  const reader = readline.createInterface({
    input: fs.createReadStream(globalsPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let currentSetId: number | null = null;
  let pendingMask: number | null = null;
  const items: Record<string, ItemEntry> = {};
  let totalPieces = 0;
  let unknownSlots = 0;

  for await (const line of reader) {
    const setMatch = setPattern.exec(line);
    if (setMatch) {
      currentSetId = Number(setMatch[1]);
      continue;
    }

    const slotMatch = slotPattern.exec(line);
    if (slotMatch) {
      pendingMask = floatToMask(Number(slotMatch[1]));
      continue;
    }

    const pieceMatch = piecePattern.exec(line);
    if (pieceMatch && pendingMask !== null && currentSetId !== null) {
      const itemId = Number(pieceMatch[1]);
      const slotInfo = SLOT_MASK_INFO[pendingMask] ?? { category: 'unknown' as const };
      if (!SLOT_MASK_INFO[pendingMask]) {
        unknownSlots += 1;
      }

      items[itemId] = {
        setId: currentSetId,
        slotMask: pendingMask,
        category: slotInfo.category,
        slot: slotInfo.slot,
        weight: slotInfo.weight,
        note: slotInfo.note,
        itemType: slotInfo.itemType,
      };

      totalPieces += 1;
      pendingMask = null;
    }
  }

  const mythicAdded = addMythicSlotOverrides(items);
  totalPieces += mythicAdded;

  const slotMaskMap = Object.fromEntries(
    Object.entries(SLOT_MASK_INFO).map(([mask, info]) => [mask, info])
  );

  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: path.relative(process.cwd(), globalsPath),
      totalPieces,
      totalItems: Object.keys(items).length,
      unknownSlotCount: unknownSlots,
    },
    slotMasks: slotMaskMap,
    items,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`✅ Wrote ${Object.keys(items).length} entries to ${path.relative(process.cwd(), outputPath)}`);
  if (unknownSlots > 0) {
    console.warn(`⚠️  ${unknownSlots} pieces used slot masks without explicit metadata. Update SLOT_MASK_INFO if needed.`);
  }
}

function addMythicSlotOverrides(items: Record<string, ItemEntry>): number {
  if (!fs.existsSync(libSetsItemIdsPath)) {
    console.warn('⚠️  Missing LibSets item ID data – mythic slot overrides skipped.');
    return 0;
  }

  const fileContent = fs.readFileSync(libSetsItemIdsPath, 'utf-8');
  let added = 0;
  const missingSets: string[] = [];

  MYTHIC_SLOT_OVERRIDES.forEach((override) => {
    const slotInfo = SLOT_MASK_INFO[override.slotMask];
    if (!slotInfo) {
      console.warn(`⚠️  Slot mask ${override.slotMask} missing metadata for mythic ${override.name}.`);
      return;
    }

  const setItems = extractItemIdsForSet(fileContent, override.setId);
  console.log(`   Mythic ${override.name}: resolved ${setItems.length} item IDs (first: ${setItems[0] ?? 'n/a'})`);
    if (!setItems || setItems.length === 0) {
      missingSets.push(override.name);
      return;
    }

    const itemId = setItems[0];
    const existing = items[itemId];
    if (existing) {
      const needsUpdate =
        existing.setId !== override.setId ||
        existing.slotMask !== override.slotMask ||
        !existing.slot ||
        existing.category === 'unknown';

      if (needsUpdate) {
        items[itemId] = {
          ...existing,
          setId: override.setId,
          slotMask: override.slotMask,
          category: slotInfo.category,
          slot: slotInfo.slot,
          weight: slotInfo.weight,
          note: override.note ?? 'Mythic slot override from LibSets',
          itemType: slotInfo.itemType,
        };
      }
      return;
    }

    items[itemId] = {
      setId: override.setId,
      slotMask: override.slotMask,
      category: slotInfo.category,
      slot: slotInfo.slot,
      weight: slotInfo.weight,
      note: override.note ?? 'Mythic slot override from LibSets',
      itemType: slotInfo.itemType,
    };
    added += 1;
  });

  if (added > 0) {
    console.log(`✨ Added ${added} mythic slot overrides via LibSets data.`);
  }
  if (missingSets.length > 0) {
    console.warn(`⚠️  Missing LibSets item IDs for mythic sets: ${missingSets.join(', ')}`);
  }

  return added;
}

function extractItemIdsForSet(fileContent: string, setId: number): number[] {
  const setRegex = new RegExp(`\\[${setId}\\]\\s*=\\s*\\{([^}]+)\\}`);
  const match = setRegex.exec(fileContent);
  if (!match) {
    return [];
  }

  const block = match[1];
  const itemIds: number[] = [];

  const stringRegex = /"([^"]+)"/g;
  let stringMatch: RegExpExecArray | null;
  while ((stringMatch = stringRegex.exec(block)) !== null) {
    itemIds.push(...expandCompressedEntry(stringMatch[1]));
  }

  const numberRegex = /=\s*(\d+)/g;
  let numberMatch: RegExpExecArray | null;
  while ((numberMatch = numberRegex.exec(block)) !== null) {
    itemIds.push(Number(numberMatch[1]));
  }

  return itemIds;
}

function expandCompressedEntry(entry: string): number[] {
  const parts = entry.split(',');
  if (parts.length !== 2) {
    return [];
  }

  const startId = Number(parts[0]);
  const count = Number(parts[1]);
  if (Number.isNaN(startId) || Number.isNaN(count)) {
    return [];
  }

  return Array.from({ length: count + 1 }, (_, index) => startId + index);
}

main().catch((error) => {
  console.error('❌ Failed to generate item set collection data');
  console.error(error);
  process.exit(1);
});