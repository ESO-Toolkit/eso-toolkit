#!/usr/bin/env node

/**
 * Download test data for screen size tests
 * 
 * This script downloads all the data needed for screen size tests using the
 * specific report code and fight ID that the tests use. It ensures consistent
 * test data and eliminates the need for API calls during test execution.
 * 
 * Usage:
 *   npm run download-test-data
 *   
 * The script will download data for:
 * - Report: nbKdDtT4NcZyVrvX 
 * - Fight: 117
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Test configuration - matches what the screen size tests use
const TEST_REPORT_CODE = 'nbKdDtT4NcZyVrvX';
const TEST_FIGHT_ID = '117';
const DATA_DIR = path.join(process.cwd(), 'data-downloads');

console.log('🎯 Downloading test data for screen size tests...');
console.log(`📋 Report: ${TEST_REPORT_CODE}`);
console.log(`⚔️  Fight: ${TEST_FIGHT_ID}`);
console.log(`📁 Output: ${DATA_DIR}`);
console.log('');

try {
  // Ensure data directory exists
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Run the download script with our test parameters
  const command = `npm run download-report-data ${TEST_REPORT_CODE} ${TEST_FIGHT_ID}`;
  console.log(`🚀 Executing: ${command}`);
  console.log('');

  execSync(command, { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('');
  console.log('✅ Test data download completed!');
  console.log('');
  console.log('📁 Data has been saved to:');
  console.log(`   ${path.join(DATA_DIR, TEST_REPORT_CODE, `fight-${TEST_FIGHT_ID}`)}`);
  console.log('');
  console.log('🧪 Screen size tests can now run offline using this pre-downloaded data.');

} catch (error) {
  console.error('');
  console.error('❌ Failed to download test data:');
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  console.error('');
  console.error('💡 Make sure you have:');
  console.error('   - Valid OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET in .env');
  console.error('   - Internet connection');
  console.error('   - ESO Logs API access');
  process.exit(1);
}