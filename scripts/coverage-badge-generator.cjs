#!/usr/bin/env node
/**
 * Coverage Badge Generator
 * 
 * Generates coverage badges and status indicators for the project
 */

const fs = require('fs');
const path = require('path');

class CoverageBadgeGenerator {
  constructor() {
    this.coverageDir = path.resolve('coverage');
    this.summaryPath = path.join(this.coverageDir, 'coverage-final.json');
    this.badgeDir = path.join(this.coverageDir, 'badges');
  }

  /**
   * Generate coverage badges
   */
  generateBadges() {
    if (!fs.existsSync(this.summaryPath)) {
      console.warn('⚠️  Coverage summary not found. Run tests with coverage first.');
      return;
    }

    const coverageData = JSON.parse(fs.readFileSync(this.summaryPath, 'utf8'));
    
    // Calculate total coverage from detailed coverage data
    const total = this.calculateTotalCoverage(coverageData);

    // Ensure badge directory exists
    if (!fs.existsSync(this.badgeDir)) {
      fs.mkdirSync(this.badgeDir, { recursive: true });
    }

    console.log('🏷️  Generating coverage badges...\n');

    // Generate badges for each metric
    this.generateBadge('lines', total.lines.pct);
    this.generateBadge('functions', total.functions.pct);
    this.generateBadge('branches', total.branches.pct);
    this.generateBadge('statements', total.statements.pct);

    // Generate overall badge
    const overallPct = this.calculateOverallCoverage(total);
    this.generateBadge('overall', overallPct);

    // Generate status file for CI
    this.generateStatusFile(total);

    console.log('✅ Coverage badges generated successfully!');
    console.log(`📁 Badges saved to: ${this.badgeDir}`);
  }

  /**
   * Calculate total coverage from detailed coverage data
   */
  calculateTotalCoverage(coverageData) {
    const totals = {
      statements: { covered: 0, total: 0 },
      functions: { covered: 0, total: 0 },
      branches: { covered: 0, total: 0 },
      lines: { covered: 0, total: 0 }
    };

    // Iterate through each file's coverage data
    Object.values(coverageData).forEach(fileData => {
      if (fileData.s) {
        // Statements
        Object.values(fileData.s).forEach(hits => {
          totals.statements.total++;
          if (hits > 0) totals.statements.covered++;
        });
      }

      if (fileData.f) {
        // Functions
        Object.values(fileData.f).forEach(hits => {
          totals.functions.total++;
          if (hits > 0) totals.functions.covered++;
        });
      }

      if (fileData.b) {
        // Branches
        Object.values(fileData.b).forEach(branchHits => {
          if (Array.isArray(branchHits)) {
            branchHits.forEach(hits => {
              totals.branches.total++;
              if (hits > 0) totals.branches.covered++;
            });
          }
        });
      }

      if (fileData.statementMap) {
        // Lines (derived from statement map)
        const lines = new Set();
        Object.values(fileData.statementMap).forEach(stmt => {
          for (let line = stmt.start.line; line <= stmt.end.line; line++) {
            lines.add(line);
          }
        });
        
        lines.forEach(line => {
          totals.lines.total++;
          // Check if any statement on this line was executed
          const executed = Object.entries(fileData.statementMap).some(([key, stmt]) => {
            return stmt.start.line <= line && stmt.end.line >= line && fileData.s[key] > 0;
          });
          if (executed) totals.lines.covered++;
        });
      }
    });

    // Calculate percentages
    return {
      statements: {
        covered: totals.statements.covered,
        total: totals.statements.total,
        pct: totals.statements.total > 0 ? 
          Math.round((totals.statements.covered / totals.statements.total) * 10000) / 100 : 0
      },
      functions: {
        covered: totals.functions.covered,
        total: totals.functions.total,
        pct: totals.functions.total > 0 ? 
          Math.round((totals.functions.covered / totals.functions.total) * 10000) / 100 : 0
      },
      branches: {
        covered: totals.branches.covered,
        total: totals.branches.total,
        pct: totals.branches.total > 0 ? 
          Math.round((totals.branches.covered / totals.branches.total) * 10000) / 100 : 0
      },
      lines: {
        covered: totals.lines.covered,
        total: totals.lines.total,
        pct: totals.lines.total > 0 ? 
          Math.round((totals.lines.covered / totals.lines.total) * 10000) / 100 : 0
      }
    };
  }

  /**
   * Generate individual badge
   */
  generateBadge(type, percentage) {
    const color = this.getColorForPercentage(percentage);
    const pct = percentage.toFixed(1);
    
    // Generate SVG badge
    const svg = this.generateSVGBadge(type, `${pct}%`, color);
    const badgePath = path.join(this.badgeDir, `coverage-${type}.svg`);
    
    fs.writeFileSync(badgePath, svg);
    console.log(`   📊 ${type.padEnd(10)}: ${pct.padStart(5)}% - ${badgePath}`);
  }

  /**
   * Generate SVG badge
   */
  generateSVGBadge(label, value, color) {
    const labelWidth = Math.max(label.length * 7 + 10, 60);
    const valueWidth = Math.max(value.length * 7 + 10, 50);
    const totalWidth = labelWidth + valueWidth;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <defs>
    <linearGradient id="b" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
  </defs>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <rect width="${totalWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#b)"/>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
      <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
      <text x="${labelWidth / 2}" y="14">${label}</text>
      <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
      <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
    </g>
  </g>
</svg>`;
  }

  /**
   * Get color based on coverage percentage
   */
  getColorForPercentage(pct) {
    if (pct >= 90) return '#4c1';      // Bright green
    if (pct >= 80) return '#97CA00';   // Green
    if (pct >= 70) return '#a4a61d';   // Yellow-green
    if (pct >= 60) return '#dfb317';   // Yellow
    if (pct >= 50) return '#fe7d37';   // Orange
    return '#e05d44';                  // Red
  }

  /**
   * Calculate overall coverage percentage
   */
  calculateOverallCoverage(total) {
    const weights = { lines: 0.4, functions: 0.3, branches: 0.2, statements: 0.1 };
    return (
      total.lines.pct * weights.lines +
      total.functions.pct * weights.functions +
      total.branches.pct * weights.branches +
      total.statements.pct * weights.statements
    );
  }

  /**
   * Generate status file for CI/CD integration
   */
  generateStatusFile(total) {
    const status = {
      timestamp: new Date().toISOString(),
      coverage: {
        lines: {
          percentage: total.lines.pct,
          covered: total.lines.covered,
          total: total.lines.total,
          status: this.getStatus(total.lines.pct)
        },
        functions: {
          percentage: total.functions.pct,
          covered: total.functions.covered,
          total: total.functions.total,
          status: this.getStatus(total.functions.pct)
        },
        branches: {
          percentage: total.branches.pct,
          covered: total.branches.covered,
          total: total.branches.total,
          status: this.getStatus(total.branches.pct)
        },
        statements: {
          percentage: total.statements.pct,
          covered: total.statements.covered,
          total: total.statements.total,
          status: this.getStatus(total.statements.pct)
        },
        overall: {
          percentage: this.calculateOverallCoverage(total),
          status: this.getStatus(this.calculateOverallCoverage(total))
        }
      }
    };

    const statusPath = path.join(this.coverageDir, 'coverage-status.json');
    fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));

    // Generate simple status file for quick checks
    const simpleStatus = {
      coverage: status.coverage.overall.percentage.toFixed(1),
      status: status.coverage.overall.status,
      timestamp: status.timestamp
    };

    const simpleStatusPath = path.join(this.coverageDir, 'status.json');
    fs.writeFileSync(simpleStatusPath, JSON.stringify(simpleStatus, null, 2));
  }

  /**
   * Get status text based on percentage
   */
  getStatus(pct) {
    if (pct >= 90) return 'excellent';
    if (pct >= 80) return 'good';
    if (pct >= 70) return 'fair';
    if (pct >= 60) return 'poor';
    return 'critical';
  }
}

// CLI Interface
if (require.main === module) {
  const generator = new CoverageBadgeGenerator();
  generator.generateBadges();
}

module.exports = CoverageBadgeGenerator;
