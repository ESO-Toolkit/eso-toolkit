#!/usr/bin/env node

/**
 * Update manifest.json with version-based cache busting
 * This script updates the web app manifest with version information
 */

const fs = require('fs');
const path = require('path');

// Read the generated version info
const versionPath = path.join(__dirname, '..', 'public', 'version.json');
if (!fs.existsSync(versionPath)) {
  console.error('❌ version.json not found. Run generate-version.cjs first.');
  process.exit(1);
}

const versionInfo = JSON.parse(fs.readFileSync(versionPath, 'utf8'));

// Default manifest structure
const defaultManifest = {
  short_name: 'ESO Toolkit',
  name: 'ESO Toolkit',
  description: 'Advanced analytics and visualization for Elder Scrolls Online combat logs',
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
  id: '/',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  lang: 'en-US',
  categories: ['utilities', 'productivity'],
  theme_color: '#0b1220',
  background_color: '#0b1220',
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
    // Preserve optional custom fields while keeping release-critical branding,
    // navigation, icon, and color defaults authoritative. Otherwise a stale
    // generated manifest silently wins over updates made in this script.
    manifest = { ...existingManifest, ...defaultManifest };
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

// Include ephemeral build metadata only when development is explicitly
// requested. Production manifests need a stable app identity and launch URL;
// hashed assets already provide cache busting for deployed releases.
const isDevelopment = process.env.NODE_ENV === 'development';
if (isDevelopment) {
  manifest.version = versionInfo.buildId;
  manifest.version_name = `${versionInfo.version} (${versionInfo.shortCommit})`;
  manifest.original_description = originalDescription;
  manifest.original_start_url = originalStartUrl;
  const separator = originalStartUrl.includes('?') ? '&' : '?';
  manifest.start_url = `${originalStartUrl}${separator}${versionInfo.cacheBuster}`;
  manifest.description = `${originalDescription} [Build: ${versionInfo.shortCommit}]`;
} else {
  manifest.description = originalDescription;
  manifest.start_url = defaultManifest.start_url;
  delete manifest.version;
  delete manifest.version_name;
  delete manifest.original_description;
  delete manifest.original_start_url;
}

// Write updated manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(
  '✅ Updated manifest.json:',
  isDevelopment ? `development build ${versionInfo.buildId}` : 'production metadata',
);
console.log('   📁 Manifest path:', manifestPath);
console.log('   🏷️  Start URL:', manifest.start_url);
