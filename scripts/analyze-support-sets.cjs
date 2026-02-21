/**
 * Analyze downloaded fight data to find frequently occurring support sets
 * Only analyzes BOSS FIGHTS (filters out trash mobs)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data-downloads');

// Known trash mob patterns to filter out
const TRASH_PATTERNS = [
  /^Half-Giant/i,
  /^Vampire Infuser/i,
  /^Crimson Knight/i,
  /^Bitter Knight/i,
  /^Blood Knight/i,
  /^Target /i,
  /^Unknown$/i,
  /^Storm$/i,
];

// Known boss names (based on data)
const KNOWN_BOSSES = [
  'Overfiend Kazpian',
  'Tideborn Taleria',
  'Yandir the Butcher',
  'Captain Vrol',
  'Lord Falgravn',
  'Lokkestiiz',
  'Yolnahkriin',
  'Rakkhat',
  'Bahsei',
  'Vrol',
  'Xalvakka',
  'Ansuul',
  // Add more as needed
];

/**
 * Determine if a fight is a boss fight based on name
 */
function isBossFight(fightName) {
  // Check if it matches trash patterns
  for (const pattern of TRASH_PATTERNS) {
    if (pattern.test(fightName)) {
      return false;
    }
  }
  
  // Check if it's a known boss
  for (const boss of KNOWN_BOSSES) {
    if (fightName.includes(boss)) {
      return true;
    }
  }
  
  // If name length > 20 characters, likely a boss with complex name
  if (fightName.length > 20) {
    return true;
  }
  
  // If it has certain boss-like keywords
  const bossKeywords = ['Lord', 'Captain', 'Overfiend', 'the ', 'Saint', 'General'];
  if (bossKeywords.some(keyword => fightName.includes(keyword))) {
    return true;
  }
  
  return false; // Default to false for safety
}

// Support sets we're interested in
const SUPPORT_SETS = [
  'Powerful Assault',
  'Spell Power Cure',
  'Jorvuld\'s Guidance',
  'Pillager\'s Profit',
  'Perfected Pillager\'s Profit',
  'Worm\'s Raiment',
  'Olorime',
  'Martial Knowledge',
  'Zen\'s Redress',
  'Master Architect',
  'Roaring Opportunist',
  'Yolnahkriin',
  'Claw of Yolnahkriin',
  'Perfected Claw of Yolnahkriin',
  'Alkosh',
  'Roar of Alkosh',
  'Turning Tide',
  'Saxhleel Champion',
  'Perfected Saxhleel Champion',
  'Drake\'s Rush',
  'Crimson Oath',
  'Tremorscale',
  'Baron Zaudrus',
  'Encratis',
  'Encratis\'s Behemoth',
  'Nazaray',
  'Pearls of Ehlnofey',
  'Pearlescent Ward',
  'Perfected Pearlescent Ward',
  'Lucent Echoes',
  'Perfected Lucent Echoes',
  'Combat Physician',
  'War Machine',
  'Symphony of Blades',
  'Sentinel of Rkugamz',
  'Stone Husk',
  'Engine Guardian',
  'Bloodspawn',
  'Lord Warden',
  'Grave-Stake Collector',
  'Frozen Watcher',
  'Catalyst',
  'Perfected Yandir\'s Might',
  'Perfected Arms of Relequen',
  'Ansuul\'s Torment',
  'Zen\'s Redress',
  'Vestment of Olorime',
];

const setOccurrences = new Map();
const setByRole = new Map(); // Track which role uses which set
const playerCount = { tanks: 0, healers: 0, total: 0 };
const fightStats = { total: 0, bosses: 0, trash: 0, skipped: 0 };

/**
 * Normalize set names by removing "Perfected" prefix
 * This combines perfected and non-perfected versions into one entry
 */
function normalizeSetName(setName) {
  return setName.replace(/^Perfected\s+/i, '');
}

function analyzePlayerDetails(filePath, reportDir) {
  try {
    // Check if this is a boss fight by reading index.json
    const indexPath = path.join(path.dirname(filePath), 'index.json');
    if (!fs.existsSync(indexPath)) {
      fightStats.skipped++;
      return;
    }
    
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const fights = indexData.fights || [];
    
    // Filter for boss fights only
    const bossFights = fights.filter(fight => isBossFight(fight.name));
    
    fightStats.total += fights.length;
    fightStats.bosses += bossFights.length;
    fightStats.trash += fights.length - bossFights.length;
    
    if (bossFights.length === 0) {
      console.log(`   ⏭️  Skipped ${reportDir}: No boss fights (${fights.length} trash fights)`);
      return;
    }
    
    console.log(`   ✅ ${reportDir}: ${bossFights.length} boss fight(s) - ${bossFights.map(f => f.name).join(', ')}`);
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!data.data?.playerDetails) {
      return;
    }

    const { tanks = [], healers = [] } = data.data.playerDetails;

    // Analyze tanks
    tanks.forEach(tank => {
      playerCount.tanks++;
      playerCount.total++;
      
      if (tank.combatantInfo?.gear) {
        const sets = new Set();
        tank.combatantInfo.gear.forEach(item => {
          if (item.setName) {
            const normalizedName = normalizeSetName(item.setName);
            if (SUPPORT_SETS.includes(item.setName) || SUPPORT_SETS.includes(normalizedName)) {
              sets.add(normalizedName);
            }
          }
        });

        sets.forEach(setName => {
          setOccurrences.set(setName, (setOccurrences.get(setName) || 0) + 1);
          
          if (!setByRole.has(setName)) {
            setByRole.set(setName, { tank: 0, healer: 0 });
          }
          setByRole.get(setName).tank++;
        });
      }
    });

    // Analyze healers
    healers.forEach(healer => {
      playerCount.healers++;
      playerCount.total++;
      
      if (healer.combatantInfo?.gear) {
        const sets = new Set();
        healer.combatantInfo.gear.forEach(item => {
          if (item.setName) {
            const normalizedName = normalizeSetName(item.setName);
            if (SUPPORT_SETS.includes(item.setName) || SUPPORT_SETS.includes(normalizedName)) {
              sets.add(normalizedName);
            }
          }
        });

        sets.forEach(setName => {
          setOccurrences.set(setName, (setOccurrences.get(setName) || 0) + 1);
          
          if (!setByRole.has(setName)) {
            setByRole.set(setName, { tank: 0, healer: 0 });
          }
          setByRole.get(setName).healer++;
        });
      }
    });
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function analyzeFights() {
  const reportDirs = fs.readdirSync(DATA_DIR).filter(dir => {
    const fullPath = path.join(DATA_DIR, dir);
    return fs.statSync(fullPath).isDirectory();
  });

  console.log(`\n📊 Analyzing ${reportDirs.length} fight reports (BOSS FIGHTS ONLY)...\n`);

  reportDirs.forEach(dir => {
    const playerDetailsPath = path.join(DATA_DIR, dir, 'player-details.json');
    if (fs.existsSync(playerDetailsPath)) {
      analyzePlayerDetails(playerDetailsPath, dir);
    }
  });

  // Sort by occurrence
  const sortedSets = Array.from(setOccurrences.entries())
    .sort((a, b) => b[1] - a[1]);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                  SUPPORT SET ANALYSIS RESULTS');
  console.log('                    (BOSS FIGHTS ONLY)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`Total Players Analyzed: ${playerCount.total}`);
  console.log(`  • Tanks: ${playerCount.tanks}`);
  console.log(`  • Healers: ${playerCount.healers}`);
  console.log(`  • Reports: ${reportDirs.length}`);
  console.log(`  • Total Fights: ${fightStats.total}`);
  console.log(`  • Boss Fights: ${fightStats.bosses} ✅`);
  console.log(`  • Trash Fights: ${fightStats.trash} (excluded)`);
  console.log(`  • Skipped: ${fightStats.skipped}\n`);

  console.log('───────────────────────────────────────────────────────────────');
  console.log('TOP SUPPORT SETS BY OCCURRENCE');
  console.log('───────────────────────────────────────────────────────────────\n');

  sortedSets.forEach(([setName, count], index) => {
    const roleData = setByRole.get(setName);
    const percentage = ((count / playerCount.total) * 100).toFixed(1);
    const tankPct = roleData.tank > 0 ? ((roleData.tank / playerCount.tanks) * 100).toFixed(0) : 0;
    const healerPct = roleData.healer > 0 ? ((roleData.healer / playerCount.healers) * 100).toFixed(0) : 0;
    
    const star = index < 10 ? '⭐' : '  ';
    console.log(`${star} ${(index + 1).toString().padStart(2)}. ${setName.padEnd(30)} | ${count.toString().padStart(3)} occurrences (${percentage.padStart(5)}%)`);
    console.log(`      └─ Tank: ${roleData.tank.toString().padStart(2)} (${tankPct}%)  |  Healer: ${roleData.healer.toString().padStart(2)} (${healerPct}%)\n`);
  });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('RECOMMENDATIONS FOR ROSTER BUILDER');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const topSets = sortedSets.slice(0, 15);
  const frequentSets = sortedSets.filter(([_, count]) => count >= playerCount.total * 0.10); // 10%+ occurrence
  
  console.log('✨ TOP 15 RECOMMENDED SETS (typical 12+ set requirement):');
  console.log('   Note: Raids need ~8 five-piece sets + ~4 two-piece monster sets = 12 total\n');
  topSets.forEach(([setName, count], index) => {
    const roleData = setByRole.get(setName);
    const role = roleData.tank > roleData.healer ? 'Tank' : roleData.healer > roleData.tank ? 'Healer' : 'Both';
    const percentage = ((count / playerCount.total) * 100).toFixed(1);
    console.log(`   ${(index + 1).toString().padStart(2)}. ${setName} (${role}) - ${percentage}%`);
  });

  console.log(`\n🔥 FREQUENTLY USED SETS (>10% occurrence in boss fights):`);
  frequentSets.forEach(([setName, count]) => {
    const percentage = ((count / playerCount.total) * 100).toFixed(1);
    console.log(`   • ${setName} (${percentage}%)`);
  });

  console.log('\n───────────────────────────────────────────────────────────────\n');
}

analyzeFights();
