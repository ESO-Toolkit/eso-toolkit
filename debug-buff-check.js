// Quick debug script to understand the buff checking logic
// Run with: node debug-buff-check.js

// Simulated data from console logs
const buffInterval = {
  targetID: 1,
  sourceID: 1,
  start: 2577883,
  end: 3277883
};

const player = {
  id: 1,
  name: 'Tzù'
};

const fightMidpoint = 2619936;

// Simulate the check from isBuffActiveOnTarget
function checkMatch() {
  console.log('=== Buff Interval Check ===');
  console.log('buffInterval.targetID:', buffInterval.targetID, 'type:', typeof buffInterval.targetID);
  console.log('player.id:', player.id, 'type:', typeof player.id);
  console.log('fightMidpoint:', fightMidpoint);
  console.log('interval.start:', buffInterval.start);
  console.log('interval.end:', buffInterval.end);
  console.log('');
  
  console.log('=== Checks ===');
  console.log('timestamp >= interval.start:', fightMidpoint >= buffInterval.start);
  console.log('timestamp <= interval.end:', fightMidpoint <= buffInterval.end);
  console.log('interval.targetID === targetID:', buffInterval.targetID === player.id);
  console.log('');
  
  const allMatch = 
    fightMidpoint >= buffInterval.start &&
    fightMidpoint <= buffInterval.end &&
    buffInterval.targetID === player.id;
    
  console.log('=== Result ===');
  console.log('Should return true:', allMatch);
  
  return allMatch;
}

const result = checkMatch();
console.log('\nFinal result:', result);
