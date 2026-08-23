#!/usr/bin/env node

/**
 * Verify the maintained public screen-size testing entry points.
 *
 * This is intentionally a repository-local check: it must not download test
 * data, start a server, or create visual artifacts.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');

function checkFile(relativePath, description) {
  const exists = fs.existsSync(path.join(root, relativePath));
  console.log(`${exists ? '✅' : '❌'} ${description}: ${relativePath}`);
  return exists;
}

function checkScript(scripts, name) {
  const configured = typeof scripts[name] === 'string' && scripts[name].length > 0;
  console.log(`${configured ? '✅' : '❌'} npm run ${name}`);
  return configured;
}

function countBaselines() {
  const snapshotDir = path.join(
    root,
    'tests',
    'screen-sizes',
    'comprehensive-visual-regression.spec.ts-snapshots',
  );

  if (!fs.existsSync(snapshotDir)) return 0;

  return fs
    .readdirSync(snapshotDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.png')).length;
}

let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
  console.error(`❌ Could not read package.json: ${error.message}`);
  process.exit(1);
}

console.log('🔍 Verifying maintained screen-size test setup\n');

const requiredFiles = [
  ['.github/workflows/screen-size-testing.yml', 'Screen-size workflow'],
  ['playwright/screen-sizes-fast.config.ts', 'Maintained Playwright config'],
  ['playwright/screen-sizes.config.ts', 'Exploratory matrix config'],
  ['tests/screen-sizes/comprehensive-visual-regression.spec.ts', 'Maintained responsive spec'],
  ['tests/screen-sizes/README.md', 'Test README'],
  ['documentation/testing/SCREEN_SIZE_TESTING.md', 'Testing documentation'],
  ['documentation/setup/GITHUB_ACTION_SETUP.md', 'GitHub Actions setup guide'],
];

let valid = requiredFiles.every(([filePath, description]) => checkFile(filePath, description));

console.log('\n📋 npm scripts:');
const requiredScripts = [
  'test:screen-sizes',
  'test:screen-sizes:fast',
  'test:screen-sizes:matrix',
  'test:screen-sizes:mobile',
  'test:screen-sizes:tablet',
  'test:screen-sizes:desktop',
  'test:screen-sizes:breakpoints',
  'test:screen-sizes:report',
];
valid = requiredScripts.every((name) => checkScript(packageJson.scripts ?? {}, name)) && valid;

const maintainedCommand = packageJson.scripts?.['test:screen-sizes'] ?? '';
const usesFastConfig = maintainedCommand.includes('playwright/screen-sizes-fast.config.ts');
console.log(`${usesFastConfig ? '✅' : '❌'} Maintained command uses fast config`);
valid = usesFastConfig && valid;

const baselineCount = countBaselines();
// Checked-in screenshots are deliberately forbidden: report data can include
// player-provided names, and public baselines become stale branding artifacts.
const baselinesValid = baselineCount === 0;
console.log(
  `${baselinesValid ? '✅' : '❌'} Checked-in visual baselines: ${baselineCount}/0 PNG files (privacy policy)`,
);
valid = baselinesValid && valid;

console.log(
  `\n${valid ? '✅ Screen-size testing setup is valid.' : '❌ Screen-size testing setup is incomplete.'}`,
);
process.exit(valid ? 0 : 1);
