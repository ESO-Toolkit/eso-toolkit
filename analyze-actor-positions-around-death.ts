/**
 * Detailed analysis of actor positions around death times
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

async function analyzeActorPositionsAroundDeath() {
  console.log('🔍 Analyzing actor positions around death events...\n');

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
  console.log(`🔬 Running calculateActorPositions...`);
  const result = calculateActorPositions({
    fight: fight as any,
    events: fightEvents,
  });

  console.log(`✅ Calculation completed`);

  // Get the first death event
  const firstDeath = deathEvents[0];
  const actorId = firstDeath.targetID!;
  const deathTimestamp = firstDeath.timestamp;
  const relativeDeathTime = deathTimestamp - fightInfo.startTime;

  console.log(
    `\n🎯 Analyzing Actor ${actorId} death at ${deathTimestamp} (${relativeDeathTime}ms into fight)`,
  );

  // Check if this actor exists in the timeline at all
  const actorTimeline = result.timeline.actorTimelines[actorId];
  if (!actorTimeline) {
    console.log(`❌ Actor ${actorId} not found in timeline at all!`);
    console.log(`Available actors: ${Object.keys(result.timeline.actorTimelines).join(', ')}`);
    return;
  }

  console.log(`📊 Actor ${actorId} (${actorTimeline.name}) timeline info:`);
  console.log(`  Total positions: ${actorTimeline.positions.length}`);
  console.log(`  First position: ${actorTimeline.positions[0]?.timestamp}ms`);
  console.log(
    `  Last position: ${actorTimeline.positions[actorTimeline.positions.length - 1]?.timestamp}ms`,
  );

  // Look for positions around the death time
  const positionsAroundDeath = actorTimeline.positions
    .filter(
      (pos) => Math.abs(pos.timestamp - relativeDeathTime) <= 5000, // Within 5 seconds
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  console.log(`\n📍 Positions within 5 seconds of death (${relativeDeathTime}ms):`);
  positionsAroundDeath.forEach((pos) => {
    const timeDiff = pos.timestamp - relativeDeathTime;
    const status = pos.isDead ? '💀 DEAD' : '❤️ ALIVE';
    console.log(
      `  ${pos.timestamp}ms (${timeDiff > 0 ? '+' : ''}${timeDiff}ms): ${status} at [${pos.position.join(', ')}]`,
    );
  });

  // Check the lookup structure too
  console.log(`\n🔍 Checking lookup structure around death time:`);
  const timestampsAroundDeath = result.lookup.sortedTimestamps
    .filter((ts) => Math.abs(ts - relativeDeathTime) <= 5000)
    .sort((a, b) => Math.abs(a - relativeDeathTime) - Math.abs(b - relativeDeathTime));

  timestampsAroundDeath.slice(0, 10).forEach((ts) => {
    const positionsAtTime = result.lookup.positionsByTimestamp[ts];
    const actorAtTime = positionsAtTime?.[actorId];
    const timeDiff = ts - relativeDeathTime;

    if (actorAtTime) {
      const status = actorAtTime.isDead ? '💀 DEAD' : '❤️ ALIVE';
      console.log(
        `  ${ts}ms (${timeDiff > 0 ? '+' : ''}${timeDiff}ms): ${status} at [${actorAtTime.position.join(', ')}]`,
      );
    } else {
      console.log(`  ${ts}ms (${timeDiff > 0 ? '+' : ''}${timeDiff}ms): ❌ NO POSITION DATA`);
    }
  });

  // Check several other deaths to see if it's a pattern
  console.log(`\n📊 Quick check of other deaths:`);
  for (let i = 1; i < Math.min(5, deathEvents.length); i++) {
    const death = deathEvents[i];
    const actId = death.targetID!;
    const deathTime = death.timestamp - fightInfo.startTime;
    const timeline = result.timeline.actorTimelines[actId];

    if (timeline) {
      const positionsNearDeath = timeline.positions.filter(
        (pos) => Math.abs(pos.timestamp - deathTime) <= 2000,
      );
      const deadPositions = positionsNearDeath.filter((pos) => pos.isDead);
      console.log(
        `  Actor ${actId}: ${positionsNearDeath.length} positions near death, ${deadPositions.length} marked as dead`,
      );
    } else {
      console.log(`  Actor ${actId}: ❌ Not found in timeline`);
    }
  }

  // Check if death events are being processed at all
  console.log(`\n🔬 Death events processing check:`);
  console.log(`Input death events: ${fightEvents.death.length}`);
  fightEvents.death.slice(0, 3).forEach((death, i) => {
    console.log(
      `  Death ${i + 1}: Actor ${death.targetID} at ${death.timestamp} (type: ${death.type})`,
    );
  });

  // Check if the timestamps align
  console.log(`\n⏰ Timestamp alignment check:`);
  console.log(`Fight start time: ${fightInfo.startTime}`);
  console.log(`Death timestamp (absolute): ${firstDeath.timestamp}`);
  console.log(`Death timestamp (relative): ${relativeDeathTime}`);
  console.log(
    `Timeline timestamp range: ${result.timeline.timestamps[0]} - ${result.timeline.timestamps[result.timeline.timestamps.length - 1]}`,
  );
}

// Run the analysis
analyzeActorPositionsAroundDeath().catch(console.error);
