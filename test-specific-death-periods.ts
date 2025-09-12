/**
 * Test death detection with the exact timestamps we identified
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

async function testSpecificDeathPeriods() {
  console.log('🎯 Testing specific death periods for Actor 1...\n');

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

  // Create fight object with friendlyPlayers to properly classify actors
  const fight = {
    id: fightInfo.id,
    name: fightInfo.name,
    startTime: fightInfo.startTime,
    endTime: fightInfo.endTime,
    boss: { id: 122, name: 'Lord Falgravn' },
    friendlyPlayers: [1], // Actor 1 is a player
  };

  // Run calculateActorPositions
  console.log(`🔬 Running calculateActorPositions...`);
  const result = calculateActorPositions({
    fight: fight as any,
    events: fightEvents,
  });

  // Known death periods for Actor 1 (relative times):
  const deathPeriods = [
    { start: 22640, end: 30779, description: 'First death period' },
    { start: 488202, end: 491727, description: 'Second death period' },
    { start: 518269, end: 528735, description: 'Third death period (until end)' },
  ];

  console.log(`📊 Checking Actor 1 positions during known death periods:\n`);

  const actor1Timeline = result.timeline.actorTimelines[1];
  if (!actor1Timeline) {
    console.log(`❌ Actor 1 not found in timeline!`);
    return;
  }

  for (const period of deathPeriods) {
    console.log(`🔍 ${period.description} (${period.start}ms - ${period.end}ms):`);

    // Find positions in this time range
    const positionsInPeriod = actor1Timeline.positions.filter(
      (pos) => pos.timestamp >= period.start && pos.timestamp <= period.end,
    );

    console.log(`  Found ${positionsInPeriod.length} positions in this period`);

    if (positionsInPeriod.length > 0) {
      const deadPositions = positionsInPeriod.filter((pos) => pos.isDead);
      const alivePositions = positionsInPeriod.filter((pos) => !pos.isDead);

      console.log(`    Dead positions: ${deadPositions.length}`);
      console.log(`    Alive positions: ${alivePositions.length}`);

      // Show first few positions
      positionsInPeriod.slice(0, 3).forEach((pos) => {
        const status = pos.isDead ? '💀 DEAD' : '❤️ ALIVE';
        console.log(`    ${pos.timestamp}ms: ${status}`);
      });

      if (alivePositions.length > 0) {
        console.log(`    ❌ ERROR: Actor should be dead during this entire period!`);
      } else {
        console.log(`    ✅ Correct: All positions marked as dead`);
      }
    } else {
      console.log(`    ℹ️ No positions found during this period`);
    }
    console.log('');
  }

  // Also check the lookup structure
  console.log(`🔍 Checking lookup structure during first death period:`);
  const testTimestamps = [25000, 27000, 29000]; // Within first death period

  for (const timestamp of testTimestamps) {
    const positionsAtTime = result.lookup.positionsByTimestamp[timestamp];
    const actor1AtTime = positionsAtTime?.[1];

    if (actor1AtTime) {
      const status = actor1AtTime.isDead ? '💀 DEAD' : '❤️ ALIVE';
      console.log(`  ${timestamp}ms: ${status}`);
    } else {
      console.log(`  ${timestamp}ms: ❌ No position data`);
    }
  }
}

// Run the test
testSpecificDeathPeriods().catch(console.error);
