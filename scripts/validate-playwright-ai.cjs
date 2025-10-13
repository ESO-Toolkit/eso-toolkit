#!/usr/bin/env node

/**
 * AI Agent Validation Script for Playwright Tests
 * 
 * Run this script to validate that your Playwright tests follow the skeleton detection guidelines.
 * Usage: node scripts/validate-playwright-ai.cjs [test-file-pattern]
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// ANSI colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function validateTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];
  const successes = [];
  
  // Check 1: Has skeleton detector import
  const hasSkeletonImport = /import.*createSkeletonDetector.*from.*skeleton-detector/.test(content);
  if (!hasSkeletonImport) {
    issues.push({
      type: 'CRITICAL',
      rule: 'Missing skeleton detector import',
      message: 'Must import: import { createSkeletonDetector } from \'./utils/skeleton-detector\';',
      line: 1
    });
  } else {
    successes.push('✅ Has skeleton detector import');
  }
  
  // Check 2: Uses skeleton detector before screenshots
  const screenshotLines = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    if (line.includes('toHaveScreenshot') || line.includes('page.screenshot')) {
      screenshotLines.push(index + 1);
    }
  });
  
  screenshotLines.forEach(lineNum => {
    // Look backwards from screenshot to find skeleton detector usage
    const startSearch = Math.max(0, lineNum - 20);
    const searchArea = lines.slice(startSearch, lineNum);
    
    const hasSkeletonDetectorUsage = searchArea.some(line => 
      line.includes('createSkeletonDetector') || 
      line.includes('waitForSkeletonsToDisappear')
    );
    
    if (!hasSkeletonDetectorUsage) {
      issues.push({
        type: 'CRITICAL',
        rule: 'Screenshot without skeleton wait',
        message: `Screenshot at line ${lineNum} not preceded by skeleton detector usage`,
        line: lineNum
      });
    } else {
      successes.push(`✅ Screenshot at line ${lineNum} has skeleton detection`);
    }
  });
  
  // Check 3: Avoid bad patterns
  const badPatterns = [
    {
      pattern: /waitForTimeout\(\s*\d{4,}\s*\)/,
      rule: 'Long arbitrary timeout',
      message: 'Replace long waitForTimeout with skeleton detection and pre-loading'
    },
    {
      pattern: /waitForLoadState.*networkidle.*\n.*screenshot/,
      rule: 'Network idle + screenshot',
      message: 'Network idle alone is insufficient, use skeleton detection with pre-loading'
    },
    {
      pattern: /waitForLoadState.*domcontentloaded.*\n.*screenshot/,
      rule: 'DOM loaded + screenshot',  
      message: 'DOM loaded alone is insufficient, use skeleton detection with pre-loading'
    },
    {
      pattern: /toHaveScreenshot.*\n(?!.*preloadAllReportData|.*takeScreenshotWithPreloadedData|.*ensureDataPreloadedForScreenshot)/,
      rule: 'Screenshot without pre-loading',
      message: 'Visual tests should use data pre-loading utilities for reliability'
    }
  ];
  
  badPatterns.forEach(({ pattern, rule, message }) => {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        type: 'WARNING',
        rule,
        message,
        line: 'Multiple locations'
      });
    }
  });
  
  // Check 4: Good patterns
  const goodPatterns = [
    {
      pattern: /createSkeletonDetector\(page\)/,
      message: 'Creates skeleton detector properly'
    },
    {
      pattern: /waitForSkeletonsToDisappear.*timeout:\s*\d+/,
      message: 'Uses skeleton detection with timeout'
    },
    {
      pattern: /waitForTimeout\(1000\)/,
      message: 'Uses appropriate safety wait after skeleton detection'
    },
    {
      pattern: /preloadAllReportData|takeScreenshotWithPreloadedData|ensureDataPreloadedForScreenshot/,
      message: 'Uses data pre-loading utilities for reliable visual tests'
    },
    {
      pattern: /waitForLoadingComplete/,
      message: 'Uses preload-aware loading detection'
    },
    {
      pattern: /navigateWithPreloadedData/,
      message: 'Uses preload-aware navigation'
    },
    {
      pattern: /warmCacheForVisualTestSuite/,
      message: 'Warms cache for test suite efficiency'
    }
  ];
  
  goodPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(content)) {
      successes.push(`✅ ${message}`);
    }
  });
  
  return { issues, successes, screenshotCount: screenshotLines.length };
}

function main() {
  const testPattern = process.argv[2] || 'tests/**/*.spec.ts';
  
  console.log(colorize('🤖 AI Agent Playwright Test Validation', 'bold'));
  console.log(colorize('='.repeat(50), 'cyan'));
  console.log();
  
  try {
    const testFiles = glob.sync(testPattern, { cwd: process.cwd() });
    
    if (testFiles.length === 0) {
      console.log(colorize('❌ No test files found matching pattern:', 'red'), testPattern);
      process.exit(1);
    }
    
    let totalIssues = 0;
    let totalSuccesses = 0;
    let totalScreenshots = 0;
    
    testFiles.forEach(filePath => {
      console.log(colorize(`📁 Validating: ${filePath}`, 'blue'));
      
      try {
        const { issues, successes, screenshotCount } = validateTestFile(filePath);
        totalIssues += issues.length;
        totalSuccesses += successes.length;
        totalScreenshots += screenshotCount;
        
        // Show successes
        successes.forEach(success => {
          console.log(`  ${colorize(success, 'green')}`);
        });
        
        // Show issues
        issues.forEach(issue => {
          const color = issue.type === 'CRITICAL' ? 'red' : 'yellow';
          const icon = issue.type === 'CRITICAL' ? '❌' : '⚠️';
          console.log(`  ${colorize(`${icon} ${issue.rule}`, color)}`);
          console.log(`     ${issue.message}`);
          if (typeof issue.line === 'number') {
            console.log(`     Line: ${issue.line}`);
          }
        });
        
        if (screenshotCount > 0) {
          console.log(`  ${colorize(`📸 Found ${screenshotCount} screenshot(s)`, 'cyan')}`);
        }
        
      } catch (error) {
        console.log(`  ${colorize('❌ Error reading file:', 'red')} ${error.message}`);
      }
      
      console.log();
    });
    
    // Summary
    console.log(colorize('📊 Validation Summary', 'bold'));
    console.log(colorize('-'.repeat(30), 'cyan'));
    console.log(`Files validated: ${colorize(testFiles.length.toString(), 'blue')}`);
    console.log(`Screenshots found: ${colorize(totalScreenshots.toString(), 'cyan')}`);
    console.log(`Successes: ${colorize(totalSuccesses.toString(), 'green')}`);
    console.log(`Issues: ${colorize(totalIssues.toString(), totalIssues > 0 ? 'red' : 'green')}`);
    
    if (totalIssues === 0) {
      console.log();
      console.log(colorize('🎉 All tests follow AI agent guidelines!', 'green'));
      console.log(colorize('Your tests should work reliably with skeleton detection.', 'green'));
    } else {
      console.log();
      console.log(colorize('🚨 Issues found that may cause test failures!', 'red'));
      console.log(colorize('Review the guidelines in AI_PLAYWRIGHT_INSTRUCTIONS.md', 'yellow'));
      process.exit(1);
    }
    
  } catch (error) {
    console.error(colorize('❌ Validation failed:', 'red'), error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateTestFile, colorize };