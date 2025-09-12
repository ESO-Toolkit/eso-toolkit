/**
 * Examine death events in Fight 84 to understand why actors aren't being marked as dead
 */

import fs from 'fs';
import path from 'path';

interface DeathEvent {
  timestamp: number;
  type: string;
  sourceID: number;
  targetID: number;
  sourceIsFriendly: boolean;
  targetIsFriendly: boolean;
  killerID?: number;
  killingAbilityGameID?: number;
  sourceResources?: any;
  targetResources?: any;
}

async function examineDeathEvents() {
  console.log('💀 Examining death events in Fight 84...\n');

  const dataDir = 'data-downloads/baJFfYC8trPhHMQp/fight-84';
  const deathEventsPath = path.join(dataDir, 'events/death-events.json');

  const deathData = JSON.parse(fs.readFileSync(deathEventsPath, 'utf8'));
  const deathEvents: DeathEvent[] = deathData.reportData?.report?.events?.data || deathData;

  console.log(`📊 Total death events: ${deathEvents.length}\n`);

  // Load fight info to get timing context
  const fightInfoPath = path.join(dataDir, 'fight-info.json');
  const fightData = JSON.parse(fs.readFileSync(fightInfoPath, 'utf8'));
  const fightInfo = fightData.reportData?.report?.fights?.data?.[0] || fightData;

  const fightStart = fightInfo.startTime;
  const fightEnd = fightInfo.endTime;
  const fightDuration = fightEnd - fightStart;

  console.log(
    `⏱️ Fight timing: ${fightStart} -> ${fightEnd} (${fightDuration / 1000}s duration)\n`,
  );

  // Analyze each death event
  deathEvents.forEach((death, index) => {
    const relativeTime = death.timestamp - fightStart;
    const relativePercent = ((relativeTime / fightDuration) * 100).toFixed(1);

    console.log(`💀 Death ${index + 1}:`);
    console.log(
      `  Timestamp: ${death.timestamp} (${relativeTime}ms into fight, ${relativePercent}%)`,
    );
    console.log(`  Victim: Actor ${death.targetID} (friendly: ${death.targetIsFriendly})`);
    console.log(`  Killer: Actor ${death.sourceID} (friendly: ${death.sourceIsFriendly})`);

    if (death.targetResources) {
      console.log(`  Victim position: (${death.targetResources.x}, ${death.targetResources.y})`);
      console.log(
        `  Victim HP: ${death.targetResources.hitPoints}/${death.targetResources.maxHitPoints}`,
      );
    }

    if (death.sourceResources) {
      console.log(`  Killer position: (${death.sourceResources.x}, ${death.sourceResources.y})`);
    }

    console.log('');
  });

  // Check which actors died
  const deadActors = new Set(deathEvents.map((d) => d.targetID));
  console.log(`🎭 Unique actors that died: ${Array.from(deadActors).join(', ')}`);
  console.log(`   Count: ${deadActors.size} unique actors\n`);

  // Check for resurrections or multiple deaths
  const deathCounts = new Map<number, number>();
  deathEvents.forEach((death) => {
    const count = deathCounts.get(death.targetID) || 0;
    deathCounts.set(death.targetID, count + 1);
  });

  console.log(`📊 Death counts per actor:`);
  for (const [actorId, count] of deathCounts.entries()) {
    console.log(`  Actor ${actorId}: ${count} death(s)`);
  }

  // Load player data to see if we can identify the dead actors
  const masterDataPath = path.join('data-downloads/baJFfYC8trPhHMQp', 'master-data.json');
  if (fs.existsSync(masterDataPath)) {
    const masterData = JSON.parse(fs.readFileSync(masterDataPath, 'utf8'));
    const actors = masterData.reportData?.report?.masterData?.actors || [];

    console.log(`\n🎭 Actor information:`);
    for (const actorId of deadActors) {
      const actor = actors.find((a: any) => a.id === actorId);
      if (actor) {
        console.log(`  Actor ${actorId}: ${actor.name} (${actor.type}, server: ${actor.server})`);
      } else {
        console.log(`  Actor ${actorId}: [Unknown actor]`);
      }
    }
  }
}

// Run the examination
examineDeathEvents().catch(console.error);
