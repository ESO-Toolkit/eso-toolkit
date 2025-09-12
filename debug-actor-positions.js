const fs = require('fs');
const path = require('path');

// Load the data files
const reportMetadata = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/report-metadata.json', 'utf8'),
);
const playerDetails = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/player-details.json', 'utf8'),
);
const fightInfo = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/fight-info.json', 'utf8'),
);
const allEvents = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/events/all-events.json', 'utf8'),
);

console.log('Fight Info:');
console.log('- Fight ID:', fightInfo.id);
console.log('- Name:', fightInfo.name);
console.log('- Duration:', fightInfo.duration);
console.log('- Start Time:', fightInfo.startTime);
console.log('- End Time:', fightInfo.endTime);

console.log('\nFriendly Players:', fightInfo.friendlyPlayers);
console.log('Enemy Players:', fightInfo.enemyPlayers);
console.log('Friendly NPCs:', fightInfo.friendlyNPCs?.length || 0);
console.log('Enemy NPCs:', fightInfo.enemyNPCs?.length || 0);

console.log('\nAnalyzing Events:');
console.log('- Total events:', allEvents.length);

// Count events by type
const eventTypes = {};
allEvents.forEach((event) => {
  eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
});

console.log('- Event types:');
Object.entries(eventTypes).forEach(([type, count]) => {
  console.log(`  - ${type}: ${count}`);
});

// Look for death events specifically
const deathEvents = allEvents.filter((event) => event.type === 'death');
console.log(`\nDeath Events (${deathEvents.length}):`);
deathEvents.forEach((event) => {
  console.log(
    `- Target ID: ${event.targetID} died at ${event.timestamp}ms (relative: ${event.timestamp - fightInfo.startTime}ms)`,
  );
});

// Look for damage events to see if there are position data
const damageEventsWithPosition = allEvents
  .filter((event) => event.type === 'damage' && event.x !== undefined && event.y !== undefined)
  .slice(0, 5); // Just first 5 for brevity

console.log(`\nSample Damage Events with Position Data (first 5):`);
damageEventsWithPosition.forEach((event) => {
  console.log(
    `- Source ID: ${event.sourceID} at (${event.x}, ${event.y}) with facing ${event.facing} at ${event.timestamp}ms`,
  );
});

console.log('\nData analysis complete. Now testing calculateActorPositions...');
