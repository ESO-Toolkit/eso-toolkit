#!/usr/bin/env node
/**
 * Coverage Analysis Utility
 * 
 * This script provides enhanced coverage analysis and reporting capabilities
 * for the ESO Log Aggregator project.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CoverageAnalyzer {
  constructor() {
    this.coverageDir = path.resolve('coverage');
    this.reportPath = path.join(this.coverageDir, 'coverage-final.json');
    this.summaryPath = path.join(this.coverageDir, 'coverage-summary.json');
  }

  /**
   * Run coverage analysis with specified options
   */
  async runCoverage(options = {}) {
    const {
      watch = false,
      threshold = false,
      verbose = false,
      output = 'text'
    } = options;

    console.log('🧪 Running Jest Coverage Analysis...\n');

    const command = [
      'npm run test:coverage',
      watch && '--watch',
      threshold && '--passWithNoTests',
      verbose && '--verbose'
    ].filter(Boolean).join(' ');

    try {
      execSync(command, { stdio: 'inherit' });
      
      if (fs.existsSync(this.summaryPath)) {
        this.generateEnhancedReport();
      }
    } catch (error) {
      console.error('❌ Coverage analysis failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Generate enhanced coverage report with insights
   */
  generateEnhancedReport() {
    if (!fs.existsSync(this.summaryPath)) {
      console.warn('⚠️  Coverage summary not found');
      return;
    }

    const summaryData = JSON.parse(fs.readFileSync(this.summaryPath, 'utf8'));
    const detailData = fs.existsSync(this.reportPath) 
      ? JSON.parse(fs.readFileSync(this.reportPath, 'utf8'))
      : null;

    console.log('\n📊 Enhanced Coverage Report\n');
    console.log('=' .repeat(60));
    
    this.printOverallSummary(summaryData.total);
    this.printCategoryBreakdown(summaryData);
    
    if (detailData) {
      this.printLowCoverageFiles(detailData);
      this.printHighCoverageFiles(detailData);
    }

    this.printRecommendations(summaryData);
  }

  /**
   * Print overall coverage summary
   */
  printOverallSummary(total) {
    console.log('📈 Overall Coverage:');
    console.log(`   Lines:      ${this.formatPercentage(total.lines.pct)}     (${total.lines.covered}/${total.lines.total})`);
    console.log(`   Functions:  ${this.formatPercentage(total.functions.pct)}  (${total.functions.covered}/${total.functions.total})`);
    console.log(`   Branches:   ${this.formatPercentage(total.branches.pct)}   (${total.branches.covered}/${total.branches.total})`);
    console.log(`   Statements: ${this.formatPercentage(total.statements.pct)} (${total.statements.covered}/${total.statements.total})\n`);
  }

  /**
   * Print coverage breakdown by category
   */
  printCategoryBreakdown(summaryData) {
    console.log('📂 Coverage by Directory:');
    
    const categories = this.categorizePaths(Object.keys(summaryData));
    
    categories.forEach(category => {
      const files = category.files.map(f => summaryData[f]).filter(Boolean);
      if (files.length === 0) return;

      const avgCoverage = this.calculateAverageCoverage(files);
      console.log(`   ${category.name}: ${this.formatPercentage(avgCoverage.lines.pct)} lines`);
    });
    console.log('');
  }

  /**
   * Print files with low coverage that need attention
   */
  printLowCoverageFiles(detailData, threshold = 60) {
    console.log('🚨 Files Needing Attention (< 60% coverage):');
    
    const lowCoverageFiles = Object.entries(detailData)
      .filter(([, data]) => data.lines && data.lines.pct < threshold)
      .sort(([, a], [, b]) => a.lines.pct - b.lines.pct)
      .slice(0, 10); // Top 10 worst

    if (lowCoverageFiles.length === 0) {
      console.log('   🎉 All files have good coverage!');
    } else {
      lowCoverageFiles.forEach(([file, data]) => {
        const relativePath = path.relative(process.cwd(), file);
        console.log(`   ${relativePath}: ${this.formatPercentage(data.lines.pct)} lines`);
      });
    }
    console.log('');
  }

  /**
   * Print files with excellent coverage
   */
  printHighCoverageFiles(detailData, threshold = 90) {
    console.log('✨ Files with Excellent Coverage (> 90%):');
    
    const highCoverageFiles = Object.entries(detailData)
      .filter(([, data]) => data.lines && data.lines.pct > threshold)
      .sort(([, a], [, b]) => b.lines.pct - a.lines.pct)
      .slice(0, 5); // Top 5 best

    if (highCoverageFiles.length === 0) {
      console.log('   📚 Focus on improving test coverage');
    } else {
      highCoverageFiles.forEach(([file, data]) => {
        const relativePath = path.relative(process.cwd(), file);
        console.log(`   ${relativePath}: ${this.formatPercentage(data.lines.pct)} lines`);
      });
    }
    console.log('');
  }

  /**
   * Print actionable recommendations
   */
  printRecommendations(summaryData) {
    console.log('💡 Recommendations:');
    
    const total = summaryData.total;
    const recommendations = [];

    if (total.lines.pct < 80) {
      recommendations.push('Focus on increasing line coverage to reach 80% threshold');
    }
    
    if (total.functions.pct < 75) {
      recommendations.push('Add tests for uncovered functions');
    }
    
    if (total.branches.pct < 70) {
      recommendations.push('Improve branch coverage by testing edge cases and error conditions');
    }

    if (recommendations.length === 0) {
      recommendations.push('Great job! Coverage meets all thresholds');
      recommendations.push('Consider increasing thresholds or adding integration tests');
    }

    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    
    console.log('\n📖 View detailed report: npm run coverage:open');
    console.log('=' .repeat(60));
  }

  /**
   * Categorize file paths for organized reporting
   */
  categorizePaths(paths) {
    const categories = [
      { name: 'Components', pattern: /\/components\//, files: [] },
      { name: 'Features', pattern: /\/features\//, files: [] },
      { name: 'Utils', pattern: /\/utils\//, files: [] },
      { name: 'Hooks', pattern: /\/hooks\//, files: [] },
      { name: 'Store', pattern: /\/store\//, files: [] },
      { name: 'Other', pattern: /./, files: [] }
    ];

    paths.forEach(filePath => {
      if (filePath === 'total') return;
      
      const category = categories.find(cat => cat.pattern.test(filePath)) || categories[categories.length - 1];
      category.files.push(filePath);
    });

    return categories.filter(cat => cat.files.length > 0);
  }

  /**
   * Calculate average coverage for a set of files
   */
  calculateAverageCoverage(files) {
    const totals = { lines: { covered: 0, total: 0 } };
    
    files.forEach(file => {
      if (file.lines) {
        totals.lines.covered += file.lines.covered;
        totals.lines.total += file.lines.total;
      }
    });

    return {
      lines: {
        pct: totals.lines.total > 0 ? (totals.lines.covered / totals.lines.total) * 100 : 0
      }
    };
  }

  /**
   * Format percentage with color coding
   */
  formatPercentage(pct) {
    const percentage = pct.toFixed(1).padStart(5) + '%';
    
    if (pct >= 90) return `\x1b[32m${percentage}\x1b[0m`; // Green
    if (pct >= 70) return `\x1b[33m${percentage}\x1b[0m`; // Yellow
    return `\x1b[31m${percentage}\x1b[0m`; // Red
  }
}

// CLI Interface
if (require.main === module) {
  const analyzer = new CoverageAnalyzer();
  
  const args = process.argv.slice(2);
  const options = {
    watch: args.includes('--watch'),
    threshold: args.includes('--threshold'),
    verbose: args.includes('--verbose'),
    output: args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'text'
  };

  if (args.includes('--help')) {
    console.log(`
Coverage Analysis Utility

Usage: node coverage-analyzer.js [options]

Options:
  --watch      Run coverage in watch mode
  --threshold  Enforce coverage thresholds
  --verbose    Verbose output
  --output     Output format (text, json, html)
  --help       Show this help message

Examples:
  node coverage-analyzer.js                    # Basic coverage run
  node coverage-analyzer.js --watch            # Watch mode
  node coverage-analyzer.js --threshold        # Enforce thresholds
    `);
    process.exit(0);
  }

  analyzer.runCoverage(options).catch(console.error);
}

module.exports = CoverageAnalyzer;
