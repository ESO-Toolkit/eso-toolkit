/**
 * Test death detection specifically in Fight 84 around death events
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
      case 'heal':
        events.heal.push(event as HealEvent);
        break;
      case 'death':
        events.death.push(event as DeathEvent);
        break;
      case 'resourcechange':
        events.resource.push(event as ResourceChangeEvent);
        break;
      case 'cast':
        events.cast.push(event as CastEvent);
        break;
    }
  }

  return events;
}

async function testDeathDetection() {
  console.log('💀 Testing death detection in Fight 84...\n');

  const dataDir = 'data-downloads/baJFfYC8trPhHMQp';
  const fight84Dir = path.join(dataDir, 'fight-84');

  // Load fight info
  const fightInfoPath = path.join(fight84Dir, 'fight-info.json');
  const fightData = JSON.parse(fs.readFileSync(fightInfoPath, 'utf8'));
  const fightInfo = fightData.reportData?.report?.fights?.data?.[0] || fightData;

  // Load events
  const eventsDir = path.join(fight84Dir, 'events');
  const damageEvents = loadEventsFromFile(path.join(eventsDir, 'damage-events.json'));
  const healingEvents = loadEventsFromFile(path.join(eventsDir, 'healing-events.json'));
  const deathEvents = loadEventsFromFile(path.join(eventsDir, 'death-events.json'));
  const resourceEvents = loadEventsFromFile(path.join(eventsDir, 'resource-events.json'));
  const castEvents = loadEventsFromFile(path.join(eventsDir, 'cast-events.json'));

  const allRawEvents = [
    ...damageEvents,
    ...healingEvents,
    ...deathEvents,
    ...resourceEvents,
    ...castEvents,
  ];

  const fightEvents = convertToTypedEvents(allRawEvents);

  console.log(`📊 Death events loaded: ${fightEvents.death.length}`);

  // Get some specific death timestamps
  const firstDeath = deathEvents[0]; // Actor 1 dies at 6997207 (22640ms into fight)
  const secondDeath = deathEvents[1]; // Actor 6 dies at 7004965 (30398ms into fight)

  console.log(
    `🎯 First death: Actor ${firstDeath.targetID} at ${firstDeath.timestamp} (${firstDeath.timestamp - fightInfo.startTime}ms into fight)`,
  );
  console.log(
    `🎯 Second death: Actor ${secondDeath.targetID} at ${secondDeath.timestamp} (${secondDeath.timestamp - fightInfo.startTime}ms into fight)`,
  );

  // Create minimal fight object
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

  // Run calculateActorPositions
  console.log(`\n🔬 Running calculateActorPositions...`);

  const result = calculateActorPositions({
    fight: fight as any,
    events: fightEvents,
  });

  console.log(`✅ Calculation completed`);

  // Check around death times
  const checkTimeAroundDeath = (deathTimestamp: number, actorId: number, deathLabel: string) => {
    console.log(`\n🔍 Checking ${deathLabel} around timestamp ${deathTimestamp}:`);

    const relativeTime = deathTimestamp - fightInfo.startTime;
    const timeBeforeDeath = relativeTime - 1000; // 1 second before
    const timeAfterDeath = relativeTime + 1000; // 1 second after

    console.log(`  Looking for actor ${actorId} at:
      - ${timeBeforeDeath}ms (before death)
      - ${relativeTime}ms (at death)
      - ${timeAfterDeath}ms (after death)`);

    for (const checkTime of [timeBeforeDeath, relativeTime, timeAfterDeath]) {
      const positionsAtTime = result.lookup.positionsByTimestamp[checkTime];
      if (positionsAtTime && positionsAtTime[actorId]) {
        const actor = positionsAtTime[actorId];
        console.log(
          `    ${checkTime}ms: ${actor.name} at [${actor.position.join(', ')}], isDead: ${actor.isDead}`,
        );
      } else {
        console.log(`    ${checkTime}ms: Actor ${actorId} not found at this exact time`);
      }
    }

    // Also check nearby timestamps
    const nearbyTimestamps = result.lookup.sortedTimestamps
      .filter((ts) => Math.abs(ts - relativeTime) <= 2000)
      .sort((a, b) => Math.abs(a - relativeTime) - Math.abs(b - relativeTime));

    console.log(`  Nearby timestamps (within 2s):`);
    nearbyTimestamps.slice(0, 5).forEach((ts) => {
      const positionsAtTime = result.lookup.positionsByTimestamp[ts];
      if (positionsAtTime && positionsAtTime[actorId]) {
        const actor = positionsAtTime[actorId];
        const timeDiff = ts - relativeTime;
        console.log(
          `    ${ts}ms (${timeDiff > 0 ? '+' : ''}${timeDiff}ms): isDead: ${actor.isDead}`,
        );
      }
    });
  };

  // Check the first death
  if (firstDeath.targetID !== undefined) {
    checkTimeAroundDeath(firstDeath.timestamp, firstDeath.targetID, 'first death');
  }

  // Check the second death
  if (secondDeath.targetID !== undefined) {
    checkTimeAroundDeath(secondDeath.timestamp, secondDeath.targetID, 'second death');
  }

  // Also check actor timelines directly
  console.log(`\n📊 Actor timeline death status:`);
  const actorTimelines = result.timeline.actorTimelines;

  for (const [actorId, timeline] of Object.entries(actorTimelines)) {
    const deadPositions = timeline.positions.filter((pos) => pos.isDead);
    if (deadPositions.length > 0) {
      console.log(`💀 Actor ${actorId} (${timeline.name}): ${deadPositions.length} dead positions`);
      deadPositions.slice(0, 3).forEach((pos) => {
        console.log(`   ${pos.timestamp}ms: dead at [${pos.position.join(', ')}]`);
      });
    }
  }

  // Check if any actors are marked as dead
  let totalDeadPositions = 0;
  let actorsWithDeaths = 0;

  for (const timeline of Object.values(actorTimelines)) {
    const deadCount = timeline.positions.filter((pos) => pos.isDead).length;
    if (deadCount > 0) {
      actorsWithDeaths++;
      totalDeadPositions += deadCount;
    }
  }

  console.log(`\n📈 Death statistics:
    Actors with dead positions: ${actorsWithDeaths}
    Total dead positions: ${totalDeadPositions}
    Total death events: ${fightEvents.death.length}`);
}

// Run the test
testDeathDetection().catch(console.error);
