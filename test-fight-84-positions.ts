/**
 * Test calculateActorPositions with Fight 84 data
 */

import fs from 'fs';
import path from 'path';
import { calculateActorPositions } from './src/workers/calculations/CalculateActorPositions.js';

interface EventData {
  timestamp: number;
  sourceID?: number;
  targetID?: number;
  x?: number;
  y?: number;
  facing?: number;
  type: string;
}

interface FightInfo {
  id: number;
  name: string;
  startTime: number;
  endTime: number;
}

async function testFight84() {
  console.log('🔍 Testing Fight 84 with calculateActorPositions...\n');

  const dataDir = 'data-downloads/baJFfYC8trPhHMQp';
  const fight84Dir = path.join(dataDir, 'fight-84');

  // Load fight info
  const fightInfoPath = path.join(fight84Dir, 'fight-info.json');
  const fightInfo: FightInfo = JSON.parse(fs.readFileSync(fightInfoPath, 'utf8'));

  console.log(`📊 Fight Info:`, {
    id: fightInfo.id,
    name: fightInfo.name,
    duration: `${(fightInfo.endTime - fightInfo.startTime) / 1000}s`,
    startTime: fightInfo.startTime,
    endTime: fightInfo.endTime,
  });

  // Load all events
  const allEventsPath = path.join(fight84Dir, 'events/all-events.json');
  const allEvents: EventData[] = JSON.parse(fs.readFileSync(allEventsPath, 'utf8'));

  console.log(`\n📋 Total events: ${allEvents.length}`);

  // Check for position data in events
  const eventsWithPosition = allEvents.filter(
    (event) => typeof event.x === 'number' && typeof event.y === 'number',
  );

  console.log(`📍 Events with position data: ${eventsWithPosition.length}`);

  if (eventsWithPosition.length > 0) {
    console.log(`\n✨ Sample position events:`);
    eventsWithPosition.slice(0, 5).forEach((event, i) => {
      console.log(
        `  ${i + 1}. [${event.timestamp}ms] ${event.type} - Position: (${event.x}, ${event.y}), Facing: ${event.facing}`,
      );
    });
  }

  // Check specific event types for position data
  const eventTypes = ['damage', 'healing', 'cast', 'death', 'combatantInfo'];
  for (const eventType of eventTypes) {
    const eventsOfType = allEvents.filter((e) => e.type === eventType);
    const withPosition = eventsOfType.filter(
      (e) => typeof e.x === 'number' && typeof e.y === 'number',
    );
    console.log(
      `📊 ${eventType}: ${eventsOfType.length} total, ${withPosition.length} with position`,
    );
  }

  // Load death events specifically to check structure
  const deathEventsPath = path.join(fight84Dir, 'events/death-events.json');
  const deathEvents = JSON.parse(fs.readFileSync(deathEventsPath, 'utf8'));

  console.log(`\n💀 Death events: ${deathEvents.length}`);
  if (deathEvents.length > 0) {
    console.log(`Sample death event structure:`, JSON.stringify(deathEvents[0], null, 2));
  }

  // Try to run calculateActorPositions
  console.log(`\n🔬 Running calculateActorPositions...`);

  try {
    const result = calculateActorPositions({
      reportCode: 'baJFfYC8trPhHMQp',
      fightId: 84,
      events: allEvents,
      startTime: fightInfo.startTime,
      endTime: fightInfo.endTime,
    });

    console.log(`✅ calculateActorPositions completed successfully`);
    console.log(`📊 Result summary:`, {
      totalTimepoints: result.length,
      sampleTimepoints: result.slice(0, 3).map((tp) => ({
        timestamp: tp.timestamp,
        actorCount: tp.actorPositions.length,
        sampleActors: tp.actorPositions.slice(0, 2).map((actor) => ({
          actorId: actor.actorId,
          position: { x: actor.x, y: actor.y },
          isDead: actor.isDead,
        })),
      })),
    });

    // Check for dead actors in the data
    const timePointsWithDeadActors = result.filter((tp) =>
      tp.actorPositions.some((actor) => actor.isDead),
    );

    console.log(`\n💀 Timepoints with dead actors: ${timePointsWithDeadActors.length}`);

    if (timePointsWithDeadActors.length > 0) {
      console.log(`Sample timepoint with dead actors:`, {
        timestamp: timePointsWithDeadActors[0].timestamp,
        deadActors: timePointsWithDeadActors[0].actorPositions
          .filter((actor) => actor.isDead)
          .map((actor) => ({ actorId: actor.actorId, position: { x: actor.x, y: actor.y } })),
      });
    }

    // Save results to file
    const outputPath = 'fight-84-positions-result.json';
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error running calculateActorPositions:`, error);
  }
}

// Run the test
testFight84().catch(console.error);
