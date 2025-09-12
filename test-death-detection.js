// Import required modules
const fs = require('fs');
const path = require('path');

// We need to compile and run the TypeScript calculateActorPositions function
// Let's create a simplified version that mimics the function structure

// Mock data to match the function's expected input format
const fightInfo = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/fight-info.json', 'utf8'),
);
const deathEvents = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/events/death-events.json', 'utf8'),
);
const damageEvents = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/events/damage-events.json', 'utf8'),
);
const healingEvents = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/events/healing-events.json', 'utf8'),
);
const castEvents = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/events/cast-events.json', 'utf8'),
);

// Transform the data to match what calculateActorPositions expects
const mockFight = {
  id: fightInfo.id,
  name: fightInfo.name,
  startTime: fightInfo.startTime,
  endTime: fightInfo.endTime,
  actors: [
    // Mock actors for players 1-14
    ...fightInfo.friendlyPlayers.map((id) => ({
      id,
      name: `Player${id}`,
      type: 'PC',
      subType: 'Player',
      gameID: 0,
      petOwner: null,
      server: 'test',
    })),
  ],
};

// Combine all events and add proper typing
const allEvents = [
  ...deathEvents.reportData.report.events.data.map((e) => ({ ...e, type: 'death' })),
  ...damageEvents.reportData.report.events.data.map((e) => ({ ...e, type: 'damage' })),
  ...healingEvents.reportData.report.events.data.map((e) => ({ ...e, type: 'heal' })),
  ...castEvents.reportData.report.events.data.map((e) => ({ ...e, type: 'cast' })),
].sort((a, b) => a.timestamp - b.timestamp);

console.log('=== PREPARED DATA FOR CALCULATEACTORPOSITIONS ===');
console.log('Fight:', mockFight.name);
console.log('Actors:', mockFight.actors.length);
console.log('Events:', allEvents.length);

// Find death events for testing
const deaths = allEvents.filter((e) => e.type === 'death');
console.log('Death events:', deaths.length);

// Test death detection logic manually
const actorDeathTime = new Map();
const actorResurrectionTime = new Map();

// Process death events
deaths.forEach((event) => {
  actorDeathTime.set(event.targetID, event.timestamp);
  console.log(
    `Death recorded: Actor ${event.targetID} at ${event.timestamp - mockFight.startTime}ms`,
  );
});

// Test if a specific player (Player 1) would be marked as dead
const testTimestamp = fightInfo.startTime + 60000; // 60 seconds into fight
const playerId = 1;
const deathTime = actorDeathTime.get(playerId);
const resurrectionTime = actorResurrectionTime.get(playerId);

console.log(`\n=== TESTING DEATH STATUS AT 60 SECONDS ===`);
console.log(
  `Player ${playerId} death time:`,
  deathTime ? deathTime - fightInfo.startTime + 'ms' : 'not dead',
);
console.log(`Test timestamp: 60000ms`);

const isDead =
  deathTime !== undefined &&
  testTimestamp >= deathTime &&
  (resurrectionTime === undefined || testTimestamp < resurrectionTime);

console.log(`Player ${playerId} should be dead at 60s:`, isDead);

// Save this analysis for debugging
const debugOutput = {
  fightInfo: {
    id: fightInfo.id,
    name: fightInfo.name,
    startTime: fightInfo.startTime,
    endTime: fightInfo.endTime,
    duration: fightInfo.endTime - fightInfo.startTime,
  },
  playerDeaths: deaths
    .filter((e) => fightInfo.friendlyPlayers.includes(e.targetID))
    .map((e) => ({
      playerId: e.targetID,
      deathTime: e.timestamp,
      relativeTime: e.timestamp - fightInfo.startTime,
    })),
  testResults: {
    playerId,
    deathTime: deathTime ? deathTime - fightInfo.startTime : null,
    testTime: 60000,
    isDead,
  },
};

fs.writeFileSync('debug-death-detection.json', JSON.stringify(debugOutput, null, 2));
console.log('\nDebug output saved to debug-death-detection.json');
