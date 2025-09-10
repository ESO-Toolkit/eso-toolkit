#!/usr/bin/env node

/**
 * Fix cache busting version mismatch by regenerating version files
 * This script should be run when you see "New version available" in development
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🔧 Fixing cache busting version mismatch...');

try {
  // Generate fresh version information
  console.log('📝 Generating version information...');
  execSync('node scripts/generate-version.js', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });

  console.log('✅ Cache busting version mismatch fixed!');
  console.log('💡 The version files have been regenerated.');
  console.log('🔄 You may need to refresh your browser to see the changes.');
} catch (error) {
  console.error('❌ Failed to fix cache busting:', error.message);
  process.exit(1);
}
