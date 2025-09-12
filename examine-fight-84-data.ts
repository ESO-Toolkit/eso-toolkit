/**
 * Simple test to examine Fight 84 data structure
 */

import fs from 'fs';
import path from 'path';

async function examineFight84Data() {
  console.log('🔍 Examining Fight 84 data structure...\n');

  const dataDir = 'data-downloads/baJFfYC8trPhHMQp/fight-84';

  // Check death events first
  const deathEventsPath = path.join(dataDir, 'events/death-events.json');
  const deathData = JSON.parse(fs.readFileSync(deathEventsPath, 'utf8'));

  console.log('📊 Death events file structure:');
  console.log(JSON.stringify(deathData, null, 2).substring(0, 500) + '...\n');

  // Navigate to actual events data
  let actualDeathEvents = deathData;
  if (deathData.reportData?.report?.events?.data) {
    actualDeathEvents = deathData.reportData.report.events.data;
  }

  console.log(`💀 Death events count: ${actualDeathEvents.length}`);
  if (actualDeathEvents.length > 0) {
    console.log('Sample death event:');
    console.log(JSON.stringify(actualDeathEvents[0], null, 2));
  }

  // Check damage events for position data
  const damageEventsPath = path.join(dataDir, 'events/damage-events.json');
  const damageData = JSON.parse(fs.readFileSync(damageEventsPath, 'utf8'));

  let actualDamageEvents = damageData;
  if (damageData.reportData?.report?.events?.data) {
    actualDamageEvents = damageData.reportData.report.events.data;
  }

  console.log(`\n⚔️ Damage events count: ${actualDamageEvents.length}`);

  // Check first few events for position data
  const eventsWithPosition = actualDamageEvents.filter(
    (event: any) => typeof event.x === 'number' && typeof event.y === 'number',
  );

  console.log(`📍 Damage events with position data: ${eventsWithPosition.length}`);

  if (eventsWithPosition.length > 0) {
    console.log('Sample damage event with position:');
    console.log(JSON.stringify(eventsWithPosition[0], null, 2));
  } else if (actualDamageEvents.length > 0) {
    console.log('Sample damage event (no position):');
    console.log(JSON.stringify(actualDamageEvents[0], null, 2));
  }

  // Check all events combined
  const allEventsPath = path.join(dataDir, 'events/all-events.json');
  const allEventsData = JSON.parse(fs.readFileSync(allEventsPath, 'utf8'));

  let allEvents = allEventsData;
  if (allEventsData.reportData?.report?.events?.data) {
    allEvents = allEventsData.reportData.report.events.data;
  }

  console.log(`\n📋 All events count: ${allEvents.length}`);

  const allEventsWithPosition = allEvents.filter(
    (event: any) => typeof event.x === 'number' && typeof event.y === 'number',
  );

  console.log(`📍 All events with position data: ${allEventsWithPosition.length}`);

  if (allEventsWithPosition.length > 0) {
    console.log('Sample event with position from all events:');
    console.log(JSON.stringify(allEventsWithPosition[0], null, 2));
  }

  // Look at the metadata to understand the structure
  const metadataPath = path.join(dataDir, 'events/all-events-metadata.json');
  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    console.log('\n📊 Events metadata:');
    console.log(JSON.stringify(metadata, null, 2));
  }
}

// Run the examination
examineFight84Data().catch(console.error);
