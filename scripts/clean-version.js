#!/usr/bin/env node

/**
 * Clean up generated version files
 * This script removes all generated version files
 */

const fs = require('fs');
const path = require('path');

const filesToClean = [
  path.join(__dirname, '..', 'public', 'version.json'),
  path.join(__dirname, '..', 'src', 'version.json'),
  path.join(__dirname, '..', 'src', 'utils', 'version.ts'),
  path.join(__dirname, '..', 'build', 'version.json'),
];

console.log('🧹 Cleaning up generated version files...');

let cleanedCount = 0;

filesToClean.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`   ✅ Removed: ${path.relative(process.cwd(), filePath)}`);
      cleanedCount++;
    } catch (error) {
      console.log(`   ❌ Failed to remove: ${path.relative(process.cwd(), filePath)} - ${error.message}`);
    }
  }
});

if (cleanedCount === 0) {
  console.log('   ℹ️  No version files found to clean');
} else {
  console.log(`✅ Cleaned up ${cleanedCount} version file(s)`);
}
