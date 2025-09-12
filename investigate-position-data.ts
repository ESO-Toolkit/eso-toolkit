import fs from 'fs';

// Load the events to understand the data better
const damageEvents = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/events/damage-events.json', 'utf8'),
);
const deathEvents = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/events/death-events.json', 'utf8'),
);
const fightInfo = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/fight-info.json', 'utf8'),
);

console.log('=== INVESTIGATING EVENT DATA ===');

// Check if Player 1 has any events with position data
const player1DamageEvents = damageEvents.reportData.report.events.data.filter(
  (event: any) => event.sourceID === 1 && event.x !== undefined && event.y !== undefined,
);

console.log(`Player 1 damage events with position: ${player1DamageEvents.length}`);

if (player1DamageEvents.length > 0) {
  console.log('Sample Player 1 damage events:');
  player1DamageEvents.slice(0, 5).forEach((event: any, index: number) => {
    const relativeTime = event.timestamp - fightInfo.startTime;
    console.log(
      `${index + 1}. At ${relativeTime}ms: (${event.x}, ${event.y}) facing ${event.facing}`,
    );
  });
} else {
  console.log('Player 1 has no damage events with position data');

  // Check if Player 1 has any events at all
  const player1AllDamage = damageEvents.reportData.report.events.data.filter(
    (event: any) => event.sourceID === 1,
  );
  console.log(`Player 1 total damage events: ${player1AllDamage.length}`);

  if (player1AllDamage.length > 0) {
    console.log('Sample Player 1 events (no position):');
    player1AllDamage.slice(0, 3).forEach((event: any, index: number) => {
      const relativeTime = event.timestamp - fightInfo.startTime;
      console.log(
        `${index + 1}. At ${relativeTime}ms: ability ${event.abilityGameID}, target ${event.targetID}`,
      );
    });
  }
}

// Check which players DO have position data
console.log('\n=== PLAYERS WITH POSITION DATA ===');
const playersWithPositions = new Set();
damageEvents.reportData.report.events.data.forEach((event: any) => {
  if (
    event.x !== undefined &&
    event.y !== undefined &&
    fightInfo.friendlyPlayers.includes(event.sourceID)
  ) {
    playersWithPositions.add(event.sourceID);
  }
});

console.log('Players with position data:', Array.from(playersWithPositions));

// For a player with position data, show sample events around death time
if (playersWithPositions.size > 0) {
  const samplePlayerId = Array.from(playersWithPositions)[0] as number;
  console.log(`\n=== SAMPLE PLAYER ${samplePlayerId} DATA ===`);

  const samplePlayerEvents = damageEvents.reportData.report.events.data
    .filter(
      (event: any) =>
        event.sourceID === samplePlayerId && event.x !== undefined && event.y !== undefined,
    )
    .slice(0, 10);

  samplePlayerEvents.forEach((event: any, index: number) => {
    const relativeTime = event.timestamp - fightInfo.startTime;
    console.log(
      `${index + 1}. At ${relativeTime}ms: (${event.x}, ${event.y}) facing ${event.facing}`,
    );
  });

  // Check if this player died
  const playerDeath = deathEvents.reportData.report.events.data.find(
    (event: any) => event.targetID === samplePlayerId,
  );
  if (playerDeath) {
    const deathTime = playerDeath.timestamp - fightInfo.startTime;
    console.log(`Player ${samplePlayerId} died at ${deathTime}ms`);
  } else {
    console.log(`Player ${samplePlayerId} did not die`);
  }
}
