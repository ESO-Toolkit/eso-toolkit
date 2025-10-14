#!/usr/bin/env node

/**
 * Simple wrapper script for affix script detection
 * Allows easy integration with npm scripts and CI/CD
 */

const { AffixScriptDetector } = require('./detect-affix-scripts');
const path = require('path');
const fs = require('fs');

function findReportDirectories(baseDir = 'data-downloads') {
  if (!fs.existsSync(baseDir)) {
    return [];
  }

  const reports = [];
  const items = fs.readdirSync(baseDir);
  
  items.forEach(item => {
    const itemPath = path.join(baseDir, item);
    if (fs.statSync(itemPath).isDirectory()) {
      // Check if it looks like a report directory (has index.json or fight directories)
      const hasIndex = fs.existsSync(path.join(itemPath, 'index.json'));
      const hasFights = fs.readdirSync(itemPath).some(subItem => 
        subItem.startsWith('fight-') && fs.statSync(path.join(itemPath, subItem)).isDirectory()
      );
      
      if (hasIndex || hasFights) {
        reports.push(itemPath);
      }
    }
  });

  return reports;
}

function analyzeAll() {
  console.log('🔍 ESO Log Aggregator - Affix Script Analysis\n');
  
  const reportDirs = findReportDirectories();
  
  if (reportDirs.length === 0) {
    console.log('No report directories found in data-downloads/');
    return;
  }

  console.log(`Found ${reportDirs.length} report director${reportDirs.length === 1 ? 'y' : 'ies'} to analyze:\n`);
  
  const scribingDataPath = path.join(__dirname, '..', 'data', 'scribing-complete.json');
  const allResults = [];

  reportDirs.forEach((reportDir, index) => {
    const reportCode = path.basename(reportDir);
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 ANALYZING REPORT: ${reportCode} (${index + 1}/${reportDirs.length})`);
    console.log(`${'='.repeat(50)}`);

    try {
      const detector = new AffixScriptDetector(scribingDataPath, reportDir);
      const results = detector.detectAffixScripts();
      detector.displayResults(results);

      allResults.push({
        reportCode,
        reportPath: reportDir,
        ...results
      });

      // Save individual results
      const outputPath = path.join(reportDir, 'affix-script-analysis.json');
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      console.log(`💾 Results saved to: ${outputPath}`);

    } catch (error) {
      console.error(`❌ Failed to analyze ${reportCode}: ${error.message}`);
    }
  });

  // Generate summary report
  if (allResults.length > 0) {
    generateSummaryReport(allResults);
  }
}

function generateSummaryReport(allResults) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('📈 SUMMARY REPORT - ALL ANALYZED FIGHTS');
  console.log(`${'='.repeat(60)}`);

  const totalReports = allResults.length;
  const totalAffixScripts = allResults.reduce((sum, r) => sum + r.summary.confirmedAffixes, 0);
  const totalFights = allResults.reduce((sum, r) => sum + r.summary.fightsAnalyzed, 0);

  // Collect all unique affix scripts across reports
  const allAffixScripts = new Map();
  
  allResults.forEach(result => {
    result.affixScripts.forEach(item => {
      const key = item.affix.databaseKey;
      if (!allAffixScripts.has(key)) {
        allAffixScripts.set(key, {
          name: item.affix.databaseName,
          description: item.affix.description,
          reportCount: 0,
          totalUsage: 0
        });
      }
      
      const affixData = allAffixScripts.get(key);
      affixData.reportCount++;
      affixData.totalUsage += item.appliedTo.length;
    });
  });

  console.log(`\n📊 OVERALL STATISTICS:`);
  console.log(`• Total reports analyzed: ${totalReports}`);
  console.log(`• Total fights analyzed: ${totalFights}`);
  console.log(`• Unique affix scripts detected: ${allAffixScripts.size}`);
  console.log(`• Total affix script instances: ${totalAffixScripts}`);

  if (allAffixScripts.size > 0) {
    console.log(`\n🎭 AFFIX SCRIPT USAGE ACROSS ALL REPORTS:`);
    
    // Sort by popularity (report count, then total usage)
    const sortedAffixes = Array.from(allAffixScripts.entries())
      .sort((a, b) => b[1].reportCount - a[1].reportCount || b[1].totalUsage - a[1].totalUsage);

    sortedAffixes.forEach(([key, data], index) => {
      const percentage = Math.round((data.reportCount / totalReports) * 100);
      console.log(`${index + 1}. ${data.name}`);
      console.log(`   Used in ${data.reportCount}/${totalReports} reports (${percentage}%)`);
      console.log(`   Total applications: ${data.totalUsage}`);
      console.log(`   Effect: ${data.description}\n`);
    });
  }

  // Save summary report
  const summaryPath = path.join('data-downloads', 'affix-script-summary.json');
  const summaryData = {
    generatedAt: new Date().toISOString(),
    statistics: {
      totalReports,
      totalFights,
      uniqueAffixScripts: allAffixScripts.size,
      totalInstances: totalAffixScripts
    },
    affixScriptUsage: Object.fromEntries(allAffixScripts),
    reportDetails: allResults.map(r => ({
      reportCode: r.reportCode,
      fightsAnalyzed: r.summary.fightsAnalyzed,
      affixScriptsFound: r.summary.confirmedAffixes
    }))
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
  console.log(`💾 Summary report saved to: ${summaryPath}`);
}

// Main execution
const command = process.argv[2];

if (command === 'all' || !command) {
  analyzeAll();
} else {
  // Analyze specific report
  console.log('🔍 ESO Log Aggregator - Affix Script Analysis\n');
  require('./detect-affix-scripts');
}