#!/usr/bin/env node
/**
 * Generate coverage badge JSON files for shields.io endpoint format.
 * Writes files to coverage/badge-json/ for deployment to GitHub Pages.
 */

const fs = require('fs');
const path = require('path');

function generateCoverageBadgeJson() {
  const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-final.json');
  const outputDir = path.join(__dirname, '..', 'coverage', 'badge-json');

  if (!fs.existsSync(coveragePath)) {
    console.log('⚠️  Coverage file not found. Run tests with coverage first.');
    process.exit(1);
  }

  const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

  // Calculate total coverage from Jest format
  const total = Object.values(coverageData).reduce(
    (acc, file) => {
      if (file.s) {
        Object.values(file.s).forEach((hits) => {
          acc.statements.total++;
          if (hits > 0) acc.statements.covered++;
        });
      }
      if (file.f) {
        Object.values(file.f).forEach((hits) => {
          acc.functions.total++;
          if (hits > 0) acc.functions.covered++;
        });
      }
      if (file.b) {
        Object.values(file.b).forEach((branchHits) => {
          if (Array.isArray(branchHits)) {
            branchHits.forEach((hits) => {
              acc.branches.total++;
              if (hits > 0) acc.branches.covered++;
            });
          }
        });
      }
      if (file.statementMap) {
        const lines = new Set();
        Object.values(file.statementMap).forEach((stmt) => {
          for (let line = stmt.start.line; line <= stmt.end.line; line++) {
            lines.add(line);
          }
        });
        lines.forEach((line) => {
          acc.lines.total++;
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

  const pct = (covered, t) => (t > 0 ? Math.round((covered / t) * 100) : 0);

  const coverage = {
    overall: pct(total.statements.covered, total.statements.total),
    lines: pct(total.lines.covered, total.lines.total),
    functions: pct(total.functions.covered, total.functions.total),
    branches: pct(total.branches.covered, total.branches.total),
    statements: pct(total.statements.covered, total.statements.total),
  };

  const createBadge = (label, percentage) => ({
    schemaVersion: 1,
    label,
    message: `${percentage}%`,
    color: percentage >= 80 ? 'brightgreen' : percentage >= 60 ? 'yellow' : 'red',
  });

  const badges = {
    'coverage-overall.json': createBadge('coverage', coverage.overall),
    'coverage-lines.json': createBadge('lines', coverage.lines),
    'coverage-functions.json': createBadge('functions', coverage.functions),
    'coverage-branches.json': createBadge('branches', coverage.branches),
    'coverage-statements.json': createBadge('statements', coverage.statements),
  };

  fs.mkdirSync(outputDir, { recursive: true });

  for (const [filename, data] of Object.entries(badges)) {
    fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(data, null, 2));
    console.log(`✅ Wrote ${filename}`);
  }

  console.log(`📊 Coverage: ${coverage.overall}% overall`);
}

generateCoverageBadgeJson();
