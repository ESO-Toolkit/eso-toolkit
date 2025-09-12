import fs from 'fs';

// Check all event types for position data
const eventFiles = [
  'damage-events.json',
  'healing-events.json',
  'cast-events.json',
  'death-events.json',
];

console.log('=== CHECKING ALL EVENT TYPES FOR POSITION DATA ===');

const fightInfo = JSON.parse(
  fs.readFileSync('data-downloads/baJFfYC8trPhHMQp/fight-16/fight-info.json', 'utf8'),
);

for (const filename of eventFiles) {
  try {
    const events = JSON.parse(
      fs.readFileSync(`data-downloads/baJFfYC8trPhHMQp/fight-16/events/${filename}`, 'utf8'),
    );
    const data = events.reportData.report.events.data;

    // Count events with position data
    const eventsWithPosition = data.filter(
      (event: any) => event.x !== undefined && event.y !== undefined,
    );

    // Count events from friendly players with position data
    const playerEventsWithPosition = data.filter(
      (event: any) =>
        event.x !== undefined &&
        event.y !== undefined &&
        fightInfo.friendlyPlayers.includes(event.sourceID),
    );

    console.log(`\n${filename}:`);
    console.log(`- Total events: ${data.length}`);
    console.log(`- Events with position: ${eventsWithPosition.length}`);
    console.log(`- Player events with position: ${playerEventsWithPosition.length}`);

    if (eventsWithPosition.length > 0) {
      // Show sample
      const sample = eventsWithPosition[0];
      console.log(
        `- Sample: sourceID=${sample.sourceID}, (${sample.x}, ${sample.y}), facing=${sample.facing}`,
      );

      // Show which source IDs have position data
      const sourceIds = new Set(eventsWithPosition.map((e: any) => e.sourceID));
      console.log(
        `- Source IDs with position: ${Array.from(sourceIds).slice(0, 10).join(', ')}${sourceIds.size > 10 ? '...' : ''}`,
      );
    }
  } catch (error) {
    console.log(`\n${filename}: Error reading file`);
  }
}

console.log('\n=== CONCLUSION ===');
console.log('If no player events have position data, then calculateActorPositions');
console.log('cannot generate position timelines, which means no actors will be rendered');
console.log('in the 3D scene, and therefore death coloring cannot be tested.');
