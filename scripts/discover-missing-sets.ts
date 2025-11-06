#!/usr/bin/env tsx
/**
 * Script to discover missing set IDs from ESO Logs leaderboard data
 * 
 * This script:
 * 1. Fetches all trial zones from ESO Logs
 * 2. For each encounter in each trial, fetches fight rankings
 * 3. Extracts report codes from the rankings
 * 4. Downloads combatant info (gear data) from those reports
 * 5. Extracts all unique set IDs from gear items
 * 6. Compares against known set IDs in our codebase
 * 7. Reports missing sets with sample item names
 * 
 * Usage: 
 *   npm run discover-missing-sets              # Current patch (default)
 *   npm run discover-missing-sets -- --all     # All time (historical data)
 *   npm run discover-missing-sets -- --days 90 # Last 90 days
 */

import { gql } from '@apollo/client/core';
import * as fs from 'fs';
import * as path from 'path';

import { runScript } from './_runner/bootstrap';
import type { ScriptLogger } from './_runner/bootstrap';
import {
  GetTrialZonesDocument,
  type GetTrialZonesQuery,
  GetEncounterFightRankingsDocument,
  type GetEncounterFightRankingsQuery,
  GetCombatantInfoEventsDocument,
  type GetCombatantInfoEventsQuery,
  GetReportByCodeDocument,
  type GetReportByCodeQuery,
} from '../src/graphql/gql/graphql';

// Known set IDs from our codebase (extracted from abilities.ts)
const KNOWN_SET_IDS = new Set<number>([
  // Arena weapons
  369, 373, 522, 526, 533,
  // Trial sets
  496, 497, 499, 501, 502, 504, 505, 507, 508, 509, 510, 511, 512, 513, 514, 515,
  516, 517, 518, 519, 520, 521, 523, 524, 525, 527, 528, 529, 530, 531, 532, 534,
  // Monster sets
  169, 270, 279, 436, 578, 633, 687,
  // Perfected sets
  768, 770, 772,
  // Other tracked sets
  127, 180, 185, 232, 281, 346, 455, 475, 589, 642, 646, 649, 650, 653, 691, 694, 707, 809,
]);

interface SetInfo {
  setId: number;
  itemNames: Set<string>;
  reportCodes: Set<string>;
  encounterNames: Set<string>;
  count: number;
}

// Run the script with authentication
runScript(async ({ getGraphqlHarness, logger }) => {
  logger.info('🔍 ESO Logs Set Discovery Tool');
  logger.info('================================\n');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const useAllTime = args.includes('--all');
  const daysArg = args.find(arg => arg.startsWith('--days'));
  const daysBack = daysArg ? parseInt(daysArg.split('=')[1], 10) : null;

  // Calculate date range
  let startTime: number | undefined;
  let endTime: number | undefined;
  
  if (useAllTime) {
    // All time: no date restrictions
    logger.info('🕒 Time Range: ALL TIME (historical data)\n');
    startTime = undefined;
    endTime = undefined;
  } else if (daysBack && !isNaN(daysBack)) {
    // Specific days back
    endTime = Date.now();
    startTime = endTime - (daysBack * 24 * 60 * 60 * 1000);
    logger.info(`🕒 Time Range: Last ${daysBack} days`);
    logger.info(`   From: ${new Date(startTime).toISOString()}`);
    logger.info(`   To:   ${new Date(endTime).toISOString()}\n`);
  } else {
    // Default: current patch (last 30 days is a reasonable default)
    endTime = Date.now();
    startTime = endTime - (30 * 24 * 60 * 60 * 1000);
    logger.info('🕒 Time Range: Current Patch (last 30 days)');
    logger.info(`   From: ${new Date(startTime).toISOString()}`);
    logger.info(`   To:   ${new Date(endTime).toISOString()}\n`);
  }

  // Get authenticated GraphQL client
  const harness = await getGraphqlHarness({ defaultFetchPolicy: 'no-cache' });
  const client = harness.getClient();
  
  logger.info('✅ Connected to ESO Logs API\n');

  // First, fetch all trial zones from the API
  logger.info('📋 Fetching trial zones from ESO Logs API...');
  try {
    const zonesResponse = await client.query<GetTrialZonesQuery>({
      query: GetTrialZonesDocument,
      fetchPolicy: 'no-cache',
    });

    // The response from Apollo client.query() has the data at the top level when using generated types
    const zones = (zonesResponse as any).worldData?.zones || [];
    
    if (zones.length === 0) {
      logger.error('❌ No zones found in API response');
      return;
    }

    logger.info(`Found ${zones.length} zones\n`);

    // Track all discovered sets
    const discoveredSets = new Map<number, SetInfo>();
    const processedReports = new Set<string>();

    // Filter to only 12-player trial zones (size 12)
    const trialZones = zones.filter((zone: any) =>
      zone.difficulties?.some((diff: any) => diff.sizes?.includes(12))
    );

    logger.info(`Found ${trialZones.length} trial zones with 12-player content\n`);

    // Process each trial zone
    for (const zone of trialZones) {
      logger.info(`\n📊 Processing ${zone.name} (Zone ${zone.id})...`);

      if (!zone.encounters || zone.encounters.length === 0) {
        logger.warn(`  ⚠️  No encounters found for ${zone.name}`);
        continue;
      }

      // Process each encounter in the zone
      for (const encounter of zone.encounters) {
        logger.info(`  🎯 ${encounter.name} (Encounter ${encounter.id})`);

        try {
          // Get fight rankings for this encounter (veteran difficulty)
          const rankingsVariables: any = {
            encounterId: encounter.id,
            difficulty: 121, // Veteran
            page: 1,
            size: 12,
          };
          
          // Add time range if specified
          if (startTime !== undefined) {
            rankingsVariables.timespan = 'Historical';
            rankingsVariables.startTime = startTime;
            rankingsVariables.endTime = endTime;
          }
          
          const rankingsResponse = await client.query<GetEncounterFightRankingsQuery>({
            query: GetEncounterFightRankingsDocument,
            variables: rankingsVariables,
            fetchPolicy: 'no-cache',
          });

          // Parse the fight rankings to extract report codes
          const fightRankings = (rankingsResponse as any).worldData?.encounter?.fightRankings;
          
          if (!fightRankings) {
            logger.warn(`    ⚠️  No rankings found`);
            continue;
          }

          const rankingsData = Array.isArray(fightRankings.rankings)
            ? fightRankings.rankings
            : Array.isArray(fightRankings.data)
              ? fightRankings.data
              : [];

          if (rankingsData.length === 0) {
            logger.warn(`    ⚠️  No ranking data available`);
            continue;
          }

          logger.info(`    Found ${rankingsData.length} rankings`);

          // Extract unique report codes from rankings
          const reportCodes = new Set<string>();
          for (const ranking of rankingsData) {
            const reportCode = ranking?.report?.code;
            if (reportCode && !processedReports.has(reportCode)) {
              reportCodes.add(reportCode);
            }
          }

          if (reportCodes.size === 0) {
            logger.warn(`    ⚠️  No report codes found in rankings`);
            continue;
          }

          logger.info(`    Processing ${reportCodes.size} unique reports`);

          // Download gear data from each report (limit to 10 per encounter to avoid rate limiting)
          let reportCount = 0;
          for (const reportCode of reportCodes) {
            if (reportCount >= 10) break;
            if (processedReports.has(reportCode)) continue;
            
            logger.info(`      📥 ${reportCode}`);
            processedReports.add(reportCode);
            reportCount++;

            try {
              // First, get the fight IDs for this report
              const fightsResponse = await client.query<GetReportByCodeQuery>({
                query: GetReportByCodeDocument,
                variables: { code: reportCode },
                fetchPolicy: 'no-cache',
              });

              const reportData = fightsResponse.reportData?.report;
              const fights = reportData?.fights || [];
              const fightIds = fights.map((f: any) => f.id);

              if (fightIds.length === 0) {
                logger.warn(`        ⚠️  No fights found in report`);
                continue;
              }

              // Now get combatant info with fight IDs
              const combatantResponse = await client.query<GetCombatantInfoEventsQuery>({
                query: GetCombatantInfoEventsDocument,
                variables: {
                  code: reportCode,
                  fightIds: fightIds,
                },
                fetchPolicy: 'no-cache',
              });

              const eventsData = (combatantResponse as any).reportData?.report?.events?.data;

              if (!eventsData) {
                logger.warn(`        ⚠️  No combatant info found`);
                continue;
              }

              // Parse events
              let events: any[] = [];
              if (typeof eventsData === 'string') {
                events = JSON.parse(eventsData);
              } else if (Array.isArray(eventsData)) {
                events = eventsData;
              }

              // Extract set IDs
              let itemCount = 0;
              events.forEach((event: any) => {
                if (event.gear) {
                  event.gear.forEach((item: any) => {
                    if (item.setID) {
                      itemCount++;
                      
                      if (!discoveredSets.has(item.setID)) {
                        discoveredSets.set(item.setID, {
                          setId: item.setID,
                          itemNames: new Set(),
                          reportCodes: new Set(),
                          encounterNames: new Set(),
                          count: 0,
                        });
                      }

                      const setInfo = discoveredSets.get(item.setID)!;
                      setInfo.itemNames.add(item.name || 'Unknown');
                      setInfo.reportCodes.add(reportCode);
                      setInfo.encounterNames.add(encounter.name);
                      setInfo.count++;
                    }
                  });
                }
              });

              logger.info(`        ✅ ${events.length} combatants, ${itemCount} gear items`);

              // Small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
              logger.error(`        ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

        } catch (error) {
          logger.error(`    ❌ Error processing encounter: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Small delay between encounters
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Analyze results
    logger.info('\n\n📊 DISCOVERY RESULTS');
    logger.info('====================\n');

    logger.info(`Total unique set IDs discovered: ${discoveredSets.size}`);
    logger.info(`Known set IDs in codebase: ${KNOWN_SET_IDS.size}\n`);

    // Find missing sets
    const missingSets: SetInfo[] = [];
    const knownSets: SetInfo[] = [];

    discoveredSets.forEach((setInfo) => {
      if (KNOWN_SET_IDS.has(setInfo.setId)) {
        knownSets.push(setInfo);
      } else {
        missingSets.push(setInfo);
      }
    });

    if (missingSets.length === 0) {
      logger.info('✅ All discovered sets are already in the codebase!');
    } else {
      logger.info(`🆕 Found ${missingSets.length} MISSING set IDs:\n`);

      // Sort by frequency
      missingSets.sort((a, b) => b.count - a.count);

      missingSets.forEach((setInfo) => {
        logger.info(`Set ID ${setInfo.setId}:`);
        logger.info(`  Occurrences: ${setInfo.count}`);
        logger.info(`  Encounters: ${Array.from(setInfo.encounterNames).slice(0, 3).join(', ')}`);
        logger.info(`  Reports: ${Array.from(setInfo.reportCodes).slice(0, 3).join(', ')}`);
        logger.info(`  Sample items:`);
        Array.from(setInfo.itemNames).slice(0, 3).forEach((name) => {
          logger.info(`    - ${name}`);
        });
        logger.info('');
      });

      // Save to file
      const outputDir = 'data';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, 'missing-sets.json');
      const output = {
        timestamp: new Date().toISOString(),
        totalDiscovered: discoveredSets.size,
        totalKnown: KNOWN_SET_IDS.size,
        totalMissing: missingSets.length,
        missingSets: missingSets.map((s) => ({
          setId: s.setId,
          count: s.count,
          itemNames: Array.from(s.itemNames),
          reportCodes: Array.from(s.reportCodes),
          encounterNames: Array.from(s.encounterNames),
        })),
      };

      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      logger.info(`\n💾 Saved detailed results to: ${outputPath}`);
    }

    // Show most common sets
    logger.info('\n\n📈 Most Common Sets (Top 20):');
    logger.info('==============================\n');

    const allSets = Array.from(discoveredSets.values()).sort((a, b) => b.count - a.count);

    allSets.slice(0, 20).forEach((setInfo, index) => {
      const status = KNOWN_SET_IDS.has(setInfo.setId) ? '✅' : '🆕';
      const sampleName = Array.from(setInfo.itemNames)[0];
      logger.info(`${index + 1}. ${status} Set ${setInfo.setId}: ${setInfo.count} items - "${sampleName}"`);
    });

    logger.info('\n✨ Discovery complete!\n');
  } catch (error) {
    logger.error(`❌ Failed to fetch trial zones: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});
