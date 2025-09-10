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

  // Calculate total coverage from Jest format
  const total = Object.values(coverageData).reduce(
    (acc, file) => {
      // Count statements
      if (file.s) {
        Object.values(file.s).forEach(hits => {
          acc.statements.total++;
          if (hits > 0) acc.statements.covered++;
        });
      }

      // Count functions
      if (file.f) {
        Object.values(file.f).forEach(hits => {
          acc.functions.total++;
          if (hits > 0) acc.functions.covered++;
        });
      }

      // Count branches
      if (file.b) {
        Object.values(file.b).forEach(branchHits => {
          if (Array.isArray(branchHits)) {
            branchHits.forEach(hits => {
              acc.branches.total++;
              if (hits > 0) acc.branches.covered++;
            });
          }
        });
      }

      // Count lines (derived from statement map)
      if (file.statementMap) {
        const lines = new Set();
        Object.values(file.statementMap).forEach(stmt => {
          for (let line = stmt.start.line; line <= stmt.end.line; line++) {
            lines.add(line);
          }
        });
        
        lines.forEach(line => {
          acc.lines.total++;
          // Check if any statement on this line was executed
          const executed = Object.entries(file.statementMap).some(([key, stmt]) => {
            return stmt.start.line <= line && stmt.end.line >= line && file.s[key] > 0;
          });
          if (executed) acc.lines.covered++;
        });
      }

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
    overall: total.statements.total > 0 ? Math.round((total.statements.covered / total.statements.total) * 100) : 0,
    lines: total.lines.total > 0 ? Math.round((total.lines.covered / total.lines.total) * 100) : 0,
    functions: total.functions.total > 0 ? Math.round((total.functions.covered / total.functions.total) * 100) : 0,
    branches: total.branches.total > 0 ? Math.round((total.branches.covered / total.branches.total) * 100) : 0,
    statements: total.statements.total > 0 ? Math.round((total.statements.covered / total.statements.total) * 100) : 0,
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
        console.log('   See docs/COVERAGE_BADGES_SETUP.md for detailed instructions.');
      }
    }
  } catch (error) {
    console.error('❌ Error uploading coverage data:', error.message);
    console.log('💡 If this is a permission error, see docs/COVERAGE_BADGES_SETUP.md');
  }
}

uploadCoverageToGist().catch(console.error);
