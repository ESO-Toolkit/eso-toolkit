/**
 * Test calculateActorPositions with Fight 84 data with proper event structure
 */

import fs from 'fs';
import path from 'path';
import {
  calculateActorPositions,
  FightEvents,
} from './src/workers/calculations/CalculateActorPositions.js';
import {
  DamageEvent,
  HealEvent,
  DeathEvent,
  ResourceChangeEvent,
  CastEvent,
} from './src/types/combatlogEvents.js';

interface RawEvent {
  timestamp: number;
  type: string;
  sourceID?: number;
  targetID?: number;
  sourceIsFriendly?: boolean;
  targetIsFriendly?: boolean;
  sourceResources?: {
    x?: number;
    y?: number;
    facing?: number;
    hitPoints?: number;
    maxHitPoints?: number;
  };
  targetResources?: {
    x?: number;
    y?: number;
    facing?: number;
    hitPoints?: number;
    maxHitPoints?: number;
  };
  abilityGameID?: number;
  amount?: number;
  hitType?: number;
  [key: string]: any;
}

interface FightInfo {
  id: number;
  name: string;
  startTime: number;
  endTime: number;
}

function loadEventsFromFile(filePath: string): RawEvent[] {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return data.reportData?.report?.events?.data || data;
}

function convertToTypedEvents(rawEvents: RawEvent[]): FightEvents {
  const events: FightEvents = {
    damage: [],
    heal: [],
    death: [],
    resource: [],
    cast: [],
  };

  for (const event of rawEvents) {
    switch (event.type) {
      case 'damage':
        events.damage.push(event as DamageEvent);
        break;
      case 'heal': // Note: it's "heal" not "healing"
        events.heal.push(event as HealEvent);
        break;
      case 'death':
        events.death.push(event as DeathEvent);
        break;
      case 'resourcechange': // Note: it's "resourcechange" not "resource"
        events.resource.push(event as ResourceChangeEvent);
        break;
      case 'cast':
        events.cast.push(event as CastEvent);
        break;
    }
  }

  return events;
}

async function testFight84WithRealData() {
  console.log('🔍 Testing Fight 84 with real calculateActorPositions...\n');

  const dataDir = 'data-downloads/baJFfYC8trPhHMQp';
  const fight84Dir = path.join(dataDir, 'fight-84');

  // Load fight info
  const fightInfoPath = path.join(fight84Dir, 'fight-info.json');
  const fightData = JSON.parse(fs.readFileSync(fightInfoPath, 'utf8'));
  const fightInfo: FightInfo = fightData.reportData?.report?.fights?.data?.[0] || fightData;

  console.log(`📊 Fight Info:`, {
    id: fightInfo.id,
    name: fightInfo.name,
    duration: `${(fightInfo.endTime - fightInfo.startTime) / 1000}s`,
    startTime: fightInfo.startTime,
    endTime: fightInfo.endTime,
  });

  // Load events from separate files
  const eventsDir = path.join(fight84Dir, 'events');
  const damageEvents = loadEventsFromFile(path.join(eventsDir, 'damage-events.json'));
  const healingEvents = loadEventsFromFile(path.join(eventsDir, 'healing-events.json'));
  const deathEvents = loadEventsFromFile(path.join(eventsDir, 'death-events.json'));
  const resourceEvents = loadEventsFromFile(path.join(eventsDir, 'resource-events.json'));
  const castEvents = loadEventsFromFile(path.join(eventsDir, 'cast-events.json'));

  console.log(`\n📋 Event counts:`, {
    damage: damageEvents.length,
    healing: healingEvents.length,
    deaths: deathEvents.length,
    resources: resourceEvents.length,
    casts: castEvents.length,
  });

  // Check for position data in different event types
  const checkPositionData = (events: RawEvent[], type: string) => {
    const withSourcePos = events.filter(
      (e) => e.sourceResources?.x !== undefined && e.sourceResources?.y !== undefined,
    );
    const withTargetPos = events.filter(
      (e) => e.targetResources?.x !== undefined && e.targetResources?.y !== undefined,
    );
    console.log(
      `📍 ${type}: ${withSourcePos.length} with source position, ${withTargetPos.length} with target position`,
    );

    if (withSourcePos.length > 0) {
      const sample = withSourcePos[0];
      console.log(
        `  Sample ${type} source position: (${sample.sourceResources?.x}, ${sample.sourceResources?.y}), facing: ${sample.sourceResources?.facing}`,
      );
    }
  };

  checkPositionData(damageEvents, 'Damage');
  checkPositionData(healingEvents, 'Healing');
  checkPositionData(deathEvents, 'Death');
  checkPositionData(resourceEvents, 'Resource');
  checkPositionData(castEvents, 'Cast');

  // Convert all events to the proper format
  const allRawEvents = [
    ...damageEvents,
    ...healingEvents,
    ...deathEvents,
    ...resourceEvents,
    ...castEvents,
  ];

  const fightEvents = convertToTypedEvents(allRawEvents);

  console.log(`\n📊 Converted events:`, {
    damage: fightEvents.damage.length,
    heal: fightEvents.heal.length,
    death: fightEvents.death.length,
    resource: fightEvents.resource.length,
    cast: fightEvents.cast.length,
  });

  // Create a minimal fight object
  const fight = {
    id: fightInfo.id,
    name: fightInfo.name,
    startTime: fightInfo.startTime,
    endTime: fightInfo.endTime,
    boss: {
      id: 122,
      name: 'Lord Falgravn',
    },
  };

  // Try to run calculateActorPositions
  console.log(`\n🔬 Running calculateActorPositions...`);

  try {
    const result = calculateActorPositions({
      fight: fight as any,
      events: fightEvents,
    });

    console.log(`✅ calculateActorPositions completed successfully`);
    console.log(`📊 Result structure:`, {
      timelineActors: Object.keys(result.timeline.actorTimelines).length,
      timestamps: result.timeline.timestamps.length,
      lookupTimestamps: result.lookup.sortedTimestamps.length,
      sampleTimestamp: result.timeline.timestamps[0],
      fightDuration: result.timeline.fightDuration,
    });

    // Check for dead actors in the timeline
    let deadActorCount = 0;
    let totalPositions = 0;

    for (const [actorId, timeline] of Object.entries(result.timeline.actorTimelines)) {
      totalPositions += timeline.positions.length;
      const deadPositions = timeline.positions.filter((pos) => pos.isDead);
      if (deadPositions.length > 0) {
        deadActorCount++;
        console.log(
          `💀 Actor ${actorId} (${timeline.name}) has ${deadPositions.length} dead positions`,
        );
        console.log(`  First death at: ${deadPositions[0].timestamp}ms`);
        console.log(`  Position: [${deadPositions[0].position.join(', ')}]`);
      }
    }

    console.log(`\n📊 Summary:`, {
      totalActors: Object.keys(result.timeline.actorTimelines).length,
      totalPositions,
      deadActors: deadActorCount,
    });

    // Save results to file
    const outputPath = 'fight-84-real-positions-result.json';
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);

    // Test the lookup functionality
    const testTimestamp =
      result.timeline.timestamps[Math.floor(result.timeline.timestamps.length / 2)];
    console.log(`\n🔍 Testing lookup at timestamp ${testTimestamp}:`);

    const positionsAtTime = result.lookup.positionsByTimestamp[testTimestamp];
    if (positionsAtTime) {
      console.log(`Found ${Object.keys(positionsAtTime).length} actors at this time`);
      const sampleActor = Object.values(positionsAtTime)[0];
      if (sampleActor) {
        console.log(
          `Sample actor: ${sampleActor.name} at [${sampleActor.position.join(', ')}], dead: ${sampleActor.isDead}`,
        );
      }
    }
  } catch (error) {
    console.error(`❌ Error running calculateActorPositions:`, error);
    console.error('Error details:', error instanceof Error ? error.stack : error);
  }
}

// Run the test
testFight84WithRealData().catch(console.error);
