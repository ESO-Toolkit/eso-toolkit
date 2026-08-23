#!/usr/bin/env node

/**
 * Generate version information for cache-busting
 * This script creates a version.json file with build metadata
 */

const fs = require('fs');
const path = require('path');
// SOURCE_DATE_EPOCH makes CI artifacts reproducible. Local development keeps a
// wall-clock timestamp so version.json remains useful outside a Git checkout.
const sourceDateEpoch = process.env.SOURCE_DATE_EPOCH;
const hasSourceDateEpoch = /^\d+$/.test(sourceDateEpoch || '');
const buildTimestamp = hasSourceDateEpoch ? Number(sourceDateEpoch) * 1000 : Date.now();
const buildTime = new Date(buildTimestamp).toISOString();

// Get git commit hash (if available)
let gitCommit = '';
try {
  const { execSync } = require('child_process');
  gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
  console.warn('Could not get git commit hash:', error.message);
  // Keep local/offline builds deterministic instead of inventing a random
  // release identity that cannot be traced back to source.
  gitCommit = 'unknown';
}

// Get short commit hash
const shortCommit = gitCommit.substring(0, 8);

// Get package version
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const packageVersion = packageJson.version;

// A commit-derived build ID is stable across rebuilds of the same source.
const buildId = `${packageVersion}-${shortCommit}`;

// Create version object
const versionInfo = {
  version: packageVersion,
  buildTime,
  gitCommit,
  shortCommit,
  buildId,
  timestamp: buildTimestamp,
  // Additional cache-busting parameter for URLs
  cacheBuster: `v=${buildId.replace(/[^a-zA-Z0-9]/g, '')}`,
};

// Write as JSON file for require() compatibility
const versionJsonPath = path.join(__dirname, '..', 'public', 'version.json');
fs.writeFileSync(versionJsonPath, JSON.stringify(versionInfo, null, 2));

console.log('✅ Generated version information:');
console.log(`   Version: ${packageVersion}`);
console.log(`   Build ID: ${buildId}`);
console.log(`   Commit: ${shortCommit}`);
console.log(`   Build Time: ${buildTime}`);
console.log(`   Cache Buster: ${versionInfo.cacheBuster}`);
