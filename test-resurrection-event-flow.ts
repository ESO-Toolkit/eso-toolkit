/**
 * Test specifically what resurrection events make it through to calculateActorPositions
 */

import fs from 'fs';
import path from 'path';

function loadEventsFromFile(filePath: string): any[] {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return data.reportData?.report?.events?.data || data;
}

function convertToTypedEvents(rawEvents: any[]) {
  const events = {
    damage: [] as any[],
    heal: [] as any[],
    death: [] as any[],
    resource: [] as any[],
    cast: [] as any[],
  };

  for (const event of rawEvents) {
    switch (event.type) {
      case 'damage':
        events.damage.push(event);
        break;
      case 'heal':
        events.heal.push(event);
        break;
      case 'death':
        events.death.push(event);
        break;
      case 'resourcechange':
        events.resource.push(event);
        break;
      case 'cast': // This should only include 'cast' events, not 'begincast'
        events.cast.push(event);
        break;
    }
  }

  return events;
}

async function testResurrectionEventFlow() {
  console.log('🔍 Testing resurrection event flow through to calculateActorPositions...\n');

  const dataDir = 'data-downloads/baJFfYC8trPhHMQp/fight-84';

  // Load cast events (contains both 'cast' and 'begincast')
  const castEventsPath = path.join(dataDir, 'events/cast-events.json');
  const castEvents = loadEventsFromFile(castEventsPath);

  console.log(`📊 Raw cast events loaded: ${castEvents.length}`);

  // Filter resurrection events by type
  const RESURRECT_ABILITY_ID = 26770;
  const allResurrectEvents = castEvents.filter((e) => e.abilityGameID === RESURRECT_ABILITY_ID);
  const begincastResurrects = allResurrectEvents.filter((e) => e.type === 'begincast');
  const castResurrects = allResurrectEvents.filter((e) => e.type === 'cast');

  console.log(`📋 Resurrection events breakdown:`);
  console.log(`  Total resurrection events: ${allResurrectEvents.length}`);
  console.log(`  begincast resurrections: ${begincastResurrects.length}`);
  console.log(`  cast resurrections: ${castResurrects.length}`);

  // Convert events through our function
  const convertedEvents = convertToTypedEvents(castEvents);
  console.log(`\n🔄 After convertToTypedEvents:`);
  console.log(`  cast events: ${convertedEvents.cast.length}`);

  // Check what resurrection events made it through
  const convertedResurrects = convertedEvents.cast.filter(
    (e: any) => e.abilityGameID === RESURRECT_ABILITY_ID,
  );
  console.log(`  resurrection cast events: ${convertedResurrects.length}`);

  console.log(`\n📝 Resurrection events that will reach calculateActorPositions:`);
  convertedResurrects.forEach((event: any, i: number) => {
    console.log(
      `  ${i + 1}. Target: Actor ${event.targetID}, Time: ${event.timestamp}, Type: ${event.type}`,
    );
  });

  // Load fight info for timing
  const fightInfoPath = path.join(dataDir, 'fight-info.json');
  const fightData = JSON.parse(fs.readFileSync(fightInfoPath, 'utf8'));
  const fightInfo = fightData.reportData?.report?.fights?.data?.[0] || fightData;
  const fightStartTime = fightInfo.startTime;

  // Check Actor 1 specifically
  const actor1Resurrects = convertedResurrects.filter((e: any) => e.targetID === 1);
  console.log(`\n🎯 Actor 1 resurrection events (type='cast' only):`);
  actor1Resurrects.forEach((event) => {
    const relativeTime = event.timestamp - fightStartTime;
    console.log(`  ${event.timestamp} (${relativeTime}ms into fight)`);
  });

  // Load death events for comparison
  const deathEventsPath = path.join(dataDir, 'events/death-events.json');
  const deathEvents = loadEventsFromFile(deathEventsPath);
  const actor1Deaths = deathEvents.filter((e: any) => e.targetID === 1);

  console.log(`\n💀 Actor 1 death events:`);
  actor1Deaths.forEach((event) => {
    const relativeTime = event.timestamp - fightStartTime;
    console.log(`  ${event.timestamp} (${relativeTime}ms into fight)`);
  });

  // Calculate expected dead periods
  if (actor1Deaths.length > 0 && actor1Resurrects.length > 0) {
    console.log(`\n⏰ Expected dead periods for Actor 1:`);
    actor1Deaths.forEach((death, i) => {
      const deathTime = death.timestamp - fightStartTime;
      const nextResurrect = actor1Resurrects.find((r: any) => r.timestamp > death.timestamp);
      if (nextResurrect) {
        const resurrectTime = nextResurrect.timestamp - fightStartTime;
        console.log(
          `  Death ${i + 1}: ${deathTime}ms - ${resurrectTime}ms (duration: ${resurrectTime - deathTime}ms)`,
        );
      } else {
        console.log(`  Death ${i + 1}: ${deathTime}ms - end of fight (no resurrection found)`);
      }
    });
  }
}

// Run the test
testResurrectionEventFlow().catch(console.error);
