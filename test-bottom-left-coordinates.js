#!/usr/bin/env node

/**
 * Bottom-Left Coordinate System Demonstration
 *
 * Compares center-based vs bottom-left coordinate conversion
 * using our boss position data.
 */

// Mock the coordinate conversion functions for testing
function convertCoordinatesWithCenter(x, y, centerX, centerY) {
  const scale = 100;
  const x3D = (x - centerX) / scale;
  const z3D = -(y - centerY) / scale;
  return [x3D, 0, z3D];
}

function convertCoordinatesWithBottomLeft(x, y, bottomLeftX, bottomLeftY) {
  const scale = 100;
  const x3D = (x - bottomLeftX) / scale;
  const z3D = -(y - bottomLeftY) / scale;
  return [x3D, 0, z3D];
}

// Test data from our boss position analysis
const testCases = [
  {
    name: 'Kazpian',
    position: { x: 47.5, y: 66.5 },
  },
  {
    name: 'Falgravn',
    position: { x: 50.59, y: 50.29 },
  },
  {
    name: 'Taleria',
    position: { x: 49.35, y: 41.8 },
  },
  {
    name: 'Lokkestiiz',
    position: { x: 58.62, y: 40.79 },
  },
  {
    name: "Z'Maja",
    position: { x: 53.32, y: 42.04 },
  },
];

// Simulated bounding box (typical arena bounds)
const boundingBox = {
  minX: 40.0, // Bottom-left X
  maxX: 60.0, // Top-right X
  minY: 35.0, // Bottom-left Y
  maxY: 70.0, // Top-right Y
};

const centerX = (boundingBox.minX + boundingBox.maxX) / 2; // 50.0
const centerY = (boundingBox.minY + boundingBox.maxY) / 2; // 52.5

console.log('🎯 Bottom-Left vs Center-Based Coordinate Comparison');
console.log('=====================================================\n');

console.log(`📊 Arena Info:`);
console.log(
  `   Bounding Box: (${boundingBox.minX}, ${boundingBox.minY}) to (${boundingBox.maxX}, ${boundingBox.maxY})`,
);
console.log(`   Center: (${centerX}, ${centerY})`);
console.log(`   Bottom-Left: (${boundingBox.minX}, ${boundingBox.minY})`);
console.log('');

testCases.forEach((testCase) => {
  const { name, position } = testCase;

  // Convert using center-based system
  const [centerX3D, centerY3D, centerZ3D] = convertCoordinatesWithCenter(
    position.x,
    position.y,
    centerX,
    centerY,
  );

  // Convert using bottom-left system
  const [blX3D, blY3D, blZ3D] = convertCoordinatesWithBottomLeft(
    position.x,
    position.y,
    boundingBox.minX,
    boundingBox.minY,
  );

  console.log(`🏹 ${name}:`);
  console.log(`   ESO Coordinates: (${position.x}, ${position.y})`);
  console.log(
    `   Center-based 3D: (${centerX3D.toFixed(3)}, ${centerY3D.toFixed(3)}, ${centerZ3D.toFixed(3)})`,
  );
  console.log(
    `   Bottom-left 3D:  (${blX3D.toFixed(3)}, ${blY3D.toFixed(3)}, ${blZ3D.toFixed(3)})`,
  );
  console.log('');
});

console.log('✨ Bottom-Left Coordinate System Benefits:');
console.log('- 🎯 Intuitive positioning: (0,0,0) = bottom-left corner');
console.log('- 📐 All coordinates are positive within the arena');
console.log('- 🎮 More familiar for game developers (standard screen coordinates)');
console.log('- 🔧 Easier debugging and visualization');
console.log('- 📊 Direct correlation with bounding box dimensions');
