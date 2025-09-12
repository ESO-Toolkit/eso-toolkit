import { calculateActorPositions } from './src/workers/calculations/CalculateActorPositions';
import fs from 'fs';

// Load the data
const fightInfo = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/fight-info.json', 'utf8'),
);
const deathEvents = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/events/death-events.json', 'utf8'),
);
const damageEvents = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/events/damage-events.json', 'utf8'),
);

// Mock fight object
const mockFight = {
  id: fightInfo.id,
  name: fightInfo.name,
  startTime: fightInfo.startTime,
  endTime: fightInfo.endTime,
  actors: fightInfo.friendlyPlayers.map((id: number) => ({
    id,
    name: `Player${id}`,
    type: 'PC' as const,
    subType: 'Player',
    gameID: 0,
    petOwner: null,
    server: 'test',
  })),
};

// Combine events (limit damage events to avoid too much data)
const fightEvents = {
  damage: damageEvents.reportData.report.events.data.slice(0, 1000),
  heal: [], // No healing events for this test
  death: deathEvents.reportData.report.events.data,
  resource: [], // No resource events for this test
  cast: [], // No cast events for this test
};

console.log('Running calculateActorPositions...');
console.log('Fight:', mockFight.name);
console.log('Damage events:', fightEvents.damage.length);
console.log('Death events:', fightEvents.death.length);

try {
  const taskData = {
    fight: mockFight as any,
    events: fightEvents,
    playersById: {},
    actorsById: {},
    debuffLookupData: {
      buffIntervals: {},
      abilityIds: new Set(),
    },
  };

  const result = calculateActorPositions(taskData);

  // Check Player 1 at around 60 seconds (after death at 55.4s)
  const player1Timeline = result.timeline.actorTimelines[1];
  if (player1Timeline) {
    console.log('\n=== PLAYER 1 ANALYSIS ===');
    console.log('Player 1 timeline:', player1Timeline.name);
    console.log('Total positions:', player1Timeline.positions.length);

    // Find positions around death time (55441ms relative)
    const positionsAroundDeath = player1Timeline.positions.filter(
      (pos) => pos.timestamp >= 55000 && pos.timestamp <= 65000,
    );

    console.log('\nPositions around death time (55-65 seconds):');
    positionsAroundDeath.forEach((pos) => {
      console.log(
        `- At ${pos.timestamp}ms: isDead=${pos.isDead}, position=[${pos.position.join(', ')}]`,
      );
    });

    // Check some positions after death to see if they stay dead
    const positionsAfterDeath = player1Timeline.positions.filter(
      (pos) => pos.timestamp >= 60000 && pos.timestamp <= 70000,
    );

    console.log('\nPositions 60-70 seconds (after death):');
    positionsAfterDeath.slice(0, 10).forEach((pos) => {
      console.log(`- At ${pos.timestamp}ms: isDead=${pos.isDead}`);
    });
  }

  // Save a subset of the result for analysis
  const debugResult = {
    fightInfo: {
      fightDuration: result.timeline.fightDuration,
      fightStartTime: result.timeline.fightStartTime,
      timestamps: result.timeline.timestamps.length,
    },
    player1Timeline: player1Timeline
      ? {
          name: player1Timeline.name,
          type: player1Timeline.type,
          totalPositions: player1Timeline.positions.length,
          samplePositions: player1Timeline.positions.slice(0, 5).map((pos) => ({
            timestamp: pos.timestamp,
            isDead: pos.isDead,
            position: pos.position,
          })),
        }
      : null,
  };

  fs.writeFileSync('calculateActorPositions-debug.json', JSON.stringify(debugResult, null, 2));
  console.log('\nDebug result saved to calculateActorPositions-debug.json');
} catch (error) {
  console.error('Error running calculateActorPositions:', error);
}
