/**
 * Check if mismatched enum abilities appear in downloaded report data
 * This helps identify which wrong ability IDs are actually being used in combat logs
 */

const fs = require('fs');
const path = require('path');

// List of mismatched ability IDs from our enum check
const mismatchedAbilities = [
  { enumName: 'SKILLED_TRACKER', id: 45596, actualName: 'Slayer' },
  { enumName: 'ADVANCED_SPECIES', id: 184809, actualName: 'Ritual' },
  { enumName: 'HUNTERS_EYE_PASSIVE', id: 45576, actualName: 'Crushing Leap' },
  { enumName: 'DISMEMBER_PASSIVE', id: 61697, actualName: 'Minor Fortitude' },
  { enumName: 'PIERCING_PASSIVE', id: 45233, actualName: 'Spell Resistance Potion' },
  { enumName: 'FORCE_OF_NATURE_PASSIVE', id: 126597, actualName: 'Touch of Z\'en' },
  { enumName: 'HEAVY_WEAPONS_PASSIVE', id: 45265, actualName: 'Dynamic' },
  { enumName: 'TWIN_BLADE_AND_BLUNT_PASSIVE', id: 45477, actualName: 'Dual Wield Expert' },
  { enumName: 'CRYSTAL_WEAPON_BUFF', id: 126045, actualName: 'Heavy Attack' },
  { enumName: 'TREMORSCALE', id: 142023, actualName: 'Elemental Wave' },
  { enumName: 'CRIMSON_OATH', id: 155150, actualName: 'Hunter\'s Focus' },
  { enumName: 'ROAR_OF_ALKOSH', id: 102094, actualName: 'Thurvokun' },
  { enumName: 'VELOTHI_UR_MAGE_BUFF', id: 193447, actualName: 'Velothi Ur-Mage\'s Amulet' },
  { enumName: 'DEXTERITY', id: 45241, actualName: 'Major Savagery' },
  { enumName: 'FELINE_AMBUSH', id: 192901, actualName: 'Poison Snare' },
  { enumName: 'MAJOR_SORCERY', id: 61685, actualName: 'Minor Sorcery' },
  { enumName: 'SHATTERING_KNIFE', id: 217699, actualName: 'Banner Bearer' },
  // Add more key mismatches
  { enumName: 'CRUSHING_SHOCK', id: 23214, actualName: 'Boundless Storm' },
  { enumName: 'BOUNDLESS_STORM', id: 62547, actualName: 'Deadly Cloak' },
  { enumName: 'HURRICANE', id: 62529, actualName: 'Quick Cloak' },
  { enumName: 'ERUPTION', id: 118720, actualName: 'Pummeling Goliath Bash' },
  { enumName: 'LIQUID_LIGHTNING', id: 38891, actualName: 'Whirling Blades' },
  { enumName: 'WALL_OF_ELEMENTS', id: 102136, actualName: 'Zaan' },
  { enumName: 'ELEMENTAL_BLOCKADE', id: 75752, actualName: 'Roar of Alkosh' },
];

const dataDownloadsPath = path.join(__dirname, '..', '..', 'data-downloads');
const foundAbilities = new Map();

function searchInFile(filePath, relativePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Search for ability IDs in various structures
    const searchObject = (obj, path = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => searchObject(item, `${path}[${index}]`));
      } else {
        for (const [key, value] of Object.entries(obj)) {
          const newPath = path ? `${path}.${key}` : key;
          
          // Check if this looks like an ability ID field
          if ((key === 'abilityGameID' || key === 'id' || key === 'abilityId') && typeof value === 'number') {
            checkAbilityId(value, relativePath, newPath);
          }
          
          searchObject(value, newPath);
        }
      }
    };
    
    searchObject(data);
  } catch (error) {
    // Skip files that can't be parsed
  }
}

function checkAbilityId(id, file, jsonPath) {
  const match = mismatchedAbilities.find(a => a.id === id);
  if (match) {
    if (!foundAbilities.has(id)) {
      foundAbilities.set(id, {
        ...match,
        occurrences: []
      });
    }
    foundAbilities.get(id).occurrences.push({ file, jsonPath });
  }
}

function searchDirectory(dir, baseDir = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      searchDirectory(fullPath, baseDir);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      searchInFile(fullPath, relativePath);
    }
  }
}

console.log('\n=== Searching for Mismatched Abilities in Report Data ===\n');
console.log(`Checking ${mismatchedAbilities.length} mismatched abilities...`);
console.log(`Searching in: ${dataDownloadsPath}\n`);

if (!fs.existsSync(dataDownloadsPath)) {
  console.error('Error: data-downloads directory not found!');
  process.exit(1);
}

// Search all JSON files in data-downloads
searchDirectory(dataDownloadsPath);

// Also check fight-48-data.json if it exists
const fight48Path = path.join(__dirname, '..', '..', 'fight-48-data.json');
if (fs.existsSync(fight48Path)) {
  console.log('Also checking fight-48-data.json...\n');
  searchInFile(fight48Path, 'fight-48-data.json');
}

// Report findings
console.log('=== RESULTS ===\n');

if (foundAbilities.size === 0) {
  console.log('✓ None of the mismatched abilities were found in the report data.');
  console.log('  This suggests these enum entries may not be actively used.');
} else {
  console.log(`⚠️  Found ${foundAbilities.size} mismatched abilities in report data:\n`);
  
  const sortedAbilities = Array.from(foundAbilities.values()).sort((a, b) => 
    b.occurrences.length - a.occurrences.length
  );
  
  for (const ability of sortedAbilities) {
    console.log(`\n${ability.enumName} = ${ability.id}`);
    console.log(`  Actual ability name: "${ability.actualName}"`);
    console.log(`  Found in ${ability.occurrences.length} location(s):`);
    
    // Show first 5 occurrences
    const occurrencesToShow = ability.occurrences.slice(0, 5);
    for (const occ of occurrencesToShow) {
      console.log(`    - ${occ.file}`);
      console.log(`      at: ${occ.jsonPath}`);
    }
    
    if (ability.occurrences.length > 5) {
      console.log(`    ... and ${ability.occurrences.length - 5} more`);
    }
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total mismatched abilities checked: ${mismatchedAbilities.length}`);
  console.log(`Found in report data: ${foundAbilities.size}`);
  console.log(`Not found: ${mismatchedAbilities.length - foundAbilities.size}`);
  
  // Priority list
  console.log('\n=== HIGH PRIORITY (Most Frequently Used) ===');
  const highPriority = sortedAbilities.filter(a => a.occurrences.length >= 10);
  if (highPriority.length > 0) {
    highPriority.forEach(a => {
      console.log(`  - ${a.enumName} (${a.occurrences.length} occurrences)`);
    });
  } else {
    console.log('  No abilities with 10+ occurrences');
  }
}

console.log('');
