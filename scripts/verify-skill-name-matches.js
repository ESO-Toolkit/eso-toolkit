/**
 * Script to verify all skill names have exact matches in abilities.json
 * Reports any skills with IDs that don't match their names
 * Usage: node scripts/verify-skill-name-matches.js
 */

const fs = require('fs');
const path = require('path');

// Load abilities.json
const abilitiesPath = path.join(__dirname, '..', 'data', 'abilities.json');
const abilities = JSON.parse(fs.readFileSync(abilitiesPath, 'utf8'));

// Create reverse lookup: ID -> Name
const idToName = {};
for (const [id, ability] of Object.entries(abilities)) {
  idToName[id] = ability.name;
}

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

// Extract skill entries from a TypeScript file
function extractSkills(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const skills = [];
  
  // Match patterns like: { id: 123, name: 'Skill Name', category: CATEGORY }
  const skillPattern = /\{\s*id:\s*(\d+),\s*name:\s*['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = skillPattern.exec(content)) !== null) {
    const id = match[1];
    const name = match[2];
    
    // Skip placeholder IDs
    if (id !== '0') {
      skills.push({ id: parseInt(id), name });
    }
  }
  
  return skills;
}

// Process all class files
let totalChecked = 0;
let mismatches = [];
let perfect = [];

console.log('=== Verifying Skill Name Matches ===\n');

for (const className of classes) {
  const classDir = path.join(classesPath, className);
  
  // Get all .ts files except index.ts
  const files = fs.readdirSync(classDir)
    .filter(f => f.endsWith('.ts') && f !== 'index.ts');
  
  for (const file of files) {
    const filePath = path.join(classDir, file);
    const skillLineName = file.replace('.ts', '');
    const skills = extractSkills(filePath);
    
    console.log(`${className}/${skillLineName}:`);
    
    let fileHasMismatch = false;
    
    for (const skill of skills) {
      totalChecked++;
      
      const actualName = idToName[skill.id];
      
      if (!actualName) {
        mismatches.push({
          class: className,
          skillLine: skillLineName,
          id: skill.id,
          expectedName: skill.name,
          actualName: 'NOT FOUND IN abilities.json',
          issue: 'ID_NOT_FOUND'
        });
        console.log(`  ✗ ${skill.name} (ID ${skill.id}): NOT FOUND in abilities.json`);
        fileHasMismatch = true;
      } else if (actualName !== skill.name) {
        mismatches.push({
          class: className,
          skillLine: skillLineName,
          id: skill.id,
          expectedName: skill.name,
          actualName: actualName,
          issue: 'NAME_MISMATCH'
        });
        console.log(`  ✗ ID ${skill.id}: Expected "${skill.name}" but found "${actualName}"`);
        fileHasMismatch = true;
      }
    }
    
    if (!fileHasMismatch && skills.length > 0) {
      perfect.push({ class: className, skillLine: skillLineName, count: skills.length });
      console.log(`  ✓ All ${skills.length} skills verified`);
    }
    
    console.log('');
  }
}

// Summary
console.log('\n=== SUMMARY ===');
console.log(`Total skills checked: ${totalChecked}`);
console.log(`Perfect matches: ${totalChecked - mismatches.length}`);
console.log(`Mismatches: ${mismatches.length}`);

if (mismatches.length > 0) {
  console.log('\n=== MISMATCHES DETAIL ===');
  
  const idNotFound = mismatches.filter(m => m.issue === 'ID_NOT_FOUND');
  const nameMismatch = mismatches.filter(m => m.issue === 'NAME_MISMATCH');
  
  if (idNotFound.length > 0) {
    console.log(`\nIDs not found in abilities.json (${idNotFound.length}):`);
    idNotFound.forEach(m => {
      console.log(`  ${m.class}/${m.skillLine}: ${m.expectedName} (ID ${m.id})`);
    });
  }
  
  if (nameMismatch.length > 0) {
    console.log(`\nName mismatches (${nameMismatch.length}):`);
    nameMismatch.forEach(m => {
      console.log(`  ${m.class}/${m.skillLine}:`);
      console.log(`    ID ${m.id}:`);
      console.log(`      Expected: "${m.expectedName}"`);
      console.log(`      Actual:   "${m.actualName}"`);
    });
  }
} else {
  console.log('\n✓ All skills have exact name matches!');
}

// Save results
const outputPath = path.join(__dirname, 'skill-verification-results.json');
fs.writeFileSync(outputPath, JSON.stringify({ totalChecked, mismatches, perfect }, null, 2));
console.log(`\n✓ Results saved to ${outputPath}`);
