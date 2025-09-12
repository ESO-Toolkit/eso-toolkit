const fs = require('fs');

// Load the data files
const fightInfo = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/fight-info.json', 'utf8'),
);
const deathEvents = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/events/death-events.json', 'utf8'),
);
const damageEvents = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/events/damage-events.json', 'utf8'),
);

console.log('=== FIGHT ANALYSIS ===');
console.log('Fight:', fightInfo.name);
console.log('Duration:', fightInfo.duration);
console.log('Start Time:', fightInfo.startTime);

// Extract death events
const deaths = deathEvents.reportData.report.events.data;
console.log(`\n=== DEATH EVENTS (${deaths.length}) ===`);
deaths.forEach((event, index) => {
  const relativeTime = event.timestamp - fightInfo.startTime;
  console.log(
    `${index + 1}. Target ID: ${event.targetID} died at ${relativeTime}ms (absolute: ${event.timestamp})`,
  );
});

// Look for players who died (IDs 1-14 are friendly players)
const playerDeaths = deaths.filter((event) => fightInfo.friendlyPlayers.includes(event.targetID));

console.log(`\n=== PLAYER DEATHS (${playerDeaths.length}) ===`);
playerDeaths.forEach((event, index) => {
  const relativeTime = event.timestamp - fightInfo.startTime;
  console.log(`${index + 1}. Player ID: ${event.targetID} died at ${relativeTime}ms`);
});

// Sample some damage events to see position data
const sampleDamage = damageEvents.reportData.report.events.data.slice(0, 10);
console.log(`\n=== SAMPLE DAMAGE EVENTS (first 10) ===`);
sampleDamage.forEach((event, index) => {
  const relativeTime = event.timestamp - fightInfo.startTime;
  if (event.x !== undefined && event.y !== undefined) {
    console.log(
      `${index + 1}. Source ID: ${event.sourceID} at (${event.x}, ${event.y}) facing: ${event.facing} at ${relativeTime}ms`,
    );
  }
});

// Now let's manually test what calculateActorPositions would do
// First, let's see if we have data for when a player dies
if (playerDeaths.length > 0) {
  const firstPlayerDeath = playerDeaths[0];
  const deathTime = firstPlayerDeath.timestamp - fightInfo.startTime;
  const playerId = firstPlayerDeath.targetID;

  console.log(`\n=== TESTING DEATH DETECTION ===`);
  console.log(`Player ${playerId} died at ${deathTime}ms`);

  // Look for damage events from this player before and after death
  const playerDamageEvents = damageEvents.reportData.report.events.data
    .filter(
      (event) => event.sourceID === playerId && event.x !== undefined && event.y !== undefined,
    )
    .slice(0, 20); // Limit to first 20 for analysis

  console.log(`\nDamage events from Player ${playerId}:`);
  playerDamageEvents.forEach((event) => {
    const relativeTime = event.timestamp - fightInfo.startTime;
    const isBeforeDeath = relativeTime < deathTime;
    console.log(
      `- At ${relativeTime}ms: (${event.x}, ${event.y}) facing ${event.facing} [${isBeforeDeath ? 'BEFORE' : 'AFTER'} death]`,
    );
  });
}

console.log('\n=== ANALYSIS COMPLETE ===');
