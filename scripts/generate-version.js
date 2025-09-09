#!/usr/bin/env node

/**
 * Generate version information for cache-busting
 * This script creates a version.json file with build metadata
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Get build timestamp
const buildTime = new Date().toISOString();

// Get git commit hash (if available)
let gitCommit = '';
try {
  const { execSync } = require('child_process');
  gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
  console.warn('Could not get git commit hash:', error.message);
  // Fallback to random hash for development
  gitCommit = crypto.randomBytes(20).toString('hex');
}

// Get short commit hash
const shortCommit = gitCommit.substring(0, 8);

// Get package version
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const packageVersion = packageJson.version;

// Generate a unique build ID combining timestamp and commit
const buildId = `${packageVersion}-${shortCommit}-${Date.now()}`;

// Create version object
const versionInfo = {
  version: packageVersion,
  buildTime,
  gitCommit,
  shortCommit,
  buildId,
  timestamp: Date.now(),
  // Additional cache-busting parameter for URLs
  cacheBuster: `v=${buildId.replace(/[^a-zA-Z0-9]/g, '')}`,
};

// Write version.json to public directory (will be copied to build)
const publicVersionPath = path.join(__dirname, '..', 'public', 'version.json');
fs.writeFileSync(publicVersionPath, JSON.stringify(versionInfo, null, 2));

// Write version.json to src directory for import
const srcVersionPath = path.join(__dirname, '..', 'src', 'version.json');
fs.writeFileSync(srcVersionPath, JSON.stringify(versionInfo, null, 2));

// Write as JSON file for require() compatibility
const versionJsonPath = path.join(__dirname, '..', 'src', 'utils', 'version.json');
fs.writeFileSync(versionJsonPath, JSON.stringify(versionInfo, null, 2));

console.log('✅ Generated version information:');
console.log(`   Version: ${packageVersion}`);
console.log(`   Build ID: ${buildId}`);
console.log(`   Commit: ${shortCommit}`);
console.log(`   Build Time: ${buildTime}`);
console.log(`   Cache Buster: ${versionInfo.cacheBuster}`);
