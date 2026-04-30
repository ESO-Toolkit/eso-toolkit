/**
 * Script to update class skill files with found IDs
 * Only updates skills with exact name matches
 * Usage: node scripts/update-class-skill-ids.js
 */

const fs = require('fs');
const path = require('path');

// Load the results from the lookup script
const resultsPath = path.join(__dirname, 'class-skill-ids.json');
const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

// Base path for class skill files
const classesPath = path.join(__dirname, '..', 'src', 'features', 'loadout-manager', 'data', 'classes');

let totalUpdated = 0;
let filesUpdated = 0;

// Update a single file
function updateFile(className, skillLineName, skills) {
  const fileName = `${skillLineName}.ts`;
  const filePath = path.join(classesPath, className, fileName);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let updatedCount = 0;
  
  // Create a map of skill name to ID for quick lookup
  const skillMap = new Map();
  skills.forEach(skill => {
    skillMap.set(skill.name, skill.id);
  });
  
  // Update each skill by finding the exact pattern and replacing the ID
  for (const [skillName, skillId] of skillMap.entries()) {
    // Escape special regex characters in skill name
    const escapedName = skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Pattern to match: { id: 0, name: 'Skill Name',
    // We want to replace the 0 with the actual ID
    const pattern = new RegExp(
      `(\\{\\s*id:\\s*)0(\\s*,\\s*name:\\s*['"]${escapedName}['"])`,
      'g'
    );
    
    const newContent = content.replace(pattern, `$1${skillId}$2`);
    
    if (newContent !== content) {
      updatedCount++;
      content = newContent;
    }
  }
  
  if (updatedCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ ${className}/${fileName}: Updated ${updatedCount} skills`);
    filesUpdated++;
    totalUpdated += updatedCount;
  }
  
  return updatedCount;
}

// Process all classes
console.log('=== Updating Class Skill Files ===\n');

for (const [className, skillLines] of Object.entries(results)) {
  console.log(`${className}:`);
  
  for (const [skillLineName, skills] of Object.entries(skillLines)) {
    updateFile(className, skillLineName, skills);
  }
  
  console.log('');
}

console.log('=== SUMMARY ===');
console.log(`Files updated: ${filesUpdated}`);
console.log(`Total skills updated: ${totalUpdated}`);
