/**
 * Look up skill IDs for corrected Arcanist and Warden skill names
 * This will update the files with correct IDs from abilities.json
 */

const fs = require('fs');
const path = require('path');

// Load abilities.json
const abilitiesPath = path.join(__dirname, '..', 'data', 'abilities.json');
const abilitiesData = JSON.parse(fs.readFileSync(abilitiesPath, 'utf8'));

// Handle both array and object formats
const abilities = Array.isArray(abilitiesData) ? abilitiesData : Object.values(abilitiesData);

// Create a lookup map by skill name (case-insensitive for better matching)
const abilityMap = new Map();
abilities.forEach(ability => {
  if (ability.name) {
    abilityMap.set(ability.name.toLowerCase(), ability.id);
  }
});

// Skills to look up (from corrected Arcanist files + missing Warden skills)
const skillsToLookup = [
  // Curative Runeforms
  'Evolving Runemend',
  'Proactive Runemend',
  'Perfected Runemend',
  'Rune of Displacement',
  'Translocation',
  'Shifting Rune',
  'Runic Jolt',
  'Runic Sunder',
  'Runic Embrace',
  'Runic Defense',
  'Impervious Runeward',
  'Spiteward of the Lucid Mind',
  'Runeguard of Still Waters',
  'Runeguard of Freedom',
  'Runeguard of Loath',
  'Remedy Cascade',
  'Cascading Fortune',
  'Curative Surge',
  'Recuperative Treatise',
  'Harnessed Quintessence',
  'Healing Tides',
  'Warding Contingency',
  
  // Herald of the Tome
  'The Languid Eye',
  'The Tide King\'s Gaze',
  'The Unblinking Eye',
  'Fulminating Rune',
  'Escalating Rune',
  'Evolving Rune',
  'Tentacular Dread',
  'Abyssal Impact',
  'Writhing Runeblades',
  'Runeblades',
  'Escalating Runeblades',
  'Intricate Runeblades',
  'The Imperfect Ring',
  'Fatecarver\'s Prelude',
  'Pragmatic Fatecarver',
  'Cephaliarch\'s Flail',
  'Cephaliarch\'s Blitz',
  'Cephaliarch\'s Discernment',
  'Crux Weaver',
  'Ancient Knowledge',
  'Fated Fortune',
  'Hideous Clarity',
  
  // Soldier of Apocrypha
  'Sanctum of the Abyssal Sea',
  'Gibbering Shelter',
  'Tidal Aegis',
  'Rune of the Colorless Pool',
  'Rune of Uncanny Adoration',
  'Rune of Eldritch Horror',
  'Runespite Ward',
  'Reinforced Ward',
  'Gibbering Shield',
  'Inspired Scholarship',
  'Phantasmal Affinity',
  'Inspired Virtues',
  'Fatecarver',
  'Exhausting Fatecarver',
  'Tome-Bearer\'s Inspiration',
  'Concordant Panacea',
  'Fate\'s Insistence',
  'Aegis of the Unseen',
  'Crux Mastery',
  'Cultivated Synergy',
  'Wellspring of the Abyss',
  
  // Missing Warden skills
  'Frozen Armor',
];

// Look up IDs
const results = {
  found: [],
  notFound: []
};

skillsToLookup.forEach(skillName => {
  const id = abilityMap.get(skillName.toLowerCase());
  if (id) {
    results.found.push({ name: skillName, id });
  } else {
    results.notFound.push(skillName);
  }
});

// Output results
console.log('=== SKILL ID LOOKUP RESULTS ===\n');
console.log(`Found: ${results.found.length}/${skillsToLookup.length} skills`);
console.log(`Not Found: ${results.notFound.length} skills\n`);

console.log('FOUND SKILLS:');
results.found.forEach(skill => {
  console.log(`  ${skill.name}: ${skill.id}`);
});

if (results.notFound.length > 0) {
  console.log('\nNOT FOUND (need manual lookup):');
  results.notFound.forEach(name => {
    console.log(`  ${name}`);
  });
}

// Write results to JSON file for easy reference
const outputPath = path.join(__dirname, 'arcanist-warden-skill-ids.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`\nResults saved to: ${outputPath}`);
