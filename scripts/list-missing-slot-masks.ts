import fs from 'fs';
import path from 'path';

import { itemIdMap } from '../src/features/loadout-manager/data/itemIdMap';

interface GlobalsData {
  items: Record<string, unknown>;
}

function readCsvItemIds(csvPath: string): number[] {
  const raw = fs.readFileSync(csvPath, 'utf-8').trim();
  const lines = raw.split(/\r?\n/).slice(1); // skip header
  return lines
    .map((line) => line.split(',')[0])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));
}

function main() {
  const csvPath = path.join(__dirname, '..', 'tmp', 'extracted-item-ids.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Missing tmp/extracted-item-ids.csv. Run extract-gear-item-ids.ts first.');
    process.exit(1);
  }

  const globalsPath = path.join(__dirname, '..', 'data', 'eso-globals-item-set-collections.json');
  if (!fs.existsSync(globalsPath)) {
    console.error('❌ Missing data/eso-globals-item-set-collections.json. Generate it first.');
    process.exit(1);
  }

  const userItemIds = readCsvItemIds(csvPath);
  const globalsData: GlobalsData = JSON.parse(fs.readFileSync(globalsPath, 'utf-8'));
  const collectionIds = new Set(Object.keys(globalsData.items).map((key) => Number(key)));

  const missingIds = userItemIds.filter((id) => !collectionIds.has(id));

  console.log(`📊 Total user items: ${userItemIds.length}`);
  console.log(`✅ With slot masks: ${userItemIds.length - missingIds.length}`);
  console.log(`❌ Missing slot masks: ${missingIds.length}`);

  if (missingIds.length === 0) {
    console.log('\n🎉 All user items have slot mask coverage.');
    return;
  }

  const samples = missingIds.slice(0, 20).map((id) => {
    const info = itemIdMap[id];
    return {
      itemId: id,
      name: info?.name ?? 'Unknown Item',
      set: info?.setName ?? 'Unknown Set',
      type: info?.type ?? 'Unknown',
    };
  });

  console.log('\n🔎 Sample missing items:');
  console.table(samples);
}

main();
