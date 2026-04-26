/**
 * Extract unique item IDs from WizardsWardrobe LUA file
 * 
 * This script scans the WW file and extracts all unique item IDs with their
 * item links, which can then be used to manually populate itemIdMap.ts
 * 
 * Usage:
 *   npx ts-node scripts/extract-gear-item-ids.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { itemIdMap } from '../src/features/loadout-manager/data/itemIdMap';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ExtractedItem {
  itemId: number;
  link: string;
  count: number; // How many times this item appears
  name?: string;
  slotMask?: number;
}

interface CollectionItemInfo {
  slotMask?: number;
}

interface SlotDataset {
  items?: Record<string, CollectionItemInfo>;
}

/**
 * Parse ESO item link format: |H0:item:ITEMID:...|h|h
 */
function parseItemLink(link: string): number | null {
  const match = link.match(/\|H0:item:(\d+):/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract all gear items from WizardsWardrobe.lua
 */
function extractItemIds(filePath: string): Map<number, ExtractedItem> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const itemMap = new Map<number, ExtractedItem>();
  
  // Match gear entries: ["link"] = "|H0:item:...|h|h"
  const gearPattern = /\["link"\]\s*=\s*"(\|H0:item:[^"]+)"/g;
  
  let match;
  while ((match = gearPattern.exec(content)) !== null) {
    const link = match[1];
    const itemId = parseItemLink(link);
    
    if (itemId) {
      const itemName = itemIdMap[itemId]?.name;
      const existing = itemMap.get(itemId);
      if (existing) {
        existing.count++;
      } else {
        itemMap.set(itemId, {
          itemId,
          link,
          count: 1,
          name: itemName
        });
      }
    }
  }
  
  return itemMap;
}

function loadSlotMaskMap(): Map<number, number> {
  const datasetPath = path.join(__dirname, '..', 'data', 'eso-globals-item-set-collections.json');
  const slotMaskMap = new Map<number, number>();

  if (!fs.existsSync(datasetPath)) {
    console.warn('⚠️  Slot mask dataset not found. Skipping mask enrichment.');
    return slotMaskMap;
  }

  try {
    const raw: SlotDataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
    const entries = Object.entries(raw.items ?? {});
    for (const [id, info] of entries) {
      if (typeof info?.slotMask === 'number') {
        slotMaskMap.set(Number(id), info.slotMask);
      }
    }
  } catch (error) {
    console.warn('⚠️  Failed to parse slot mask dataset. Skipping mask enrichment.', error);
  }

  return slotMaskMap;
}

/**
 * Main execution
 */
function main() {
  const wwFilePath = path.join(__dirname, '..', 'tmp', 'WizardsWardrobe.lua');
  
  if (!fs.existsSync(wwFilePath)) {
    console.error('❌ WizardsWardrobe.lua not found at:', wwFilePath);
    console.error('   Please place your WizardsWardrobe.lua file in the tmp/ directory');
    process.exit(1);
  }
  
  console.log('📖 Reading WizardsWardrobe.lua...');
  const items = extractItemIds(wwFilePath);
  const slotMaskMap = loadSlotMaskMap();

  items.forEach((item) => {
    const slotMask = slotMaskMap.get(item.itemId);
    if (typeof slotMask === 'number') {
      item.slotMask = slotMask;
    }
  });
  
  console.log(`\n✅ Found ${items.size} unique item IDs\n`);
  
  // Sort by frequency (most common first)
  const sorted = Array.from(items.values()).sort((a, b) => b.count - a.count);
  
  // Output as CSV for easy processing
  console.log('Item ID,Count,Name,Slot Mask,Sample Link');
  console.log('========,=====,====,========,==========');
  sorted.forEach(item => {
    console.log(`${item.itemId},${item.count},${formatCsvValue(item.name ?? '')},${item.slotMask ?? ''},${formatCsvValue(item.link)}`);
  });
  
  // Save to file
  const outputPath = path.join(__dirname, '..', 'tmp', 'extracted-item-ids.csv');
  const csvContent = [
    'itemId,count,name,slotMask,link',
    ...sorted.map(item =>
      `${item.itemId},${item.count},${formatCsvValue(item.name ?? '')},${item.slotMask ?? ''},${formatCsvValue(item.link)}`
    )
  ].join('\n');
  
  fs.writeFileSync(outputPath, csvContent, 'utf-8');
  console.log(`\n💾 Saved to: ${outputPath}`);
  
  // Summary statistics
  console.log('\n📊 Statistics:');
  console.log(`   Total unique items: ${items.size}`);
  console.log(`   Most common item: ${sorted[0].itemId} (appears ${sorted[0].count} times)`);
  console.log(`   Total gear pieces: ${sorted.reduce((sum, item) => sum + item.count, 0)}`);
  
  console.log('\n💡 Next steps:');
  console.log('   1. Open tmp/extracted-item-ids.csv');
  console.log('   2. Look up item names using ESO game or UESP wiki');
  console.log('   3. Add mappings to src/features/loadout-manager/data/itemIdMap.ts');
}

function formatCsvValue(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

// Direct execution
main();
