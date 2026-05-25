#!/usr/bin/env node
/**
 * Pre-fetch ESO item icons and weapon types from UESP's minedItemSummary API.
 *
 * Downloads every item's icon path and weapon type in a single bulk request
 * and writes a compact JSON file that the app can import at build time —
 * zero runtime API calls needed.
 *
 * Output format (indexed to de-duplicate shared icons):
 *   {
 *     "icons": ["gear_breton_ring_a", ...],
 *     "items": { "147237": 0, ... },
 *     "weaponTypes": { "97227": 12, "97230": 9, ... }  // only non-zero entries
 *   }
 *
 * weaponTypes values match ESO's WEAPON_TYPE constants (and WeaponType enum in
 * src/types/playerDetails.ts):
 *   1=Axe, 2=Mace, 3=Sword, 4=2H Sword, 5=2H Axe, 6=Maul, 8=Bow,
 *   9=Restoration Staff, 11=Dagger, 12=Inferno Staff, 13=Ice Staff,
 *   14=Shield, 15=Lightning Staff
 *
 * Usage:
 *   node scripts/fetch-item-icons.mjs
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const UESP_API = 'https://esolog.uesp.net/exportJson.php';
const OUTPUT_FILE = resolve(__dirname, '../src/features/loadout-manager/data/itemIcons.json');

/**
 * Extract just the icon filename (without path or extension).
 *   "/esoui/art/icons/gear_undnarlimor_head_a.dds" → "gear_undnarlimor_head_a"
 */
function extractIconName(iconPath) {
  if (!iconPath || iconPath.includes('icon_missing')) return null;
  const match = iconPath.match(/([^/]+)\.dds$/i);
  return match ? match[1] : null;
}

async function main() {
  console.log('Fetching all items from UESP minedItemSummary...');

  const response = await fetch(
    `${UESP_API}?table=minedItemSummary&limit=200000&fields=itemId,icon,weaponType`,
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  const items = data.minedItemSummary || [];
  console.log(`Received ${items.length} items from UESP.`);

  // ── Build item → icon mapping ──────────────────────────────────────
  const itemMap = {}; // itemId → iconName
  const weaponTypeMap = {}; // itemId → weaponType (only non-zero)
  let skipped = 0;

  for (const item of items) {
    const iconName = extractIconName(item.icon);
    if (iconName) {
      itemMap[item.itemId] = iconName;
    } else {
      skipped++;
    }

    // Store non-zero weapon types (staves, swords, bows, etc.)
    const wt = Number(item.weaponType);
    if (wt > 0) {
      weaponTypeMap[item.itemId] = wt;
    }
  }

  console.log(`  ${Object.keys(itemMap).length} items with icons`);
  console.log(`  ${Object.keys(weaponTypeMap).length} items with weapon types`);
  console.log(`  ${skipped} items without icons (skipped)`);

  // ── Build indexed/deduplicated output ──────────────────────────────
  const uniqueIcons = [...new Set(Object.values(itemMap))].sort();
  const iconIndex = {};
  uniqueIcons.forEach((name, i) => {
    iconIndex[name] = i;
  });

  const indexedItems = {};
  for (const [id, name] of Object.entries(itemMap)) {
    indexedItems[id] = iconIndex[name];
  }

  const output = { icons: uniqueIcons, items: indexedItems, weaponTypes: weaponTypeMap };
  const json = JSON.stringify(output);

  writeFileSync(OUTPUT_FILE, json);
  console.log(`\nWritten to ${OUTPUT_FILE}`);
  console.log(`  ${uniqueIcons.length} unique icon names`);
  console.log(`  ${Object.keys(indexedItems).length} item mappings`);
  console.log(`  ${Object.keys(weaponTypeMap).length} weapon type entries`);
  console.log(`  ${(json.length / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
