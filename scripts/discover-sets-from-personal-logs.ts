/**
 * Discover Set IDs from Personal Downloaded Logs
 * 
 * This script scans through downloaded report data in data-downloads/
 * to find set IDs that aren't in our KnownSetIDs enum.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the enum to check against
import { KnownSetIDs } from '../src/types/abilities.js';

interface SetInfo {
  setId: number;
  count: number;
  itemNames: Set<string>;
  reportCodes: Set<string>;
}

const knownSetIds = new Set(Object.values(KnownSetIDs).filter((v): v is number => typeof v === 'number'));

console.log(`[INFO] Loaded ${knownSetIds.size} known set IDs from enum`);

// Scan data-downloads directory
const dataDownloadsDir = path.join(__dirname, '..', 'data-downloads');
const discoveredSets = new Map<number, SetInfo>();

function processGearItem(item: any, reportCode: string): void {
  if (!item || typeof item.id !== 'number') return;
  
  const setId = item.id;
  
  // Skip if it's a known set
  if (knownSetIds.has(setId)) return;
  
  if (!discoveredSets.has(setId)) {
    discoveredSets.set(setId, {
      setId,
      count: 0,
      itemNames: new Set(),
      reportCodes: new Set(),
    });
  }
  
  const setInfo = discoveredSets.get(setId)!;
  setInfo.count++;
  setInfo.reportCodes.add(reportCode);
  
  if (item.name) {
    setInfo.itemNames.add(item.name);
  }
}

function scanReportDirectory(reportCode: string, reportDir: string): void {
  // Look for combatant-info files
  const files = fs.readdirSync(reportDir);
  
  for (const file of files) {
    if (!file.startsWith('combatant-info-') || !file.endsWith('.json')) continue;
    
    const filePath = path.join(reportDir, file);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      // Process combatants
      if (data.data?.reportData?.report?.playerDetails?.data?.playerDetails?.combatantInfo) {
        const combatants = data.data.reportData.report.playerDetails.data.playerDetails.combatantInfo;
        
        for (const combatant of combatants) {
          if (!combatant.gear) continue;
          
          // Process each gear slot
          for (const gear of combatant.gear) {
            processGearItem(gear, reportCode);
          }
        }
      }
    } catch (error) {
      // Skip files that can't be parsed
      continue;
    }
  }
}

// Scan all report directories
const reportDirs = fs.readdirSync(dataDownloadsDir);

console.log(`[INFO] Scanning ${reportDirs.length} directories in data-downloads/`);

for (const reportCode of reportDirs) {
  const reportPath = path.join(dataDownloadsDir, reportCode);
  
  // Skip if not a directory
  if (!fs.statSync(reportPath).isDirectory()) continue;
  
  scanReportDirectory(reportCode, reportPath);
}

// Sort by count and prepare results
const sortedSets = Array.from(discoveredSets.values()).sort((a, b) => b.count - a.count);

console.log('\n' + '='.repeat(60));
console.log('📊 DISCOVERED SETS FROM PERSONAL LOGS');
console.log('='.repeat(60));
console.log(`Total discovered: ${sortedSets.length}`);
console.log(`Total known in enum: ${knownSetIds.size}`);
console.log('='.repeat(60));

// Display top 50
console.log('\n🔝 Top 50 Most Common Sets:');
console.log('='.repeat(60));

for (let i = 0; i < Math.min(50, sortedSets.length); i++) {
  const set = sortedSets[i];
  const sampleItems = Array.from(set.itemNames).slice(0, 3).join(', ');
  const sampleReports = Array.from(set.reportCodes).slice(0, 2).join(', ');
  
  console.log(`\n${i + 1}. Set ID ${set.setId}:`);
  console.log(`   Occurrences: ${set.count}`);
  console.log(`   Sample items: ${sampleItems}`);
  console.log(`   Sample reports: ${sampleReports}`);
}

// Save to file
const outputPath = path.join(__dirname, '..', 'data', 'personal-logs-missing-sets.json');
const output = {
  timestamp: new Date().toISOString(),
  totalDiscovered: sortedSets.length,
  totalKnown: knownSetIds.size,
  missingSets: sortedSets.map(set => ({
    setId: set.setId,
    count: set.count,
    itemNames: Array.from(set.itemNames),
    reportCodes: Array.from(set.reportCodes),
  })),
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\n💾 Saved results to: ${outputPath}`);
console.log('\n✨ Discovery complete!\n');
