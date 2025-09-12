// Simple test to verify the cleaned up CalculateActorPositions module works
const {
  calculateActorPositions,
} = require('./src/workers/calculations/CalculateActorPositions.ts');

console.log('Testing cleaned up CalculateActorPositions module...');

// Test with empty data to check basic functionality
const testData = {
  fight: {
    startTime: 0,
    endTime: 10000,
    friendlyPlayers: [],
    enemyNPCs: [],
    friendlyNPCs: [],
  },
  events: {
    damage: [],
    heal: [],
    death: [],
    resource: [],
    cast: [],
  },
};

try {
  const result = calculateActorPositions(testData);
  console.log('✅ Module loads and basic function works');
  console.log('Return type has timeline:', 'timeline' in result);
  console.log('Return type has lookup:', 'lookup' in result);
  console.log(
    'Timeline structure correct:',
    typeof result.timeline === 'object' && 'actorTimelines' in result.timeline,
  );
  console.log(
    'Lookup structure correct:',
    typeof result.lookup === 'object' && 'positionsByTimestamp' in result.lookup,
  );
} catch (error) {
  console.error('❌ Error testing module:', error.message);
}
