#!/usr/bin/env node

/**
 * Boss Position Analysis Script
 *
 * This script analyzes boss actor positions from downloaded ESO Logs data
 * to find consistent offsets and patterns for boss positioning.
 */

import fs from 'fs';
import path from 'path';

// Report data from the untitled file
const reportData = [
  {
    reportCode: 'nbKdDtT4NcZyVrvX',
    fightId: 117,
    bossName: 'Kazpian',
    expectedPosition: { x: 47.5, y: 66.5 },
  },
  {
    reportCode: 'baJFfYC8trPhHMQp',
    fightId: 16,
    bossName: 'Falgravn',
    expectedPosition: { x: 50.59, y: 50.29 },
  },
  {
    reportCode: 'VTqBNRdzCfp36gtL',
    fightId: 25,
    bossName: 'Taleria',
    expectedPosition: { x: 49.35, y: 41.8 },
  },
  {
    reportCode: 'qdxpGgyQ92A31LBr',
    fightId: 5,
    bossName: 'Lokkestiiz',
    expectedPosition: { x: 58.62, y: 40.79 },
  },
  {
    reportCode: 'L4RQWvJkGXnfaPK6',
    fightId: 58,
    bossName: "Z'Maja",
    expectedPosition: { x: 53.32, y: 42.04 },
  },
];

async function analyzePositions() {
  console.log('🔍 Boss Position Analysis');
  console.log('========================\n');

  const results = [];

  for (const report of reportData) {
    console.log(
      `\n📊 Analyzing ${report.bossName} (Report: ${report.reportCode}, Fight: ${report.fightId})`,
    );
    console.log(`Expected position: ${report.expectedPosition.x}, ${report.expectedPosition.y}`);

    try {
      // Read actors data to find boss ID
      const actorsPath = path.join('data-downloads', report.reportCode, 'actors-by-type.json');
      const actorsData = JSON.parse(fs.readFileSync(actorsPath, 'utf8'));

      // Find boss actor
      const bossActor = actorsData.npcs.find(
        (npc) =>
          npc.name.toLowerCase().includes(report.bossName.toLowerCase()) && npc.subType === 'Boss',
      );

      if (!bossActor) {
        console.log(`❌ Boss actor not found for ${report.bossName}`);
        results.push({
          boss: report.bossName,
          success: false,
          error: 'Boss actor not found',
        });
        continue;
      }

      console.log(`✅ Found boss actor: ${bossActor.name} (ID: ${bossActor.id})`);

      // Read damage events to find position data
      const damageEventsPath = path.join(
        'data-downloads',
        report.reportCode,
        `fight-${report.fightId}`,
        'events',
        'damage-events.json',
      );
      const damageData = JSON.parse(fs.readFileSync(damageEventsPath, 'utf8'));

      // Find events where boss is the target and extract position data
      const bossPositions = [];
      const events = damageData.reportData.report.events.data;

      for (const event of events) {
        if (event.targetID === bossActor.id && event.targetResources) {
          const pos = {
            x: event.targetResources.x / 100, // Convert to percentage
            y: event.targetResources.y / 100,
            timestamp: event.timestamp,
          };
          bossPositions.push(pos);
        }
      }

      if (bossPositions.length === 0) {
        console.log(`❌ No position data found for ${report.bossName}`);
        results.push({
          boss: report.bossName,
          success: false,
          error: 'No position data found',
        });
        continue;
      }

      // Find the earliest position (likely the starting position)
      const earliestPosition = bossPositions.sort((a, b) => a.timestamp - b.timestamp)[0];

      console.log(
        `📍 Starting position from data: ${earliestPosition.x.toFixed(2)}, ${earliestPosition.y.toFixed(2)}`,
      );
      console.log(
        `📍 Expected position:          ${report.expectedPosition.x}, ${report.expectedPosition.y}`,
      );

      // Calculate offset
      const offsetX = earliestPosition.x - report.expectedPosition.x;
      const offsetY = earliestPosition.y - report.expectedPosition.y;

      console.log(`🎯 Offset: X=${offsetX.toFixed(2)}, Y=${offsetY.toFixed(2)}`);

      // Show position range during fight
      const minX = Math.min(...bossPositions.map((p) => p.x));
      const maxX = Math.max(...bossPositions.map((p) => p.x));
      const minY = Math.min(...bossPositions.map((p) => p.y));
      const maxY = Math.max(...bossPositions.map((p) => p.y));

      console.log(`📊 Position range during fight:`);
      console.log(
        `   X: ${minX.toFixed(2)} - ${maxX.toFixed(2)} (range: ${(maxX - minX).toFixed(2)})`,
      );
      console.log(
        `   Y: ${minY.toFixed(2)} - ${maxY.toFixed(2)} (range: ${(maxY - minY).toFixed(2)})`,
      );
      console.log(`   Total positions recorded: ${bossPositions.length}`);

      results.push({
        boss: report.bossName,
        bossActorName: bossActor.name,
        success: true,
        expectedPosition: report.expectedPosition,
        actualStartPosition: { x: earliestPosition.x, y: earliestPosition.y },
        offset: { x: offsetX, y: offsetY },
        positionRange: {
          x: { min: minX, max: maxX, range: maxX - minX },
          y: { min: minY, max: maxY, range: maxY - minY },
        },
        totalPositions: bossPositions.length,
      });
    } catch (error) {
      console.error(`❌ Error analyzing ${report.bossName}:`, error.message);
      results.push({
        boss: report.bossName,
        success: false,
        error: error.message,
      });
    }
  }

  // Print summary
  console.log('\n\n📋 SUMMARY - Boss Position Pattern Analysis');
  console.log('===========================================\n');

  const successfulResults = results.filter((r) => r.success);

  if (successfulResults.length === 0) {
    console.log('❌ No successful analyses');
    return;
  }

  console.log('📊 Position Analysis Results:');
  successfulResults.forEach((result) => {
    console.log(`\n🏹 ${result.boss} (${result.bossActorName}):`);
    console.log(`   Expected: (${result.expectedPosition.x}, ${result.expectedPosition.y})`);
    console.log(
      `   Actual:   (${result.actualStartPosition.x.toFixed(2)}, ${result.actualStartPosition.y.toFixed(2)})`,
    );
    console.log(`   Offset:   (${result.offset.x.toFixed(2)}, ${result.offset.y.toFixed(2)})`);
    console.log(
      `   Movement: X±${result.positionRange.x.range.toFixed(2)}, Y±${result.positionRange.y.range.toFixed(2)}`,
    );
  });

  // Check for patterns
  console.log('\n🔍 Pattern Analysis:');

  const allOffsets = successfulResults.map((r) => r.offset);
  const avgOffsetX = allOffsets.reduce((sum, o) => sum + o.x, 0) / allOffsets.length;
  const avgOffsetY = allOffsets.reduce((sum, o) => sum + o.y, 0) / allOffsets.length;

  console.log(`\n📈 Average Offset: (${avgOffsetX.toFixed(3)}, ${avgOffsetY.toFixed(3)})`);

  const zeroOffsets = allOffsets.filter((o) => Math.abs(o.x) < 0.01 && Math.abs(o.y) < 0.01);
  console.log(`✅ Bosses with zero offset: ${zeroOffsets.length}/${allOffsets.length}`);

  if (zeroOffsets.length === allOffsets.length) {
    console.log(
      '🎯 CONCLUSION: Perfect match! Boss positions in the data exactly match the expected positions.',
    );
    console.log(
      '   This means there is NO consistent offset - the positions you recorded are the actual starting positions.',
    );
  } else {
    console.log('⚠️  CONCLUSION: There are offsets detected. This suggests either:');
    console.log('   - Different coordinate systems are being used');
    console.log('   - The expected positions were recorded at different times during the fights');
    console.log('   - There might be measurement errors in the expected positions');
  }
}

// Run the analysis
analyzePositions().catch(console.error);
