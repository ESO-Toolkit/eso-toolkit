#!/usr/bin/env node

/**
 * ESO Logs Report Data Downloader
 *
 * This script downloads comprehensive data from ESO logs reports for testing and debugging purposes.
 * It organizes the data into a structured folder hierarchy for easy analysis and issue reproduction.
 *
 * Usage:
 *   node --loader ts-node/esm scripts/download-report-data.mts <report-code> [fight-id]
 *
 * Examples:
 *   node --loader ts-node/esm scripts/download-report-data.mts ABC123DEF
 *   node --loader ts-node/esm scripts/download-report-data.mts ABC123DEF 1
 *
 * Environment Variables:
 *   OAUTH_CLIENT_ID     - ESO Logs OAuth client ID
 *   OAUTH_CLIENT_SECRET - ESO Logs OAuth client secret
 *   ESOLOGS_TOKEN_URL   - OAuth token endpoint (optional)
 */

import fs from 'fs';
import path from 'path';
import fetch from 'cross-fetch';
import dotenv from 'dotenv';

import { createEsoLogsClient } from '../src/esologsClient';
import {
  GetReportByCodeDocument,
  GetReportMasterDataDocument,
  GetDamageEventsDocument,
  GetHealingEventsDocument,
  GetBuffEventsDocument,
  GetDebuffEventsDocument,
  GetDeathEventsDocument,
  GetCombatantInfoEventsDocument,
  GetResourceEventsDocument,
  GetCastEventsDocument,
  GetPlayersForReportDocument,
} from '../src/graphql/generated';
import { GetEncounterInfoDocument } from '../src/graphql/world-data.generated';

// Import types separately (these work with ES modules)
import type {
  GetReportByCodeQuery,
  GetReportMasterDataQuery,
  GetPlayersForReportQuery,
  GetEncounterInfoQuery,
} from '../src/graphql/generated.js';

// Suppress Apollo Client deprecation warnings for canonizeResults
const originalConsoleWarn = console.warn;
console.warn = (message: any, ...args: any[]) => {
  if (
    typeof message === 'string' &&
    message.includes('canonizeResults is deprecated and will be removed in Apollo Client 4.0')
  ) {
    // Suppress this specific deprecation warning
    return;
  }
  originalConsoleWarn(message, ...args);
};

// Load environment variables
dotenv.config();

console.log('🚀 Download script started');
console.log('📁 Current directory:', process.cwd());
console.log('🔧 Arguments:', process.argv);
console.log('🔑 CLIENT_ID available:', !!process.env.OAUTH_CLIENT_ID);
console.log('🔑 CLIENT_SECRET available:', !!process.env.OAUTH_CLIENT_SECRET);

// Configuration
const TOKEN_URL = process.env.ESOLOGS_TOKEN_URL || 'https://www.esologs.com/oauth/token';
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;

// Data storage configuration
const SAMPLE_DATA_DIR = path.resolve(__dirname, '../data-downloads');
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const EVENT_LIMIT = 100000; // Reasonable limit to avoid massive downloads

interface DownloadOptions {
  reportCode: string;
  fightId?: number;
  outputDir: string;
}

interface EventTypeConfig {
  name: string;
  document: any;
  filename: string;
  description: string;
}

// Define all event types we want to download
const EVENT_TYPES: EventTypeConfig[] = [
  {
    name: 'damage',
    document: GetDamageEventsDocument,
    filename: 'damage-events.json',
    description: 'Damage events for DPS analysis',
  },
  {
    name: 'healing',
    document: GetHealingEventsDocument,
    filename: 'healing-events.json',
    description: 'Healing events for healing analysis',
  },
  {
    name: 'buffs',
    document: GetBuffEventsDocument,
    filename: 'buff-events.json',
    description: 'Buff events for uptime and scribing skills analysis (friendly + hostile)',
  },
  {
    name: 'debuffs',
    document: GetDebuffEventsDocument,
    filename: 'debuff-events.json',
    description: 'Debuff events for penetration analysis (friendly + hostile)',
  },
  {
    name: 'deaths',
    document: GetDeathEventsDocument,
    filename: 'death-events.json',
    description: 'Death events for survival analysis',
  },
  {
    name: 'combatantInfo',
    document: GetCombatantInfoEventsDocument,
    filename: 'combatant-info-events.json',
    description: 'Combatant info events for gear and spec analysis',
  },
  {
    name: 'resources',
    document: GetResourceEventsDocument,
    filename: 'resource-events.json',
    description: 'Resource events for resource management analysis',
  },
  {
    name: 'casts',
    document: GetCastEventsDocument,
    filename: 'cast-events.json',
    description: 'Cast events for rotation analysis',
  },
];

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safely write JSON data to file with error handling
 */
function writeJsonSafe(filePath: string, data: any): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);

    console.log(`✅ Saved: ${path.relative(process.cwd(), filePath)}`);
  } catch (error) {
    console.error(`❌ Failed to write ${filePath}:`, error);
    throw error;
  }
}

/**
 * Get OAuth access token from ESO Logs
 */
async function getAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing OAUTH_CLIENT_ID or OAUTH_CLIENT_SECRET environment variables');
  }

  console.log('🔑 Getting access token...');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('✅ Access token obtained');
  return data.access_token;
}

/**
 * Retry wrapper for API calls
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`⚠️  ${operationName} failed (attempt ${attempt}/${maxRetries}):`, error);

      if (attempt === maxRetries) {
        throw new Error(`${operationName} failed after ${maxRetries} attempts: ${error}`);
      }

      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  throw new Error('Unexpected error in retry operation');
}

/**
 * Download report metadata (basic info + fights)
 */
async function downloadReportMetadata(
  client: any,
  reportCode: string,
  outputDir: string,
): Promise<GetReportByCodeQuery> {
  console.log('📊 Downloading report metadata...');

  const reportData = await retryOperation(async () => {
    const result = await client.query({
      query: GetReportByCodeDocument,
      variables: { code: reportCode },
    });
    return result as GetReportByCodeQuery;
  }, 'Download report metadata');

  // Save report data
  writeJsonSafe(path.join(outputDir, 'report-metadata.json'), reportData);

  // Create a summary file for quick reference
  const report = reportData.reportData?.report;
  if (report) {
    const summary = {
      code: report.code,
      title: report.title,
      startTime: report.startTime,
      endTime: report.endTime,
      duration: ((report.endTime - report.startTime) / 1000 / 60).toFixed(1) + ' minutes',
      zone: report.zone?.name,
      visibility: report.visibility,
      fights: report.fights?.map((fight) => ({
        id: fight?.id,
        name: fight?.name,
        difficulty: fight?.difficulty,
        startTime: fight?.startTime,
        endTime: fight?.endTime,
        duration:
          fight?.startTime && fight?.endTime
            ? ((fight.endTime - fight.startTime) / 1000).toFixed(1) + ' seconds'
            : 'Unknown',
        friendlyPlayers: fight?.friendlyPlayers,
        enemyPlayers: fight?.enemyPlayers,
        bossPercentage: fight?.bossPercentage,
      })),
    };

    writeJsonSafe(path.join(outputDir, 'report-summary.json'), summary);
  }

  return reportData;
}

/**
 * Download master data (actors and abilities)
 */
async function downloadMasterData(
  client: any,
  reportCode: string,
  outputDir: string,
): Promise<GetReportMasterDataQuery> {
  console.log('👥 Downloading master data (actors & abilities)...');

  const masterData = await retryOperation(async () => {
    const result = await client.query({
      query: GetReportMasterDataDocument,
      variables: { code: reportCode },
    });
    return result as GetReportMasterDataQuery;
  }, 'Download master data');

  // Save full master data
  writeJsonSafe(path.join(outputDir, 'master-data.json'), masterData);

  // Create organized views
  const actors = masterData.reportData?.report?.masterData?.actors || [];
  const abilities = masterData.reportData?.report?.masterData?.abilities || [];

  // Save organized actor data
  const actorsByType = {
    players: actors.filter((actor) => actor?.type === 'Player'),
    npcs: actors.filter((actor) => actor?.type === 'NPC'),
    pets: actors.filter((actor) => actor?.type === 'Pet'),
  };

  writeJsonSafe(path.join(outputDir, 'actors-by-type.json'), actorsByType);

  // Save ability data with additional organization
  const abilitiesByType = abilities.reduce((acc: any, ability) => {
    const type = ability?.type || 'Unknown';
    if (!acc[type]) acc[type] = [];
    acc[type].push(ability);
    return acc;
  }, {});

  writeJsonSafe(path.join(outputDir, 'abilities-by-type.json'), abilitiesByType);

  return masterData;
}

/**
 * Download player data (player details and ranked characters)
 */
async function downloadPlayerData(
  client: any,
  reportCode: string,
  fightIds: number[],
  outputDir: string,
): Promise<GetPlayersForReportQuery> {
  console.log('👤 Downloading player data...');

  const playerData = await retryOperation(async () => {
    const result = await client.query({
      query: GetPlayersForReportDocument,
      variables: {
        code: reportCode,
        fightIDs: fightIds.length > 0 ? fightIds : undefined,
      },
    });
    return result as GetPlayersForReportQuery;
  }, 'Download player data');

  // Save full player data
  writeJsonSafe(path.join(outputDir, 'player-data.json'), playerData);

  // Extract and organize player details
  const report = playerData.reportData?.report;
  if (report) {
    // Save player details (JSON format from API)
    if (report.playerDetails) {
      writeJsonSafe(path.join(outputDir, 'player-details.json'), report.playerDetails);
    }
  }

  return playerData;
}

/**
 * Download events for a specific type
 */
async function downloadEventType(
  client: any,
  reportCode: string,
  eventConfig: EventTypeConfig,
  fightIds: number[],
  startTime?: number,
  endTime?: number,
  outputDir: string = '',
): Promise<void> {
  console.log(`🎯 Downloading ${eventConfig.name} events...`);

  try {
    // For buffs and debuffs, fetch both friendly and hostile data
    const isBuffOrDebuff = eventConfig.name === 'buffs' || eventConfig.name === 'debuffs';
    const hostilityTypes = isBuffOrDebuff ? ['Friendlies', 'Enemies'] : ['Friendlies'];

    let allEvents: any[] = [];

    for (const hostilityType of hostilityTypes) {
      console.log(`  📥 Fetching ${hostilityType.toLowerCase()} ${eventConfig.name} events...`);

      const eventData = await retryOperation(async () => {
        const result = await client.query({
          query: eventConfig.document,
          variables: {
            code: reportCode,
            fightIds,
            startTime,
            endTime,
            hostilityType: hostilityType,
            limit: EVENT_LIMIT,
          },
        });
        return result as any; // Using any since we have multiple event types
      }, `Download ${hostilityType.toLowerCase()} ${eventConfig.name} events`);

      const events = eventData.reportData?.report?.events?.data || [];
      allEvents = allEvents.concat(events);

      // Save hostility-specific data for buffs and debuffs
      if (isBuffOrDebuff) {
        const eventsDir = path.join(outputDir, 'events');
        const hostilityFilename = eventConfig.filename.replace(
          '.json',
          `-${hostilityType.toLowerCase()}.json`,
        );
        writeJsonSafe(path.join(eventsDir, hostilityFilename), eventData);

        // Create hostility-specific metadata
        const hostilityMetadata = {
          eventType: eventConfig.name,
          hostilityType: hostilityType,
          description: `${eventConfig.description} (${hostilityType.toLowerCase()})`,
          count: Array.isArray(events) ? events.length : 0,
          nextPageTimestamp: eventData.reportData?.report?.events?.nextPageTimestamp,
          hasMoreData: !!eventData.reportData?.report?.events?.nextPageTimestamp,
          downloadParams: {
            reportCode,
            fightIds,
            startTime,
            endTime,
            hostilityType: hostilityType,
            limit: EVENT_LIMIT,
          },
        };

        writeJsonSafe(
          path.join(eventsDir, `${eventConfig.name}-${hostilityType.toLowerCase()}-metadata.json`),
          hostilityMetadata,
        );
      }
    }

    // Save combined data
    const eventsDir = path.join(outputDir, 'events');
    const combinedEventData = {
      reportData: {
        report: {
          events: {
            data: allEvents,
            nextPageTimestamp: null, // Combined data doesn't have pagination
          },
        },
      },
    };

    writeJsonSafe(path.join(eventsDir, eventConfig.filename), combinedEventData);

    // Create combined metadata
    const metadata = {
      eventType: eventConfig.name,
      description: eventConfig.description,
      hostilityTypes: hostilityTypes,
      count: allEvents.length,
      friendlyCount: isBuffOrDebuff
        ? allEvents.filter((event: any) => event.sourceIsFriendly).length
        : allEvents.length,
      hostileCount: isBuffOrDebuff
        ? allEvents.filter((event: any) => !event.sourceIsFriendly).length
        : 0,
      nextPageTimestamp: null, // Combined data doesn't have pagination
      hasMoreData: false,
      downloadParams: {
        reportCode,
        fightIds,
        startTime,
        endTime,
        hostilityTypes: hostilityTypes,
        limit: EVENT_LIMIT,
      },
    };

    writeJsonSafe(path.join(eventsDir, `${eventConfig.name}-metadata.json`), metadata);

    console.log(`✅ ${eventConfig.name} events downloaded (${allEvents.length} total events)`);
  } catch (error) {
    console.error(`❌ Failed to download ${eventConfig.name} events:`, error);
    throw error;
  }
}

/**
 * Downloads all event types for a fight and combines them into a single file
 */
async function downloadAllEvents(
  client: any,
  reportCode: string,
  fightIds: number[],
  startTime?: number,
  endTime?: number,
  outputDir: string = '',
): Promise<void> {
  console.log(`🎯 Downloading all events combined...`);

  try {
    let allCombinedEvents: any[] = [];
    const eventTypeCounts: Record<string, number> = {};

    // Download each event type and collect all events
    for (const eventConfig of EVENT_TYPES) {
      console.log(`  📥 Fetching ${eventConfig.name} events for all events file...`);

      const isBuffOrDebuff = eventConfig.name === 'buffs' || eventConfig.name === 'debuffs';
      const hostilityTypes = isBuffOrDebuff ? ['Friendlies', 'Enemies'] : ['Friendlies'];

      let eventTypeEvents: any[] = [];

      for (const hostilityType of hostilityTypes) {
        const eventData = await retryOperation(async () => {
          const result = await client.query({
            query: eventConfig.document,
            variables: {
              code: reportCode,
              fightIds,
              startTime,
              endTime,
              hostilityType: hostilityType,
              limit: EVENT_LIMIT,
            },
          });
          return result as any;
        }, `Download ${hostilityType.toLowerCase()} ${eventConfig.name} events for all events file`);

        const events = eventData.reportData?.report?.events?.data || [];

        // Add event type metadata to each event for easier filtering
        const eventsWithType = events.map((event: any) => ({
          ...event,
          _eventType: eventConfig.name,
          _hostilityType: hostilityType,
        }));

        eventTypeEvents = eventTypeEvents.concat(eventsWithType);
      }

      eventTypeCounts[eventConfig.name] = eventTypeEvents.length;
      allCombinedEvents = allCombinedEvents.concat(eventTypeEvents);
    }

    // Sort all events by timestamp for chronological order
    allCombinedEvents.sort((a, b) => {
      const timeA = a.timestamp || 0;
      const timeB = b.timestamp || 0;
      return timeA - timeB;
    });

    // Save all events to a single file
    const eventsDir = path.join(outputDir, 'events');
    const allEventsData = {
      reportData: {
        report: {
          events: {
            data: allCombinedEvents,
            nextPageTimestamp: null, // Combined data doesn't have pagination
          },
        },
      },
    };

    writeJsonSafe(path.join(eventsDir, 'all-events.json'), allEventsData);

    // Create metadata for all events file
    const allEventsMetadata = {
      eventType: 'all-events',
      description: 'All event types combined in chronological order for comprehensive analysis',
      totalCount: allCombinedEvents.length,
      eventTypeCounts,
      eventTypes: EVENT_TYPES.map((config) => config.name),
      downloadParams: {
        reportCode,
        fightIds,
        startTime,
        endTime,
        limit: EVENT_LIMIT,
      },
      sortedBy: 'timestamp',
      note: 'Events include _eventType and _hostilityType fields for filtering',
    };

    writeJsonSafe(path.join(eventsDir, 'all-events-metadata.json'), allEventsMetadata);

    console.log(
      `✅ All events downloaded (${allCombinedEvents.length} total events across ${Object.keys(eventTypeCounts).length} types)`,
    );
    console.log(`   Event breakdown:`, eventTypeCounts);
  } catch (error) {
    console.error(`❌ Failed to download all events:`, error);
    throw error;
  }
}

/**
 * Download encounter information for a specific encounter ID
 */
async function downloadEncounterInfo(
  client: any,
  encounterId: number,
  outputDir: string,
): Promise<GetEncounterInfoQuery | null> {
  if (!encounterId || encounterId === 0) {
    console.log('⚠️  Skipping encounter info download (trash fight or invalid encounter ID)');
    return null;
  }

  console.log(`🏛️  Downloading encounter info for encounter ${encounterId}...`);

  try {
    const encounterData = await retryOperation(async () => {
      const result = await client.query({
        query: GetEncounterInfoDocument,
        variables: { encounterId },
      });
      return result as GetEncounterInfoQuery;
    }, 'Download encounter info');

    // Save encounter data
    writeJsonSafe(path.join(outputDir, 'encounter-info.json'), encounterData);

    if (encounterData.worldData?.encounter) {
      const encounter = encounterData.worldData.encounter;
      console.log(`✅ Encounter info downloaded: ${encounter.name} (ID: ${encounter.id})`);
      if (encounter.zone) {
        console.log(`   Zone: ${encounter.zone.name} (ID: ${encounter.zone.id})`);
        if (encounter.zone.encounters) {
          console.log(`   Zone has ${encounter.zone.encounters.length} total encounters`);
        }
      }
    } else {
      console.warn(`⚠️  No encounter data found for ID ${encounterId}`);
    }

    return encounterData;
  } catch (error) {
    console.error(`❌ Failed to download encounter info for ${encounterId}:`, error);
    return null;
  }
}

/**
 * Main download function
 */
async function downloadReportData(options: DownloadOptions): Promise<void> {
  const { reportCode, fightId, outputDir } = options;

  console.log(`🚀 Starting download for report: ${reportCode}`);
  console.log(`📁 Output directory: ${outputDir}`);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get access token and create client
  const accessToken = await getAccessToken();
  const client = createEsoLogsClient(accessToken);

  // Download report metadata first
  const reportData = await downloadReportMetadata(client, reportCode, outputDir);
  const fights = reportData.reportData?.report?.fights || [];

  if (fights.length === 0) {
    console.warn('⚠️  No fights found in report');
    return;
  }

  // Determine which fights to download
  const targetFights = fightId ? fights.filter((fight) => fight?.id === fightId) : fights;

  if (targetFights.length === 0) {
    console.error(`❌ Fight ${fightId} not found in report`);
    return;
  }

  console.log(`🎯 Downloading data for ${targetFights.length} fight(s):`);
  targetFights.forEach((fight) => {
    console.log(`  - Fight ${fight?.id}: ${fight?.name} (${fight?.difficulty})`);
  });

  // Download master data
  await downloadMasterData(client, reportCode, outputDir);

  // Download player data
  const fightIds = targetFights
    .map((fight) => fight?.id)
    .filter((id): id is number => id !== undefined);
  await downloadPlayerData(client, reportCode, fightIds, outputDir);

  // Download events for each fight
  for (const fight of targetFights) {
    if (!fight?.id) continue;

    const fightDir = path.join(outputDir, `fight-${fight.id}`);
    console.log(`\n📂 Processing Fight ${fight.id}: ${fight.name}`);

    // Create fight-specific directory
    if (!fs.existsSync(fightDir)) {
      fs.mkdirSync(fightDir, { recursive: true });
    }

    // Save fight metadata
    writeJsonSafe(path.join(fightDir, 'fight-info.json'), {
      id: fight.id,
      name: fight.name,
      difficulty: fight.difficulty,
      startTime: fight.startTime,
      endTime: fight.endTime,
      duration:
        fight.startTime && fight.endTime
          ? ((fight.endTime - fight.startTime) / 1000).toFixed(1) + ' seconds'
          : 'Unknown',
      friendlyPlayers: fight.friendlyPlayers,
      enemyPlayers: fight.enemyPlayers,
      bossPercentage: fight.bossPercentage,
      friendlyNPCs: fight.friendlyNPCs,
      enemyNPCs: fight.enemyNPCs,
    });

    // Download encounter information if this is a boss fight
    if (fight.encounterID && fight.encounterID !== 0) {
      await downloadEncounterInfo(client, fight.encounterID, fightDir);
    }

    // Download all event types for this fight
    for (const eventConfig of EVENT_TYPES) {
      await downloadEventType(
        client,
        reportCode,
        eventConfig,
        [fight.id],
        fight.startTime,
        fight.endTime,
        fightDir,
      );
    }

    // Download all events in a single file for comprehensive analysis
    await downloadAllEvents(
      client,
      reportCode,
      [fight.id],
      fight.startTime,
      fight.endTime,
      fightDir,
    );

    console.log(`✅ Fight ${fight.id} data downloaded successfully`);
  }

  // Create an index file for easy navigation
  const indexData = {
    reportCode,
    downloadedAt: new Date().toISOString(),
    report: reportData.reportData?.report
      ? {
          title: reportData.reportData.report.title,
          zone: reportData.reportData.report.zone?.name,
          duration:
            reportData.reportData.report.endTime && reportData.reportData.report.startTime
              ? (
                  (reportData.reportData.report.endTime - reportData.reportData.report.startTime) /
                  1000 /
                  60
                ).toFixed(1) + ' minutes'
              : 'Unknown',
        }
      : null,
    fights: targetFights.map((fight) => ({
      id: fight?.id,
      name: fight?.name,
      directory: `fight-${fight?.id}`,
    })),
    eventTypes: EVENT_TYPES.map((config) => ({
      name: config.name,
      filename: config.filename,
      description: config.description,
    })),
    structure: {
      'report-metadata.json': 'Full report data including fights',
      'report-summary.json': 'Human-readable report summary',
      'master-data.json': 'Actors and abilities data',
      'actors-by-type.json': 'Actors organized by type (players, NPCs, pets)',
      'abilities-by-type.json': 'Abilities organized by type',
      'fight-{id}/': 'Directory for each fight containing:',
      'fight-{id}/fight-info.json': 'Fight metadata and summary',
      'fight-{id}/events/': 'All event types for this fight',
      'fight-{id}/events/{type}-events.json':
        'Combined event data (friendly + hostile for buffs/debuffs)',
      'fight-{id}/events/{type}-friendlies.json': 'Friendly-only event data (buffs/debuffs only)',
      'fight-{id}/events/{type}-enemies.json': 'Hostile-only event data (buffs/debuffs only)',
      'fight-{id}/events/{type}-metadata.json': 'Combined event metadata and download info',
      'fight-{id}/events/{type}-friendlies-metadata.json':
        'Friendly-specific metadata (buffs/debuffs only)',
      'fight-{id}/events/{type}-enemies-metadata.json':
        'Hostile-specific metadata (buffs/debuffs only)',
    },
  };

  writeJsonSafe(path.join(outputDir, 'index.json'), indexData);

  console.log('\n✅ Download completed successfully!');
  console.log(`📁 Data saved to: ${path.relative(process.cwd(), outputDir)}`);
  console.log('\n📝 Files created:');
  console.log('  - index.json (navigation guide)');
  console.log('  - report-metadata.json (full report data)');
  console.log('  - report-summary.json (human-readable summary)');
  console.log('  - master-data.json (actors & abilities)');
  console.log('  - actors-by-type.json (organized actor data)');
  console.log('  - abilities-by-type.json (organized ability data)');
  targetFights.forEach((fight) => {
    console.log(`  - fight-${fight?.id}/ (fight-specific data)`);
    console.log(`    - fight-info.json (fight metadata)`);
    console.log(`    - events/ (event data folder)`);
    console.log(`      - all-events.json (all event types combined chronologically)`);
    console.log(`      - all-events-metadata.json (all events metadata & breakdown)`);
    console.log(`      - Individual event type files (damage, healing, buffs, etc.)`);
    console.log(`      - Separate files for friendly/hostile buffs & debuffs`);
  });
}

/**
 * Parse command line arguments and run
 */
async function main(): Promise<void> {
  console.log('📋 Main function called');
  const args = process.argv.slice(2);
  console.log('📝 Arguments:', args);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
ESO Logs Report Data Downloader

Downloads comprehensive data from ESO logs reports for testing and debugging.
For buffs and debuffs, downloads data for both friendly and hostile targets.

Usage:
  node --loader ts-node/esm scripts/download-report-data.mts <report-code> [fight-id]

Arguments:
  report-code    ESO logs report code (e.g., ABC123DEF)
  fight-id       Optional: specific fight ID to download (downloads all fights if omitted)

Examples:
  node --loader ts-node/esm scripts/download-report-data.mts ABC123DEF
  node --loader ts-node/esm scripts/download-report-data.mts ABC123DEF 1

After downloading, you can analyze the data:
  node --loader ts-node/esm scripts/examples/analyze-scribing-skills.mts ABC123DEF

Environment Variables:
  OAUTH_CLIENT_ID     - ESO Logs OAuth client ID (required)
  OAUTH_CLIENT_SECRET - ESO Logs OAuth client secret (required)
  ESOLOGS_TOKEN_URL   - OAuth token endpoint (optional)

Output:
  Data is saved to ./sample-data/<report-code>/ with organized folder structure.
  Buff and debuff events are downloaded for both friendly and hostile targets.
  The folder is added to .gitignore to prevent accidental commits.
`);
    return;
  }

  const reportCode = args[0];
  const fightId = args[1] ? parseInt(args[1], 10) : undefined;

  if (!reportCode) {
    console.error('❌ Report code is required');
    process.exit(1);
  }

  if (fightId !== undefined && (isNaN(fightId) || fightId < 1)) {
    console.error('❌ Fight ID must be a positive number');
    process.exit(1);
  }

  const outputDir = path.join(SAMPLE_DATA_DIR, reportCode);

  try {
    await downloadReportData({
      reportCode,
      fightId,
      outputDir,
    });
  } catch (error) {
    console.error('❌ Download failed:', error);
    process.exit(1);
  }
}

// Run the script if executed directly
console.log('🔍 Checking if this is main module...');
console.log('📍 import.meta.url:', import.meta.url);
console.log('📍 process.argv[1]:', process.argv[1]);
console.log('📍 file:// + argv[1]:', `file://${process.argv[1]}`);

if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1].includes('download-report-data')
) {
  console.log('✅ Running as main module, calling main()...');
  main().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
} else {
  console.log('❌ Not running as main module');
}
