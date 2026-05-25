#!/usr/bin/env node

/**
 * GitHub Action Setup Verification Script
 * Verifies that the screen size testing GitHub Action is properly configured
 */

const fs = require('fs');
const path = require('path');

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`);
  return exists;
}

function checkDirectory(dirPath, description) {
  const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  console.log(`${exists ? '✅' : '❌'} ${description}: ${dirPath}`);
  return exists;
}

function checkPackageScript(scriptName, packageJsonPath = './package.json') {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const exists = packageJson.scripts && packageJson.scripts[scriptName];
    console.log(`${exists ? '✅' : '❌'} NPM Script "${scriptName}": ${exists ? 'configured' : 'missing'}`);
    return !!exists;
  } catch (error) {
    console.log(`❌ Could not read package.json: ${error.message}`);
    return false;
  }
}

console.log('🔍 GitHub Action Screen Size Testing Setup Verification\n');

// Check core files
console.log('📁 Core Files:');
const coreFiles = [
  ['.github/workflows/screen-size-testing.yml', 'Screen Size Testing Workflow'],
  ['playwright.screen-sizes.config.ts', 'Playwright Screen Size Config'],
  ['documentation/SCREEN_SIZE_TESTING.md', 'Screen Size Testing Documentation'],
  ['documentation/GITHUB_ACTION_SETUP.md', 'GitHub Action Setup Guide'],
];

// External repository deployment (no separate index workflow needed)
console.log('✅ Reports Deployment: External repository (ESO-Toolkit/eso-log-aggregator-reports)');

let allCoreFilesExist = true;
coreFiles.forEach(([filePath, description]) => {
  if (!checkFile(filePath, description)) {
    allCoreFilesExist = false;
  }
});

console.log('\n📂 Test Directories:');
const testDirs = [
  ['tests/screen-sizes', 'Screen Size Test Directory'],
];

let allTestDirsExist = true;
testDirs.forEach(([dirPath, description]) => {
  if (!checkDirectory(dirPath, description)) {
    allTestDirsExist = false;
  }
});

console.log('\n📋 NPM Scripts:');
const requiredScripts = [
  'test:screen-sizes',
  'test:screen-sizes:mobile',
  'test:screen-sizes:tablet', 
  'test:screen-sizes:desktop',
  'test:screen-sizes:report',
  'test:screen-sizes:update-snapshots',
];

let allScriptsExist = true;
requiredScripts.forEach(scriptName => {
  if (!checkPackageScript(scriptName)) {
    allScriptsExist = false;
  }
});

console.log('\n🔧 Configuration Checks:');

// Check Playwright config
let playwrightConfigValid = false;
try {
  const configContent = fs.readFileSync('playwright.screen-sizes.config.ts', 'utf8');
  const hasOutputDir = configContent.includes('outputDir');
  const hasProjects = configContent.includes('Mobile Portrait Small');
  const hasReporter = configContent.includes('screen-size-report');
  
  console.log(`${hasOutputDir ? '✅' : '❌'} Playwright output directory configured`);
  console.log(`${hasProjects ? '✅' : '❌'} Multiple device projects configured`);
  console.log(`${hasReporter ? '✅' : '❌'} HTML reporter configured`);
  
  playwrightConfigValid = hasOutputDir && hasProjects && hasReporter;
} catch (error) {
  console.log(`❌ Could not validate Playwright config: ${error.message}`);
}

// Check .gitignore
let gitignoreValid = false;
try {
  const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
  const hasScreenSizeReports = gitignoreContent.includes('screen-size-report');
  const hasTestResults = gitignoreContent.includes('test-results-screen-sizes');
  const hasPngPatterns = gitignoreContent.includes('*-overview-*.png');
  
  console.log(`${hasScreenSizeReports ? '✅' : '❌'} .gitignore includes screen-size-report/`);
  console.log(`${hasTestResults ? '✅' : '❌'} .gitignore includes test-results-screen-sizes/`);
  console.log(`${hasPngPatterns ? '✅' : '❌'} .gitignore includes PNG file patterns`);
  
  gitignoreValid = hasScreenSizeReports && hasTestResults && hasPngPatterns;
} catch (error) {
  console.log(`❌ Could not validate .gitignore: ${error.message}`);
}

// Check test files
console.log('\n🧪 Test Files:');
const testFiles = [
  ['tests/screen-sizes/home-page.spec.ts', 'Home Page Tests'],
  ['tests/screen-sizes/log-analysis.spec.ts', 'Log Analysis Tests'],
  ['tests/screen-sizes/cross-device.spec.ts', 'Cross Device Tests'],
  ['tests/screen-sizes/visual-regression.spec.ts', 'Visual Regression Tests'],
  ['tests/screen-sizes/comprehensive-report.spec.ts', 'Comprehensive Report Tests'],
  ['tests/screen-sizes/utils.ts', 'Test Utilities'],
  ['tests/screen-sizes/README.md', 'Test Directory README'],
];

let allTestFilesExist = true;
testFiles.forEach(([filePath, description]) => {
  if (!checkFile(filePath, description)) {
    allTestFilesExist = false;
  }
});

// Overall status
console.log('\n🎯 Overall Status:');
const overallValid = allCoreFilesExist && allTestDirsExist && allScriptsExist && playwrightConfigValid && gitignoreValid && allTestFilesExist;

if (overallValid) {
  console.log('✅ Screen Size Testing GitHub Action is fully configured!');
  console.log('\n📋 Next Steps:');
  console.log('1. Push changes to GitHub');
  console.log('2. Enable GitHub Pages in repository settings (Source: GitHub Actions)');
  console.log('3. Go to Actions tab → "Screen Size Testing" → "Run workflow"');
  console.log('4. View results at: https://[username].github.io/[repository]/screen-size-reports/');
} else {
  console.log('❌ Screen Size Testing setup incomplete. Please check the missing items above.');
}

console.log('\n📚 Documentation:');
console.log('- Setup Guide: documentation/GITHUB_ACTION_SETUP.md');
console.log('- Testing Guide: documentation/SCREEN_SIZE_TESTING.md');
console.log('- Test Directory: tests/screen-sizes/README.md');

// Exit with appropriate code
process.exit(overallValid ? 0 : 1);