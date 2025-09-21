#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to get file size in KB
function getFileSizeInKB(filePath) {
  const stats = fs.statSync(filePath);
  return Math.round((stats.size / 1024) * 100) / 100;
}

// Get all JS files in build directory
const buildDir = path.join(__dirname, 'build', 'static', 'js');
const files = fs
  .readdirSync(buildDir)
  .filter((file) => file.endsWith('.js') && !file.endsWith('.map'))
  .map((file) => ({
    name: file,
    size: getFileSizeInKB(path.join(buildDir, file)),
  }))
  .sort((a, b) => b.size - a.size);

console.log('📦 Bundle Analysis Report');
console.log('========================');

const totalSize = files.reduce((sum, file) => sum + file.size, 0);
let asyncChunks = 0;
let mainBundle = 0;

files.forEach((file, index) => {
  const percentage = ((file.size / totalSize) * 100).toFixed(1);
  let type = '';

  if (file.name.includes('main.')) {
    type = ' (Main Bundle)';
    mainBundle = file.size;
  } else {
    type = ' (Async Chunk)';
    asyncChunks += file.size;
  }

  console.log(`${index + 1}. ${file.name}${type}`);
  console.log(`   Size: ${file.size} KB (${percentage}%)`);

  // Estimate gzipped size (roughly 30% of original)
  const gzippedSize = Math.round(file.size * 0.3 * 100) / 100;
  console.log(`   Estimated Gzipped: ~${gzippedSize} KB`);
  console.log();
});

console.log('Summary:');
console.log('========');
console.log(`Total Bundle Size: ${totalSize} KB`);
console.log(`Main Bundle: ${mainBundle} KB (~${Math.round(mainBundle * 0.3)} KB gzipped)`);
console.log(`Async Chunks: ${asyncChunks} KB (~${Math.round(asyncChunks * 0.3)} KB gzipped)`);
console.log(`Number of Chunks: ${files.length}`);

// Performance recommendations
console.log('\n🚀 Performance Recommendations:');
console.log('===============================');
if (mainBundle > 500) {
  console.log('⚠️  Main bundle is still large (>500KB). Consider more code splitting.');
}
if (files.some((f) => f.size > 1000)) {
  console.log('⚠️  Some chunks are >1MB. Consider lazy loading these features.');
}
if (files.length > 10) {
  console.log('✅ Good chunk splitting - multiple small chunks improve caching.');
}
console.log('✅ Enable gzip compression on your server for ~70% size reduction.');
console.log('✅ Consider preloading critical chunks for better performance.');
