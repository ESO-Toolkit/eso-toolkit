/**
 * Check actor classification to understand position behavior
 */

import fs from 'fs';
import path from 'path';

async function checkActorClassification() {
  console.log('🔍 Checking actor classification...\n');

  const dataDir = 'data-downloads/baJFfYC8trPhHMQp';

  // Load master data to see actor types
  const masterDataPath = path.join(dataDir, 'master-data.json');
  const masterData = JSON.parse(fs.readFileSync(masterDataPath, 'utf8'));
  const actors = masterData.reportData?.report?.masterData?.actors || [];

  console.log('📊 Actor information:');
  actors.slice(0, 15).forEach((actor: any) => {
    console.log(
      `  Actor ${actor.id}: ${actor.name} (type: ${actor.type}, server: ${actor.server})`,
    );
  });

  // Look for Actor 1 specifically
  const actor1 = actors.find((a: any) => a.id === 1);
  if (actor1) {
    console.log(`\n🎯 Actor 1 details:`);
    console.log(JSON.stringify(actor1, null, 2));
  }

  // Load actors by type
  const actorsByTypePath = path.join(dataDir, 'actors-by-type.json');
  if (fs.existsSync(actorsByTypePath)) {
    const actorsByType = JSON.parse(fs.readFileSync(actorsByTypePath, 'utf8'));
    console.log(`\n📋 Actors by type:`);

    for (const [type, actorList] of Object.entries(actorsByType)) {
      const actors = actorList as any[];
      console.log(`  ${type}: ${actors.length} actors`);

      // Check if Actor 1 is in this type
      const hasActor1 = actors.some((a) => a.id === 1);
      if (hasActor1) {
        console.log(`    ⭐ Actor 1 is classified as: ${type}`);
      }
    }
  }
}

// Run the check
checkActorClassification().catch(console.error);
