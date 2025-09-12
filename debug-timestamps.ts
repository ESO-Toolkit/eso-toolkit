/**
 * Debug timestamp comparison in death detection
 */

import fs from 'fs';
import path from 'path';

async function debugTimestamps() {
  console.log('🐛 Debugging timestamp comparison in death detection...\n');

  // Load first death event
  const dataDir = 'data-downloads/baJFfYC8trPhHMQp/fight-84';
  const deathEventsPath = path.join(dataDir, 'events/death-events.json');
  const deathData = JSON.parse(fs.readFileSync(deathEventsPath, 'utf8'));
  const deathEvents = deathData.reportData?.report?.events?.data || deathData;

  // Load fight info
  const fightInfoPath = path.join(dataDir, 'fight-info.json');
  const fightData = JSON.parse(fs.readFileSync(fightInfoPath, 'utf8'));
  const fightInfo = fightData.reportData?.report?.fights?.data?.[0] || fightData;

  const firstDeath = deathEvents[0];
  const fightStartTime = fightInfo.startTime;
  const fightEndTime = fightInfo.endTime;

  console.log('📊 Timestamp analysis:');
  console.log(`Fight start time: ${fightStartTime}`);
  console.log(`Fight end time: ${fightEndTime}`);
  console.log(`Fight duration: ${fightEndTime - fightStartTime}ms`);
  console.log('');

  console.log(`💀 First death event (Actor ${firstDeath.targetID}):`);
  console.log(`Death timestamp (absolute): ${firstDeath.timestamp}`);
  console.log(`Death timestamp (relative): ${firstDeath.timestamp - fightStartTime}ms`);
  console.log('');

  // Simulate the comparison logic
  const relativeDeathTime = firstDeath.timestamp - fightStartTime; // 22640ms
  const sampleTimestamps = [20000, 22000, 22640, 23000, 25000];

  console.log('🔍 Simulated comparison logic:');
  console.log('actorDeathTime.set(targetID, deathEvent.timestamp) stores:', firstDeath.timestamp);
  console.log('');

  for (const relativeTime of sampleTimestamps) {
    const currentTimestamp = fightStartTime + relativeTime; // This is absolute
    const deathTime = firstDeath.timestamp; // This is also absolute
    const isDead = currentTimestamp >= deathTime;

    console.log(`At relative time ${relativeTime}ms:`);
    console.log(`  currentTimestamp = ${fightStartTime} + ${relativeTime} = ${currentTimestamp}`);
    console.log(`  deathTime = ${deathTime}`);
    console.log(`  isDead = ${currentTimestamp} >= ${deathTime} = ${isDead}`);
    console.log('');
  }

  // The issue might be in how we're calculating...
  console.log('🔍 Checking if death timestamp is in the right format:');
  console.log(`Death event timestamp: ${firstDeath.timestamp}`);
  console.log(
    `Is it reasonable? Fight started at ${fightStartTime}, death at ${firstDeath.timestamp}`,
  );
  console.log(
    `Difference: ${firstDeath.timestamp - fightStartTime}ms = ${(firstDeath.timestamp - fightStartTime) / 1000}s`,
  );

  if (firstDeath.timestamp < fightStartTime) {
    console.log('❌ PROBLEM: Death timestamp is BEFORE fight start!');
  } else if (firstDeath.timestamp > fightEndTime) {
    console.log('❌ PROBLEM: Death timestamp is AFTER fight end!');
  } else {
    console.log('✅ Death timestamp is within fight duration');
  }
}

// Run the debug
debugTimestamps().catch(console.error);
