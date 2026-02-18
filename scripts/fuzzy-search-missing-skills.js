/**
 * Manual fuzzy search for missing skill IDs
 * Uses partial matching and apostrophe variations
 */

const fs = require('fs');
const path = require('path');

// Load abilities.json
const abilitiesPath = path.join(__dirname, '..', 'data', 'abilities.json');
const abilitiesData = JSON.parse(fs.readFileSync(abilitiesPath, 'utf8'));
const abilities = Array.isArray(abilitiesData) ? abilitiesData : Object.values(abilitiesData);

// Missing skills that need manual lookup
const missingSkills = [
  'Proactive Runemend',
  'Perfected Runemend',
  'Translocation',
  'Shifting Rune',
  'Runeguard of Loath',
  'Escalating Rune',
  'Evolving Rune',
  'Intricate Runeblades',
  'Fatecarver\'s Prelude',
  'Cephaliarch\'s Blitz',
  'Cephaliarch\'s Discernment',
  'Crux Weaver',
  'Tidal Aegis',
  'Reinforced Ward',
  'Phantasmal Affinity',
  'Inspired Virtues',
  'Concordant Panacea',
  'Fate\'s Insistence',
  'Crux Mastery',
  'Cultivated Synergy',
];

console.log('=== FUZZY SEARCH FOR MISSING SKILLS ===\n');

missingSkills.forEach(skillName => {
  console.log(`\nSearching for: ${skillName}`);
  
  // Normalize the search term
  const searchTerms = [
    skillName.toLowerCase(),
    skillName.toLowerCase().replace(/'/g, ''),
    // Normalize Unicode apostrophes/curly quotes to a standard apostrophe
    skillName.toLowerCase().replace(/['\u2018\u2019\u02bc]/g, "'"),
  ];
  
  // Find partial matches
  const matches = abilities.filter(ability => {
    if (!ability.name) return false;
    const abilityNameLower = ability.name.toLowerCase();
    return searchTerms.some(term => 
      abilityNameLower.includes(term) || term.includes(abilityNameLower)
    );
  });
  
  if (matches.length > 0) {
    console.log(`  Found ${matches.length} potential matches:`);
    matches.slice(0, 5).forEach(match => {
      console.log(`    - ${match.name} (ID: ${match.id})`);
    });
  } else {
    console.log(`  No matches found - may need web lookup`);
  }
});
