#!/usr/bin/env node

/**
 * UESP Data MCP Server
 *
 * Provides tools for fetching and updating ESO item data from UESP.
 * Primary use case: refreshing the local item icon database after
 * new ESO content patches.
 *
 * Tools:
 *   - fetch_item_icons: Download all item→icon mappings from UESP
 *   - check_icon_coverage: Verify icon coverage against WW gear data
 *   - lookup_item: Look up a specific item's icon by ID
 *
 * @module eso-log-aggregator-uesp-data-skill
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ROOT = process.cwd();
const UESP_API = 'https://esolog.uesp.net/exportJson.php';
const UESP_ICON_CDN = 'https://esoicons.uesp.net';
const ICON_DATA_PATH = resolve(
  PROJECT_ROOT,
  'src/features/loadout-manager/data/itemIcons.json',
);

// ── Helpers ────────────────────────────────────────────────────────────

function extractIconName(iconPath) {
  if (!iconPath || iconPath.includes('icon_missing')) return null;
  const match = iconPath.match(/([^/]+)\.dds$/i);
  return match ? match[1] : null;
}

function iconNameToUrl(iconName) {
  return `${UESP_ICON_CDN}/esoui/art/icons/${iconName}.png`;
}

function loadLocalData() {
  if (!existsSync(ICON_DATA_PATH)) return null;
  return JSON.parse(readFileSync(ICON_DATA_PATH, 'utf8'));
}

// ── Tool implementations ──────────────────────────────────────────────

/**
 * Fetch all item icons from UESP and write the local JSON file.
 */
async function fetchItemIcons() {
  const oldData = loadLocalData();
  const oldCount = oldData ? Object.keys(oldData.items).length : 0;

  // Single bulk request – UESP supports limit up to 200K
  const response = await fetch(
    `${UESP_API}?table=minedItemSummary&limit=200000&fields=itemId,icon`,
  );
  if (!response.ok) {
    return { error: `UESP API returned HTTP ${response.status}` };
  }

  const data = await response.json();
  const items = data.minedItemSummary || [];

  // Build item → icon mapping
  const itemMap = {};
  let skipped = 0;
  for (const item of items) {
    const iconName = extractIconName(item.icon);
    if (iconName) {
      itemMap[item.itemId] = iconName;
    } else {
      skipped++;
    }
  }

  // Build indexed/deduplicated output
  const uniqueIcons = [...new Set(Object.values(itemMap))].sort();
  const iconIndex = {};
  uniqueIcons.forEach((name, i) => {
    iconIndex[name] = i;
  });

  const indexedItems = {};
  for (const [id, name] of Object.entries(itemMap)) {
    indexedItems[id] = iconIndex[name];
  }

  const output = { icons: uniqueIcons, items: indexedItems };
  const json = JSON.stringify(output);
  writeFileSync(ICON_DATA_PATH, json);

  const newCount = Object.keys(indexedItems).length;
  const newIcons = newCount - oldCount;

  return {
    success: true,
    totalItems: items.length,
    itemsWithIcons: newCount,
    itemsWithoutIcons: skipped,
    uniqueIconNames: uniqueIcons.length,
    fileSizeMB: (json.length / 1024 / 1024).toFixed(2),
    outputPath: ICON_DATA_PATH,
    newItemsSinceLastFetch: newIcons > 0 ? newIcons : 0,
    summary:
      `Fetched ${newCount} item→icon mappings (${uniqueIcons.length} unique icons) ` +
      `from ${items.length} total UESP items. ` +
      (newIcons > 0
        ? `${newIcons} new items since last fetch.`
        : 'No new items since last fetch.') +
      ` File size: ${(json.length / 1024 / 1024).toFixed(2)} MB.`,
  };
}

/**
 * Check icon coverage against extracted WW gear data.
 */
async function checkIconCoverage() {
  const data = loadLocalData();
  if (!data) {
    return { error: 'No local icon data found. Run fetch_item_icons first.' };
  }

  const csvPath = resolve(PROJECT_ROOT, 'tmp/extracted-item-ids.csv');
  if (!existsSync(csvPath)) {
    return {
      localDataStats: {
        uniqueIcons: data.icons.length,
        totalMappings: Object.keys(data.items).length,
      },
      gearCoverage:
        'No extracted gear data found at tmp/extracted-item-ids.csv. ' +
        'Import gear from Wizard\'s Wardrobe first to test coverage.',
    };
  }

  const csv = readFileSync(csvPath, 'utf8');
  const lines = csv.trim().split('\n').slice(1);
  let found = 0;
  let missing = 0;
  const missingItems = [];

  for (const line of lines) {
    const cols = line.split(',');
    const itemId = cols[0];
    const name = cols[2];
    if (data.items[itemId] !== undefined) {
      found++;
    } else {
      missing++;
      missingItems.push({ itemId, name });
    }
  }

  return {
    totalGearItems: found + missing,
    found,
    missing,
    coveragePercent: ((found / (found + missing)) * 100).toFixed(1),
    missingItems: missingItems.slice(0, 20),
    localDataStats: {
      uniqueIcons: data.icons.length,
      totalMappings: Object.keys(data.items).length,
    },
    summary:
      `${found}/${found + missing} gear items have icons (${((found / (found + missing)) * 100).toFixed(1)}% coverage). ` +
      (missing > 0
        ? `${missing} items missing — run fetch_item_icons to update.`
        : 'Full coverage!'),
  };
}

/**
 * Look up a specific item by ID.
 */
async function lookupItem(itemId) {
  const id = parseInt(itemId, 10);
  if (isNaN(id) || id <= 0) {
    return { error: 'Invalid item ID. Must be a positive integer.' };
  }

  // Check local data first
  const localData = loadLocalData();
  let localResult = null;
  if (localData) {
    const idx = localData.items[String(id)];
    if (idx !== undefined) {
      const iconName = localData.icons[idx];
      localResult = {
        iconName,
        iconUrl: iconNameToUrl(iconName),
        source: 'local',
      };
    }
  }

  // Also query UESP live for comparison
  let uespResult = null;
  try {
    const r = await fetch(
      `${UESP_API}?table=minedItemSummary&id=${id}`,
    );
    const j = await r.json();
    const item = j.minedItemSummary?.[0];
    if (item) {
      const iconName = extractIconName(item.icon);
      uespResult = {
        name: item.name,
        icon: item.icon,
        iconName,
        iconUrl: iconName ? iconNameToUrl(iconName) : null,
        source: 'uesp-api',
      };
    }
  } catch (err) {
    uespResult = { error: err.message };
  }

  return {
    itemId: id,
    local: localResult || { found: false },
    uesp: uespResult || { found: false },
    inSync:
      localResult && uespResult
        ? localResult.iconName === uespResult.iconName
        : null,
  };
}

// ── MCP Server setup ──────────────────────────────────────────────────

const server = new Server(
  { name: 'eso-log-aggregator-uesp-data', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'fetch_item_icons',
      description:
        'Download all ESO item→icon mappings from UESP and update the local ' +
        'itemIcons.json file. Run this after ESO content patches to pick up ' +
        'new gear items. This is a single bulk API call (~2.5 MB result).',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'check_icon_coverage',
      description:
        'Check what percentage of gear items in the app have icons in the ' +
        'local data. Reports any missing items. Uses extracted WW gear data ' +
        'from tmp/extracted-item-ids.csv if available.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'lookup_item',
      description:
        'Look up a specific ESO item by its item ID. Shows the icon URL ' +
        'from both local data and the live UESP API, and whether they match.',
      inputSchema: {
        type: 'object',
        properties: {
          itemId: {
            type: 'string',
            description: 'The ESO item ID to look up (e.g., "147237")',
          },
        },
        required: ['itemId'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    switch (name) {
      case 'fetch_item_icons':
        result = await fetchItemIcons();
        break;
      case 'check_icon_coverage':
        result = await checkIconCoverage();
        break;
      case 'lookup_item':
        result = await lookupItem(args?.itemId);
        break;
      default:
        return {
          content: [
            { type: 'text', text: `Unknown tool: ${name}` },
          ],
          isError: true,
        };
    }

    return {
      content: [
        { type: 'text', text: JSON.stringify(result, null, 2) },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}\n\n${error.stack || ''}`,
        },
      ],
      isError: true,
    };
  }
});

// ── Start server ──────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
