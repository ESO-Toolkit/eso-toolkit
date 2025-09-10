#!/usr/bin/env node
/**
 * Upload coverage data to GitHub Gist for dynamic badges
 * This creates JSON endpoints that shields.io can use to generate badges
 */

const fs = require('fs');
const path = require('path');

// Polyfill fetch for older Node.js versions
let fetch;
try {
  fetch = globalThis.fetch;
} catch {
  // For Node.js < 18, you might need: npm install node-fetch
  console.log('ℹ️  Using node-fetch polyfill for older Node.js versions');
}

async function uploadCoverageToGist() {
  const GIST_ID = process.env.COVERAGE_GIST_ID;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REF = process.env.GITHUB_REF;
  const GITHUB_EVENT_NAME = process.env.GITHUB_EVENT_NAME;

  console.log(`🔍 Running coverage upload check...`);
  console.log(`   Event: ${GITHUB_EVENT_NAME}`);
  console.log(`   Ref: ${GITHUB_REF}`);

  if (!GIST_ID || !GITHUB_TOKEN) {
    console.log('⚠️  COVERAGE_GIST_ID or GITHUB_TOKEN not provided. Skipping gist upload.');
    return;
  }

  const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-final.json');

  if (!fs.existsSync(coveragePath)) {
    console.log('⚠️  Coverage file not found. Run tests with coverage first.');
    return;
  }

  const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

  // Calculate total coverage
  const total = Object.values(coverageData).reduce(
    (acc, file) => {
      acc.lines.total += file.lines.total;
      acc.lines.covered += file.lines.covered;
      acc.functions.total += file.functions.total;
      acc.functions.covered += file.functions.covered;
      acc.branches.total += file.branches.total;
      acc.branches.covered += file.branches.covered;
      acc.statements.total += file.statements.total;
      acc.statements.covered += file.statements.covered;
      return acc;
    },
    {
      lines: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 },
      statements: { total: 0, covered: 0 },
    },
  );

  // Calculate percentages
  const coverage = {
    overall: Math.round((total.statements.covered / total.statements.total) * 100),
    lines: Math.round((total.lines.covered / total.lines.total) * 100),
    functions: Math.round((total.functions.covered / total.functions.total) * 100),
    branches: Math.round((total.branches.covered / total.branches.total) * 100),
    statements: Math.round((total.statements.covered / total.statements.total) * 100),
  };

  // Create shields.io badge format
  const createBadge = (label, percentage) => ({
    schemaVersion: 1,
    label,
    message: `${percentage}%`,
    color: percentage >= 80 ? 'brightgreen' : percentage >= 60 ? 'yellow' : 'red',
  });

  const gistFiles = {
    'coverage-overall.json': {
      content: JSON.stringify(createBadge('coverage', coverage.overall), null, 2),
    },
    'coverage-lines.json': {
      content: JSON.stringify(createBadge('lines', coverage.lines), null, 2),
    },
    'coverage-functions.json': {
      content: JSON.stringify(createBadge('functions', coverage.functions), null, 2),
    },
    'coverage-branches.json': {
      content: JSON.stringify(createBadge('branches', coverage.branches), null, 2),
    },
    'coverage-statements.json': {
      content: JSON.stringify(createBadge('statements', coverage.statements), null, 2),
    },
  };

  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'eso-log-aggregator-coverage-updater',
      },
      body: JSON.stringify({
        description: 'Coverage badges for eso-log-aggregator',
        files: gistFiles,
      }),
    });

    if (response.ok) {
      console.log('✅ Coverage data uploaded to GitHub Gist successfully');
      console.log(`📊 Coverage: ${coverage.overall}% overall`);
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to upload to GitHub Gist:', response.status, response.statusText);
      console.error('Error details:', errorText);

      if (response.status === 403 || response.status === 401) {
        console.log('💡 Tip: The default GITHUB_TOKEN does not have gist permissions.');
        console.log('   To fix this, create a Personal Access Token with "gist" scope and');
        console.log('   add it as a repository secret named "GIST_TOKEN".');
        console.log('   See documentation/COVERAGE_BADGES_SETUP.md for detailed instructions.');
      }
    }
  } catch (error) {
    console.error('❌ Error uploading coverage data:', error.message);
    console.log('💡 If this is a permission error, see documentation/COVERAGE_BADGES_SETUP.md');
  }
}

uploadCoverageToGist().catch(console.error);
