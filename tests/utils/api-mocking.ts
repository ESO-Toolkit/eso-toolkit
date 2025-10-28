import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Cache for loaded event data to avoid repeated file reads
const eventDataCache = new Map<string, any>();

function loadReportData(reportCode: string, fileName: string = 'report-metadata.json') {
  try {
    const dataPath = path.join(process.cwd(), 'data-downloads', reportCode, fileName);
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log(`Could not load real report data: ${error}`);
  }
  return null;
}

function loadPlayerData(reportCode: string) {
  try {
    const dataPath = path.join(process.cwd(), 'data-downloads', reportCode, 'player-details.json');
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log(`Could not load real player data: ${error}`);
  }
  return null;
}

/**
 * Load event data for a specific fight with caching
 */
function loadEventData(reportCode: string, fightId: string, eventType: string) {
  const cacheKey = `${reportCode}-${fightId}-${eventType}`;
  
  // Return cached data if available
  if (eventDataCache.has(cacheKey)) {
    return eventDataCache.get(cacheKey);
  }
  
  try {
    const dataPath = path.join(process.cwd(), 'data-downloads', reportCode, `fight-${fightId}`, 'events', `${eventType}.json`);
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      const parsed = JSON.parse(data);
      // Cache the parsed data
      eventDataCache.set(cacheKey, parsed);
      return parsed;
    }
  } catch (error) {
    console.log(`Could not load ${eventType} events for fight ${fightId}: ${error}`);
  }
  return null;
}

/**
 * Load fight info metadata
 */
function loadFightInfo(reportCode: string, fightId: string) {
  try {
    const dataPath = path.join(process.cwd(), 'data-downloads', reportCode, `fight-${fightId}`, 'fight-info.json');
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log(`Could not load fight info for fight ${fightId}: ${error}`);
  }
  return null;
}

function normalizeGraphQLPayload(data: any): any {
  // If the data already has 'data' key, return as-is
  if (data && typeof data === 'object' && 'data' in data) {
    return data;
  }
  // Otherwise wrap it in { data: ... }
  return { data };
}

export async function setupApiMocking(page: Page) {
  // Mock ESO Logs API - both /client and /user endpoints
  await page.route('**esologs.com/**', async (route) => {
    await handleEsoLogsRequest(route);
  });
}

async function handleEsoLogsRequest(route: any) {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method();
  
  let operationName = url.searchParams.get('operationName') ?? '';
  let variables: Record<string, unknown> = {};
  
  if (method === 'POST') {
    try {
      const requestBody = await request.postDataJSON();
      operationName = requestBody?.operationName ?? '';
      variables = requestBody?.variables ?? {};
    } catch (error) {
      // Silent fail
    }
  } else {
    const variablesParam = url.searchParams.get('variables');
    if (variablesParam) {
      try {
        variables = JSON.parse(decodeURIComponent(variablesParam));
      } catch (e) {}
    }
  }
  
  if (operationName.includes('getCurrentUser')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { userData: { currentUser: { id: 12345, name: 'TestUser', naDisplayName: '@TestUser', euDisplayName: '@TestUser' } } }
      }),
    });
    return;
  }
  
  if (operationName.includes('getReportByCode')) {
    const reportCode = (variables as any)?.code || '7zj1ma8kD9xn4cTq';
    const realData = loadReportData(reportCode);
    if (realData) {
      // The file has { reportData: ... }, wrap it in { data: { reportData: ... } }
      const payload = realData.data ? realData : { data: realData };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
      return;
    }
  }
  
  if (operationName.includes('getPlayersForReport')) {
    const reportCode = (variables as any)?.code || '7zj1ma8kD9xn4cTq';
    const realData = loadPlayerData(reportCode);
    if (realData) {
      // Wrap if needed
      const payload = realData.data ? realData : { data: realData };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
      return;
    }
  }
  
  // Handle getReportMasterData - returns report metadata
  if (operationName.includes('getReportMasterData')) {
    const reportCode = (variables as any)?.reportCode || (variables as any)?.code || '3gjVGWB2dxCL8XAw';
    const realData = loadReportData(reportCode);
    if (realData) {
      const payload = realData.data ? realData : { data: realData };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
      return;
    }
  }
  
  // Handle all event type queries
  const eventTypeMap: Record<string, string> = {
    'getBuffEvents': 'buff-events-friendlies',
    'getDebuffEvents': 'debuff-events-friendlies',
    'getCastEvents': 'cast-events',
    'getDamageEvents': 'damage-events',
    'getHealingEvents': 'healing-events',
    'getResourceEvents': 'resource-events',
    'getDeathEvents': 'death-events',
    'getCombatantInfoEvents': 'combatant-info-events'
  };
  
  for (const [queryName, eventType] of Object.entries(eventTypeMap)) {
    if (operationName.includes(queryName)) {
      const reportCode = (variables as any)?.reportCode || (variables as any)?.code || '3gjVGWB2dxCL8XAw';
      const fightIDs = (variables as any)?.fightIDs || [32];
      const fightId = fightIDs[0]?.toString() || '32';
      
      // Check if this is a filtered request (has sourceID, targetID, or abilityID)
      const hasFilters = (variables as any)?.sourceID || (variables as any)?.targetID || (variables as any)?.abilityID;
      
      // Only load real data for unfiltered requests to avoid memory issues
      // Filtered requests return empty data since we don't implement server-side filtering
      if (hasFilters) {
        // Return empty data for filtered requests
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              reportData: {
                report: {
                  events: {
                    data: [],
                    nextPageTimestamp: null
                  }
                }
              }
            }
          }),
        });
        return;
      }
      
      // For unfiltered requests, return real data
      const realData = loadEventData(reportCode, fightId, eventType);
      
      if (realData) {
        const payload = realData.data ? realData : { data: realData };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(payload),
        });
        return;
      }
    }
  }
  
  // Fallback for unhandled operations
  
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: {} }),
  });
}
