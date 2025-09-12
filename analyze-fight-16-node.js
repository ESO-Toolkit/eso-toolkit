#!/usr/bin/env node

/**
 * Node.js script to analyze fight 16 data including bounding box and player coordinates
 * Usage: node analyze-fight-16-node.js
 */

const fs = require('fs');
const path = require('path');

// Constants for coordinate conversion (from CalculateActorPositions.ts)
const COORDINATE_CENTER_X = 5235;
const COORDINATE_CENTER_Y = 5410;
const COORDINATE_SCALE = 1000;

// Helper function to convert game coordinates to 3D coordinates
function convertCoordinates(x, y) {
  return [
    (x - COORDINATE_CENTER_X) / COORDINATE_SCALE,
    0,
    (y - COORDINATE_CENTER_Y) / COORDINATE_SCALE,
  ];
}

// Helper function to format numbers with thousand separators
function formatNumber(num) {
  return num.toLocaleString('en-US');
}

// Helper function to format duration from milliseconds
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function analyzeFight16() {
  console.log('🔍 Analyzing Fight 16 Data from Local Files');
  console.log('='.repeat(60));

  const reportFolder = path.join(__dirname, 'data-downloads', 'baJFfYC8trPhHMQp');
  const fight16Folder = path.join(reportFolder, 'fight-16');

  // Check if the fight 16 data exists
  if (!fs.existsSync(fight16Folder)) {
    console.error('❌ Fight 16 data not found in:', fight16Folder);
    console.log('Available reports:');
    const dataDownloads = path.join(__dirname, 'data-downloads');
    if (fs.existsSync(dataDownloads)) {
      const reports = fs.readdirSync(dataDownloads);
      reports.forEach((report) => {
        console.log(`  - ${report}`);
        const reportPath = path.join(dataDownloads, report);
        if (fs.existsSync(reportPath)) {
          const files = fs.readdirSync(reportPath);
          const fightFolders = files.filter((f) => f.startsWith('fight-'));
          if (fightFolders.length > 0) {
            console.log(`    Fights: ${fightFolders.join(', ')}`);
          }
        }
      });
    }
    return;
  }

  try {
    // Load fight metadata with bounding box
    console.log('📊 Loading fight metadata...');
    const reportMetadataPath = path.join(reportFolder, 'report-metadata.json');
    const reportMetadata = JSON.parse(fs.readFileSync(reportMetadataPath, 'utf8'));

    // Find fight 16 in the metadata
    const fight16 = reportMetadata.reportData.report.fights.find((fight) => fight.id === 16);

    if (!fight16) {
      console.error('❌ Fight 16 not found in report metadata');
      return;
    }

    console.log('\n🎯 FIGHT 16 INFORMATION');
    console.log('-'.repeat(40));
    console.log(`Name: ${fight16.name}`);
    console.log(`Difficulty: ${fight16.difficulty}`);
    console.log(`Duration: ${formatDuration(fight16.endTime - fight16.startTime)}`);
    console.log(`Boss Percentage: ${fight16.bossPercentage}%`);
    console.log(`Start Time: ${fight16.startTime} (${new Date(fight16.startTime).toISOString()})`);
    console.log(`End Time: ${fight16.endTime} (${new Date(fight16.endTime).toISOString()})`);

    // Display bounding box information
    if (fight16.boundingBox) {
      console.log('\n🗺️  FIGHT BOUNDING BOX');
      console.log('-'.repeat(40));
      const bbox = fight16.boundingBox;
      console.log(`Min X: ${formatNumber(bbox.minX)}`);
      console.log(`Max X: ${formatNumber(bbox.maxX)}`);
      console.log(`Min Y: ${formatNumber(bbox.minY)}`);
      console.log(`Max Y: ${formatNumber(bbox.maxY)}`);
      console.log(`Width: ${formatNumber(bbox.maxX - bbox.minX)} units`);
      console.log(`Height: ${formatNumber(bbox.maxY - bbox.minY)} units`);

      // Calculate center
      const centerX = (bbox.minX + bbox.maxX) / 2;
      const centerY = (bbox.minY + bbox.maxY) / 2;
      console.log(`Center: (${formatNumber(centerX)}, ${formatNumber(centerY)})`);

      // Convert to 3D coordinates for reference
      const [minX3D, , minY3D] = convertCoordinates(bbox.minX, bbox.minY);
      const [maxX3D, , maxY3D] = convertCoordinates(bbox.maxX, bbox.maxY);
      console.log('\n🎮 3D Coordinate System (for Combat Arena):');
      console.log(`3D Min: (${minX3D.toFixed(2)}, 0, ${minY3D.toFixed(2)})`);
      console.log(`3D Max: (${maxX3D.toFixed(2)}, 0, ${maxY3D.toFixed(2)})`);
      console.log(`3D Width: ${(maxX3D - minX3D).toFixed(2)} units`);
      console.log(`3D Height: ${(maxY3D - minY3D).toFixed(2)} units`);
    } else {
      console.log('\n❌ No bounding box data available for fight 16');
    }

    // Load player data to get player names and roles
    console.log('\n👥 Loading player data...');
    const playerDataPath = path.join(reportFolder, 'player-data.json');
    let playerData = null;
    if (fs.existsSync(playerDataPath)) {
      playerData = JSON.parse(fs.readFileSync(playerDataPath, 'utf8'));
    }

    // Analyze player coordinate data from events
    console.log('\n📍 ANALYZING PLAYER COORDINATES');
    console.log('-'.repeat(40));

    const eventsFolder = path.join(fight16Folder, 'events');

    // Event types that might contain position data
    const eventTypes = [
      { file: 'damage-events.json', name: 'Damage' },
      { file: 'healing-events.json', name: 'Healing' },
      { file: 'resource-events.json', name: 'Resource' },
    ];

    let allPlayerCoordinates = [];
    let coordinateStats = {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
      totalPoints: 0,
    };

    eventTypes.forEach(({ file, name }) => {
      const eventFilePath = path.join(eventsFolder, file);

      if (!fs.existsSync(eventFilePath)) {
        console.log(`⚠️  ${name} events file not found: ${file}`);
        return;
      }

      console.log(`\n🔄 Processing ${name} events...`);
      const eventData = JSON.parse(fs.readFileSync(eventFilePath, 'utf8'));

      // Extract events array from the nested structure
      const events = eventData.reportData?.report?.events?.data || [];

      if (!Array.isArray(events)) {
        console.log(`  ⚠️  Invalid events structure in ${file}`);
        return;
      }

      let eventCoordinates = [];
      let eventStats = {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
        count: 0,
      };

      events.forEach((event) => {
        // Check if event is within fight 16 timeframe
        if (event.timestamp >= fight16.startTime && event.timestamp <= fight16.endTime) {
          // Check for position data in source resources
          if (
            event.sourceResources &&
            typeof event.sourceResources.x === 'number' &&
            typeof event.sourceResources.y === 'number'
          ) {
            const x = event.sourceResources.x;
            const y = event.sourceResources.y;

            eventStats.minX = Math.min(eventStats.minX, x);
            eventStats.maxX = Math.max(eventStats.maxX, x);
            eventStats.minY = Math.min(eventStats.minY, y);
            eventStats.maxY = Math.max(eventStats.maxY, y);
            eventStats.count++;

            eventCoordinates.push({
              x,
              y,
              timestamp: event.timestamp,
              actorId: event.sourceID,
              sourceType: 'source',
              eventType: name.toLowerCase(),
            });
          }

          // Check for position data in target resources
          if (
            event.targetResources &&
            typeof event.targetResources.x === 'number' &&
            typeof event.targetResources.y === 'number'
          ) {
            const x = event.targetResources.x;
            const y = event.targetResources.y;

            eventStats.minX = Math.min(eventStats.minX, x);
            eventStats.maxX = Math.max(eventStats.maxX, x);
            eventStats.minY = Math.min(eventStats.minY, y);
            eventStats.maxY = Math.max(eventStats.maxY, y);
            eventStats.count++;

            eventCoordinates.push({
              x,
              y,
              timestamp: event.timestamp,
              actorId: event.targetID,
              sourceType: 'target',
              eventType: name.toLowerCase(),
            });
          }
        }
      });

      if (eventStats.count > 0) {
        console.log(`  ✅ Found ${formatNumber(eventStats.count)} coordinate points`);
        console.log(
          `  📊 X range: ${formatNumber(eventStats.minX)} to ${formatNumber(eventStats.maxX)} (width: ${formatNumber(eventStats.maxX - eventStats.minX)})`,
        );
        console.log(
          `  📊 Y range: ${formatNumber(eventStats.minY)} to ${formatNumber(eventStats.maxY)} (height: ${formatNumber(eventStats.maxY - eventStats.minY)})`,
        );

        // Update overall stats
        coordinateStats.minX = Math.min(coordinateStats.minX, eventStats.minX);
        coordinateStats.maxX = Math.max(coordinateStats.maxX, eventStats.maxX);
        coordinateStats.minY = Math.min(coordinateStats.minY, eventStats.minY);
        coordinateStats.maxY = Math.max(coordinateStats.maxY, eventStats.maxY);
        coordinateStats.totalPoints += eventStats.count;

        allPlayerCoordinates.push(...eventCoordinates);
      } else {
        console.log(`  ❌ No coordinate data found in ${name} events`);
      }
    });

    // Display combined coordinate analysis
    if (coordinateStats.totalPoints > 0) {
      console.log('\n🎯 COMBINED PLAYER COORDINATE ANALYSIS');
      console.log('='.repeat(50));
      console.log(`Total coordinate points: ${formatNumber(coordinateStats.totalPoints)}`);
      console.log(
        `Player movement X range: ${formatNumber(coordinateStats.minX)} to ${formatNumber(coordinateStats.maxX)}`,
      );
      console.log(
        `Player movement Y range: ${formatNumber(coordinateStats.minY)} to ${formatNumber(coordinateStats.maxY)}`,
      );
      console.log(
        `Player movement area width: ${formatNumber(coordinateStats.maxX - coordinateStats.minX)} units`,
      );
      console.log(
        `Player movement area height: ${formatNumber(coordinateStats.maxY - coordinateStats.minY)} units`,
      );

      // Convert to 3D coordinates
      const [playerMinX3D, , playerMinY3D] = convertCoordinates(
        coordinateStats.minX,
        coordinateStats.minY,
      );
      const [playerMaxX3D, , playerMaxY3D] = convertCoordinates(
        coordinateStats.maxX,
        coordinateStats.maxY,
      );
      console.log('\n🎮 Player Movement in 3D Coordinates:');
      console.log(`3D Min: (${playerMinX3D.toFixed(2)}, 0, ${playerMinY3D.toFixed(2)})`);
      console.log(`3D Max: (${playerMaxX3D.toFixed(2)}, 0, ${playerMaxY3D.toFixed(2)})`);
      console.log(`3D Width: ${(playerMaxX3D - playerMinX3D).toFixed(2)} units`);
      console.log(`3D Height: ${(playerMaxY3D - playerMinY3D).toFixed(2)} units`);

      // Compare with bounding box
      if (fight16.boundingBox) {
        console.log('\n🔄 COMPARISON: Player Movement vs Fight Bounding Box');
        console.log('='.repeat(55));
        const bbox = fight16.boundingBox;

        console.log('Bounding Box vs Player Coordinates:');
        console.log(
          `Fight BB:  X(${formatNumber(bbox.minX)} to ${formatNumber(bbox.maxX)}), Y(${formatNumber(bbox.minY)} to ${formatNumber(bbox.maxY)})`,
        );
        console.log(
          `Player:    X(${formatNumber(coordinateStats.minX)} to ${formatNumber(coordinateStats.maxX)}), Y(${formatNumber(coordinateStats.minY)} to ${formatNumber(coordinateStats.maxY)})`,
        );

        const xWithinBounds =
          coordinateStats.minX >= bbox.minX && coordinateStats.maxX <= bbox.maxX;
        const yWithinBounds =
          coordinateStats.minY >= bbox.minY && coordinateStats.maxY <= bbox.maxY;

        console.log(`\nBounds Check:`);
        console.log(`  X coordinates within bounding box: ${xWithinBounds ? '✅ YES' : '❌ NO'}`);
        console.log(`  Y coordinates within bounding box: ${yWithinBounds ? '✅ YES' : '❌ NO'}`);

        if (!xWithinBounds || !yWithinBounds) {
          console.log('\n⚠️  WARNING: Player coordinates extend beyond the fight bounding box!');

          if (!xWithinBounds) {
            if (coordinateStats.minX < bbox.minX) {
              console.log(
                `  📍 Players moved ${formatNumber(bbox.minX - coordinateStats.minX)} units west of bounding box`,
              );
            }
            if (coordinateStats.maxX > bbox.maxX) {
              console.log(
                `  📍 Players moved ${formatNumber(coordinateStats.maxX - bbox.maxX)} units east of bounding box`,
              );
            }
          }

          if (!yWithinBounds) {
            if (coordinateStats.minY < bbox.minY) {
              console.log(
                `  📍 Players moved ${formatNumber(bbox.minY - coordinateStats.minY)} units south of bounding box`,
              );
            }
            if (coordinateStats.maxY > bbox.maxY) {
              console.log(
                `  📍 Players moved ${formatNumber(coordinateStats.maxY - bbox.maxY)} units north of bounding box`,
              );
            }
          }
        } else {
          console.log('\n✅ SUCCESS: All player coordinates are within the fight bounding box');
        }

        // Calculate coverage percentage
        const bboxArea = (bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY);
        const playerArea =
          (coordinateStats.maxX - coordinateStats.minX) *
          (coordinateStats.maxY - coordinateStats.minY);
        const coveragePercent = (playerArea / bboxArea) * 100;

        console.log(`\n📊 Area Coverage:`);
        console.log(`  Bounding box area: ${formatNumber(Math.round(bboxArea))} square units`);
        console.log(`  Player movement area: ${formatNumber(Math.round(playerArea))} square units`);
        console.log(`  Coverage: ${coveragePercent.toFixed(1)}% of bounding box area used`);
      }

      // Show sample coordinates grouped by actor
      console.log('\n📋 SAMPLE COORDINATE DATA');
      console.log('-'.repeat(30));

      // Group coordinates by actor
      const coordinatesByActor = {};
      allPlayerCoordinates.forEach((coord) => {
        if (!coordinatesByActor[coord.actorId]) {
          coordinatesByActor[coord.actorId] = [];
        }
        coordinatesByActor[coord.actorId].push(coord);
      });

      const actorIds = Object.keys(coordinatesByActor).slice(0, 5); // Show first 5 actors

      actorIds.forEach((actorId) => {
        const coords = coordinatesByActor[actorId];
        const playerName = playerData?.playersById?.[actorId]?.name || `Actor ${actorId}`;
        const playerRole = playerData?.playersById?.[actorId]?.role || 'unknown';

        console.log(`\n👤 ${playerName} (${playerRole}) - ${coords.length} positions:`);
        coords.slice(0, 3).forEach((coord, i) => {
          const relativeTime = Math.round((coord.timestamp - fight16.startTime) / 1000);
          console.log(
            `  ${i + 1}. (${formatNumber(coord.x)}, ${formatNumber(coord.y)}) at +${relativeTime}s [${coord.eventType}/${coord.sourceType}]`,
          );
        });

        if (coords.length > 3) {
          console.log(`  ... and ${coords.length - 3} more positions`);
        }
      });
    } else {
      console.log('\n❌ No player coordinate data found in any events');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Fight 16 analysis complete!');
  } catch (error) {
    console.error('❌ Error analyzing fight 16:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the analysis
if (require.main === module) {
  analyzeFight16();
}

module.exports = { analyzeFight16 };
