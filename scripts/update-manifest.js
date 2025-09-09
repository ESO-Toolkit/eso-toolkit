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

// Default manifest structure
const defaultManifest = {
  short_name: 'ESO Log Insights',
  name: 'ESO Log Insights by NotaGuild',
  description: 'Advanced analytics and visualization tool for Elder Scrolls Online combat logs',
  icons: [
    {
      src: 'favicon.ico',
      sizes: '64x64 32x32 24x24 16x16',
      type: 'image/x-icon',
    },
    {
      src: 'android-chrome-192x192.png',
      type: 'image/png',
      sizes: '192x192',
    },
    {
      src: 'android-chrome-512x512.png',
      type: 'image/png',
      sizes: '512x512',
    },
  ],
  start_url: '.',
  display: 'standalone',
  theme_color: '#7289da',
  background_color: '#1a1a1a',
};

// Read or create the manifest
const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
const publicDir = path.dirname(manifestPath);

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('📁 Created public directory');
}

let manifest;

if (fs.existsSync(manifestPath)) {
  try {
    const existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    // Merge existing manifest with defaults to preserve customizations
    manifest = { ...defaultManifest, ...existingManifest };
    console.log('📄 Found existing manifest.json');
  } catch (error) {
    console.warn('⚠️  Invalid manifest.json found, creating new one');
    manifest = { ...defaultManifest };
  }
} else {
  console.log('📄 manifest.json not found, creating new one');
  manifest = { ...defaultManifest };
}

// Store original values if not already stored
const originalDescription =
  manifest.original_description ||
  (manifest.description
    ? manifest.description.replace(/ \[Build: [^\]]+\]/g, '')
    : defaultManifest.description);
const originalStartUrl =
  manifest.original_start_url ||
  (manifest.start_url ? manifest.start_url.split('?')[0] : defaultManifest.start_url);

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
console.log('   📁 Manifest path:', manifestPath);
console.log('   🏷️  Start URL:', manifest.start_url);
