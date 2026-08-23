#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Function to get file size in KB
function getFileSizeInKB(filePath) {
  return Math.round((fs.statSync(filePath).size / 1024) * 100) / 100;
}

function getGzipSizeInKB(filePath) {
  const compressed = zlib.gzipSync(fs.readFileSync(filePath), { level: 9 });
  return Math.round((compressed.length / 1024) * 100) / 100;
}

// Vite emits hashed JavaScript chunks under build/assets. Keep the legacy
// fallback so this helper remains useful if it is pointed at an older CRA
// artifact while making the current production build the default.
const buildRoot = path.join(__dirname, '..', 'build');
const buildDir = fs.existsSync(path.join(buildRoot, 'assets'))
  ? path.join(buildRoot, 'assets')
  : path.join(buildRoot, 'static', 'js');

if (!fs.existsSync(buildDir)) {
  console.error(`Build JavaScript directory not found: ${buildDir}`);
  process.exit(1);
}

const files = fs
  .readdirSync(buildDir)
  .filter((file) => file.endsWith('.js') && !file.endsWith('.map'))
  .map((file) => ({
    name: file,
    size: getFileSizeInKB(path.join(buildDir, file)),
    gzip: getGzipSizeInKB(path.join(buildDir, file)),
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

  if (file.name.includes('main.') || /^index-[^/]+\.js$/.test(file.name)) {
    type = ' (Main Bundle)';
    mainBundle = file.size;
  } else {
    type = ' (Async Chunk)';
    asyncChunks += file.size;
  }

  console.log(`${index + 1}. ${file.name}${type}`);
  console.log(`   Size: ${file.size} KB (${percentage}%)`);

  console.log(`   Gzipped: ${file.gzip} KB`);
  console.log();
});

console.log('Summary:');
console.log('========');
console.log(`Total Bundle Size: ${totalSize} KB`);
console.log(`Main Bundle: ${mainBundle} KB`);
console.log(`Async Chunks: ${asyncChunks} KB`);
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
