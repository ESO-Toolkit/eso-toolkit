/**
 * Update Arcanist and Warden files with found skill IDs
 */

const fs = require('fs');
const path = require('path');

// Load the found IDs
const resultsPath = path.join(__dirname, 'arcanist-warden-skill-ids.json');
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

// Create a map of skill names to IDs
const idMap = new Map();
results.found.forEach(skill => {
  idMap.set(skill.name, skill.id);
});

// Files to update
const filesToUpdate = [
  {
    path: path.join(__dirname, '..', 'src', 'features', 'loadout-manager', 'data', 'classes', 'arcanist', 'curativeRuneforms.ts'),
    name: 'Curative Runeforms'
  },
  {
    path: path.join(__dirname, '..', 'src', 'features', 'loadout-manager', 'data', 'classes', 'arcanist', 'heraldOfTheTome.ts'),
    name: 'Herald of the Tome'
  },
  {
    path: path.join(__dirname, '..', 'src', 'features', 'loadout-manager', 'data', 'classes', 'arcanist', 'soldierOfApocrypha.ts'),
    name: 'Soldier of Apocrypha'
  },
  {
    path: path.join(__dirname, '..', 'src', 'features', 'loadout-manager', 'data', 'classes', 'warden', 'wintersEmbrace.ts'),
    name: 'Winter\'s Embrace'
  }
];

let totalUpdated = 0;

filesToUpdate.forEach(file => {
  console.log(`\nUpdating: ${file.name}`);
  let content = fs.readFileSync(file.path, 'utf8');
  let fileUpdated = 0;
  
  // For each found skill, replace id: 0 with the correct ID
  idMap.forEach((id, skillName) => {
    // Escape backslashes then single quotes to avoid incomplete sanitization
    const escapedName = skillName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    
    // Match pattern: { id: 0, name: 'SkillName'
    const pattern = new RegExp(
      `(\\{\\s*id:\\s*)0(\\s*,\\s*name:\\s*'${escapedName}')`,
      'g'
    );
    
    const beforeCount = (content.match(pattern) || []).length;
    content = content.replace(pattern, `$1${id}$2`);
    const afterCount = (content.match(pattern) || []).length;
    
    if (beforeCount > afterCount) {
      console.log(`  ✓ ${skillName}: ${id}`);
      fileUpdated++;
      totalUpdated++;
    }
  });
  
  // Write updated content
  fs.writeFileSync(file.path, content, 'utf8');
  console.log(`  Updated ${fileUpdated} skills in ${file.name}`);
});

console.log(`\n=== SUMMARY ===`);
console.log(`Total skills updated: ${totalUpdated}`);
console.log(`Skills with IDs found: ${results.found.length}`);
console.log(`Skills still needing IDs: ${results.notFound.length}`);
console.log(`\nFiles updated successfully!`);
