#!/usr/bin/env node

/**
 * Update manifest.json with version-based cache busting
 * This script updates the web app manifest with version information
 */

const fs = require('fs');
const path = require('path');

// Read the generated version info
const versionPath = path.join(__dirname, '..', 'src', 'version.json');
if (!fs.existsSync(versionPath)) {
  console.error('❌ version.json not found. Run generate-version.js first.');
  process.exit(1);
}

const versionInfo = JSON.parse(fs.readFileSync(versionPath, 'utf8'));

// Read the current manifest
const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Store original values if not already stored
const originalDescription = manifest.original_description || manifest.description.replace(/ \[Build: [^\]]+\]/g, '');
const originalStartUrl = manifest.original_start_url || manifest.start_url.split('?')[0];

// Update manifest with version info
manifest.version = versionInfo.buildId;
manifest.version_name = `${versionInfo.version} (${versionInfo.shortCommit})`;
manifest.original_description = originalDescription;
manifest.original_start_url = originalStartUrl;

// Add cache-busting query parameters to start_url
const separator = originalStartUrl.includes('?') ? '&' : '?';
manifest.start_url = `${originalStartUrl}${separator}${versionInfo.cacheBuster}`;

// Update description to include build info in development
if (process.env.NODE_ENV !== 'production') {
  manifest.description = `${originalDescription} [Build: ${versionInfo.shortCommit}]`;
} else {
  manifest.description = originalDescription;
}

// Write updated manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('✅ Updated manifest.json with version:', versionInfo.buildId);
