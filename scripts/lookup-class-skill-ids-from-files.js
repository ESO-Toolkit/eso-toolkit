/**
 * Script to extract skill names from class skill files and look up their IDs
 * This reads the actual TypeScript files to get the exact skill names
 * Usage: node scripts/lookup-class-skill-ids-from-files.js
 */

const fs = require('fs');
const path = require('path');

// Load abilities.json
const abilitiesPath = path.join(__dirname, '..', 'data', 'abilities.json');
const abilities = JSON.parse(fs.readFileSync(abilitiesPath, 'utf8'));

// Base path for class skill files
const classesPath = path.join(__dirname, '..', 'src', 'features', 'loadout-manager', 'data', 'classes');

// All class directories
const classes = [
  'necromancer',
  'arcanist',
  'templar',
  'dragonknight',
  'sorcerer',
  'nightblade',
  'warden'
];

// Extract skill names from a TypeScript file
function extractSkillNames(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const skills = [];
  
  // Match patterns like: { id: 0, name: 'Skill Name', category: CATEGORY }
  const skillPattern = /\{\s*id:\s*\d+,\s*name:\s*['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = skillPattern.exec(content)) !== null) {
    skills.push(match[1]);
  }
  
  return skills;
}

// Find skill ID in abilities.json (return first/lowest ID match as base skill)
function findSkillId(skillName) {
  const matches = [];
  
  for (const [id, ability] of Object.entries(abilities)) {
    if (ability.name === skillName) {
      matches.push({ id: parseInt(id), icon: ability.icon });
    }
  }
  
  if (matches.length === 0) {
    return null;
  }
  
  // Sort by ID (lower IDs are usually base skills)
  matches.sort((a, b) => a.id - b.id);
  return matches[0];
}

// Process all class files
const allResults = {};
const notFound = [];

for (const className of classes) {
  const classDir = path.join(classesPath, className);
  
  // Get all .ts files except index.ts
  const files = fs.readdirSync(classDir)
    .filter(f => f.endsWith('.ts') && f !== 'index.ts');
  
  for (const file of files) {
    const filePath = path.join(classDir, file);
    const skillLineName = file.replace('.ts', '');
    const skills = extractSkillNames(filePath);
    
    console.log(`\n=== ${className}/${skillLineName} ===`);
    console.log(`Found ${skills.length} skills`);
    
    for (const skillName of skills) {
      const result = findSkillId(skillName);
      
      if (result) {
        if (!allResults[className]) {
          allResults[className] = {};
        }
        if (!allResults[className][skillLineName]) {
          allResults[className][skillLineName] = [];
        }
        
        allResults[className][skillLineName].push({
          name: skillName,
          id: result.id,
          icon: result.icon
        });
        
        console.log(`  ✓ ${skillName}: ${result.id}`);
      } else {
        notFound.push({ class: className, skillLine: skillLineName, skill: skillName });
        console.log(`  ✗ ${skillName}: NOT FOUND`);
      }
    }
  }
}

// Summary
console.log('\n\n=== SUMMARY ===');
let totalFound = 0;
for (const className in allResults) {
  for (const skillLine in allResults[className]) {
    totalFound += allResults[className][skillLine].length;
  }
}

console.log(`Total found: ${totalFound}`);
console.log(`Total not found: ${notFound.length}`);

if (notFound.length > 0) {
  console.log('\n=== NOT FOUND ===');
  notFound.forEach(({ class: className, skillLine, skill }) => {
    console.log(`  ${className}/${skillLine}: ${skill}`);
  });
}

// Save results to JSON for use in update script
const outputPath = path.join(__dirname, 'class-skill-ids.json');
fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
console.log(`\n✓ Results saved to ${outputPath}`);
