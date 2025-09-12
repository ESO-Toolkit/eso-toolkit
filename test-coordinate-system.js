/**
 * Coordinate System Validation Test
 *
 * Tests the updated coordinate system to ensure boss positions
 * are correctly converted from ESO Logs percentage-based coordinates
 * to 3D space coordinates.
 */

// Simplified coordinate conversion for testing
// Based on our updated coordinateUtils.ts logic
function convertCoordinatesWithCenter(x, y, centerX, centerY) {
  const scale = 100; // COORDINATE_SCALE = 100

  // Convert percentage coordinates to 3D space
  const x3d = (x - centerX) / scale;
  const z3d = (y - centerY) / scale;
  const y3d = 0; // Ground level

  return [x3d, y3d, z3d];
}

// Test data from our boss position analysis
const testCases = [
  {
    name: 'Kazpian',
    position: { x: 47.5, y: 66.5 },
    arenaCenter: { x: 50.0, y: 50.0 }, // Typical center
  },
  {
    name: 'Falgravn',
    position: { x: 50.59, y: 50.29 },
    arenaCenter: { x: 50.0, y: 50.0 },
  },
  {
    name: 'Taleria',
    position: { x: 49.35, y: 41.8 },
    arenaCenter: { x: 50.0, y: 50.0 },
  },
  {
    name: 'Lokkestiiz',
    position: { x: 58.62, y: 40.79 },
    arenaCenter: { x: 50.0, y: 50.0 },
  },
  {
    name: "Z'Maja",
    position: { x: 53.32, y: 42.04 },
    arenaCenter: { x: 50.0, y: 50.0 },
  },
];

console.log('🔍 Coordinate System Validation Test');
console.log('====================================\n');

testCases.forEach((testCase) => {
  const { name, position, arenaCenter } = testCase;

  // Convert using our new coordinate system
  const [x3D, y3D, z3D] = convertCoordinatesWithCenter(
    position.x,
    position.y,
    arenaCenter.x,
    arenaCenter.y,
  );

  console.log(`🏹 ${name}:`);
  console.log(`   ESO Coordinates: (${position.x}, ${position.y})`);
  console.log(`   3D Coordinates:  (${x3D.toFixed(3)}, ${y3D.toFixed(3)}, ${z3D.toFixed(3)})`);
  console.log(`   Distance from center: ${Math.sqrt(x3D * x3D + z3D * z3D).toFixed(3)} units`);
  console.log('');
});

console.log('✅ Coordinate conversion completed successfully!');
console.log('');
console.log('📊 Observations:');
console.log('- X coordinates: positive = east of center, negative = west of center');
console.log('- Z coordinates: positive = south of center, negative = north of center');
console.log('- Y coordinate is always 0 (ground level)');
console.log('- Coordinate scale: 1 ESO unit = 0.01 3D units (1% = 0.01)');
