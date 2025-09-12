// Test script to verify image-only arena sizing
const { calculateArenaDimensionsFromImageOnly } = require('./src/utils/coordinateUtils.ts');

// Test different image aspect ratios
const testCases = [
  {
    name: 'Square image',
    imageDimensions: { width: 1024, height: 1024, aspectRatio: 1 },
    baseScale: 10,
  },
  {
    name: 'Wide image (2:1)',
    imageDimensions: { width: 2048, height: 1024, aspectRatio: 2 },
    baseScale: 10,
  },
  {
    name: 'Tall image (1:2)',
    imageDimensions: { width: 512, height: 1024, aspectRatio: 0.5 },
    baseScale: 10,
  },
  {
    name: 'Very wide image (4:1)',
    imageDimensions: { width: 4096, height: 1024, aspectRatio: 4 },
    baseScale: 10,
  },
  {
    name: 'Different base scale',
    imageDimensions: { width: 1024, height: 1024, aspectRatio: 1 },
    baseScale: 15,
  },
];

console.log('Testing image-only arena sizing:');
console.log('=====================================');

testCases.forEach(({ name, imageDimensions, baseScale }) => {
  const result = calculateArenaDimensionsFromImageOnly(imageDimensions, baseScale);
  console.log(`\n${name}:`);
  console.log(
    `  Input: ${imageDimensions.width}x${imageDimensions.height} (aspect: ${imageDimensions.aspectRatio})`,
  );
  console.log(`  Base scale: ${baseScale}`);
  console.log(`  Arena dimensions: ${result.width.toFixed(2)} x ${result.height.toFixed(2)}`);
  console.log(`  Arena aspect ratio: ${(result.width / result.height).toFixed(2)}`);
});
