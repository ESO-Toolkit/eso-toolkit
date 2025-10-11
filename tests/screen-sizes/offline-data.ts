/**
 * Offline data utilities for screen size tests
 * 
 * These utilities allow tests to use pre-downloaded data instead of making
 * live API calls, making tests faster, more reliable, and independent of
 * external services.
 */

import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Test configuration - matches the test data
const TEST_REPORT_CODE = 'nbKdDtT4NcZyVrvX';
const TEST_FIGHT_ID = '117';
const DATA_DIR = path.join(process.cwd(), 'data-downloads');
const TEST_DATA_DIR = path.join(DATA_DIR, TEST_REPORT_CODE, `fight-${TEST_FIGHT_ID}`);

interface OfflineDataFile {
  filename: string;
  operationName: string;
  description: string;
}

// Mapping of data files to GraphQL operations
const DATA_FILE_MAPPING: OfflineDataFile[] = [
  {
    filename: 'fight-info.json',
    operationName: 'getReportByCode',
    description: 'Basic report information',
  },
  {
    filename: 'encounter-info.json', 
    operationName: 'getReportMasterData',
    description: 'Report master data with fights and actors',
  },
  {
    filename: '../player-data.json', 
    operationName: 'getPlayersForReport',
    description: 'Player information with details and stats',
  },
  {
    filename: 'events/damage-events.json',
    operationName: 'getDamageEvents', 
    description: 'Damage events for DPS analysis',
  },
  {
    filename: 'events/buff-events.json',
    operationName: 'getBuffEvents',
    description: 'Buff events for uptime analysis',
  },
  {
    filename: 'events/debuff-events.json',
    operationName: 'getDebuffEvents',
    description: 'Debuff events for penetration analysis',
  },
  {
    filename: 'events/combatant-info-events.json',
    operationName: 'getCombatantInfoEvents',
    description: 'Combatant info for gear analysis',
  },
  {
    filename: 'events/healing-events.json',
    operationName: 'getHealingEvents',
    description: 'Healing events for healing analysis',
  },
  {
    filename: 'events/death-events.json',
    operationName: 'getDeathEvents',
    description: 'Death events for survival analysis',
  },
  {
    filename: 'events/resource-events.json',
    operationName: 'getResourceEvents',
    description: 'Resource events for resource management',
  },
  {
    filename: 'events/cast-events.json',
    operationName: 'getCastEvents',
    description: 'Cast events for rotation analysis',
  },
];

/**
 * Check if offline test data is available
 */
export function isOfflineDataAvailable(): boolean {
  try {
    // Check if the test data directory exists
    if (!fs.existsSync(TEST_DATA_DIR)) {
      return false;
    }

    // Check if core data files exist in their actual structure
    const coreFiles = [
      'fight-info.json',
      'encounter-info.json', 
      '../player-data.json',
      'events/damage-events.json',
      'events/buff-events.json',
      'events/all-events.json'
    ];
    
    for (const filename of coreFiles) {
      const filePath = path.join(TEST_DATA_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return false;
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Load offline data for a specific operation
 */
export function loadOfflineData(operationName: string, variables?: any): any {
  const mapping = DATA_FILE_MAPPING.find(m => m.operationName === operationName);
  if (!mapping) {
    console.warn(`⚠️ No offline data mapping found for operation: ${operationName}`);
    return null;
  }

  try {
    const filePath = path.join(TEST_DATA_DIR, mapping.filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Offline data file not found: ${filePath}`);
      return null;
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(rawData);
    console.log(`📂 Loaded offline data for ${operationName} from ${mapping.filename}`);
    return data;
  } catch (error) {
    console.warn(`⚠️ Failed to load offline data for ${operationName}:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Set up offline data mode for screen size tests
 * This intercepts API calls and responds with pre-downloaded data
 */
export async function enableOfflineMode(page: Page): Promise<void> {
  console.log('🔌 Enabling offline mode with pre-downloaded data...');

  if (!isOfflineDataAvailable()) {
    throw new Error(
      `❌ Offline test data not available!\n\n` +
      `Please run: npm run download-test-data\n\n` +
      `This will download the required test data to: ${TEST_DATA_DIR}`
    );
  }

  await page.route('**/api/v2/**', async (route) => {
    const request = route.request();
    const url = request.url();

    // Only intercept ESO Logs API calls
    if (!url.includes('esologs.com/api/v2/')) {
      return route.continue();
    }

    try {
      // Extract GraphQL operation details
      const body = request.postData();
      if (!body) {
        return route.continue();
      }

      const graphqlRequest = JSON.parse(body);
      const operationName = graphqlRequest.operationName || 'unknown';

      // Try to load offline data
      const offlineData = loadOfflineData(operationName, graphqlRequest.variables);
      
      if (offlineData) {
        console.log(`🔌 Offline response for ${operationName}`);
        
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(offlineData),
        });
        return;
      }

      // If no offline data available, log warning but continue to API
      console.warn(`⚠️ No offline data for ${operationName}, falling back to API`);
      return route.continue();

    } catch (error) {
      console.warn(`⚠️ Error in offline mode for ${url}:`, error instanceof Error ? error.message : String(error));
      return route.continue();
    }
  });

  console.log('✅ Offline mode enabled - tests will use pre-downloaded data');
}

/**
 * Clean up offline mode (remove route handlers)
 */
export async function disableOfflineMode(page: Page): Promise<void> {
  await page.unroute('**/api/v2/**');
  console.log('🔌 Offline mode disabled');
}

/**
 * Get information about available offline data
 */
export function getOfflineDataInfo(): { available: boolean; path: string; files: string[] } {
  const available = isOfflineDataAvailable();
  const files: string[] = [];

  if (available) {
    try {
      const allFiles = fs.readdirSync(TEST_DATA_DIR);
      files.push(...allFiles.filter(f => f.endsWith('.json')));
    } catch (error) {
      // Ignore error
    }
  }

  return {
    available,
    path: TEST_DATA_DIR,
    files,
  };
}