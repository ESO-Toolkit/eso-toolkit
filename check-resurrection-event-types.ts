/**
 * Check the event types of resurrection events
 */

import fs from 'fs';
import path from 'path';

async function checkResurrectionEventTypes() {
  console.log('🔍 Checking resurrection event types...\n');

  const dataDir = 'data-downloads/baJFfYC8trPhHMQp/fight-84';

  // Load cast events
  const castEventsPath = path.join(dataDir, 'events/cast-events.json');
  const castData = JSON.parse(fs.readFileSync(castEventsPath, 'utf8'));
  const castEvents = castData.reportData?.report?.events?.data || castData;

  // Load fight info for timestamp conversion
  const fightInfoPath = path.join(dataDir, 'fight-info.json');
  const fightData = JSON.parse(fs.readFileSync(fightInfoPath, 'utf8'));
  const fightInfo = fightData.reportData?.report?.fights?.data?.[0] || fightData;
  const fightStartTime = fightInfo.startTime;

  // Look for resurrection events (ability ID 26770)
  const RESURRECT_ABILITY_ID = 26770;
  const resurrectEvents = castEvents.filter(
    (event: any) => event.abilityGameID === RESURRECT_ABILITY_ID,
  );

  console.log(`📊 Total resurrection events found: ${resurrectEvents.length}\n`);

  // Group by event type
  const eventTypeGroups = new Map<string, any[]>();
  resurrectEvents.forEach((event) => {
    const type = event.type;
    if (!eventTypeGroups.has(type)) {
      eventTypeGroups.set(type, []);
    }
    eventTypeGroups.get(type)!.push(event);
  });

  console.log(`📋 Resurrection events by type:`);
  for (const [type, events] of eventTypeGroups.entries()) {
    console.log(`  ${type}: ${events.length} events`);
  }
  console.log('');

  // Show detailed info for each type
  for (const [type, events] of eventTypeGroups.entries()) {
    console.log(`🔍 Sample ${type} events:`);
    events.slice(0, 3).forEach((event, i) => {
      const relativeTime = event.timestamp - fightStartTime;
      console.log(
        `  ${i + 1}. Target: Actor ${event.targetID}, Time: ${event.timestamp} (${relativeTime}ms), Type: ${event.type}`,
      );

      // Show the full structure of the first event
      if (i === 0) {
        console.log(`     Full structure: ${JSON.stringify(event, null, 6).substring(0, 300)}...`);
      }
    });
    console.log('');
  }

  // Check if there are any begincast events with resurrect ability
  console.log(`🔍 Checking for 'begincast' resurrection events...`);
  const begincastResurrects = castEvents.filter(
    (event: any) => event.abilityGameID === RESURRECT_ABILITY_ID && event.type === 'begincast',
  );
  console.log(`Found ${begincastResurrects.length} 'begincast' resurrection events`);

  // Check if there are any cast events with resurrect ability
  const castResurrects = castEvents.filter(
    (event: any) => event.abilityGameID === RESURRECT_ABILITY_ID && event.type === 'cast',
  );
  console.log(`Found ${castResurrects.length} 'cast' resurrection events`);

  // Check what other types might exist
  const allTypes = new Set(castEvents.map((e: any) => e.type));
  console.log(`\n📊 All event types in cast events file: ${Array.from(allTypes).join(', ')}`);

  // Look at a specific actor's resurrection timeline
  if (resurrectEvents.length > 0) {
    const targetId = resurrectEvents[0].targetID;
    const actorResurrects = resurrectEvents.filter((e) => e.targetID === targetId);

    console.log(`\n🎯 Actor ${targetId} resurrection timeline:`);
    actorResurrects.forEach((event) => {
      const relativeTime = event.timestamp - fightStartTime;
      console.log(
        `  ${event.type} at ${event.timestamp} (${relativeTime}ms) - Source: Actor ${event.sourceID}`,
      );
    });
  }
}

// Run the check
checkResurrectionEventTypes().catch(console.error);
