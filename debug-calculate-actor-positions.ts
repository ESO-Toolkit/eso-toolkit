/**
 * Test with added debugging to see what's happening in death detection
 */

import fs from 'fs';
import path from 'path';

// Load the calculateActorPositions function code and add debugging
async function debugCalculateActorPositions() {
  console.log('🐛 Adding debug to calculateActorPositions...\n');

  const dataDir = 'data-downloads/baJFfYC8trPhHMQp';
  const fight84Dir = path.join(dataDir, 'fight-84');

  // Load events
  const eventsDir = path.join(fight84Dir, 'events');
  const deathEventsPath = path.join(eventsDir, 'death-events.json');
  const deathData = JSON.parse(fs.readFileSync(deathEventsPath, 'utf8'));
  const deathEvents = deathData.reportData?.report?.events?.data || deathData;

  // Load fight info
  const fightInfoPath = path.join(fight84Dir, 'fight-info.json');
  const fightData = JSON.parse(fs.readFileSync(fightInfoPath, 'utf8'));
  const fightInfo = fightData.reportData?.report?.fights?.data?.[0] || fightData;

  const firstDeath = deathEvents[0];
  const actorId = firstDeath.targetID;
  const deathTimestamp = firstDeath.timestamp;
  const fightStartTime = fightInfo.startTime;

  console.log(`🎯 Debugging Actor ${actorId} death at ${deathTimestamp}`);
  console.log(`Fight start: ${fightStartTime}`);
  console.log(`Relative death time: ${deathTimestamp - fightStartTime}ms`);

  // Simulate the death tracking logic
  const actorDeathTime = new Map();
  const actorResurrectionTime = new Map();

  // Simulate processing death event
  console.log(`\n📝 Processing death event:`);
  console.log(`actorDeathTime.set(${actorId}, ${deathTimestamp})`);
  actorDeathTime.set(actorId, deathTimestamp);

  // Check resurrection events for this actor
  const castEventsPath = path.join(eventsDir, 'cast-events.json');
  const castData = JSON.parse(fs.readFileSync(castEventsPath, 'utf8'));
  const castEvents = castData.reportData?.report?.events?.data || castData;

  // Look for resurrection events
  const RESURRECT_ABILITY_ID = 26770; // From KnownAbilities.RESURRECT
  const resurrectEvents = castEvents.filter(
    (event: any) => event.targetID === actorId && event.abilityGameID === RESURRECT_ABILITY_ID,
  );

  console.log(`\n🔍 Resurrection events for Actor ${actorId}: ${resurrectEvents.length}`);
  if (resurrectEvents.length > 0) {
    resurrectEvents.forEach((event: any, i: number) => {
      console.log(
        `  Resurrect ${i + 1}: ability ${event.abilityGameID} at ${event.timestamp} (relative: ${event.timestamp - fightStartTime}ms)`,
      );
      actorResurrectionTime.set(actorId, event.timestamp);
    });
  }

  // Test the isDead logic at various timestamps
  console.log(`\n🧪 Testing isDead logic:`);
  const firstResurrectionTime = 6999230; // First resurrection after death
  const testTimes = [
    deathTimestamp - fightStartTime - 1000, // 1s before death
    deathTimestamp - fightStartTime, // At death
    deathTimestamp - fightStartTime + 1000, // 1s after death (should be dead)
    firstResurrectionTime - fightStartTime, // At first resurrection (should become alive)
    firstResurrectionTime - fightStartTime + 1000, // 1s after resurrection (should be alive)
  ];

  for (const relativeTime of testTimes) {
    const currentTimestamp = fightStartTime + relativeTime;
    const deathTime = actorDeathTime.get(actorId);
    // Use the first resurrection after death, not the last
    const resurrectionTime = firstResurrectionTime;

    const isDead =
      deathTime !== undefined &&
      currentTimestamp >= deathTime &&
      (resurrectionTime === undefined || currentTimestamp < resurrectionTime);

    console.log(`\nAt ${relativeTime}ms (absolute: ${currentTimestamp}):`);
    console.log(`  deathTime: ${deathTime}`);
    console.log(`  resurrectionTime (first): ${resurrectionTime}`);
    console.log(`  currentTimestamp >= deathTime: ${currentTimestamp >= deathTime!}`);
    console.log(
      `  resurrection check: ${resurrectionTime === undefined ? 'no resurrection' : `currentTimestamp < resurrectionTime: ${currentTimestamp < resurrectionTime}`}`,
    );
    console.log(`  Final isDead: ${isDead}`);
  }

  // Also check if the ability ID for resurrect is different
  console.log(`\n🔍 Checking for any cast events that might be resurrections:`);
  const castEventsAfterDeath = castEvents.filter(
    (event: any) =>
      event.targetID === actorId &&
      event.timestamp > deathTimestamp &&
      event.timestamp < deathTimestamp + 60000, // Within 1 minute
  );

  console.log(`Cast events for Actor ${actorId} after death (${castEventsAfterDeath.length}):`);
  castEventsAfterDeath.slice(0, 5).forEach((event: any) => {
    console.log(
      `  Ability ${event.abilityGameID} at ${event.timestamp} (${event.timestamp - fightStartTime}ms)`,
    );
  });
}

// Run the debug
debugCalculateActorPositions().catch(console.error);
