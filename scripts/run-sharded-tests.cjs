#!/usr/bin/env node

/**
 * Script to run Playwright nightly tests with sharding support
 *
 * Usage:
 *   node scripts/run-sharded-tests.js [options]
 *
 * Options:
 *   --shards=N      Number of shards to use (default: 3)
 *   --project=NAME  Specific browser project to run
 *   --headed        Run in headed mode
 *   --help          Show this help message
 *
 * Examples:
 *   node scripts/run-sharded-tests.js --shards=4
 *   node scripts/run-sharded-tests.js --project=firefox-desktop
 *   node scripts/run-sharded-tests.js --shards=2 --project=chromium-desktop
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const shardCount = parseInt(args.find((arg) => arg.startsWith('--shards='))?.split('=')[1] || '3');
const project = args.find((arg) => arg.startsWith('--project='))?.split('=')[1];
const headed = args.includes('--headed');
const showHelp = args.includes('--help');

if (showHelp) {
  console.log(`
Playwright Nightly Test Sharding Runner

Usage:
  node scripts/run-sharded-tests.js [options]

Options:
  --shards=N      Number of shards to use (default: 3)
  --project=NAME  Specific browser project to run
  --headed        Run in headed mode
  --help          Show this help message

Examples:
  node scripts/run-sharded-tests.js --shards=4
  node scripts/run-sharded-tests.js --project=firefox-desktop
  node scripts/run-sharded-tests.js --shards=2 --project=chromium-desktop
  `);
  process.exit(0);
}

console.log(`🚀 Starting nightly tests with ${shardCount} shards...`);
if (project) {
  console.log(`📋 Running for project: ${project}`);
}

// Prepare environment variables and command arguments
const baseEnv = { ...process.env, SHARD_TOTAL: shardCount.toString() };
const baseArgs = ['test', '--config=playwright.nightly.config.ts'];

if (project) {
  baseArgs.push(`--project=${project}`);
}

if (headed) {
  baseArgs.push('--headed');
}

// Function to run a single shard
function runShard(shardIndex) {
  return new Promise((resolve, reject) => {
    const env = { ...baseEnv, SHARD_INDEX: shardIndex.toString() };

    console.log(`📦 Starting shard ${shardIndex}/${shardCount}...`);

    const child = spawn('npx', ['playwright', ...baseArgs], {
      env,
      stdio: 'pipe',
      shell: true,
      cwd: process.cwd(),
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      // Prefix each line with the shard number for identification
      console.log(
        output
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => `[Shard ${shardIndex}] ${line}`)
          .join('\n'),
      );
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error(
        output
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => `[Shard ${shardIndex} ERROR] ${line}`)
          .join('\n'),
      );
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Shard ${shardIndex} completed successfully`);
        resolve({ shardIndex, code, stdout, stderr });
      } else {
        console.log(`❌ Shard ${shardIndex} failed with exit code ${code}`);
        resolve({ shardIndex, code, stdout, stderr }); // Don't reject, let other shards complete
      }
    });

    child.on('error', (error) => {
      console.error(`💥 Shard ${shardIndex} encountered an error:`, error.message);
      reject({ shardIndex, error });
    });
  });
}

// Run all shards in parallel
async function runAllShards() {
  const startTime = Date.now();

  try {
    // Create array of shard indices (1-based)
    const shardIndices = Array.from({ length: shardCount }, (_, i) => i + 1);

    // Run all shards in parallel
    const results = await Promise.allSettled(
      shardIndices.map((shardIndex) => runShard(shardIndex)),
    );

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    // Process results
    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.code === 0);
    const failed = results.filter(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.code !== 0),
    );

    console.log(`\n📊 Sharding Results Summary:`);
    console.log(`⏱️  Total duration: ${duration}s`);
    console.log(`✅ Successful shards: ${successful.length}/${shardCount}`);
    console.log(`❌ Failed shards: ${failed.length}/${shardCount}`);

    if (failed.length > 0) {
      console.log(`\n💥 Failed shard details:`);
      failed.forEach((result) => {
        if (result.status === 'rejected') {
          console.log(`  Shard ${result.reason.shardIndex}: ${result.reason.error.message}`);
        } else {
          console.log(`  Shard ${result.value.shardIndex}: Exit code ${result.value.code}`);
        }
      });
    }

    // Show report information
    console.log(`\n📋 To view the test report, run:`);
    console.log(`  npm run test:nightly:report`);

    // Exit with error if any shard failed
    process.exit(failed.length > 0 ? 1 : 0);
  } catch (error) {
    console.error(`💥 Fatal error running sharded tests:`, error);
    process.exit(1);
  }
}

// Start the sharded test run
runAllShards();
